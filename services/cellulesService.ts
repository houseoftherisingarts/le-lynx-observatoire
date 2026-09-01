import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
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

/**
 * Cellules locales de l'Observatoire : les comites de quartier et les equipes
 * de travail de la lutte contre le projet La Loutre. Chaque cellule porte sa
 * file de demandes et son fil de discussion. Tout arrive en direct par
 * onSnapshot.
 *
 * Regle Firestore a respecter : une personne connectee qui n'est ni
 * l'administration ni le fondateur ne peut modifier que `membreUids` et
 * `nbMembres` sur le document de cellule. Toute autre cle fait refuser
 * l'ecriture.
 */

// --- Types ------------------------------------------------------------------

export interface Cellule {
  id: string;
  nom: string;
  municipalite: string;
  theme: string;
  description: string;
  fondateurUid: string;
  fondateurNom: string;
  membreUids: string[];
  nbMembres: number;
  ouverte: boolean;
  creeLe: Timestamp | null;
}

export type StatutDemande = 'attente' | 'acceptee' | 'refusee';

export interface DemandeCellule {
  id: string;
  uid: string;
  nom: string;
  mot: string;
  statut: StatutDemande;
  creeLe: Timestamp | null;
}

export interface MessageCellule {
  id: string;
  uid: string;
  nom: string;
  texte: string;
  creeLe: Timestamp | null;
}

/** Identite minimale d'une personne qui agit sur une cellule. */
export interface PersonneCellule {
  uid: string;
  nom: string;
}

/** Fiche affichable d'un membre, resolue depuis la collection `membres`. */
export interface FicheMembre {
  uid: string;
  nom: string;
  photo: string;
}

export interface NouvelleCellule {
  nom: string;
  municipalite: string;
  theme: string;
  description: string;
  ouverte: boolean;
}

// --- Longueurs maximales ----------------------------------------------------

export const MAX_NOM = 80;
export const MAX_ETIQUETTE = 60;
export const MAX_DESCRIPTION = 1000;
export const MAX_MOT = 500;
export const MAX_TEXTE = 2000;

const coupe = (valeur: string, max: number): string => valeur.trim().slice(0, max);

const mapDocs = <T>(snap: { docs: Array<{ id: string; data: () => unknown }> }): T[] =>
  snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];

// --- Liste des cellules -----------------------------------------------------

/** Abonnement a toutes les cellules, la plus recente en premier. */
export const suivreCellules = (
  onChange: (cellules: Cellule[]) => void,
  onError?: (e: unknown) => void
): (() => void) =>
  onSnapshot(
    query(collection(db, 'cellules'), orderBy('creeLe', 'desc'), limit(120)),
    (snap) => onChange(mapDocs<Cellule>(snap)),
    (e) => onError?.(e)
  );

/** Abonnement a une seule cellule. Rend null si elle a ete supprimee. */
export const suivreCellule = (
  celluleId: string,
  onChange: (cellule: Cellule | null) => void,
  onError?: (e: unknown) => void
): (() => void) =>
  onSnapshot(
    doc(db, 'cellules', celluleId),
    (snap) =>
      onChange(snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as Cellule) : null),
    (e) => onError?.(e)
  );

// --- Fonder, rejoindre, quitter ---------------------------------------------

/** Cree une cellule. Le fondateur en est le premier membre. */
export const creerCellule = async (
  fondateur: PersonneCellule,
  data: NouvelleCellule
): Promise<string> => {
  const nom = coupe(data.nom, MAX_NOM);
  if (nom.length < 2) throw new Error('nom-trop-court');

  const ref = await addDoc(collection(db, 'cellules'), {
    nom,
    municipalite: coupe(data.municipalite, MAX_ETIQUETTE),
    theme: coupe(data.theme, MAX_ETIQUETTE),
    description: coupe(data.description, MAX_DESCRIPTION),
    fondateurUid: fondateur.uid,
    fondateurNom: coupe(fondateur.nom, MAX_NOM) || 'Membre',
    membreUids: [fondateur.uid],
    nbMembres: 1,
    ouverte: data.ouverte,
    creeLe: serverTimestamp(),
  });
  return ref.id;
};

/**
 * Entree directe dans une cellule ouverte. Ne touche que `membreUids` et
 * `nbMembres`, les deux seules cles qu'un membre a le droit de modifier.
 */
export const rejoindreCellule = async (
  celluleId: string,
  uid: string,
  nbActuel: number
): Promise<void> => {
  await updateDoc(doc(db, 'cellules', celluleId), {
    membreUids: arrayUnion(uid),
    nbMembres: Math.max(0, nbActuel) + 1,
  });
};

/** Depose une demande d'acces sur une cellule fermee. */
export const demanderAcces = async (
  celluleId: string,
  personne: PersonneCellule,
  mot: string
): Promise<void> => {
  await setDoc(doc(db, 'cellules', celluleId, 'demandes', personne.uid), {
    uid: personne.uid,
    nom: coupe(personne.nom, MAX_NOM) || 'Membre',
    mot: coupe(mot, MAX_MOT),
    statut: 'attente' as StatutDemande,
    creeLe: serverTimestamp(),
  });
};

/** Sortie volontaire. La liste passee sert a recalculer le compte. */
export const quitterCellule = async (
  celluleId: string,
  uid: string,
  membreUids: string[]
): Promise<void> => {
  const restants = membreUids.filter((m) => m !== uid);
  await updateDoc(doc(db, 'cellules', celluleId), {
    membreUids: arrayRemove(uid),
    nbMembres: restants.length,
  });
};

// --- File des demandes ------------------------------------------------------

/** Abonnement aux demandes d'une cellule, la plus ancienne en premier. */
export const suivreDemandes = (
  celluleId: string,
  onChange: (demandes: DemandeCellule[]) => void,
  onError?: (e: unknown) => void
): (() => void) =>
  onSnapshot(
    query(collection(db, 'cellules', celluleId, 'demandes'), orderBy('creeLe', 'asc'), limit(200)),
    (snap) => onChange(mapDocs<DemandeCellule>(snap)),
    (e) => onError?.(e)
  );

/**
 * Reponse du fondateur ou de l'administration. Une acceptation ajoute la
 * personne aux membres, un refus marque seulement la demande.
 */
export const repondreDemande = async (
  celluleId: string,
  uid: string,
  accepte: boolean,
  membreUids: string[],
  nbActuel: number
): Promise<void> => {
  if (accepte && !membreUids.includes(uid)) {
    await updateDoc(doc(db, 'cellules', celluleId), {
      membreUids: arrayUnion(uid),
      nbMembres: Math.max(0, nbActuel) + 1,
    });
  }
  await updateDoc(doc(db, 'cellules', celluleId, 'demandes', uid), {
    statut: (accepte ? 'acceptee' : 'refusee') as StatutDemande,
  });
};

/** Retire une demande traitee de la file. */
export const effacerDemande = async (celluleId: string, uid: string): Promise<void> => {
  await deleteDoc(doc(db, 'cellules', celluleId, 'demandes', uid));
};

// --- Fil de discussion ------------------------------------------------------

export const suivreMessagesCellule = (
  celluleId: string,
  onChange: (messages: MessageCellule[]) => void,
  onError?: (e: unknown) => void
): (() => void) =>
  onSnapshot(
    query(collection(db, 'cellules', celluleId, 'messages'), orderBy('creeLe', 'asc'), limit(200)),
    (snap) => onChange(mapDocs<MessageCellule>(snap)),
    (e) => onError?.(e)
  );

export const envoyerDansCellule = async (
  celluleId: string,
  auteur: PersonneCellule,
  texte: string
): Promise<void> => {
  const propre = coupe(texte, MAX_TEXTE);
  if (!propre) return;
  await addDoc(collection(db, 'cellules', celluleId, 'messages'), {
    uid: auteur.uid,
    nom: coupe(auteur.nom, MAX_NOM) || 'Membre',
    texte: propre,
    creeLe: serverTimestamp(),
  });
};

// --- Noms des membres -------------------------------------------------------

/**
 * Resout les noms affichables depuis la fiche publique `membres`. La fiche
 * peut ne pas exister : le nom retombe alors sur une etiquette neutre.
 */
export const chargerMembres = async (uids: string[]): Promise<FicheMembre[]> => {
  const fiches = await Promise.all(
    uids.slice(0, 60).map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, 'membres', uid));
        const data = snap.exists() ? (snap.data() as { nom?: string; photo?: string }) : null;
        return { uid, nom: data?.nom || 'Membre', photo: data?.photo || '' };
      } catch {
        return { uid, nom: 'Membre', photo: '' };
      }
    })
  );
  return fiches;
};

/** Couleur d'avatar stable, derivee de l'identifiant. */
const TONS = [
  'bg-emerald-600',
  'bg-sky-600',
  'bg-amber-600',
  'bg-violet-600',
  'bg-rose-600',
  'bg-teal-600',
];

export const tonAvatar = (graine: string): string => {
  let somme = 0;
  for (let i = 0; i < graine.length; i += 1) somme += graine.charCodeAt(i);
  return TONS[somme % TONS.length];
};

export const initiales = (nom: string): string =>
  nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((mot) => mot.charAt(0).toUpperCase())
    .join('') || '?';
