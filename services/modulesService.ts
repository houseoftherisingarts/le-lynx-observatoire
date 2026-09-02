import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Interrupteurs des modules du réseau. Un seul document, lisible par tout le
 * monde et réglable depuis /admin par l'administration seulement. Un module
 * éteint disparaît de l'interface, ses données restent en place.
 */

export type CleModule = 'engagement' | 'soutien' | 'moderation' | 'badges' | 'galerie' | 'cellules';

export interface EtatModules {
  engagement: boolean;
  soutien: boolean;
  moderation: boolean;
  badges: boolean;
  galerie: boolean;
  cellules: boolean;
}

/** Ce que voit une personne quand rien n'a encore été réglé. */
export const MODULES_PAR_DEFAUT: EtatModules = {
  engagement: false,
  soutien: false,
  moderation: false,
  badges: true,
  galerie: true,
  cellules: true,
};

export const DESCRIPTIONS: Record<CleModule, { fr: string; en: string }> = {
  engagement: {
    fr: "Points d'engagement et classement des membres.",
    en: 'Engagement points and member ranking.',
  },
  soutien: {
    fr: "Fil de conversation entre un membre et l'équipe de l'Observatoire.",
    en: 'Conversation thread between a member and the Observatory team.',
  },
  moderation: {
    fr: 'File des signalements et gestion du direct, réservé à l\'administration.',
    en: 'Report queue and live-stream panel, restricted to the administration.',
  },
  badges: {
    fr: 'Badges honorifiques et vitrine sur la fiche de membre.',
    en: 'Honorific badges and the showcase on the member card.',
  },
  galerie: {
    fr: 'Galerie de photos du territoire déposées par les membres.',
    en: 'Gallery of territory photos submitted by members.',
  },
  cellules: {
    fr: 'Comités locaux par municipalité ou par métier.',
    en: 'Local committees by municipality or by trade.',
  },
};

export const NOMS: Record<CleModule, { fr: string; en: string }> = {
  engagement: { fr: 'Engagement', en: 'Engagement' },
  soutien: { fr: 'Soutien', en: 'Support' },
  moderation: { fr: 'Modération', en: 'Moderation' },
  badges: { fr: 'Badges', en: 'Badges' },
  galerie: { fr: 'Galerie', en: 'Gallery' },
  cellules: { fr: 'Cellules', en: 'Cells' },
};

const REF = () => doc(db, 'config', 'modules');

/** Abonnement en direct. Rend la fonction de désabonnement. */
export const suivreModules = (
  onChange: (etat: EtatModules) => void,
  onErreur?: (e: unknown) => void
): (() => void) =>
  onSnapshot(
    REF(),
    (snap) => {
      const brut = (snap.exists() ? snap.data() : {}) as Partial<EtatModules>;
      onChange({
        engagement: brut.engagement ?? MODULES_PAR_DEFAUT.engagement,
        soutien: brut.soutien ?? MODULES_PAR_DEFAUT.soutien,
        moderation: brut.moderation ?? MODULES_PAR_DEFAUT.moderation,
        badges: brut.badges ?? MODULES_PAR_DEFAUT.badges,
        galerie: brut.galerie ?? MODULES_PAR_DEFAUT.galerie,
        cellules: brut.cellules ?? MODULES_PAR_DEFAUT.cellules,
      });
    },
    (e) => {
      onErreur?.(e);
      onChange(MODULES_PAR_DEFAUT);
    }
  );

/** Réservé à l'administration; les règles Firestore refusent le reste. */
export const basculerModule = async (cle: CleModule, actif: boolean): Promise<void> => {
  await setDoc(REF(), { [cle]: actif, maj: serverTimestamp() }, { merge: true });
};
