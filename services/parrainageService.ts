import {
  Timestamp,
  arrayUnion,
  doc,
  getDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { UserProfile } from '../context/AuthContext';

/**
 * Parrainage de l'Observatoire. Chaque membre porte un code de six caracteres
 * qui vit dans `codesParrain/{CODE}` pour garantir l'unicite, et une fiche
 * `parrainages/{uid}` qui garde le code, le parrain eventuel et la liste des
 * personnes amenees.
 *
 * Rien n'est calcule ailleurs que dans Firestore : la fiche du parrain est
 * mise a jour au moment ou le filleul reclame le code, avec arrayUnion pour
 * que deux reclamations simultanees ne s'ecrasent pas.
 */

// --- Types ------------------------------------------------------------------

export interface Filleul {
  uid: string;
  nom: string;
  depuis: Timestamp | null;
}

export interface FicheParrainage {
  uid: string;
  nom: string;
  code: string;
  parrainUid?: string;
  parrainNom?: string;
  filleuls: Filleul[];
  nbFilleuls: number;
  creeLe: Timestamp | null;
  maj: Timestamp | null;
}

// --- Constantes -------------------------------------------------------------

/** Alphabet sans caractere ambigu : ni I, ni O, ni zero, ni un. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const LONGUEUR_CODE = 6;

const MAX_NOM = 120;
const MAX_FILLEULS_AFFICHES = 200;
const ESSAIS_CODE = 6;
const CLE_LOCALE = 'lynx:codeParrain';
const BASE_INVITATION = 'https://lelynx.ca/';

// --- Petits outils ----------------------------------------------------------

const couper = (valeur: unknown, max: number): string =>
  typeof valeur === 'string' ? valeur.trim().slice(0, max) : '';

/** Ramene une saisie a la forme canonique du code, ou rend une chaine vide. */
export const normaliserCode = (valeur: unknown): string => {
  if (typeof valeur !== 'string') return '';
  const propre = valeur
    .toUpperCase()
    .split('')
    .filter((c) => ALPHABET.includes(c))
    .join('');
  return propre.length === LONGUEUR_CODE ? propre : '';
};

const tirerCode = (): string => {
  const valeurs = new Uint32Array(LONGUEUR_CODE);
  crypto.getRandomValues(valeurs);
  let code = '';
  for (let i = 0; i < LONGUEUR_CODE; i += 1) {
    code += ALPHABET[valeurs[i] % ALPHABET.length];
  }
  return code;
};

const enFilleul = (valeur: unknown): Filleul | null => {
  if (typeof valeur !== 'object' || valeur === null) return null;
  const brut = valeur as Record<string, unknown>;
  const uid = couper(brut.uid, 128);
  if (!uid) return null;
  return {
    uid,
    nom: couper(brut.nom, MAX_NOM) || 'Membre',
    depuis: brut.depuis instanceof Timestamp ? brut.depuis : null,
  };
};

const enFiche = (uid: string, donnees: Record<string, unknown>): FicheParrainage => {
  const bruts = Array.isArray(donnees.filleuls) ? donnees.filleuls : [];
  const filleuls: Filleul[] = [];
  for (const brut of bruts) {
    const filleul = enFilleul(brut);
    if (filleul) filleuls.push(filleul);
    if (filleuls.length >= MAX_FILLEULS_AFFICHES) break;
  }

  const nbBrut = donnees.nbFilleuls;
  const parrainUid = couper(donnees.parrainUid, 128);

  return {
    uid,
    nom: couper(donnees.nom, MAX_NOM) || 'Membre',
    code: normaliserCode(donnees.code),
    parrainUid: parrainUid || undefined,
    parrainNom: parrainUid ? couper(donnees.parrainNom, MAX_NOM) || 'Membre' : undefined,
    filleuls,
    nbFilleuls: typeof nbBrut === 'number' && nbBrut >= 0 ? Math.floor(nbBrut) : filleuls.length,
    creeLe: donnees.creeLe instanceof Timestamp ? donnees.creeLe : null,
    maj: donnees.maj instanceof Timestamp ? donnees.maj : null,
  };
};

// --- Le code du membre ------------------------------------------------------

/**
 * Rend la fiche de parrainage du membre, et la cree au premier passage.
 * Le code est reserve dans `codesParrain/{CODE}` avant d'etre inscrit dans la
 * fiche, ce qui garantit qu'aucune autre personne ne porte le meme.
 */
export async function assurerCode(profile: UserProfile): Promise<FicheParrainage> {
  const nom = couper(profile.displayName, MAX_NOM) || 'Membre';
  const reference = doc(db, 'parrainages', profile.uid);
  const capture = await getDoc(reference);

  if (capture.exists()) {
    const fiche = enFiche(profile.uid, capture.data() as Record<string, unknown>);
    if (fiche.code) return fiche;
  }

  let code = '';
  for (let essai = 0; essai < ESSAIS_CODE && !code; essai += 1) {
    const candidat = tirerCode();
    const casier = doc(db, 'codesParrain', candidat);
    // Le document sert de table d'unicite : la regle n'autorise que la
    // creation, alors une collision fait echouer l'ecriture et on retire.
    if ((await getDoc(casier)).exists()) continue;
    try {
      await setDoc(casier, {
        code: candidat,
        uid: profile.uid,
        nom,
        creeLe: serverTimestamp(),
      });
      code = candidat;
    } catch {
      code = '';
    }
  }

  if (!code) {
    throw new Error("Le code n'a pas pu être créé. Rechargez la page et reprenez.");
  }

  await setDoc(
    reference,
    {
      uid: profile.uid,
      nom,
      code,
      filleuls: [],
      nbFilleuls: 0,
      creeLe: serverTimestamp(),
      maj: serverTimestamp(),
    },
    { merge: true },
  );

  const relue = await getDoc(reference);
  return enFiche(profile.uid, (relue.data() ?? {}) as Record<string, unknown>);
}

/** Abonnement a ma fiche de parrainage. Rend la fonction de desabonnement. */
export function suivreMonParrainage(
  uid: string,
  cb: (fiche: FicheParrainage | null) => void,
  onErreur?: (message: string) => void,
): () => void {
  return onSnapshot(
    doc(db, 'parrainages', uid),
    (capture) => {
      cb(capture.exists() ? enFiche(capture.id, capture.data() as Record<string, unknown>) : null);
    },
    (erreur) => {
      if (onErreur) onErreur(erreur.message);
      else console.error('suivreMonParrainage', erreur);
    },
  );
}

// --- Reclamer un parrain ----------------------------------------------------

/**
 * Inscrit le porteur du code comme parrain, puis ajoute la personne a la liste
 * de ses filleuls. Refuse un code inconnu, son propre code, et toute deuxieme
 * reclamation.
 */
export async function reclamerParrain(code: string, moi: UserProfile): Promise<void> {
  const propre = normaliserCode(code);
  if (!propre) {
    throw new Error('Un code compte six caractères. Vérifiez celui que vous avez reçu.');
  }

  const casier = await getDoc(doc(db, 'codesParrain', propre));
  if (!casier.exists()) {
    throw new Error("Ce code n'existe pas dans le réseau.");
  }

  const donnees = casier.data() as Record<string, unknown>;
  const parrainUid = couper(donnees.uid, 128);
  const parrainNom = couper(donnees.nom, MAX_NOM) || 'Membre';

  if (!parrainUid) {
    throw new Error("Ce code n'est rattaché à personne.");
  }
  if (parrainUid === moi.uid) {
    throw new Error('Ce code est le vôtre. Envoyez-le à quelqu’un d’autre.');
  }

  const mienne = await assurerCode(moi);
  if (mienne.parrainUid) {
    throw new Error('Vous avez déjà un parrain, et cela ne se change pas.');
  }

  await updateDoc(doc(db, 'parrainages', moi.uid), {
    parrainUid,
    parrainNom,
    maj: serverTimestamp(),
  });

  // `depuis` est une estampille du navigateur : Firestore refuse
  // serverTimestamp() a l'interieur d'un element de tableau.
  await updateDoc(doc(db, 'parrainages', parrainUid), {
    filleuls: arrayUnion({
      uid: moi.uid,
      nom: couper(moi.displayName, MAX_NOM) || 'Membre',
      depuis: Timestamp.now(),
    }),
    nbFilleuls: increment(1),
    maj: serverTimestamp(),
  });
}

// --- Le lien d'invitation ---------------------------------------------------

/** Adresse a partager, du genre https://lelynx.ca/?p=ABC234 */
export const lienInvitation = (code: string): string => {
  const propre = normaliserCode(code);
  return propre ? `${BASE_INVITATION}?p=${propre}` : BASE_INVITATION;
};

/**
 * Lit le parametre `p` de l'adresse courante, le garde dans le navigateur et
 * le rend. Sans parametre, rend ce qui avait ete garde lors d'une visite
 * precedente. Le stockage local peut etre bloque, alors chaque acces est
 * entoure d'un try/catch.
 */
export const codeDepuisUrl = (): string => {
  let depuisUrl = '';
  try {
    depuisUrl = normaliserCode(new URLSearchParams(window.location.search).get('p'));
  } catch {
    depuisUrl = '';
  }

  if (depuisUrl) {
    try {
      window.localStorage.setItem(CLE_LOCALE, depuisUrl);
    } catch {
      // Navigation privee ou stockage refuse : le code reste valable pour la visite.
    }
    return depuisUrl;
  }

  try {
    return normaliserCode(window.localStorage.getItem(CLE_LOCALE));
  } catch {
    return '';
  }
};

/** Efface le code garde, une fois le parrain inscrit. */
export const oublierCodeGarde = (): void => {
  try {
    window.localStorage.removeItem(CLE_LOCALE);
  } catch {
    // Rien a faire : le code garde n'est qu'une commodite.
  }
};
