import {
  Timestamp,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Points d'engagement de l'Observatoire. Ils mesurent la contribution a la
 * lutte contre le projet La Loutre, et rien d'autre : aucune monnaie, aucune
 * recompense, aucun echange. Le total vit dans `engagement/{uid}`, le detail
 * dans la sous-collection `journal`. Tout membre connecte lit, seule
 * l'administration ecrit.
 */

// --- Types ------------------------------------------------------------------

export type CategorieEngagement = 'parole' | 'presence' | 'organisation' | 'preuve';

export interface CategorieInfo {
  cle: CategorieEngagement;
  fr: string;
  en: string;
}

export interface GesteBareme {
  cle: string;
  categorie: CategorieEngagement;
  points: number;
  fr: string;
  en: string;
}

export interface FicheEngagement {
  uid: string;
  nom: string;
  total: number;
  parCategorie: Record<string, number>;
  maj: Timestamp | null;
}

export interface EntreeJournal {
  id: string;
  motif: string;
  points: number;
  detail?: string;
  creeLe: Timestamp | null;
}

// --- Le bareme --------------------------------------------------------------

export const CATEGORIES: CategorieInfo[] = [
  { cle: 'parole', fr: 'Prendre la parole', en: 'Speaking up' },
  { cle: 'presence', fr: 'Être présent', en: 'Showing up' },
  { cle: 'organisation', fr: 'Organiser le réseau', en: 'Organizing the network' },
  { cle: 'preuve', fr: 'Documenter la lutte', en: 'Documenting the fight' },
];

/**
 * Les gestes qui comptent dans cette lutte, et ce qu'ils valent. Un geste qui
 * coute du temps et du courage vaut davantage qu'un geste qui coute un clic.
 */
export const BAREME: GesteBareme[] = [
  {
    cle: 'mur_publication',
    categorie: 'parole',
    points: 3,
    fr: 'Publier sur le mur',
    en: 'Post on the wall',
  },
  {
    cle: 'mur_commentaire',
    categorie: 'parole',
    points: 1,
    fr: 'Commenter une publication',
    en: 'Comment on a post',
  },
  {
    cle: 'question_posee',
    categorie: 'parole',
    points: 4,
    fr: 'Poser une question à une assemblée',
    en: 'Ask a question at an assembly',
  },
  {
    cle: 'presence_confirmee',
    categorie: 'presence',
    points: 2,
    fr: 'Confirmer une présence à un rendez-vous',
    en: 'Confirm attendance at a meeting',
  },
  {
    cle: 'presence_tenue',
    categorie: 'presence',
    points: 8,
    fr: 'Se présenter au rendez-vous',
    en: 'Show up at the meeting',
  },
  {
    cle: 'cellule_fondee',
    categorie: 'organisation',
    points: 25,
    fr: 'Fonder une cellule locale',
    en: 'Found a local cell',
  },
  {
    cle: 'personne_amenee',
    categorie: 'organisation',
    points: 10,
    fr: 'Amener une personne dans le réseau',
    en: 'Bring someone into the network',
  },
  {
    cle: 'photo_retenue',
    categorie: 'preuve',
    points: 5,
    fr: 'Déposer une photo retenue',
    en: 'Contribute a photo that gets published',
  },
  {
    cle: 'projet_signale',
    categorie: 'preuve',
    points: 15,
    fr: 'Signaler un autre projet minier',
    en: 'Report another mining project',
  },
];

const PAR_CLE = new Map<string, GesteBareme>(BAREME.map((geste) => [geste.cle, geste]));

/** Le libelle du geste dans la langue demandee. Rend la cle si elle est inconnue. */
export const libelleMotif = (motif: string, language: 'fr' | 'en' | 'ani'): string => {
  const geste = PAR_CLE.get(motif);
  if (!geste) return motif;
  return language === 'fr' ? geste.fr : geste.en;
};

/** La categorie du geste, ou `parole` quand le motif n'est pas au bareme. */
export const categorieDuMotif = (motif: string): CategorieEngagement =>
  PAR_CLE.get(motif)?.categorie ?? 'parole';

// --- Longueurs et bornes ----------------------------------------------------

const MAX_NOM = 120;
const MAX_MOTIF = 60;
const MAX_DETAIL = 300;
export const POINTS_MIN = -500;
export const POINTS_MAX = 500;
const LIMITE_CLASSEMENT = 100;
const LIMITE_JOURNAL = 100;

const couper = (valeur: unknown, max: number): string =>
  typeof valeur === 'string' ? valeur.trim().slice(0, max) : '';

const nombre = (valeur: unknown): number =>
  typeof valeur === 'number' && Number.isFinite(valeur) ? Math.round(valeur) : 0;

const enCategories = (valeur: unknown): Record<string, number> => {
  const sortie: Record<string, number> = {};
  if (!valeur || typeof valeur !== 'object') return sortie;
  for (const info of CATEGORIES) {
    const brut = (valeur as Record<string, unknown>)[info.cle];
    const compte = nombre(brut);
    if (compte !== 0) sortie[info.cle] = compte;
  }
  return sortie;
};

const enFiche = (uid: string, donnees: Record<string, unknown>): FicheEngagement => ({
  uid,
  nom: couper(donnees.nom, MAX_NOM) || 'Membre',
  total: nombre(donnees.total),
  parCategorie: enCategories(donnees.parCategorie),
  maj: donnees.maj instanceof Timestamp ? donnees.maj : null,
});

const enEntree = (id: string, donnees: Record<string, unknown>): EntreeJournal => ({
  id,
  motif: couper(donnees.motif, MAX_MOTIF),
  points: nombre(donnees.points),
  detail: couper(donnees.detail, MAX_DETAIL) || undefined,
  creeLe: donnees.creeLe instanceof Timestamp ? donnees.creeLe : null,
});

// --- Lecture ----------------------------------------------------------------

/** Abonnement au total d'une personne. Rend la fonction de desabonnement. */
export function suivreMonEngagement(
  uid: string,
  cb: (fiche: FicheEngagement | null) => void,
  onErreur?: (message: string) => void,
): () => void {
  return onSnapshot(
    doc(db, 'engagement', uid),
    (capture) => {
      cb(capture.exists() ? enFiche(capture.id, capture.data() as Record<string, unknown>) : null);
    },
    (erreur) => {
      if (onErreur) onErreur(erreur.message);
      else console.error('suivreMonEngagement', erreur);
    },
  );
}

/** Abonnement au classement, du plus grand total au plus petit. */
export function suivreClassement(
  cb: (classement: FicheEngagement[]) => void,
  max: number = LIMITE_CLASSEMENT,
  onErreur?: (message: string) => void,
): () => void {
  const taille = Math.min(LIMITE_CLASSEMENT, Math.max(1, Math.round(max)));
  const requete = query(collection(db, 'engagement'), orderBy('total', 'desc'), limit(taille));
  return onSnapshot(
    requete,
    (capture) => {
      cb(capture.docs.map((d) => enFiche(d.id, d.data() as Record<string, unknown>)));
    },
    (erreur) => {
      if (onErreur) onErreur(erreur.message);
      else console.error('suivreClassement', erreur);
    },
  );
}

/** Abonnement au journal d'une personne, du plus recent au plus ancien. */
export function suivreJournal(
  uid: string,
  cb: (entrees: EntreeJournal[]) => void,
  onErreur?: (message: string) => void,
): () => void {
  const requete = query(
    collection(db, 'engagement', uid, 'journal'),
    orderBy('creeLe', 'desc'),
    limit(LIMITE_JOURNAL),
  );
  return onSnapshot(
    requete,
    (capture) => {
      cb(capture.docs.map((d) => enEntree(d.id, d.data() as Record<string, unknown>)));
    },
    (erreur) => {
      if (onErreur) onErreur(erreur.message);
      else console.error('suivreJournal', erreur);
    },
  );
}

/** Le rang d'une personne dans un classement deja trie. Rend 0 si elle est absente. */
export const rangDe = (uid: string, classement: FicheEngagement[]): number =>
  classement.findIndex((fiche) => fiche.uid === uid) + 1;

// --- Ecriture (administration seulement) ------------------------------------

/**
 * Accorde des points a une personne : une ligne au journal, le total et la
 * categorie qui montent par `increment`, le tout dans un seul lot. La regle
 * Firestore refuse cet appel a quiconque n'est pas administrateur.
 *
 * Les refus partent en code (`points/motif`, `points/bornes`...) plutot qu'en
 * phrase : l'ecran les traduit dans la langue de la personne qui regarde.
 */
export async function accorderPoints(
  uid: string,
  nom: string,
  motif: string,
  points: number,
  detail?: string,
): Promise<void> {
  const cible = couper(uid, 128);
  if (!cible) throw new Error('points/cible');

  const motifPropre = couper(motif, MAX_MOTIF);
  if (!PAR_CLE.has(motifPropre)) throw new Error('points/motif');

  const valeur = nombre(points);
  if (valeur === 0) throw new Error('points/zero');
  if (valeur < POINTS_MIN || valeur > POINTS_MAX) throw new Error('points/bornes');

  const detailPropre = couper(detail, MAX_DETAIL);
  const categorie = categorieDuMotif(motifPropre);
  const fiche = doc(db, 'engagement', cible);
  const entree = doc(collection(fiche, 'journal'));

  // Un seul lot : un total qui monte sans sa ligne au journal serait un point
  // que plus personne ne peut expliquer.
  const lot = writeBatch(db);
  lot.set(entree, {
    motif: motifPropre,
    points: valeur,
    detail: detailPropre,
    creeLe: serverTimestamp(),
  });
  lot.set(
    fiche,
    {
      uid: cible,
      nom: couper(nom, MAX_NOM) || 'Membre',
      total: increment(valeur),
      parCategorie: { [categorie]: increment(valeur) },
      maj: serverTimestamp(),
    },
    { merge: true },
  );
  await lot.commit();
}
