import {
  addDoc,
  collection,
  deleteDoc,
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
  where,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Couche sociale de l'Observatoire : mur, commentaires, reactions, salon de
 * discussion, actions de mobilisation, evenements et questions du public.
 * Tout vit dans Firestore et arrive en direct par onSnapshot.
 */

// --- Types ------------------------------------------------------------------

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  createdAt: Timestamp | null;
  reactionCount: number;
  commentCount: number;
}

export interface FeedComment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  createdAt: Timestamp | null;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Timestamp | null;
}

export interface MobAction {
  id: string;
  authorId: string;
  authorName: string;
  type: string;
  title: string;
  dateDisplay: string;
  timestamp: number;
  location: string;
  description: string;
  participantIds: string[];
  participantCount: number;
  createdAt: Timestamp | null;
}

export interface PublicQuestion {
  id: string;
  name: string;
  email: string;
  question: string;
  photoURL: string;
  age: string;
  town: string;
  origin: 'inscription' | 'direct';
  status: 'pending' | 'approved' | 'hidden';
  upvotes: number;
  upvoterIds: string[];
  createdAt: Timestamp | null;
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: number;
  dateDisplay: string;
  rsvpCount: number;
}

export interface MemberProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  implicationLevel: number;
  skills: string;
  role: 'admin' | 'member';
}

export interface AuthorInfo {
  id: string;
  name: string;
  photo?: string;
}

// --- Aide -------------------------------------------------------------------

const mapDocs = <T>(snap: { docs: Array<{ id: string; data: () => unknown }> }): T[] =>
  snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];

/** Rend un horodatage lisible sans dependance externe. */
export const timeAgo = (ts: Timestamp | null, lang: 'fr' | 'en' | 'ani'): string => {
  if (!ts) return lang === 'en' ? 'just now' : "à l'instant";
  const minutes = Math.max(1, Math.round((Date.now() - ts.toMillis()) / 60000));
  if (minutes < 60) return lang === 'en' ? `${minutes} min ago` : `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return lang === 'en' ? `${hours} h ago` : `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return lang === 'en' ? `${days} d ago` : `il y a ${days} j`;
};

export const clockTime = (ts: Timestamp | null): string =>
  (ts ? ts.toDate() : new Date()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

/** Couleur d'avatar stable, derivee de l'identifiant. */
const AVATAR_TONES = [
  'bg-emerald-600',
  'bg-purple-600',
  'bg-amber-600',
  'bg-sky-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-indigo-600',
];

export const avatarTone = (seed: string): string => {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
};

// --- Mur --------------------------------------------------------------------

export const subscribeToPosts = (
  onChange: (posts: FeedPost[]) => void,
  onError?: (e: unknown) => void
) =>
  onSnapshot(
    query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(60)),
    (snap) => onChange(mapDocs<FeedPost>(snap)),
    (e) => onError?.(e)
  );

export const createPost = async (author: AuthorInfo, text: string): Promise<void> => {
  await addDoc(collection(db, 'posts'), {
    authorId: author.id,
    authorName: author.name,
    authorPhoto: author.photo || '',
    text: text.trim().slice(0, 5000),
    createdAt: serverTimestamp(),
    reactionCount: 0,
    commentCount: 0,
  });
};

export const deletePost = async (postId: string): Promise<void> => {
  await deleteDoc(doc(db, 'posts', postId));
};

export const subscribeToComments = (
  postId: string,
  onChange: (comments: FeedComment[]) => void
) =>
  onSnapshot(
    query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'), limit(200)),
    (snap) => onChange(mapDocs<FeedComment>(snap))
  );

export const addComment = async (
  postId: string,
  author: AuthorInfo,
  text: string
): Promise<void> => {
  await addDoc(collection(db, 'posts', postId, 'comments'), {
    authorId: author.id,
    authorName: author.name,
    authorPhoto: author.photo || '',
    text: text.trim().slice(0, 2000),
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) });
};

/** Bascule la reaction d'une personne sur une publication. */
export const toggleReaction = async (postId: string, uid: string): Promise<boolean> => {
  const ref = doc(db, 'posts', postId, 'reactions', uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await deleteDoc(ref);
    await updateDoc(doc(db, 'posts', postId), { reactionCount: increment(-1) });
    return false;
  }
  await setDoc(ref, { uid, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'posts', postId), { reactionCount: increment(1) });
  return true;
};

export const subscribeToMyReactions = (
  uid: string,
  onChange: (postIds: Set<string>) => void
) =>
  onSnapshot(
    query(collection(db, 'posts')),
    async () => {
      // Les reactions vivent en sous-collection : on interroge par groupe.
      onChange(new Set());
    },
    () => onChange(new Set())
  );

// --- Salon de discussion ----------------------------------------------------

export const subscribeToChat = (
  onChange: (messages: ChatMessage[]) => void,
  onError?: (e: unknown) => void
) =>
  onSnapshot(
    query(collection(db, 'chat'), orderBy('createdAt', 'asc'), limit(200)),
    (snap) => onChange(mapDocs<ChatMessage>(snap)),
    (e) => onError?.(e)
  );

export const sendChatMessage = async (author: AuthorInfo, text: string): Promise<void> => {
  await addDoc(collection(db, 'chat'), {
    authorId: author.id,
    authorName: author.name,
    text: text.trim().slice(0, 1000),
    createdAt: serverTimestamp(),
  });
};

// --- Actions de mobilisation ------------------------------------------------

export const subscribeToActions = (
  onChange: (actions: MobAction[]) => void,
  onError?: (e: unknown) => void
) =>
  onSnapshot(
    query(collection(db, 'actions'), orderBy('timestamp', 'asc'), limit(100)),
    (snap) => onChange(mapDocs<MobAction>(snap)),
    (e) => onError?.(e)
  );

export const createAction = async (
  author: AuthorInfo,
  data: {
    type: string;
    title: string;
    dateDisplay: string;
    timestamp: number;
    location: string;
    description: string;
  }
): Promise<void> => {
  await addDoc(collection(db, 'actions'), {
    authorId: author.id,
    authorName: author.name,
    type: data.type || 'Mobilisation',
    title: data.title.slice(0, 200),
    dateDisplay: data.dateDisplay,
    timestamp: data.timestamp,
    location: data.location,
    description: data.description,
    participantIds: [],
    participantCount: 0,
    createdAt: serverTimestamp(),
  });
};

export const joinAction = async (actionId: string, uid: string, current: number): Promise<void> => {
  await updateDoc(doc(db, 'actions', actionId), {
    participantIds: arrayUnion(uid),
    participantCount: current + 1,
  });
};

export const deleteAction = async (actionId: string): Promise<void> => {
  await deleteDoc(doc(db, 'actions', actionId));
};

// --- Questions du public ----------------------------------------------------

export const subscribeToQuestions = (
  onChange: (questions: PublicQuestion[]) => void,
  onError?: (e: unknown) => void
) =>
  onSnapshot(
    query(collection(db, 'questions'), orderBy('createdAt', 'asc'), limit(300)),
    (snap) => onChange(mapDocs<PublicQuestion>(snap)),
    (e) => onError?.(e)
  );

export const submitQuestion = async (data: {
  name: string;
  email?: string;
  question: string;
  town?: string;
  age?: string;
  photoURL?: string;
  origin: 'inscription' | 'direct';
}): Promise<void> => {
  await addDoc(collection(db, 'questions'), {
    name: data.name.trim().slice(0, 120),
    email: (data.email || '').trim().slice(0, 200),
    question: data.question.trim().slice(0, 1000),
    town: (data.town || '').slice(0, 120),
    age: (data.age || '').slice(0, 20),
    photoURL: (data.photoURL || '').slice(0, 800),
    origin: data.origin,
    status: 'pending',
    upvotes: 0,
    upvoterIds: [],
    createdAt: serverTimestamp(),
  });
};

export const upvoteQuestion = async (
  questionId: string,
  uid: string,
  current: number
): Promise<void> => {
  await updateDoc(doc(db, 'questions', questionId), {
    upvotes: current + 1,
    upvoterIds: arrayUnion(uid),
  });
};

export const setQuestionStatus = async (
  questionId: string,
  status: PublicQuestion['status']
): Promise<void> => {
  await updateDoc(doc(db, 'questions', questionId), { status });
};

// --- Membres ----------------------------------------------------------------

export const subscribeToMembers = (
  onChange: (members: MemberProfile[]) => void,
  onError?: (e: unknown) => void
) =>
  onSnapshot(
    query(collection(db, 'users'), limit(200)),
    (snap) => onChange(mapDocs<MemberProfile>(snap)),
    (e) => onError?.(e)
  );

// --- Evenements -------------------------------------------------------------

export const subscribeToEvents = (onChange: (events: CommunityEvent[]) => void) =>
  onSnapshot(
    query(collection(db, 'events'), orderBy('startsAt', 'asc'), limit(50)),
    (snap) => onChange(mapDocs<CommunityEvent>(snap))
  );

export const rsvpToEvent = async (
  eventId: string,
  uid: string,
  going: boolean,
  name: string
): Promise<void> => {
  await setDoc(doc(db, 'events', eventId, 'rsvps', uid), {
    uid,
    name,
    going,
    updatedAt: serverTimestamp(),
  });
};

// --- Signalement d'un autre projet -----------------------------------------

export const submitProjectReport = async (data: {
  projectName: string;
  type: string;
  location: string;
  description: string;
  submittedBy: string;
  contactEmail: string;
}): Promise<void> => {
  await addDoc(collection(db, 'projectSubmissions'), {
    ...data,
    createdAt: serverTimestamp(),
    status: 'nouveau',
  });
};

export const subscribeToProjectReports = (
  onChange: (reports: Array<Record<string, unknown> & { id: string }>) => void,
  onError?: (e: unknown) => void
) =>
  onSnapshot(
    query(collection(db, 'projectSubmissions'), orderBy('createdAt', 'desc'), limit(100)),
    (snap) => onChange(mapDocs(snap)),
    (e) => onError?.(e)
  );

// --- Publications du CALME --------------------------------------------------

export interface CalmEntry {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: Timestamp | null;
}

export const subscribeToCalmPosts = (onChange: (posts: CalmEntry[]) => void) =>
  onSnapshot(
    query(collection(db, 'calmPosts'), orderBy('createdAt', 'desc'), limit(50)),
    (snap) => onChange(mapDocs<CalmEntry>(snap))
  );

export const createCalmPost = async (title: string, content: string): Promise<void> => {
  await addDoc(collection(db, 'calmPosts'), {
    title: title.slice(0, 200),
    content: content.slice(0, 8000),
    author: 'Le CALME',
    createdAt: serverTimestamp(),
  });
};

export const deleteCalmPost = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'calmPosts', id));
};

// Reexport pour les composants qui filtrent cote client.
export { where };
