import { getApp } from 'firebase/app';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';
import { db } from './firebaseConfig';
import type { UserProfile } from '../context/AuthContext';

/**
 * Fiches de membres et annuaire du reseau. Une fiche par personne, dans
 * `membres/{uid}`, lisible par tout membre connecte et ecrite par la personne
 * elle-meme. Le champ `verifie` appartient a l'administration.
 */

// --- Types ------------------------------------------------------------------

export interface MembreFiche {
  uid: string;
  nom: string;
  avatarUrl?: string;
  avatarHue: number;
  municipalite?: string;
  competences?: string[];
  engagement: number;
  devise?: string;
  roles: string[];
  verifie: boolean;
  depuis: Timestamp | null;
  maj: Timestamp | null;
}

export type ChampsFiche = Partial<
  Pick<
    MembreFiche,
    'nom' | 'avatarUrl' | 'avatarHue' | 'municipalite' | 'competences' | 'engagement' | 'devise' | 'roles'
  >
>;

export const MUNICIPALITES = [
  'Duhamel',
  'Chénéville',
  'Lac-des-Plages',
  'Namur',
  'Saint-Émile-de-Suffolk',
  'Ripon',
  'Lac-Simon',
  'Montpellier',
  'Papineauville',
  'Autre',
] as const;

export type Municipalite = (typeof MUNICIPALITES)[number];

// --- Longueurs maximales ----------------------------------------------------

const MAX_NOM = 120;
const MAX_MUNICIPALITE = 60;
const MAX_DEVISE = 160;
const MAX_COMPETENCE = 40;
const MAX_COMPETENCES = 12;
const MAX_ROLES = 6;
const MAX_ROLE = 40;
const MAX_URL = 600;
const LIMITE_ANNUAIRE = 200;
const AVATAR_MAX_OCTETS = 5 * 1024 * 1024;

// --- Petits outils ----------------------------------------------------------

const couper = (valeur: unknown, max: number): string =>
  typeof valeur === 'string' ? valeur.trim().slice(0, max) : '';

const borner = (valeur: unknown, min: number, max: number, defaut: number): number => {
  const n = typeof valeur === 'number' && Number.isFinite(valeur) ? Math.round(valeur) : defaut;
  return Math.min(max, Math.max(min, n));
};

const listeCourte = (valeur: unknown, maxItems: number, maxLen: number): string[] => {
  if (!Array.isArray(valeur)) return [];
  const vues = new Set<string>();
  const sortie: string[] = [];
  for (const brut of valeur) {
    const propre = couper(brut, maxLen);
    if (!propre || vues.has(propre.toLowerCase())) continue;
    vues.add(propre.toLowerCase());
    sortie.push(propre);
    if (sortie.length >= maxItems) break;
  }
  return sortie;
};

/** Teinte stable tiree du uid, pour que la banniere soit la meme partout. */
export const hueDepuisUid = (uid: string): number => {
  let somme = 0;
  for (let i = 0; i < uid.length; i += 1) somme = (somme * 31 + uid.charCodeAt(i)) % 360;
  return somme;
};

const enFiche = (uid: string, donnees: Record<string, unknown>): MembreFiche => ({
  uid,
  nom: couper(donnees.nom, MAX_NOM) || 'Membre',
  avatarUrl: couper(donnees.avatarUrl, MAX_URL) || undefined,
  avatarHue: borner(donnees.avatarHue, 0, 359, hueDepuisUid(uid)),
  municipalite: couper(donnees.municipalite, MAX_MUNICIPALITE) || undefined,
  competences: listeCourte(donnees.competences, MAX_COMPETENCES, MAX_COMPETENCE),
  engagement: borner(donnees.engagement, 1, 5, 1),
  devise: couper(donnees.devise, MAX_DEVISE) || undefined,
  roles: listeCourte(donnees.roles, MAX_ROLES, MAX_ROLE),
  verifie: donnees.verifie === true,
  depuis: donnees.depuis instanceof Timestamp ? donnees.depuis : null,
  maj: donnees.maj instanceof Timestamp ? donnees.maj : null,
});

// --- Lecture ----------------------------------------------------------------

/**
 * Cree la fiche au premier passage, a partir du profil du compte. Ne touche
 * a rien si la fiche existe deja.
 */
export async function assurerFicheMembre(profile: UserProfile): Promise<void> {
  const reference = doc(db, 'membres', profile.uid);
  const capture = await getDoc(reference);
  if (capture.exists()) return;

  const competencesProfil = couper(profile.skills, 400)
    .split(',')
    .map((morceau) => morceau.trim())
    .filter(Boolean);

  await setDoc(reference, {
    uid: profile.uid,
    nom: couper(profile.displayName, MAX_NOM) || 'Membre',
    avatarUrl: couper(profile.photoURL, MAX_URL),
    avatarHue: hueDepuisUid(profile.uid),
    municipalite: '',
    competences: listeCourte(competencesProfil, MAX_COMPETENCES, MAX_COMPETENCE),
    engagement: borner(profile.implicationLevel, 1, 5, 1),
    devise: '',
    roles: [],
    // `verifie` n'est jamais ecrit ici : la regle refuse toute ecriture du
    // navigateur qui touche ce champ, et l'absence vaut « pas verifie ».
    depuis: serverTimestamp(),
    maj: serverTimestamp(),
  });
}

/** Abonnement a une fiche. Rend la fonction de desabonnement. */
export function suivreMembre(
  uid: string,
  cb: (fiche: MembreFiche | null) => void,
  onErreur?: (message: string) => void,
): () => void {
  return onSnapshot(
    doc(db, 'membres', uid),
    (capture) => {
      cb(capture.exists() ? enFiche(capture.id, capture.data() as Record<string, unknown>) : null);
    },
    (erreur) => {
      if (onErreur) onErreur(erreur.message);
      else console.error('suivreMembre', erreur);
    },
  );
}

/** Abonnement a l'annuaire, 200 fiches au maximum. Rend le desabonnement. */
export function suivreAnnuaire(
  cb: (fiches: MembreFiche[]) => void,
  onErreur?: (message: string) => void,
): () => void {
  const requete = query(collection(db, 'membres'), orderBy('nom'), limit(LIMITE_ANNUAIRE));
  return onSnapshot(
    requete,
    (capture) => {
      cb(capture.docs.map((d) => enFiche(d.id, d.data() as Record<string, unknown>)));
    },
    (erreur) => {
      if (onErreur) onErreur(erreur.message);
      else console.error('suivreAnnuaire', erreur);
    },
  );
}

// --- Ecriture ---------------------------------------------------------------

/**
 * Met la fiche a jour. Valide et tronque chaque champ avant l'appel, et laisse
 * `verifie`, `uid` et `depuis` intouches.
 */
export async function majFicheMembre(uid: string, champs: ChampsFiche): Promise<void> {
  const propre: Record<string, unknown> = {};

  if ('nom' in champs) {
    const nom = couper(champs.nom, MAX_NOM);
    if (nom) propre.nom = nom;
  }
  if ('avatarUrl' in champs) propre.avatarUrl = couper(champs.avatarUrl, MAX_URL);
  if ('avatarHue' in champs) propre.avatarHue = borner(champs.avatarHue, 0, 359, hueDepuisUid(uid));
  if ('municipalite' in champs) propre.municipalite = couper(champs.municipalite, MAX_MUNICIPALITE);
  if ('devise' in champs) propre.devise = couper(champs.devise, MAX_DEVISE);
  if ('engagement' in champs) propre.engagement = borner(champs.engagement, 1, 5, 1);
  if ('competences' in champs) {
    propre.competences = listeCourte(champs.competences, MAX_COMPETENCES, MAX_COMPETENCE);
  }
  if ('roles' in champs) propre.roles = listeCourte(champs.roles, MAX_ROLES, MAX_ROLE);

  if (Object.keys(propre).length === 0) return;

  propre.maj = serverTimestamp();
  await updateDoc(doc(db, 'membres', uid), propre);
}

/**
 * Televerse la photo de profil dans Storage et inscrit son adresse dans la
 * fiche. Rend l'adresse de telechargement.
 */
export async function televerserAvatar(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error("Le fichier doit être une image.");
  }
  if (file.size > AVATAR_MAX_OCTETS) {
    throw new Error("L'image dépasse 5 Mo.");
  }

  const stockage = getStorage(getApp());
  const cible = storageRef(stockage, `membres/${uid}/avatar`);
  await uploadBytes(cible, file, { contentType: file.type });
  const url = await getDownloadURL(cible);
  await majFicheMembre(uid, { avatarUrl: url });
  return url;
}
