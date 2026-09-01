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
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Evenements de la lutte et presences confirmees.
 * Collections touchees : events/{id} et events/{id}/rsvps/{uid}.
 */

// --- Types ------------------------------------------------------------------

export type TypeEvenement =
  | 'assemblee'
  | 'conseil'
  | 'manifestation'
  | 'atelier'
  | 'juridique'
  | 'autre';

export const TYPES_EVENEMENT: TypeEvenement[] = [
  'assemblee',
  'conseil',
  'manifestation',
  'atelier',
  'juridique',
  'autre',
];

export interface Evenement {
  id: string;
  title: string;
  description: string;
  lieu: string;
  adresse?: string;
  /** Debut de l'evenement, en millisecondes depuis epoch. */
  startsAt: number;
  dateDisplay: string;
  type: TypeEvenement;
  auteurUid: string;
  auteurNom: string;
  rsvpCount: number;
  creeLe: Timestamp | null;
}

/** Champs saisis dans le formulaire, sans les metadonnees d'auteur. */
export interface DonneesEvenement {
  title: string;
  description: string;
  lieu: string;
  adresse?: string;
  startsAt: number;
  dateDisplay: string;
  type: TypeEvenement;
}

export interface Rsvp {
  id: string;
  uid: string;
  nom: string;
  going: boolean;
  plusUn: number;
  majLe: Timestamp | null;
}

export interface Personne {
  uid: string;
  nom: string;
}

export interface ListeEvenements {
  aVenir: Evenement[];
  passes: Evenement[];
}

export interface LiensCalendrier {
  google: string;
  ics: string;
  nomFichier: string;
}

// --- Limites et nettoyage ---------------------------------------------------

const MAX = {
  title: 200,
  description: 4000,
  lieu: 120,
  adresse: 200,
  dateDisplay: 80,
  nom: 120,
  plusUn: 20,
};

const couper = (valeur: unknown, max: number): string =>
  String(valeur ?? '').trim().slice(0, max);

const estType = (valeur: unknown): valeur is TypeEvenement =>
  TYPES_EVENEMENT.includes(valeur as TypeEvenement);

const nettoyer = (data: DonneesEvenement) => {
  const titre = couper(data.title, MAX.title);
  const lieu = couper(data.lieu, MAX.lieu);
  const debut = Number(data.startsAt);
  if (!titre) throw new Error('Le titre est obligatoire.');
  if (!lieu) throw new Error('Le lieu est obligatoire.');
  if (!Number.isFinite(debut) || debut <= 0) throw new Error('La date est invalide.');
  return {
    title: titre,
    description: couper(data.description, MAX.description),
    lieu,
    adresse: couper(data.adresse, MAX.adresse),
    startsAt: Math.round(debut),
    dateDisplay: couper(data.dateDisplay, MAX.dateDisplay),
    type: estType(data.type) ? data.type : ('autre' as TypeEvenement),
  };
};

// --- Lecture ----------------------------------------------------------------

/** Abonnement direct, trie par date croissante, separe a venir et passes. */
export const suivreEvenements = (
  cb: (liste: ListeEvenements) => void,
  onErreur?: (e: unknown) => void
): Unsubscribe =>
  onSnapshot(
    query(collection(db, 'events'), orderBy('startsAt', 'asc'), limit(200)),
    (snap) => {
      const maintenant = Date.now();
      const aVenir: Evenement[] = [];
      const passes: Evenement[] = [];
      snap.docs.forEach((d) => {
        const brut = d.data() as Partial<Evenement>;
        const ev: Evenement = {
          id: d.id,
          title: String(brut.title ?? ''),
          description: String(brut.description ?? ''),
          lieu: String(brut.lieu ?? ''),
          adresse: brut.adresse ? String(brut.adresse) : undefined,
          startsAt: Number(brut.startsAt ?? 0),
          dateDisplay: String(brut.dateDisplay ?? ''),
          type: estType(brut.type) ? brut.type : 'autre',
          auteurUid: String(brut.auteurUid ?? ''),
          auteurNom: String(brut.auteurNom ?? ''),
          rsvpCount: Number(brut.rsvpCount ?? 0),
          creeLe: (brut.creeLe as Timestamp) ?? null,
        };
        if (ev.startsAt >= maintenant) aVenir.push(ev);
        else passes.push(ev);
      });
      passes.reverse();
      cb({ aVenir, passes });
    },
    (e) => onErreur?.(e)
  );

export const suivreRsvps = (
  evenementId: string,
  cb: (rsvps: Rsvp[]) => void,
  onErreur?: (e: unknown) => void
): Unsubscribe =>
  onSnapshot(
    query(collection(db, 'events', evenementId, 'rsvps'), limit(500)),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const brut = d.data() as Partial<Rsvp>;
          return {
            id: d.id,
            uid: String(brut.uid ?? d.id),
            nom: String(brut.nom ?? ''),
            going: brut.going === true,
            plusUn: Number(brut.plusUn ?? 0),
            majLe: (brut.majLe as Timestamp) ?? null,
          };
        })
      ),
    (e) => onErreur?.(e)
  );

// --- Ecriture ---------------------------------------------------------------

export const creerEvenement = async (
  auteur: Personne,
  data: DonneesEvenement
): Promise<string> => {
  const propre = nettoyer(data);
  const ref = await addDoc(collection(db, 'events'), {
    ...propre,
    auteurUid: auteur.uid,
    auteurNom: couper(auteur.nom, MAX.nom),
    rsvpCount: 0,
    creeLe: serverTimestamp(),
  });
  return ref.id;
};

export const majEvenement = async (
  evenementId: string,
  champs: Partial<DonneesEvenement>
): Promise<void> => {
  const patch: Record<string, string | number> = {};
  if (champs.title !== undefined) patch.title = couper(champs.title, MAX.title);
  if (champs.description !== undefined)
    patch.description = couper(champs.description, MAX.description);
  if (champs.lieu !== undefined) patch.lieu = couper(champs.lieu, MAX.lieu);
  if (champs.adresse !== undefined) patch.adresse = couper(champs.adresse, MAX.adresse);
  if (champs.dateDisplay !== undefined)
    patch.dateDisplay = couper(champs.dateDisplay, MAX.dateDisplay);
  if (champs.type !== undefined && estType(champs.type)) patch.type = champs.type;
  if (champs.startsAt !== undefined && Number.isFinite(Number(champs.startsAt)))
    patch.startsAt = Math.round(Number(champs.startsAt));
  if (Object.keys(patch).length === 0) return;
  await updateDoc(doc(db, 'events', evenementId), patch);
};

export const supprimerEvenement = async (evenementId: string): Promise<void> => {
  await deleteDoc(doc(db, 'events', evenementId));
};

/**
 * Ecrit la presence de la personne puis ajuste rsvpCount sur l'evenement.
 * rsvpCountActuel sert de plancher : le compteur ne descend jamais sous zero.
 */
export const repondrePresence = async (
  evenementId: string,
  personne: Personne,
  going: boolean,
  plusUn: number,
  rsvpCountActuel: number
): Promise<void> => {
  const accompagnants = Math.min(
    MAX.plusUn,
    Math.max(0, Math.round(Number(plusUn) || 0))
  );
  const refRsvp = doc(db, 'events', evenementId, 'rsvps', personne.uid);
  const ancien = await getDoc(refRsvp);
  const avant = ancien.exists()
    ? (() => {
        const d = ancien.data() as Partial<Rsvp>;
        return d.going === true ? 1 + Math.max(0, Number(d.plusUn ?? 0)) : 0;
      })()
    : 0;
  const apres = going ? 1 + accompagnants : 0;

  await setDoc(refRsvp, {
    uid: personne.uid,
    nom: couper(personne.nom, MAX.nom),
    going,
    plusUn: going ? accompagnants : 0,
    majLe: serverTimestamp(),
  });

  const base = Math.max(0, Math.round(Number(rsvpCountActuel) || 0));
  const delta = Math.max(apres - avant, -base);
  if (delta !== 0) {
    await updateDoc(doc(db, 'events', evenementId), { rsvpCount: increment(delta) });
  }
};

// --- Calendrier -------------------------------------------------------------

const DUREE_DEFAUT_MS = 2 * 60 * 60 * 1000;

const horodatageUtc = (ms: number): string =>
  new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const echapperIcs = (texte: string): string =>
  texte
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** Rend l'URL Google Agenda et le contenu d'un fichier .ics pret a telecharger. */
export const lienCalendrier = (evenement: Evenement): LiensCalendrier => {
  const debut = evenement.startsAt;
  const fin = debut + DUREE_DEFAUT_MS;
  const lieuComplet = [evenement.lieu, evenement.adresse].filter(Boolean).join(', ');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: evenement.title,
    dates: `${horodatageUtc(debut)}/${horodatageUtc(fin)}`,
    details: evenement.description,
    location: lieuComplet,
  });

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Le Lynx//Observatoire citoyen//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${evenement.id}@lelynx-observatoire`,
    `DTSTAMP:${horodatageUtc(Date.now())}`,
    `DTSTART:${horodatageUtc(debut)}`,
    `DTEND:${horodatageUtc(fin)}`,
    `SUMMARY:${echapperIcs(evenement.title)}`,
    `DESCRIPTION:${echapperIcs(evenement.description)}`,
    `LOCATION:${echapperIcs(lieuComplet)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const nomFichier = `${
    evenement.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'evenement'
  }.ics`;

  return {
    google: `https://calendar.google.com/calendar/render?${params.toString()}`,
    ics,
    nomFichier,
  };
};
