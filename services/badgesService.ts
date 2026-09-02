import {
  Timestamp,
  arrayRemove,
  collection,
  deleteField,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Badges honorifiques de l'Observatoire. Une fiche par personne, dans
 * `badges/{uid}`. L'attribution appartient a l'administration; la personne
 * choisit seulement les trois badges qu'elle met en vitrine.
 *
 * Le catalogue vit dans ce fichier, jamais en base : ajouter un badge se fait
 * par un deploiement, et les fiches existantes n'ont rien a migrer.
 */

// --- Types ------------------------------------------------------------------

export type TeinteBadge = 'emerald' | 'amber' | 'red' | 'violet';

export interface TexteBilingue {
  fr: string;
  en: string;
}

export interface Badge {
  id: string;
  nom: TexteBilingue;
  description: TexteBilingue;
  /** Nom d'icone lucide-react. Le composant tient la table de correspondance. */
  icone: string;
  teinte: TeinteBadge;
  critere: TexteBilingue;
}

export interface FicheBadges {
  uid: string;
  /** Identifiant du badge vers la date d'attribution. */
  obtenus: Record<string, Timestamp | null>;
  /** Trois badges au maximum, dans l'ordre choisi par la personne. */
  exposes: string[];
  maj: Timestamp | null;
}

// --- Catalogue --------------------------------------------------------------

export const MAX_EXPOSES = 3;

export const CATALOGUE_BADGES: Badge[] = [
  {
    id: 'premiere-parole',
    nom: { fr: 'Première parole', en: 'First word' },
    description: {
      fr: "Ce badge salue la personne qui a pris la parole une première fois sur le mur de l'Observatoire.",
      en: 'This badge honours the person who spoke up for the first time on the Observatory wall.',
    },
    icone: 'MessageSquare',
    teinte: 'emerald',
    critere: {
      fr: 'Publier un premier billet sur le mur.',
      en: 'Publish a first post on the wall.',
    },
  },
  {
    id: 'presence-assemblee',
    nom: { fr: 'Présence en assemblée', en: 'Present at a council meeting' },
    description: {
      fr: "Ce badge salue la personne qui s'est déplacée à une assemblée du conseil pour entendre ce qui s'y décide.",
      en: 'This badge honours the person who attended a council meeting to hear what gets decided there.',
    },
    icone: 'Landmark',
    teinte: 'amber',
    critere: {
      fr: 'Assister à une assemblée municipale ou à une séance de la MRC.',
      en: 'Attend a municipal council meeting or an MRC session.',
    },
  },
  {
    id: 'cheneville-30-aout-2026',
    nom: { fr: 'Chénéville, 30 août 2026', en: 'Chénéville, August 30, 2026' },
    description: {
      fr: "Ce badge salue la personne qui était dans la salle à l'assemblée de Chénéville du 30 août 2026.",
      en: 'This badge honours the person who sat in the room at the Chénéville assembly of August 30, 2026.',
    },
    icone: 'Users',
    teinte: 'amber',
    critere: {
      fr: "Avoir assisté à l'assemblée de Chénéville du 30 août 2026.",
      en: 'Have attended the Chénéville assembly of August 30, 2026.',
    },
  },
  {
    id: 'referendum-2025',
    nom: { fr: 'Référendum de 2025', en: '2025 referendum' },
    description: {
      fr: "Ce badge salue la personne qui a voté au référendum de 2025 sur le règlement encadrant le projet.",
      en: 'This badge honours the person who voted in the 2025 referendum on the by-law framing the project.',
    },
    icone: 'Vote',
    teinte: 'amber',
    critere: {
      fr: 'Avoir voté au référendum de 2025.',
      en: 'Have voted in the 2025 referendum.',
    },
  },
  {
    id: 'fondation-cellule',
    nom: { fr: 'Fondation de cellule', en: 'Founded a cell' },
    description: {
      fr: "Ce badge salue la personne qui a fondé une cellule locale et qui en porte la coordination.",
      en: 'This badge honours the person who founded a local cell and carries its coordination.',
    },
    icone: 'Flag',
    teinte: 'emerald',
    critere: {
      fr: 'Fonder une cellule dans sa municipalité.',
      en: 'Found a cell in your municipality.',
    },
  },
  {
    id: 'oeil-du-territoire',
    nom: { fr: 'Œil du territoire', en: 'Eye on the land' },
    description: {
      fr: "Ce badge salue la personne qui a déposé une photo du territoire dans la galerie des membres.",
      en: 'This badge honours the person who added a photograph of the land to the members gallery.',
    },
    icone: 'Camera',
    teinte: 'emerald',
    critere: {
      fr: 'Déposer une photo approuvée dans la galerie.',
      en: 'Add an approved photograph to the gallery.',
    },
  },
  {
    id: 'question-au-public',
    nom: { fr: 'Question posée', en: 'Question asked' },
    description: {
      fr: "Ce badge salue la personne qui a posé une question publique et qui a demandé une réponse claire.",
      en: 'This badge honours the person who asked a public question and demanded a clear answer.',
    },
    icone: 'HelpCircle',
    teinte: 'amber',
    critere: {
      fr: 'Faire approuver une question dans la file du public.',
      en: 'Get a question approved in the public queue.',
    },
  },
  {
    id: 'cinq-rendez-vous',
    nom: { fr: 'Cinq rendez-vous', en: 'Five gatherings' },
    description: {
      fr: "Ce badge salue la personne qui a confirmé sa présence à cinq rendez-vous de l'Observatoire.",
      en: 'This badge honours the person who confirmed attendance at five Observatory gatherings.',
    },
    icone: 'CalendarCheck',
    teinte: 'emerald',
    critere: {
      fr: 'Confirmer sa présence à cinq événements.',
      en: 'Confirm attendance at five events.',
    },
  },
  {
    id: 'vigie-miniere',
    nom: { fr: 'Vigie minière', en: 'Mining watch' },
    description: {
      fr: "Ce badge salue la personne qui a signalé un autre projet minier documenté ailleurs au Québec.",
      en: 'This badge honours the person who reported another documented mining project elsewhere in Quebec.',
    },
    icone: 'Radar',
    teinte: 'red',
    critere: {
      fr: 'Faire retenir un signalement de projet minier.',
      en: 'Have a mining project report accepted.',
    },
  },
  {
    id: 'gardien-des-eaux',
    nom: { fr: 'Gardien des eaux', en: 'Water guardian' },
    description: {
      fr: "Ce badge salue la personne qui a participé à un relevé de la qualité de l'eau des lacs et des ruisseaux.",
      en: 'This badge honours the person who took part in a water quality survey of the lakes and streams.',
    },
    icone: 'Droplets',
    teinte: 'emerald',
    critere: {
      fr: "Participer à une campagne d'échantillonnage de l'eau.",
      en: 'Take part in a water sampling campaign.',
    },
  },
  {
    id: 'archiviste',
    nom: { fr: 'Archiviste', en: 'Archivist' },
    description: {
      fr: "Ce badge salue la personne qui a versé une pièce au fonds documentaire de l'Observatoire.",
      en: 'This badge honours the person who filed a document into the Observatory record.',
    },
    icone: 'FileText',
    teinte: 'amber',
    critere: {
      fr: 'Verser un document vérifiable à la bibliothèque.',
      en: 'File a verifiable document into the library.',
    },
  },
  {
    id: 'porte-a-porte',
    nom: { fr: 'Porte-à-porte', en: 'Door to door' },
    description: {
      fr: "Ce badge salue la personne qui est allée frapper aux portes de son rang pour expliquer le dossier.",
      en: 'This badge honours the person who knocked on doors along their road to explain the file.',
    },
    icone: 'DoorOpen',
    teinte: 'emerald',
    critere: {
      fr: 'Mener une tournée de porte-à-porte avec sa cellule.',
      en: 'Run a door to door round with your cell.',
    },
  },
  {
    id: 'relais-de-nouvelle',
    nom: { fr: 'Relais de nouvelle', en: 'News relay' },
    description: {
      fr: "Ce badge salue la personne qui a rapporté une nouvelle que la veille quotidienne avait manquée.",
      en: 'This badge honours the person who brought in a news item the daily watch had missed.',
    },
    icone: 'Newspaper',
    teinte: 'emerald',
    critere: {
      fr: 'Faire entrer une nouvelle vérifiée dans la veille.',
      en: 'Get a verified news item into the watch.',
    },
  },
  {
    id: 'main-tendue',
    nom: { fr: 'Main tendue', en: 'Open hand' },
    description: {
      fr: "Ce badge salue la personne qui a accueilli un nouveau membre et qui l'a accompagné ses premiers jours.",
      en: 'This badge honours the person who welcomed a new member and walked them through their first days.',
    },
    icone: 'Handshake',
    teinte: 'emerald',
    critere: {
      fr: 'Accompagner une personne qui vient de rejoindre le réseau.',
      en: 'Guide someone who has just joined the network.',
    },
  },
  {
    id: 'passeur-de-langue',
    nom: { fr: 'Passeur de langue', en: 'Language bearer' },
    description: {
      fr: "Ce badge salue la personne qui a traduit un texte de l'Observatoire pour qu'il rejoigne d'autres oreilles.",
      en: 'This badge honours the person who translated an Observatory text so it could reach other ears.',
    },
    icone: 'Languages',
    teinte: 'violet',
    critere: {
      fr: 'Traduire un texte publié vers une autre langue du territoire.',
      en: 'Translate a published text into another language of the territory.',
    },
  },
  {
    id: 'voix-anishinabe',
    nom: { fr: 'Voix anishinabe', en: 'Anishinabe voice' },
    description: {
      fr: "Ce badge salue la personne qui a porté la position anishinabe sur le territoire non cédé où se trouve le gisement.",
      en: 'This badge honours the person who carried the Anishinabe position on the unceded territory where the deposit lies.',
    },
    icone: 'Feather',
    teinte: 'violet',
    critere: {
      fr: 'Relayer une prise de position de la communauté anishinabe.',
      en: 'Relay a stand taken by the Anishinabe community.',
    },
  },
];

const PAR_ID: Record<string, Badge> = Object.fromEntries(
  CATALOGUE_BADGES.map((badge) => [badge.id, badge]),
);

/** Rend le badge du catalogue, ou `undefined` si l'identifiant est inconnu. */
export const badgeParId = (id: string): Badge | undefined => PAR_ID[id];

// --- Lecture ----------------------------------------------------------------

const LIMITE_ANNUAIRE = 200;

const enFiche = (uid: string, donnees: Record<string, unknown>): FicheBadges => {
  const brut = donnees.obtenus;
  const obtenus: Record<string, Timestamp | null> = {};
  if (brut && typeof brut === 'object') {
    for (const [id, valeur] of Object.entries(brut as Record<string, unknown>)) {
      // Un badge retire du catalogue ne remonte plus dans l'interface.
      if (!PAR_ID[id]) continue;
      obtenus[id] = valeur instanceof Timestamp ? valeur : null;
    }
  }
  const exposes = Array.isArray(donnees.exposes)
    ? (donnees.exposes as unknown[])
        .filter((id): id is string => typeof id === 'string' && id in obtenus)
        .slice(0, MAX_EXPOSES)
    : [];
  return {
    uid,
    obtenus,
    exposes,
    maj: donnees.maj instanceof Timestamp ? donnees.maj : null,
  };
};

const FICHE_VIDE = (uid: string): FicheBadges => ({ uid, obtenus: {}, exposes: [], maj: null });

/** Abonnement aux badges d'une personne. Rend la fonction de desabonnement. */
export function suivreBadges(
  uid: string,
  cb: (fiche: FicheBadges) => void,
  onErreur?: (message: string) => void,
): () => void {
  return onSnapshot(
    doc(db, 'badges', uid),
    (capture) => {
      cb(
        capture.exists()
          ? enFiche(capture.id, capture.data() as Record<string, unknown>)
          : FICHE_VIDE(uid),
      );
    },
    (erreur) => {
      if (onErreur) onErreur(erreur.message);
      else console.error('suivreBadges', erreur);
    },
  );
}

/** Abonnement a toutes les fiches de badges, pour l'annuaire. Rend le desabonnement. */
export function suivreTousLesBadges(
  cb: (parUid: Record<string, FicheBadges>) => void,
  onErreur?: (message: string) => void,
): () => void {
  return onSnapshot(
    query(collection(db, 'badges'), limit(LIMITE_ANNUAIRE)),
    (capture) => {
      const parUid: Record<string, FicheBadges> = {};
      capture.docs.forEach((d) => {
        parUid[d.id] = enFiche(d.id, d.data() as Record<string, unknown>);
      });
      cb(parUid);
    },
    (erreur) => {
      if (onErreur) onErreur(erreur.message);
      else console.error('suivreTousLesBadges', erreur);
    },
  );
}

// --- Ecriture ---------------------------------------------------------------

/**
 * Accorde un badge. Reserve a l'administration par la regle Firestore : un
 * membre ordinaire qui appelle cette fonction se fait refuser l'ecriture.
 */
export async function accorderBadge(uid: string, badgeId: string): Promise<void> {
  if (!PAR_ID[badgeId]) throw new Error(`Badge inconnu : ${badgeId}`);
  await setDoc(
    doc(db, 'badges', uid),
    { uid, obtenus: { [badgeId]: serverTimestamp() }, maj: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Retire un badge et le sort de la vitrine du meme coup. Reserve a
 * l'administration par la regle Firestore.
 */
export async function retirerBadge(uid: string, badgeId: string): Promise<void> {
  await updateDoc(doc(db, 'badges', uid), {
    [`obtenus.${badgeId}`]: deleteField(),
    exposes: arrayRemove(badgeId),
    maj: serverTimestamp(),
  });
}

/**
 * Choisit les badges de vitrine. La personne ecrit seulement ce champ, et la
 * liste est nettoyee, dedupliquee et coupee a trois avant l'appel.
 */
export async function exposerBadges(uid: string, ids: string[]): Promise<void> {
  const propre: string[] = [];
  for (const id of ids) {
    if (typeof id !== 'string' || !PAR_ID[id] || propre.includes(id)) continue;
    propre.push(id);
    if (propre.length === MAX_EXPOSES) break;
  }
  await setDoc(doc(db, 'badges', uid), { uid, exposes: propre, maj: serverTimestamp() }, { merge: true });
}
