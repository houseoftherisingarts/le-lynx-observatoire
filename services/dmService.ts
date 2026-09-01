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
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Alliances et messagerie privee de l'Observatoire.
 * Une alliance vit dans `amities/{pairId}`, une conversation dans `dms/{pairId}`,
 * ou pairId est fait des deux identifiants tries et joints par '__'.
 * Aucune requete n'utilise array-contains avec un orderBy, donc aucun index
 * composite n'est necessaire : le tri se fait ici, sur des listes courtes.
 */

// --- Types ------------------------------------------------------------------

export type StatutAlliance = 'demande' | 'acceptee';

export interface Personne {
  uid: string;
  nom: string;
}

export interface Alliance {
  id: string;
  paire: string[];
  de: string;
  noms: Record<string, string>;
  statut: StatutAlliance;
  creeLe: Timestamp | null;
  majLe: Timestamp | null;
}

export interface MesAlliances {
  recues: Alliance[];
  envoyees: Alliance[];
  acceptees: Alliance[];
}

export interface Conversation {
  id: string;
  participantUids: string[];
  participantNoms: Record<string, string>;
  dernierMessage: string;
  dernierAuteur: string;
  majLe: Timestamp | null;
  nonLus: Record<string, number>;
}

export interface MessagePrive {
  id: string;
  uid: string;
  nom: string;
  texte: string;
  creeLe: Timestamp | null;
}

export const LONGUEUR_MAX_MESSAGE = 4000;
const LONGUEUR_MAX_NOM = 120;
const LONGUEUR_MAX_EXTRAIT = 200;

// --- Aide -------------------------------------------------------------------

const mapDocs = <T>(snap: { docs: Array<{ id: string; data: () => unknown }> }): T[] =>
  snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];

const nomCourt = (nom: string): string => (nom || 'Membre').trim().slice(0, LONGUEUR_MAX_NOM);

const millis = (ts: Timestamp | null): number => (ts ? ts.toMillis() : 0);

/** Identifiant stable d'une paire, quel que soit l'ordre des arguments. */
export const clePaire = (a: string, b: string): string => [a, b].sort().join('__');

/** L'autre personne d'une paire, vue depuis un identifiant donne. */
export const autreDeLaPaire = (paire: string[], moi: string): string =>
  paire.find((u) => u !== moi) || moi;

/**
 * Nom public d'une personne, lu dans la fiche `membres`. Rend une chaine vide
 * quand la fiche n'existe pas ou que la lecture est refusee.
 */
export const nomPublic = async (uid: string): Promise<string> => {
  try {
    const snap = await getDoc(doc(db, 'membres', uid));
    if (!snap.exists()) return '';
    const data = snap.data() as { nom?: string; displayName?: string };
    return nomCourt(data.nom || data.displayName || '');
  } catch {
    return '';
  }
};

// --- Alliances --------------------------------------------------------------

/** Envoie une demande d'alliance. Rend l'identifiant de la paire. */
export const demanderAlliance = async (moi: Personne, autre: Personne): Promise<string> => {
  if (!moi.uid || !autre.uid || moi.uid === autre.uid) {
    throw new Error('Alliance impossible avec soi-meme.');
  }
  const pairId = clePaire(moi.uid, autre.uid);
  const ref = doc(db, 'amities', pairId);
  // Les regles refusent la lecture d'un document absent (resource est nul), donc un
  // echec de lecture se lit ici comme « rien encore ». Et si la fiche existe deja,
  // un setDoc complet serait refuse : la regle d'update n'autorise que statut et majLe.
  const deja = await getDoc(ref).catch(() => null);
  if (deja && deja.exists()) return pairId;
  await setDoc(ref, {
    paire: [moi.uid, autre.uid].sort(),
    de: moi.uid,
    noms: {
      [moi.uid]: nomCourt(moi.nom),
      [autre.uid]: nomCourt(autre.nom),
    },
    statut: 'demande',
    creeLe: serverTimestamp(),
    majLe: serverTimestamp(),
  });
  return pairId;
};

/** Accepte une demande recue. N'ecrit que le statut et la date, comme l'exigent les regles. */
export const accepterAlliance = async (pairId: string, moi: string): Promise<void> => {
  if (!moi) throw new Error('Identifiant manquant.');
  await updateDoc(doc(db, 'amities', pairId), {
    statut: 'acceptee',
    majLe: serverTimestamp(),
  });
};

/** Refuse une demande ou rompt une alliance. */
export const retirerAlliance = async (pairId: string): Promise<void> => {
  await deleteDoc(doc(db, 'amities', pairId));
};

/**
 * Suit les alliances d'une personne et les rend classees : demandes recues,
 * demandes envoyees, alliances acceptees.
 */
export const suivreMesAlliances = (
  uid: string,
  cb: (a: MesAlliances) => void,
  onError?: (e: unknown) => void
) =>
  onSnapshot(
    query(collection(db, 'amities'), where('paire', 'array-contains', uid), limit(300)),
    (snap) => {
      const toutes = mapDocs<Alliance>(snap);
      const recentes = [...toutes].sort((a, b) => millis(b.majLe) - millis(a.majLe));
      cb({
        recues: recentes.filter((a) => a.statut === 'demande' && a.de !== uid),
        envoyees: recentes.filter((a) => a.statut === 'demande' && a.de === uid),
        acceptees: recentes.filter((a) => a.statut === 'acceptee'),
      });
    },
    (e) => {
      cb({ recues: [], envoyees: [], acceptees: [] });
      onError?.(e);
    }
  );

// --- Conversations ----------------------------------------------------------

/** Ouvre la conversation avec quelqu'un, en la creant au besoin. Rend le pairId. */
export const ouvrirConversation = async (moi: Personne, autre: Personne): Promise<string> => {
  if (!moi.uid || !autre.uid || moi.uid === autre.uid) {
    throw new Error('Conversation impossible avec soi-meme.');
  }
  const pairId = clePaire(moi.uid, autre.uid);
  const ref = doc(db, 'dms', pairId);
  // Meme piege que pour les alliances : sur un document absent, la regle de lecture
  // deshabille un `resource` nul et renvoie un refus. Le refus vaut « a creer ».
  const existante = await getDoc(ref).catch(() => null);
  if (!existante || !existante.exists()) {
    await setDoc(ref, {
      participantUids: [moi.uid, autre.uid].sort(),
      participantNoms: {
        [moi.uid]: nomCourt(moi.nom),
        [autre.uid]: nomCourt(autre.nom),
      },
      dernierMessage: '',
      dernierAuteur: '',
      majLe: serverTimestamp(),
      nonLus: { [moi.uid]: 0, [autre.uid]: 0 },
    });
  }
  return pairId;
};

/** Suit les conversations d'une personne, la plus recente en premier. */
export const suivreMesConversations = (
  uid: string,
  cb: (c: Conversation[]) => void,
  onError?: (e: unknown) => void
) =>
  onSnapshot(
    query(collection(db, 'dms'), where('participantUids', 'array-contains', uid), limit(200)),
    (snap) => {
      const conversations = mapDocs<Conversation>(snap);
      conversations.sort((a, b) => millis(b.majLe) - millis(a.majLe));
      cb(conversations);
    },
    (e) => {
      cb([]);
      onError?.(e);
    }
  );

/** Suit le fil d'une conversation, du plus ancien au plus recent. */
export const suivreMessages = (
  pairId: string,
  cb: (m: MessagePrive[]) => void,
  onError?: (e: unknown) => void
) =>
  onSnapshot(
    query(collection(db, 'dms', pairId, 'messages'), orderBy('creeLe', 'desc'), limit(200)),
    (snap) => cb(mapDocs<MessagePrive>(snap).reverse()),
    (e) => {
      cb([]);
      onError?.(e);
    }
  );

/**
 * Ecrit un message, puis met a jour la fiche de la conversation : extrait,
 * auteur, date, et compteur de non-lus du destinataire.
 */
export const envoyerMessage = async (
  pairId: string,
  auteur: Personne,
  texte: string,
  destinataireUid: string
): Promise<void> => {
  const propre = texte.trim().slice(0, LONGUEUR_MAX_MESSAGE);
  if (!propre) return;
  await addDoc(collection(db, 'dms', pairId, 'messages'), {
    uid: auteur.uid,
    nom: nomCourt(auteur.nom),
    texte: propre,
    creeLe: serverTimestamp(),
  });
  await updateDoc(doc(db, 'dms', pairId), {
    dernierMessage: propre.slice(0, LONGUEUR_MAX_EXTRAIT),
    dernierAuteur: auteur.uid,
    majLe: serverTimestamp(),
    [`nonLus.${destinataireUid}`]: increment(1),
  });
};

/** Remet a zero le compteur de non-lus de cette personne. */
export const marquerLu = async (pairId: string, uid: string): Promise<void> => {
  await updateDoc(doc(db, 'dms', pairId), { [`nonLus.${uid}`]: 0 });
};
