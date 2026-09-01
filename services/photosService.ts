import { getApp } from 'firebase/app';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { db } from './firebaseConfig';

/**
 * La galerie des membres. Une photo deposee attend une relecture : elle nait
 * au statut 'attente', l'administration l'approuve ou la refuse. Les regles
 * Firestore refusent une lecture publique qui ne filtre pas sur 'approuvee',
 * donc chaque abonnement porte son filtre.
 */

// --- Types ------------------------------------------------------------------

export type StatutPhoto = 'attente' | 'approuvee' | 'refusee';

export interface Photo {
  id: string;
  uid: string;
  nomMembre: string;
  url: string;
  chemin: string;
  largeur?: number;
  hauteur?: number;
  legende: string;
  lieu?: string;
  statut: StatutPhoto;
  creeLe: Timestamp | null;
  majLe: Timestamp | null;
}

export const LONGUEUR_MAX_LEGENDE = 300;
export const LONGUEUR_MAX_LIEU = 120;
export const TAILLE_MAX_MO = 10;

// --- Aide -------------------------------------------------------------------

const mapDocs = (snap: {
  docs: Array<{ id: string; data: () => unknown }>;
}): Photo[] => snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Photo[];

const msDe = (photo: Photo): number => photo.creeLe?.toMillis?.() ?? 0;

/** Les plus recentes d'abord. Le tri se fait ici pour ne demander aucun index. */
const recentesDAbord = (photos: Photo[]): Photo[] =>
  [...photos].sort((a, b) => msDe(b) - msDe(a));

const suivreFiltre = (
  contrainte: ReturnType<typeof where>,
  cb: (photos: Photo[]) => void,
  onError?: (e: unknown) => void,
  max = 300
): (() => void) =>
  onSnapshot(
    query(collection(db, 'photos'), contrainte, limit(max)),
    (snap) => cb(recentesDAbord(mapDocs(snap))),
    (e) => onError?.(e)
  );

// --- Lecture ----------------------------------------------------------------

/** La galerie publique : uniquement ce que l'administration a approuve. */
export const suivrePhotosApprouvees = (
  cb: (photos: Photo[]) => void,
  onError?: (e: unknown) => void
): (() => void) => suivreFiltre(where('statut', '==', 'approuvee'), cb, onError);

/** Mes depots, tous statuts confondus. */
export const suivreMesPhotos = (
  uid: string,
  cb: (photos: Photo[]) => void,
  onError?: (e: unknown) => void
): (() => void) => suivreFiltre(where('uid', '==', uid), cb, onError, 200);

/** La file de relecture, reservee a l'administration. */
export const suivreFileModeration = (
  cb: (photos: Photo[]) => void,
  onError?: (e: unknown) => void
): (() => void) => suivreFiltre(where('statut', '==', 'attente'), cb, onError, 200);

// --- Dimensions -------------------------------------------------------------

/** Lit la taille de l'image dans le navigateur, avant l'envoi. */
export const lireDimensions = (
  file: File
): Promise<{ largeur: number; hauteur: number }> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ largeur: image.naturalWidth, hauteur: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ largeur: 0, hauteur: 0 });
    };
    image.src = url;
  });

// --- Ecriture ---------------------------------------------------------------

/**
 * Envoie le fichier dans Storage sous photos/{uid}/{horodatage}-{nom}, puis
 * cree le document au statut 'attente'. Rend l'identifiant du document.
 */
export const televerserPhoto = async (
  uid: string,
  nomMembre: string,
  file: File,
  legende: string,
  lieu?: string,
  onProgression?: (pourcent: number) => void
): Promise<string> => {
  if (!file.type.startsWith('image/')) throw new Error("Ce fichier n'est pas une image.");
  if (file.size > TAILLE_MAX_MO * 1024 * 1024) {
    throw new Error(`Cette image dépasse ${TAILLE_MAX_MO} Mo.`);
  }

  const { largeur, hauteur } = await lireDimensions(file);

  const nomPropre = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60) || 'photo.jpg';
  const chemin = `photos/${uid}/${Date.now()}-${nomPropre}`;
  const cible = ref(getStorage(getApp()), chemin);

  const tache = uploadBytesResumable(cible, file, { contentType: file.type });
  await new Promise<void>((resolve, reject) => {
    tache.on(
      'state_changed',
      (snap) => {
        const total = snap.totalBytes || 1;
        onProgression?.(Math.round((snap.bytesTransferred / total) * 100));
      },
      reject,
      () => resolve()
    );
  });

  const url = await getDownloadURL(cible);

  const reference = await addDoc(collection(db, 'photos'), {
    uid,
    nomMembre: nomMembre.trim().slice(0, 120) || 'Membre',
    url,
    chemin,
    largeur,
    hauteur,
    legende: legende.trim().slice(0, LONGUEUR_MAX_LEGENDE),
    lieu: (lieu || '').trim().slice(0, LONGUEUR_MAX_LIEU),
    statut: 'attente' as StatutPhoto,
    creeLe: serverTimestamp(),
    majLe: serverTimestamp(),
  });
  return reference.id;
};

/** Reserve a l'administration : les regles Firestore refusent le reste. */
export const changerStatutPhoto = async (
  id: string,
  statut: StatutPhoto
): Promise<void> => {
  await updateDoc(doc(db, 'photos', id), { statut, majLe: serverTimestamp() });
};

/** Efface le document et le fichier. Un fichier deja disparu ne bloque rien. */
export const supprimerPhoto = async (id: string, chemin: string): Promise<void> => {
  await deleteDoc(doc(db, 'photos', id));
  if (!chemin) return;
  try {
    await deleteObject(ref(getStorage(getApp()), chemin));
  } catch {
    /* le fichier n'existe plus, le document est parti, c'est suffisant */
  }
};
