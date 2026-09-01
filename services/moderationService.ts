import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Moderation de l'Observatoire. Deux collections, deux portees.
 * `blocages/{uid}` appartient a la personne : elle seule lit et ecrit sa liste.
 * `signalements/{id}` se cree par toute personne connectee et se traite par
 * l'administration.
 */

// --- Types ------------------------------------------------------------------

export type TypeCible = 'billet' | 'commentaire' | 'membre' | 'photo' | 'message';

export interface CibleSignalement {
  type: TypeCible;
  id: string;
  uid?: string;
}

export type StatutSignalement = 'ouvert' | 'traite' | 'rejete';

export interface Signalement {
  id: string;
  parUid: string;
  parNom: string;
  cible: CibleSignalement;
  motif: string;
  extrait: string;
  statut: StatutSignalement;
  creeLe: Timestamp | null;
  traiteLe: Timestamp | null;
}

export interface AuteurSignalement {
  uid: string;
  nom: string;
}

// --- Longueurs maximales ----------------------------------------------------

export const LONGUEUR_MAX_MOTIF = 1000;
/** Ce que la personne ecrit elle-meme. Le libelle du motif s'ajoute par-dessus,
 *  et le tout doit rester sous la limite que la regle Firestore impose. */
export const LONGUEUR_MAX_PRECISION = 800;
const MAX_NOM = 120;
const MAX_ID = 200;
const MAX_EXTRAIT = 500;
const LIMITE_SIGNALEMENTS = 300;
const MAX_BLOCAGES = 500;

const TYPES: readonly TypeCible[] = ['billet', 'commentaire', 'membre', 'photo', 'message'];

// --- Petits outils ----------------------------------------------------------

const couper = (valeur: unknown, max: number): string =>
  typeof valeur === 'string' ? valeur.trim().slice(0, max) : '';

const enTypeCible = (valeur: unknown): TypeCible =>
  TYPES.includes(valeur as TypeCible) ? (valeur as TypeCible) : 'billet';

const enStatut = (valeur: unknown): StatutSignalement =>
  valeur === 'traite' || valeur === 'rejete' ? valeur : 'ouvert';

const enSignalement = (id: string, donnees: Record<string, unknown>): Signalement => {
  const cibleBrute = (donnees.cible ?? {}) as Record<string, unknown>;
  const uidCible = couper(cibleBrute.uid, MAX_ID);
  return {
    id,
    parUid: couper(donnees.parUid, MAX_ID),
    parNom: couper(donnees.parNom, MAX_NOM) || 'Membre',
    cible: {
      type: enTypeCible(cibleBrute.type),
      id: couper(cibleBrute.id, MAX_ID),
      uid: uidCible || undefined,
    },
    motif: couper(donnees.motif, LONGUEUR_MAX_MOTIF),
    extrait: couper(donnees.extrait, MAX_EXTRAIT),
    statut: enStatut(donnees.statut),
    creeLe: donnees.creeLe instanceof Timestamp ? donnees.creeLe : null,
    traiteLe: donnees.traiteLe instanceof Timestamp ? donnees.traiteLe : null,
  };
};

/** Le plus recent en premier. Un signalement tout juste ecrit passe en tete. */
const parNouveaute = (a: Signalement, b: Signalement): number => {
  const ta = a.creeLe ? a.creeLe.toMillis() : Number.MAX_SAFE_INTEGER;
  const tb = b.creeLe ? b.creeLe.toMillis() : Number.MAX_SAFE_INTEGER;
  return tb - ta;
};

// --- Blocages ---------------------------------------------------------------

/**
 * Abonnement a ma propre liste de blocages. Rend le desabonnement, a appeler
 * dans le retour du useEffect.
 */
export function suivreMesBlocages(
  uid: string,
  cb: (uids: string[]) => void,
  onErreur?: (message: string) => void,
): () => void {
  return onSnapshot(
    doc(db, 'blocages', uid),
    (capture) => {
      const donnees = (capture.data() ?? {}) as { uids?: unknown };
      const liste: unknown[] = Array.isArray(donnees.uids) ? donnees.uids : [];
      cb(
        liste
          .filter((u): u is string => typeof u === 'string' && u.length > 0)
          .slice(0, MAX_BLOCAGES),
      );
    },
    (erreur) => {
      if (onErreur) onErreur(erreur.message);
      else console.error('suivreMesBlocages', erreur);
    },
  );
}

/** Ajoute une personne a ma liste. Le document se cree au premier blocage. */
export async function bloquer(uid: string, cible: string): Promise<void> {
  const propre = couper(cible, MAX_ID);
  if (!propre || propre === uid) return;
  await setDoc(doc(db, 'blocages', uid), { uids: arrayUnion(propre) }, { merge: true });
}

/** Retire une personne de ma liste. */
export async function debloquer(uid: string, cible: string): Promise<void> {
  const propre = couper(cible, MAX_ID);
  if (!propre) return;
  await setDoc(doc(db, 'blocages', uid), { uids: arrayRemove(propre) }, { merge: true });
}

/**
 * Retire d'une liste tout ce qui vient d'une personne bloquee. Le champ qui
 * porte l'identifiant de l'auteur se nomme `uid` par defaut.
 */
export function filtrerBloques<T>(items: T[], blocages: string[], champUid = 'uid'): T[] {
  if (blocages.length === 0) return items;
  const bloques = new Set(blocages);
  return items.filter((item) => {
    const auteur = (item as Record<string, unknown>)[champUid];
    return typeof auteur !== 'string' || !bloques.has(auteur);
  });
}

// --- Signalements -----------------------------------------------------------

/** Depot d'un signalement. Le statut part toujours a 'ouvert'. */
export async function signaler(
  par: AuteurSignalement,
  cible: CibleSignalement,
  motif: string,
  extrait?: string,
): Promise<string> {
  const parUid = couper(par.uid, MAX_ID);
  const motifPropre = couper(motif, LONGUEUR_MAX_MOTIF);
  const idCible = couper(cible.id, MAX_ID);
  if (!parUid) throw new Error('Connectez-vous pour signaler ce contenu.');
  if (!motifPropre) throw new Error('Le motif est requis.');
  if (!idCible) throw new Error('La cible du signalement est introuvable.');

  const uidCible = couper(cible.uid, MAX_ID);
  const ref = await addDoc(collection(db, 'signalements'), {
    parUid,
    parNom: couper(par.nom, MAX_NOM) || 'Membre',
    cible: {
      type: enTypeCible(cible.type),
      id: idCible,
      ...(uidCible ? { uid: uidCible } : {}),
    },
    motif: motifPropre,
    extrait: couper(extrait, MAX_EXTRAIT),
    statut: 'ouvert',
    creeLe: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Abonnement a la file des signalements, reserve a l'administration. La lecture
 * echoue pour toute autre personne et `onErreur` recoit le refus.
 */
export function suivreSignalements(
  cb: (signalements: Signalement[]) => void,
  onErreur?: (message: string) => void,
): () => void {
  return onSnapshot(
    // Sans tri, Firestore rend 300 documents dans l'ordre des identifiants et
    // les signalements recents passent a la trappe des que la file s'allonge.
    query(collection(db, 'signalements'), orderBy('creeLe', 'desc'), limit(LIMITE_SIGNALEMENTS)),
    (capture) => {
      const liste = capture.docs.map((d) => enSignalement(d.id, d.data() as Record<string, unknown>));
      cb(liste.sort(parNouveaute));
    },
    (erreur) => {
      if (onErreur) onErreur(erreur.message);
      else console.error('suivreSignalements', erreur);
    },
  );
}

/** Reserve a l'administration. */
export async function traiterSignalement(id: string, statut: StatutSignalement): Promise<void> {
  await updateDoc(doc(db, 'signalements', id), {
    statut: enStatut(statut),
    traiteLe: serverTimestamp(),
  });
}
