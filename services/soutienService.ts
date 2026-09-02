import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { UserProfile } from '../context/AuthContext';

/**
 * Conversations de soutien entre un membre et l'equipe de l'Observatoire.
 * Un seul fil par personne, dans `soutien/{uid}`, avec ses messages dans
 * `soutien/{uid}/messages`. La personne lit et ecrit son propre fil,
 * l'administration lit et ecrit tous les fils.
 */

// --- Types ------------------------------------------------------------------

export type StatutFil = 'ouvert' | 'traite';

export interface FilSoutien {
  id: string;
  uid: string;
  nom: string;
  courriel: string;
  dernierMessage: string;
  dernierAuteur: string;
  majLe: Timestamp | null;
  nonLusEquipe: number;
  nonLusMembre: number;
  statut: StatutFil;
  creeLe: Timestamp | null;
}

export interface MessageSoutien {
  id: string;
  auteurUid: string;
  auteurNom: string;
  coteEquipe: boolean;
  texte: string;
  creeLe: Timestamp | null;
}

export type CoteSoutien = 'equipe' | 'membre';

export const LONGUEUR_MAX_SOUTIEN = 4000;
const LONGUEUR_MAX_NOM = 120;
const LONGUEUR_MAX_COURRIEL = 200;
const LONGUEUR_MAX_EXTRAIT = 200;

// --- Aides ------------------------------------------------------------------

const mapDocs = <T>(snap: { docs: Array<{ id: string; data: () => unknown }> }): T[] =>
  snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];

const nomCourt = (nom: string): string => (nom || 'Membre').trim().slice(0, LONGUEUR_MAX_NOM);

const courrielCourt = (courriel: string): string =>
  (courriel || '').trim().slice(0, LONGUEUR_MAX_COURRIEL);

const millis = (ts: Timestamp | null): number => (ts ? ts.toMillis() : 0);

// --- Le fil -----------------------------------------------------------------

/**
 * Ouvre le fil de soutien d'une personne, en le creant s'il n'existe pas encore.
 * Rend l'identifiant du fil, qui est celui du compte.
 */
export const ouvrirFil = async (profile: UserProfile): Promise<string> => {
  if (!profile?.uid) throw new Error('Identifiant manquant.');
  const ref = doc(db, 'soutien', profile.uid);
  // La lecture doit reussir avant toute ecriture : `setDoc` remplace le document
  // en entier, et un refus avale par erreur effacerait le statut tenu par
  // l'administration ainsi que les compteurs de non-lus. Une lecture qui echoue
  // remonte donc a l'appelant au lieu d'ouvrir un fil par-dessus l'ancien.
  const deja = await getDoc(ref);
  if (deja.exists()) return profile.uid;
  await setDoc(ref, {
    uid: profile.uid,
    nom: nomCourt(profile.displayName),
    courriel: courrielCourt(profile.email),
    dernierMessage: '',
    dernierAuteur: '',
    majLe: serverTimestamp(),
    nonLusEquipe: 0,
    nonLusMembre: 0,
    statut: 'ouvert',
    creeLe: serverTimestamp(),
  });
  return profile.uid;
};

/** Suit le fil d'une personne. Rend `null` tant que le fil n'existe pas. */
export const suivreMonFil = (
  uid: string,
  cb: (fil: FilSoutien | null) => void,
  onErreur?: (e: unknown) => void
) =>
  onSnapshot(
    doc(db, 'soutien', uid),
    (snap) => cb(snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as FilSoutien) : null),
    (e) => {
      cb(null);
      onErreur?.(e);
    }
  );

/** Suit les messages d'un fil, du plus ancien au plus recent. */
export const suivreMessagesSoutien = (
  uid: string,
  cb: (messages: MessageSoutien[]) => void,
  onErreur?: (e: unknown) => void
) =>
  onSnapshot(
    query(collection(db, 'soutien', uid, 'messages'), orderBy('creeLe', 'desc'), limit(200)),
    (snap) => cb(mapDocs<MessageSoutien>(snap).reverse()),
    (e) => {
      cb([]);
      onErreur?.(e);
    }
  );

/**
 * Message d'un membre vers l'equipe. Cree le fil au besoin, ecrit le message,
 * puis met a jour l'extrait, la date et le compteur de non-lus de l'equipe.
 */
export const ecrireAuSoutien = async (profile: UserProfile, texte: string): Promise<void> => {
  const propre = texte.trim().slice(0, LONGUEUR_MAX_SOUTIEN);
  if (!propre || !profile?.uid) return;
  await ouvrirFil(profile);
  await addDoc(collection(db, 'soutien', profile.uid, 'messages'), {
    auteurUid: profile.uid,
    auteurNom: nomCourt(profile.displayName),
    coteEquipe: false,
    texte: propre,
    creeLe: serverTimestamp(),
  });
  await updateDoc(doc(db, 'soutien', profile.uid), {
    dernierMessage: propre.slice(0, LONGUEUR_MAX_EXTRAIT),
    dernierAuteur: profile.uid,
    majLe: serverTimestamp(),
    nonLusEquipe: increment(1),
  });
};

/**
 * Reponse de l'equipe vers un membre. Le fil existe deja puisque la personne a
 * ecrit la premiere, mais il est recree si besoin pour ne jamais perdre un mot.
 */
export const repondreAuMembre = async (
  uidMembre: string,
  admin: UserProfile,
  texte: string
): Promise<void> => {
  const propre = texte.trim().slice(0, LONGUEUR_MAX_SOUTIEN);
  if (!propre || !uidMembre || !admin?.uid) return;
  await addDoc(collection(db, 'soutien', uidMembre, 'messages'), {
    auteurUid: admin.uid,
    auteurNom: nomCourt(admin.displayName),
    coteEquipe: true,
    texte: propre,
    creeLe: serverTimestamp(),
  });
  await updateDoc(doc(db, 'soutien', uidMembre), {
    dernierMessage: propre.slice(0, LONGUEUR_MAX_EXTRAIT),
    dernierAuteur: admin.uid,
    majLe: serverTimestamp(),
    nonLusMembre: increment(1),
  });
};

/** Remet a zero le compteur de non-lus d'un cote du fil. */
export const marquerLuSoutien = async (uid: string, cote: CoteSoutien): Promise<void> => {
  if (!uid) return;
  const champ = cote === 'equipe' ? 'nonLusEquipe' : 'nonLusMembre';
  await updateDoc(doc(db, 'soutien', uid), { [champ]: 0 });
};

/** Suit tous les fils, le plus recemment remue en premier. Reserve a l'administration. */
export const suivreTousLesFils = (
  cb: (fils: FilSoutien[]) => void,
  onErreur?: (e: unknown) => void
) =>
  onSnapshot(
    query(collection(db, 'soutien'), orderBy('majLe', 'desc'), limit(300)),
    (snap) => {
      const fils = mapDocs<FilSoutien>(snap);
      fils.sort((a, b) => millis(b.majLe) - millis(a.majLe));
      cb(fils);
    },
    (e) => {
      cb([]);
      onErreur?.(e);
    }
  );

/** Marque un fil traite ou le rouvre. Reserve a l'administration. */
export const changerStatutFil = async (uid: string, statut: StatutFil): Promise<void> => {
  if (!uid) return;
  await updateDoc(doc(db, 'soutien', uid), { statut, majLe: serverTimestamp() });
};
