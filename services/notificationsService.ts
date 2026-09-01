import {
  Timestamp,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Cloche de l'Observatoire. Aucune collection ne lui appartient et aucune
 * ecriture n'est faite pour elle : elle agrege quatre abonnements qui existent
 * deja ailleurs dans le site, puis rend une liste unique.
 *
 * Collections lues, toutes en lecture seule :
 *   dms       messages prives non lus, via nonLus[monUid]
 *   amities   demandes d'alliance recues et encore en attente
 *   news      veille quotidienne, depuis la derniere visite de la cloche
 *   events    rendez-vous qui commencent dans les 48 prochaines heures
 *
 * La file `cellules/{id}/demandes` des cellules fondees par la personne n'est
 * pas suivie : elle demanderait un abonnement par cellule, donc autant de
 * lecteurs Firestore ouverts en permanence que la personne a fonde de
 * cellules, et un cinquieme type dans NotifItem. Pour l'ajouter plus tard :
 * suivre `cellules` avec where('fondateurUid','==',uid), garder la liste des
 * identifiants, ouvrir un onSnapshot par cellule sur `demandes` filtre a
 * statut == 'attente', et le refermer des que la cellule sort de la liste.
 *
 * Les libelles ne sont pas ecrits ici : le service ne rend que des donnees.
 * Quand `detail` est vide, c'est au composant de poser la phrase dans la
 * langue affichee.
 */

// --- Types ------------------------------------------------------------------

export type NotifType = 'message' | 'alliance' | 'veille' | 'evenement';

export interface NotifItem {
  id: string;
  type: NotifType;
  titre: string;
  /** Extrait tire des donnees. Vide quand la source n'en fournit aucun. */
  detail: string;
  /** Moment de reference, en millisecondes depuis epoch. Toujours dans le passe. */
  quand: number;
  /** Identifiant a ouvrir dans la vue de destination (pairId, id de veille, id d'evenement). */
  cible?: string;
}

export interface EtatNotifications {
  total: number;
  items: NotifItem[];
}

// --- Reglages ---------------------------------------------------------------

/** Cle de la derniere visite, gardee dans le navigateur de la personne. */
export const CLE_DERNIERE_VISITE = 'lynx:derniereVisiteCloche';

/** Fenetre d'annonce des rendez-vous : 48 heures. */
export const FENETRE_EVENEMENT_MS = 48 * 60 * 60 * 1000;

const LIMITE_ITEMS = 30;
const MAX_TITRE = 120;
const MAX_DETAIL = 160;

const LIMITE_DMS = 200;
const LIMITE_AMITIES = 300;
const LIMITE_NEWS = 40;
const LIMITE_EVENTS = 20;

// --- Petits outils ----------------------------------------------------------

const coupe = (valeur: unknown, max: number): string =>
  typeof valeur === 'string' ? valeur.trim().slice(0, max) : '';

/** Accepte un Timestamp Firestore, un nombre de millisecondes ou une date ISO. */
const enMillis = (valeur: unknown): number => {
  if (valeur instanceof Timestamp) return valeur.toMillis();
  if (typeof valeur === 'number' && Number.isFinite(valeur)) return valeur;
  if (typeof valeur === 'string') {
    const t = Date.parse(valeur);
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
};

// --- Derniere visite --------------------------------------------------------

/**
 * Moment de la derniere ouverture de la cloche, en millisecondes. Rend 0 quand
 * rien n'a encore ete enregistre ou que le stockage local est refuse.
 */
export const derniereVisite = (): number => {
  try {
    const brut = window.localStorage.getItem(CLE_DERNIERE_VISITE);
    const valeur = brut ? Number(brut) : 0;
    return Number.isFinite(valeur) && valeur > 0 ? valeur : 0;
  } catch {
    return 0;
  }
};

/**
 * Marque la cloche comme vue a l'instant et rend le moment inscrit. Le retour
 * reste utilisable meme si le navigateur refuse d'ecrire.
 */
export const marquerClocheVue = (): number => {
  const maintenant = Date.now();
  try {
    window.localStorage.setItem(CLE_DERNIERE_VISITE, String(maintenant));
  } catch {
    // Navigation privee ou stockage bloque : la cloche se videra pour la session.
  }
  return maintenant;
};

// --- Abonnement -------------------------------------------------------------

interface Paquets {
  message: NotifItem[];
  alliance: NotifItem[];
  veille: NotifItem[];
  evenement: NotifItem[];
}

interface DocConversation {
  participantUids?: string[];
  participantNoms?: Record<string, string>;
  dernierMessage?: string;
  majLe?: unknown;
  nonLus?: Record<string, number>;
}

interface DocAlliance {
  paire?: string[];
  de?: string;
  noms?: Record<string, string>;
  statut?: string;
  creeLe?: unknown;
  majLe?: unknown;
}

interface DocVeille {
  title?: string;
  source?: string;
  firstSeenAt?: unknown;
  sortDate?: string;
}

interface DocEvenement {
  title?: string;
  lieu?: string;
  dateDisplay?: string;
  startsAt?: number;
}

/**
 * Suit les quatre sources et rend l'etat complet a chaque changement. Les
 * items sont tries du plus recent au plus ancien et coupes a trente ; `total`
 * compte tout ce qui a ete trouve, meme au-dela de la trentaine.
 *
 * Rend la fonction de desabonnement, qui ferme les quatre lecteurs.
 */
export const suivreNotifications = (
  uid: string,
  cb: (etat: EtatNotifications) => void,
  onErreur?: (message: string) => void,
): Unsubscribe => {
  if (!uid) {
    cb({ total: 0, items: [] });
    return () => {};
  }

  // Un seul repere de temps pour tout l'abonnement. Il sert de date de repli
  // quand la source n'en porte aucune, et il borne la fenetre des rendez-vous.
  // Le figer evite qu'un item sans date reapparaisse apres « tout marquer lu ».
  const debutAbonnement = Date.now();

  const paquets: Paquets = { message: [], alliance: [], veille: [], evenement: [] };

  const emettre = (): void => {
    const tout = [
      ...paquets.message,
      ...paquets.alliance,
      ...paquets.veille,
      ...paquets.evenement,
    ].sort((a, b) => b.quand - a.quand);
    cb({ total: tout.length, items: tout.slice(0, LIMITE_ITEMS) });
  };

  /** Une source refusee se vide et laisse les trois autres vivre. */
  const echec = (source: keyof Paquets) => (erreur: unknown) => {
    paquets[source] = [];
    emettre();
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    if (onErreur) onErreur(message);
    else console.error(`suivreNotifications:${source}`, erreur);
  };

  // Messages prives non lus.
  const stopMessages = onSnapshot(
    query(collection(db, 'dms'), where('participantUids', 'array-contains', uid), limit(LIMITE_DMS)),
    (snap) => {
      const trouves: NotifItem[] = [];
      snap.docs.forEach((d) => {
        const data = d.data() as DocConversation;
        const nonLus = Number(data.nonLus?.[uid] ?? 0);
        if (!Number.isFinite(nonLus) || nonLus <= 0) return;
        const autre = (data.participantUids ?? []).find((u) => u !== uid) ?? '';
        trouves.push({
          id: `message:${d.id}`,
          type: 'message',
          titre: coupe(data.participantNoms?.[autre], MAX_TITRE) || 'Membre',
          detail: coupe(data.dernierMessage, MAX_DETAIL),
          // Une ecriture serveur encore en vol laisse majLe nul : sans repli, la
          // cloche jetterait un message non lu sans jamais le dire.
          quand: enMillis(data.majLe) || debutAbonnement,
          cible: d.id,
        });
      });
      paquets.message = trouves;
      emettre();
    },
    echec('message'),
  );

  // Demandes d'alliance recues et encore en attente.
  const stopAlliances = onSnapshot(
    query(collection(db, 'amities'), where('paire', 'array-contains', uid), limit(LIMITE_AMITIES)),
    (snap) => {
      const trouves: NotifItem[] = [];
      snap.docs.forEach((d) => {
        const data = d.data() as DocAlliance;
        const de = coupe(data.de, MAX_TITRE);
        if (data.statut !== 'demande' || !de || de === uid) return;
        trouves.push({
          id: `alliance:${d.id}`,
          type: 'alliance',
          titre: coupe(data.noms?.[de], MAX_TITRE) || 'Membre',
          detail: '',
          quand: enMillis(data.majLe) || enMillis(data.creeLe) || debutAbonnement,
          cible: d.id,
        });
      });
      paquets.alliance = trouves;
      emettre();
    },
    echec('alliance'),
  );

  // Veille parue depuis la derniere ouverture de la cloche.
  const stopVeille = onSnapshot(
    query(collection(db, 'news'), orderBy('sortDate', 'desc'), limit(LIMITE_NEWS)),
    (snap) => {
      const seuil = derniereVisite();
      const trouves: NotifItem[] = [];
      snap.docs.forEach((d) => {
        const data = d.data() as DocVeille;
        const vueLe = enMillis(data.firstSeenAt) || enMillis(data.sortDate);
        if (!vueLe || vueLe <= seuil) return;
        trouves.push({
          id: `veille:${d.id}`,
          type: 'veille',
          titre: coupe(data.title, MAX_TITRE) || 'Entrée de veille',
          detail: coupe(data.source, MAX_DETAIL),
          quand: vueLe,
          cible: d.id,
        });
      });
      paquets.veille = trouves;
      emettre();
    },
    echec('veille'),
  );

  // Rendez-vous des 48 prochaines heures. L'inegalite et le tri portent sur le
  // meme champ, donc aucun index composite n'est requis.
  const stopEvenements = onSnapshot(
    query(
      collection(db, 'events'),
      where('startsAt', '>=', debutAbonnement),
      orderBy('startsAt', 'asc'),
      limit(LIMITE_EVENTS),
    ),
    (snap) => {
      // Recalcule a chaque instantane : un onglet laisse ouvert deux jours
      // continuerait autrement d'annoncer des rendez-vous deja passes.
      const maintenant = Date.now();
      const jusqua = maintenant + FENETRE_EVENEMENT_MS;
      const trouves: NotifItem[] = [];
      snap.docs.forEach((d) => {
        const data = d.data() as DocEvenement;
        const debut = Number(data.startsAt ?? 0);
        if (!Number.isFinite(debut) || debut < maintenant || debut > jusqua) return;
        const lieu = coupe(data.lieu, MAX_DETAIL);
        const quandLu = coupe(data.dateDisplay, MAX_DETAIL);
        trouves.push({
          id: `evenement:${d.id}`,
          type: 'evenement',
          titre: coupe(data.title, MAX_TITRE) || 'Rendez-vous',
          detail: [quandLu, lieu].filter(Boolean).join(' · ').slice(0, MAX_DETAIL),
          // Moment ou le rendez-vous est entre dans la fenetre : toujours passe,
          // pour que le tri et le geste « tout marquer comme lu » tiennent.
          quand: debut - FENETRE_EVENEMENT_MS,
          cible: d.id,
        });
      });
      paquets.evenement = trouves;
      emettre();
    },
    echec('evenement'),
  );

  return () => {
    stopMessages();
    stopAlliances();
    stopVeille();
    stopEvenements();
  };
};
