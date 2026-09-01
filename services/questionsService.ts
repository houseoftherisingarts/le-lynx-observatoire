import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  limit,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Questions du public, posees avant ou pendant une assemblee citoyenne.
 * Collection Firestore : questions/{id}.
 * La requete garde les 500 plus recentes (orderBy sur un seul champ, index automatique),
 * puis le tri d'affichage se refait cote client pour placer une question a peine ecrite
 * (createdAt encore nul en local) a la fin plutot qu'au debut.
 * ponytail: une question sans createdAt (import manuel, ancienne donnee) sort de la requete.
 */

export type QuestionOrigin = 'inscription' | 'direct';
export type QuestionStatus = 'pending' | 'approved' | 'hidden';

export interface Question {
  id: string;
  name: string;
  email: string;
  question: string;
  town: string;
  age: string;
  photoURL: string;
  origin: QuestionOrigin;
  status: QuestionStatus;
  upvotes: number;
  upvoterIds: string[];
  createdAt: Timestamp | null;
}

export interface NouvelleQuestion {
  name: string;
  question: string;
  email?: string;
  town?: string;
  age?: string;
  photoURL?: string;
  origin?: QuestionOrigin;
}

const MAX_NOM = 120;
const MAX_QUESTION = 1000;
const MAX_COURT = 120;
const MAX_URL = 1000;

const texte = (valeur: string | undefined, max: number): string =>
  (valeur ?? '').trim().slice(0, max);

/** Ancienne question en premier. Une question qui vient d'etre ecrite (createdAt encore nul cote client) passe a la fin. */
const parAnciennete = (a: Question, b: Question): number => {
  const ta = a.createdAt ? a.createdAt.toMillis() : Number.MAX_SAFE_INTEGER;
  const tb = b.createdAt ? b.createdAt.toMillis() : Number.MAX_SAFE_INTEGER;
  return ta - tb;
};

/**
 * Abonnement en direct au paquet de questions.
 * Rend la fonction de desabonnement, a appeler dans le retour du useEffect.
 */
export const suivreQuestions = (
  onChange: (questions: Question[]) => void,
  onError?: (erreur: Error) => void
): (() => void) =>
  onSnapshot(
    query(collection(db, 'questions'), orderBy('createdAt', 'desc'), limit(500)),
    (snap) => {
      const liste = snap.docs.map((d) => {
        const data = d.data() as Partial<Question>;
        return {
          id: d.id,
          name: data.name ?? '',
          email: data.email ?? '',
          question: data.question ?? '',
          town: data.town ?? '',
          age: data.age ?? '',
          photoURL: data.photoURL ?? '',
          origin: data.origin === 'direct' ? 'direct' : 'inscription',
          status: data.status ?? 'pending',
          upvotes: typeof data.upvotes === 'number' ? data.upvotes : 0,
          upvoterIds: Array.isArray(data.upvoterIds) ? data.upvoterIds : [],
          createdAt: data.createdAt ?? null,
        } as Question;
      });
      onChange(liste.sort(parAnciennete));
    },
    (erreur) => onError?.(erreur)
  );

/** Depot d'une question. Le statut part toujours a 'pending' et les appuis a zero, comme l'exigent les regles. */
export const poserQuestion = async (data: NouvelleQuestion): Promise<string> => {
  const name = texte(data.name, MAX_NOM);
  const question = texte(data.question, MAX_QUESTION);
  if (!name || question.length < 10) {
    throw new Error('Le nom et une question d’au moins dix caractères sont requis.');
  }
  const ref = await addDoc(collection(db, 'questions'), {
    name,
    question,
    email: texte(data.email, MAX_COURT),
    town: texte(data.town, MAX_COURT),
    age: texte(data.age, 12),
    photoURL: texte(data.photoURL, MAX_URL),
    origin: data.origin === 'direct' ? 'direct' : 'inscription',
    status: 'pending',
    upvotes: 0,
    upvoterIds: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

/**
 * Appui d'une personne connectee. Ne touche que upvotes et upvoterIds,
 * les deux seuls champs que les regles laissent bouger a un membre.
 * Le compte s'incremente cote serveur : deux appuis simultanes ne s'ecrasent plus.
 */
export const appuyerQuestion = async (id: string, uid: string): Promise<void> => {
  await updateDoc(doc(db, 'questions', id), {
    upvotes: increment(1),
    upvoterIds: arrayUnion(uid),
  });
};

/** Reserve a l'administration. */
export const changerStatut = async (id: string, statut: QuestionStatus): Promise<void> => {
  await updateDoc(doc(db, 'questions', id), { status: statut });
};

/** Reserve a l'administration. */
export const supprimerQuestion = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'questions', id));
};
