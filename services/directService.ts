import {
  Timestamp,
  Unsubscribe,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Le direct en cours, un seul a la fois.
 * Document touche : directs/actuel. Lecture publique, ecriture reservee a
 * l'administration.
 */

// --- Types ------------------------------------------------------------------

export type PlateformeDirect = 'youtube' | 'facebook' | 'zoom' | 'autre';

export const PLATEFORMES: PlateformeDirect[] = ['youtube', 'facebook', 'zoom', 'autre'];

export interface Direct {
  actif: boolean;
  titre: string;
  sousTitre: string;
  url: string;
  plateforme: PlateformeDirect;
  lieu: string;
  /** Debut annonce, en millisecondes depuis epoch. Zero quand rien n'est annonce. */
  debuteA: number;
  majLe: Timestamp | null;
  parNom: string;
}

/** Champs saisis dans le formulaire d'administration. */
export interface DonneesDirect {
  titre: string;
  sousTitre?: string;
  url?: string;
  lieu?: string;
  debuteA?: number;
}

export interface Personne {
  uid: string;
  nom: string;
}

// --- Limites et nettoyage ---------------------------------------------------

const MAX = {
  titre: 140,
  sousTitre: 200,
  url: 600,
  lieu: 160,
  nom: 120,
};

const REF_DIRECT = () => doc(db, 'directs', 'actuel');

const couper = (valeur: unknown, max: number): string =>
  String(valeur ?? '').trim().slice(0, max);

/** N'accepte qu'une adresse http ou https. Tout le reste devient une chaine vide. */
export const adresseSure = (valeur: unknown): string => {
  const brut = couper(valeur, MAX.url);
  if (!brut) return '';
  try {
    const parsee = new URL(brut);
    return parsee.protocol === 'http:' || parsee.protocol === 'https:' ? brut : '';
  } catch {
    return '';
  }
};

/** La plateforme se devine a partir de l'adresse, personne n'a a la saisir. */
export const devinerPlateforme = (url: string): PlateformeDirect => {
  const adresse = url.toLowerCase();
  if (adresse.includes('youtube.') || adresse.includes('youtu.be')) return 'youtube';
  if (adresse.includes('facebook.') || adresse.includes('fb.watch')) return 'facebook';
  if (adresse.includes('zoom.us') || adresse.includes('zoom.com')) return 'zoom';
  return 'autre';
};

const horodatage = (valeur: unknown): number => {
  const nombre = Number(valeur);
  return Number.isFinite(nombre) && nombre > 0 ? Math.round(nombre) : 0;
};

const estPlateforme = (valeur: unknown): valeur is PlateformeDirect =>
  PLATEFORMES.includes(valeur as PlateformeDirect);

export const DIRECT_VIDE: Direct = {
  actif: false,
  titre: '',
  sousTitre: '',
  url: '',
  plateforme: 'autre',
  lieu: '',
  debuteA: 0,
  majLe: null,
  parNom: '',
};

// --- Lecture ----------------------------------------------------------------

/** Abonnement au direct. Rend `null` tant qu'aucun direct n'a jamais ete ouvert. */
export const suivreDirect = (
  cb: (direct: Direct | null) => void,
  onErreur?: (e: unknown) => void
): Unsubscribe =>
  onSnapshot(
    REF_DIRECT(),
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      const brut = snap.data() as Partial<Direct>;
      cb({
        actif: brut.actif === true,
        titre: couper(brut.titre, MAX.titre),
        sousTitre: couper(brut.sousTitre, MAX.sousTitre),
        url: adresseSure(brut.url),
        plateforme: estPlateforme(brut.plateforme) ? brut.plateforme : 'autre',
        lieu: couper(brut.lieu, MAX.lieu),
        debuteA: horodatage(brut.debuteA),
        majLe: (brut.majLe as Timestamp) ?? null,
        parNom: couper(brut.parNom, MAX.nom),
      });
    },
    (e) => onErreur?.(e)
  );

// --- Ecriture (administration seulement) ------------------------------------

/** Ouvre le direct : ecrit le document au complet et met `actif` a vrai. */
export const ouvrirDirect = async (
  admin: Personne,
  data: DonneesDirect
): Promise<void> => {
  const titre = couper(data.titre, MAX.titre);
  if (!titre) throw new Error('Le titre est obligatoire.');
  const url = adresseSure(data.url);
  await setDoc(REF_DIRECT(), {
    actif: true,
    titre,
    sousTitre: couper(data.sousTitre, MAX.sousTitre),
    url,
    plateforme: devinerPlateforme(url),
    lieu: couper(data.lieu, MAX.lieu),
    debuteA: horodatage(data.debuteA),
    majLe: Timestamp.now(),
    parNom: couper(admin.nom, MAX.nom),
  });
};

/** Ferme le direct sans effacer ce qui a ete annonce. */
export const fermerDirect = async (): Promise<void> => {
  await setDoc(REF_DIRECT(), { actif: false, majLe: Timestamp.now() }, { merge: true });
};

/** Retouche un ou plusieurs champs pendant que le direct roule. */
export const majDirect = async (champs: Partial<DonneesDirect>): Promise<void> => {
  const patch: Record<string, string | number | Timestamp> = {};
  if (champs.titre !== undefined) {
    const titre = couper(champs.titre, MAX.titre);
    if (!titre) throw new Error('Le titre est obligatoire.');
    patch.titre = titre;
  }
  if (champs.sousTitre !== undefined)
    patch.sousTitre = couper(champs.sousTitre, MAX.sousTitre);
  if (champs.lieu !== undefined) patch.lieu = couper(champs.lieu, MAX.lieu);
  if (champs.url !== undefined) {
    const url = adresseSure(champs.url);
    patch.url = url;
    patch.plateforme = devinerPlateforme(url);
  }
  if (champs.debuteA !== undefined) patch.debuteA = horodatage(champs.debuteA);
  if (Object.keys(patch).length === 0) return;
  patch.majLe = Timestamp.now();
  await setDoc(REF_DIRECT(), patch, { merge: true });
};
