import { getApp } from 'firebase/app';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
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
 * Les documents deposes par les membres.
 *
 * Chaque personne a son propre versement sous `membres/{uid}/documents`, que
 * tout membre connecte peut consulter depuis sa fiche : c'est le fonds citoyen,
 * et il appartient a celui qui l'a depose.
 *
 * De la, deux chemins menent a la bibliotheque commune. Une personne qui
 * appartient a un groupe reconnu par l'administration verse directement, au nom
 * de son groupe. Toutes les autres declarent leur piece a l'administration, qui
 * la publie ou la laisse ou elle est.
 */

// --- Types ------------------------------------------------------------------

export type FormatFichier = 'PDF' | 'image' | 'texte' | 'lien';

export interface DocumentMembre {
  id: string;
  uid: string;
  nomMembre: string;
  titre: string;
  note: string;
  url: string;
  chemin?: string;
  taille?: number;
  format: FormatFichier;
  celluleId?: string;
  celluleNom?: string;
  publieId?: string;
  propose?: boolean;
  creeLe: Timestamp | null;
}

export type StatutProposition = 'attente' | 'publiee' | 'refusee';

export interface Proposition {
  id: string;
  uid: string;
  nomMembre: string;
  documentId: string;
  titre: string;
  note: string;
  url: string;
  format: FormatFichier;
  statut: StatutProposition;
  creeLe: Timestamp | null;
}

export const MAX_TITRE = 200;
export const MAX_NOTE = 900;
export const MAX_URL = 1200;
export const TAILLE_MAX_MO = 20;

const TYPES_ACCEPTES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'image/',
];

// --- Aides ------------------------------------------------------------------

const coupe = (valeur: string, max: number): string => (valeur || '').trim().slice(0, max);

const mapDocs = <T>(snap: { docs: Array<{ id: string; data: () => unknown }> }): T[] =>
  snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];

/** Une adresse ne part jamais vers autre chose que le web. */
export const urlSure = (valeur: string): boolean => {
  try {
    const u = new URL(valeur.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

export const formatDuFichier = (type: string): FormatFichier => {
  if (type === 'application/pdf') return 'PDF';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('text/')) return 'texte';
  return 'lien';
};

const typeAccepte = (type: string): boolean =>
  TYPES_ACCEPTES.some((t) => (t.endsWith('/') ? type.startsWith(t) : type === t));

// --- Lecture ----------------------------------------------------------------

/** Le fonds d'une personne, visible par tout membre connecte. */
export const suivreDocumentsMembre = (
  uid: string,
  onChange: (documents: DocumentMembre[]) => void,
  onErreur?: (erreur: Error) => void
): (() => void) =>
  onSnapshot(
    query(collection(db, 'membres', uid, 'documents'), orderBy('creeLe', 'desc'), limit(100)),
    (snap) => onChange(mapDocs<DocumentMembre>(snap)),
    (erreur) => {
      onChange([]);
      onErreur?.(erreur);
    }
  );

/** La file des pieces declarees a l'administration. */
export const suivrePropositions = (
  onChange: (propositions: Proposition[]) => void,
  onErreur?: (erreur: Error) => void
): (() => void) =>
  onSnapshot(
    query(
      collection(db, 'propositions'),
      where('statut', '==', 'attente'),
      orderBy('creeLe', 'desc'),
      limit(200)
    ),
    (snap) => onChange(mapDocs<Proposition>(snap)),
    (erreur) => {
      onChange([]);
      onErreur?.(erreur);
    }
  );

// --- Depot ------------------------------------------------------------------

/** Depot d'un fichier dans le fonds personnel. */
export const televerserDocument = async (
  uid: string,
  nomMembre: string,
  file: File,
  titre: string,
  note: string,
  onProgression?: (pourcent: number) => void
): Promise<string> => {
  if (!typeAccepte(file.type)) {
    throw new Error('Format refusé. Déposez un PDF, une image ou un fichier texte.');
  }
  if (file.size > TAILLE_MAX_MO * 1024 * 1024) {
    throw new Error(`Ce fichier dépasse ${TAILLE_MAX_MO} Mo.`);
  }
  const titrePropre = coupe(titre, MAX_TITRE);
  if (!titrePropre) throw new Error('Donnez un titre à ce document.');

  const nomPropre = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'document';
  const chemin = `documents/${uid}/${Date.now()}-${nomPropre}`;
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

  try {
    const reference = await addDoc(collection(db, 'membres', uid, 'documents'), {
      uid,
      nomMembre: coupe(nomMembre, 120) || 'Membre',
      titre: titrePropre,
      note: coupe(note, MAX_NOTE),
      url,
      chemin,
      taille: file.size,
      format: formatDuFichier(file.type),
      propose: false,
      creeLe: serverTimestamp(),
    });
    return reference.id;
  } catch (erreur) {
    await deleteObject(cible).catch(() => undefined);
    throw erreur;
  }
};

/** Depot d'un lien dans le fonds personnel, quand la piece vit deja en ligne. */
export const deposerLien = async (
  uid: string,
  nomMembre: string,
  titre: string,
  url: string,
  note: string
): Promise<string> => {
  const titrePropre = coupe(titre, MAX_TITRE);
  const adresse = coupe(url, MAX_URL);
  if (!titrePropre) throw new Error('Donnez un titre à ce document.');
  if (!urlSure(adresse)) {
    throw new Error('L’adresse doit être une adresse web complète, en http ou en https.');
  }
  const reference = await addDoc(collection(db, 'membres', uid, 'documents'), {
    uid,
    nomMembre: coupe(nomMembre, 120) || 'Membre',
    titre: titrePropre,
    note: coupe(note, MAX_NOTE),
    url: adresse,
    format: 'lien' as FormatFichier,
    propose: false,
    creeLe: serverTimestamp(),
  });
  return reference.id;
};

/** Retrait d'une piece du fonds personnel, avec son fichier. */
export const supprimerDocumentMembre = async (
  uid: string,
  id: string,
  chemin?: string
): Promise<void> => {
  await deleteDoc(doc(db, 'membres', uid, 'documents', id));
  if (chemin) {
    await deleteObject(ref(getStorage(getApp()), chemin)).catch(() => undefined);
  }
};

// --- Vers la bibliotheque commune -------------------------------------------

/** Declaration d'une piece a l'administration, par une personne sans groupe reconnu. */
export const declarerALAdministration = async (piece: DocumentMembre): Promise<string> => {
  const reference = await addDoc(collection(db, 'propositions'), {
    uid: piece.uid,
    nomMembre: piece.nomMembre,
    documentId: piece.id,
    titre: coupe(piece.titre, MAX_TITRE),
    note: coupe(piece.note, MAX_NOTE),
    url: piece.url,
    format: piece.format,
    statut: 'attente' as StatutProposition,
    creeLe: serverTimestamp(),
  });
  await updateDoc(doc(db, 'membres', piece.uid, 'documents', piece.id), { propose: true });
  return reference.id;
};

/**
 * Versement direct dans la bibliotheque commune, au nom d'un groupe reconnu.
 * Le champ « title » satisfait la regle de creation de /resources, et « type »
 * vaut 'document' pour que la bibliotheque retrouve la piece.
 */
export const verserALaBibliotheque = async (
  piece: DocumentMembre,
  cellule: { id: string; nom: string }
): Promise<string> => {
  const reference = await addDoc(collection(db, 'resources'), {
    type: 'document',
    title: coupe(piece.titre, MAX_TITRE),
    titre: coupe(piece.titre, MAX_TITRE),
    auteur: piece.nomMembre,
    annee: new Date().getFullYear(),
    type_document: 'rapport',
    resume: coupe(piece.note, MAX_NOTE),
    url: piece.url,
    format: piece.format === 'PDF' ? 'PDF' : 'page web',
    poids: '',
    authorId: piece.uid,
    celluleId: cellule.id,
    celluleNom: cellule.nom,
    ajouteLe: new Date().toISOString().slice(0, 10),
    creeLe: serverTimestamp(),
  });
  await updateDoc(doc(db, 'membres', piece.uid, 'documents', piece.id), {
    publieId: reference.id,
    celluleId: cellule.id,
    celluleNom: cellule.nom,
  });
  return reference.id;
};

/** Suite donnee par l'administration a une piece declaree. */
export const trancherProposition = async (
  proposition: Proposition,
  statut: Exclude<StatutProposition, 'attente'>
): Promise<void> => {
  await updateDoc(doc(db, 'propositions', proposition.id), { statut });
};
