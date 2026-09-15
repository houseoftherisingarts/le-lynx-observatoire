import type { EtapeVisite } from './VisiteGuidee';
import { ViewState } from '../types';

/**
 * La visite guidee du Lynx, offerte apres l'ecran de bienvenue des lettres
 * d'invitation. Chaque etape ouvre une section et cerne son entree de
 * navigation, marquee `data-visite` dans Navigation.tsx. Une ancre absente ne
 * casse rien : la carte se centre et la visite continue.
 */
export const ETAPES_VISITE: EtapeVisite[] = [
  {
    titre: 'Le tableau de bord',
    corps:
      "Tout ce qui bouge dans le dossier arrive ici, résumé chaque matin à partir des nouvelles versées dans la plateforme. C’est la page à ouvrir quand vous avez deux minutes.",
    ancre: ViewState.DASHBOARD,
  },
  {
    titre: 'La veille',
    corps:
      "Chaque matin, les fils des municipalités, de la MRC, de la compagnie et des médias régionaux sont relus et classés, si bien que la chronologie se tient à jour toute seule.",
    ancre: ViewState.NEWS,
  },
  {
    titre: 'La carte des claims',
    corps:
      'Les 485 titres miniers actifs sur la MRC de Papineau, dont les treize de Lomiko en rouge, sur une carte qui se déplace et se fouille comme une carte ordinaire.',
    ancre: ViewState.CLAIMS,
  },
  {
    titre: "L’aire protégée",
    corps:
      "Le projet de 115 kilomètres carrés présenté à Chénéville le 30 août, avec les sources au bout de chaque affirmation et l’état de la démarche à Québec.",
    ancre: ViewState.AIRE_PROTEGEE,
  },
  {
    titre: 'Le réseau',
    corps:
      "C’est ici que le monde se rassemble : le mur, les groupes de résistance par municipalité, les rassemblements dont les tâches s’affichent une par une, et la messagerie.",
    ancre: ViewState.RESEAU,
  },
  {
    titre: 'Votre fonds de documents',
    corps:
      "Chaque compte porte ses propres documents, que les autres membres consultent depuis votre fiche. Une personne qui appartient à un groupe reconnu par l’administration verse directement à la bibliothèque commune, et toutes les autres déclarent leur pièce, que l’administration publie ensuite.",
    ancre: ViewState.RESEAU,
  },
  {
    titre: 'La bibliothèque',
    corps:
      "Les pièces du dossier réunies au même endroit, avec le cadre juridique expliqué en langage clair juste à côté. Une application mobile est en route, pour que tout cela tienne aussi dans une poche.",
    ancre: ViewState.LIBRARY,
  },
];

export const LIBELLES_VISITE = {
  visite: 'Visite',
  etape: 'Étape',
  precedent: 'Précédent',
  suivant: 'Suivant',
  terminer: 'Terminer',
  quitter: 'Quitter',
};
