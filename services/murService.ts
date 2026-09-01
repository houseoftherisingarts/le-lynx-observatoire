import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { db } from './firebaseConfig';

/**
 * Le Mur est la place publique de l'Observatoire. Chaque membre y depose un
 * billet, le fait monter ou descendre par son vote, et repond aux autres.
 * Le navigateur n'ecrit jamais les compteurs : il pose son propre document de
 * vote et son propre commentaire, et une fonction serveur recompte le total.
 */

// --- Types ------------------------------------------------------------------

export interface BilletMur {
  id: string;
  uid: string;
  nom: string;
  avatarUrl?: string;
  texte: string;
  photoUrl?: string;
  fil: string;
  pour: number;
  contre: number;
  score: number;
  chaleur: number;
  nbCommentaires: number;
  epingle: boolean;
  officiel: boolean;
  creeLe: Timestamp | null;
}

export interface CommentaireMur {
  id: string;
  uid: string;
  nom: string;
  avatarUrl?: string;
  texte: string;
  creeLe: Timestamp | null;
}

export interface AuteurMur {
  uid: string;
  nom: string;
  avatarUrl?: string;
}

export type ValeurVote = 1 | -1;
export type MesVotes = Record<string, ValeurVote>;

export const FIL_PAR_DEFAUT = 'place-publique';
export const LONGUEUR_MAX_BILLET = 4000;
export const LONGUEUR_MAX_COMMENTAIRE = 2000;

// --- Chaleur ----------------------------------------------------------------

const DEMI_VIE = 45000;

export const calculerChaleur = (score: number, creeLeMs: number) =>
  Math.log10(Math.max(Math.abs(score), 1)) * Math.sign(score) + creeLeMs / 1000 / DEMI_VIE;

// --- Aide -------------------------------------------------------------------

const mapDocs = <T>(snap: { docs: Array<{ id: string; data: () => unknown }> }): T[] =>
  snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];

/** Epingles d'abord, puis les billets officiels, puis la chaleur. */
const ordonner = (billets: BilletMur[]): BilletMur[] =>
  [...billets].sort((a, b) => {
    if (a.epingle !== b.epingle) return a.epingle ? -1 : 1;
    if (a.officiel !== b.officiel) return a.officiel ? -1 : 1;
    return (b.chaleur || 0) - (a.chaleur || 0);
  });

// --- Lecture ----------------------------------------------------------------

/**
 * Suit un fil du mur en direct. La requete filtree demande un index composite
 * (fil, chaleur) ; s'il manque, on retombe sur un tri par chaleur seule et le
 * filtre se fait ici, pour que la page reste vivante.
 */
export const suivreLeMur = (
  fil: string,
  cb: (billets: BilletMur[]) => void,
  max = 100,
  onError?: (e: unknown) => void
): (() => void) => {
  let desabonnerSecours: (() => void) | null = null;
  let ferme = false;

  const secours = () =>
    onSnapshot(
      query(collection(db, 'mur'), orderBy('chaleur', 'desc'), limit(max * 3)),
      (snap) => cb(ordonner(mapDocs<BilletMur>(snap).filter((b) => b.fil === fil)).slice(0, max)),
      (e) => onError?.(e)
    );

  const desabonner = onSnapshot(
    query(collection(db, 'mur'), where('fil', '==', fil), orderBy('chaleur', 'desc'), limit(max)),
    (snap) => cb(ordonner(mapDocs<BilletMur>(snap))),
    (e) => {
      if ((e as { code?: string }).code === 'failed-precondition' && !desabonnerSecours) {
        // L'index composite (fil, chaleur) manque : on retombe sur la chaleur seule.
        if (!ferme) desabonnerSecours = secours();
        return;
      }
      onError?.(e);
    }
  );

  return () => {
    ferme = true;
    desabonner();
    desabonnerSecours?.();
    desabonnerSecours = null;
  };
};

/** Mes votes, tous fils confondus, sous la forme { postId: 1 | -1 }. */
export const suivreMesVotes = (
  uid: string,
  cb: (votes: MesVotes) => void,
  onError?: (e: unknown) => void
): (() => void) =>
  onSnapshot(
    query(collectionGroup(db, 'votes'), where('uid', '==', uid)),
    (snap) => {
      const votes: MesVotes = {};
      snap.docs.forEach((d) => {
        const postId = d.ref.parent.parent?.id;
        const valeur = (d.data() as { valeur?: number }).valeur;
        if (postId && (valeur === 1 || valeur === -1)) votes[postId] = valeur;
      });
      cb(votes);
    },
    (e) => {
      if ((e as { code?: string }).code === 'failed-precondition') {
        console.warn(
          "Le Mur n'a pas pu lire vos votes : il manque l'index de groupe " +
            'sur le champ uid de la collection votes (queryScope COLLECTION_GROUP).'
        );
      }
      onError?.(e);
    }
  );

export const suivreCommentaires = (
  postId: string,
  cb: (commentaires: CommentaireMur[]) => void,
  onError?: (e: unknown) => void
): (() => void) =>
  onSnapshot(
    query(collection(db, 'mur', postId, 'commentaires'), orderBy('creeLe', 'asc'), limit(200)),
    (snap) => cb(mapDocs<CommentaireMur>(snap)),
    (e) => onError?.(e)
  );

// --- Ecriture ---------------------------------------------------------------

export const publierSurLeMur = async ({
  uid,
  nom,
  avatarUrl,
  texte,
  photoUrl,
  fil = FIL_PAR_DEFAUT,
  officiel = false,
}: {
  uid: string;
  nom: string;
  avatarUrl?: string;
  texte: string;
  photoUrl?: string;
  fil?: string;
  officiel?: boolean;
}): Promise<string> => {
  const propre = texte.trim().slice(0, LONGUEUR_MAX_BILLET);
  if (!propre && !photoUrl) throw new Error('Un billet vide ne se publie pas.');

  const reference = await addDoc(collection(db, 'mur'), {
    uid,
    nom: nom.trim().slice(0, 120) || 'Membre',
    avatarUrl: avatarUrl || '',
    texte: propre,
    photoUrl: photoUrl || '',
    fil: fil.slice(0, 60),
    pour: 0,
    contre: 0,
    score: 0,
    chaleur: calculerChaleur(0, Date.now()),
    nbCommentaires: 0,
    epingle: false,
    officiel,
    creeLe: serverTimestamp(),
  });
  return reference.id;
};

/** valeur 1 ou -1 pose le vote, 0 le retire. */
export const voter = async (
  postId: string,
  uid: string,
  nom: string,
  valeur: ValeurVote | 0
): Promise<void> => {
  const reference = doc(db, 'mur', postId, 'votes', uid);
  if (valeur === 0) {
    await deleteDoc(reference);
    return;
  }
  await setDoc(reference, {
    uid,
    valeur,
    nom: nom.trim().slice(0, 120) || 'Membre',
    majLe: serverTimestamp(),
  });
};

export const commenter = async (
  postId: string,
  auteur: AuteurMur,
  texte: string
): Promise<void> => {
  const propre = texte.trim().slice(0, LONGUEUR_MAX_COMMENTAIRE);
  if (!propre) return;
  await addDoc(collection(db, 'mur', postId, 'commentaires'), {
    uid: auteur.uid,
    nom: auteur.nom.trim().slice(0, 120) || 'Membre',
    avatarUrl: auteur.avatarUrl || '',
    texte: propre,
    creeLe: serverTimestamp(),
  });
};

export const supprimerBillet = async (postId: string): Promise<void> => {
  await deleteDoc(doc(db, 'mur', postId));
};

/** Reserve a l'administration : les regles Firestore refusent le reste. */
export const epingler = async (postId: string, valeur: boolean): Promise<void> => {
  await updateDoc(doc(db, 'mur', postId), { epingle: valeur });
};

export const televerserPhotoMur = async (uid: string, file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) throw new Error("Ce fichier n'est pas une image.");
  if (file.size >= 10 * 1024 * 1024) throw new Error('Cette image dépasse 10 Mo.');
  const nom = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60)}`;
  const cible = ref(getStorage(), `mur/${uid}/${nom}`);
  await uploadBytes(cible, file, { contentType: file.type });
  return getDownloadURL(cible);
};
