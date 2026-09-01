import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Les documents du dossier La Loutre.
 * Collection Firestore : resources/{id}, filtree sur le champ type == 'document'.
 * Le meme paquet sert la lecture publique et l'ajout par l'administration.
 *
 * Les regles de securite exigent un champ « title » d'au plus 200 caracteres a la creation.
 * On ecrit donc « title » en meme temps que « titre », le premier pour la regle, le second
 * pour l'affichage. Le tri se fait cote client, ce qui evite un index composite
 * where + orderBy dans Firestore.
 */

export type TypeDocument =
  | 'rapport'
  | 'communique'
  | 'reglement'
  | 'article'
  | 'memoire'
  | 'carte';

export type FormatDocument = 'PDF' | 'page web' | 'audio';

export interface Document {
  id: string;
  titre: string;
  auteur: string;
  annee: number;
  type: TypeDocument;
  resume: string;
  url: string;
  format: FormatDocument;
  poids?: string;
  ajouteLe: string;
}

export interface NouveauDocument {
  titre: string;
  auteur: string;
  annee: number;
  type: TypeDocument;
  resume: string;
  url: string;
  format: FormatDocument;
  poids?: string;
}

const MAX_TITRE = 200;
const MAX_AUTEUR = 160;
const MAX_RESUME = 900;
const MAX_URL = 1200;
const MAX_POIDS = 24;

const TYPES: readonly TypeDocument[] = [
  'rapport',
  'communique',
  'reglement',
  'article',
  'memoire',
  'carte',
];

const FORMATS: readonly FormatDocument[] = ['PDF', 'page web', 'audio'];

export const TYPES_DOCUMENT = TYPES;
export const FORMATS_DOCUMENT = FORMATS;

const LIBELLES_TYPE: Record<TypeDocument, { fr: string; en: string }> = {
  rapport: { fr: 'Rapport', en: 'Report' },
  communique: { fr: 'Communiqué', en: 'Press release' },
  reglement: { fr: 'Règlement', en: 'Bylaw' },
  article: { fr: 'Article', en: 'Article' },
  memoire: { fr: 'Mémoire', en: 'Brief' },
  carte: { fr: 'Carte', en: 'Map' },
};

export const libelleType = (t: TypeDocument, langue: 'fr' | 'en' | 'ani'): string =>
  LIBELLES_TYPE[t]?.[langue === 'en' ? 'en' : 'fr'] ?? t;

const TONS_TYPE: Record<TypeDocument, string> = {
  rapport: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50',
  communique: 'bg-sky-950/40 text-sky-300 border-sky-800/50',
  reglement: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
  article: 'bg-cyan-950/40 text-cyan-300 border-cyan-800/50',
  memoire: 'bg-violet-950/40 text-violet-300 border-violet-800/50',
  carte: 'bg-slate-800/60 text-slate-300 border-slate-600/50',
};

export const tonType = (t: TypeDocument): string => TONS_TYPE[t] ?? TONS_TYPE.carte;

const texte = (valeur: string | undefined, max: number): string =>
  (valeur ?? '').trim().slice(0, max);

const estType = (valeur: unknown): valeur is TypeDocument =>
  typeof valeur === 'string' && (TYPES as readonly string[]).includes(valeur);

const estFormat = (valeur: unknown): valeur is FormatDocument =>
  typeof valeur === 'string' && (FORMATS as readonly string[]).includes(valeur);

/** Seules les adresses http et https partent vers un nouvel onglet. */
export const urlSure = (valeur: string): boolean => {
  try {
    const protocole = new URL(valeur).protocol;
    return protocole === 'http:' || protocole === 'https:';
  } catch {
    return false;
  }
};

/**
 * Le fonds de depart, verifie adresse par adresse le 1er septembre 2026.
 * Il s'affiche tant que la collection Firestore ne rend rien, et il reste
 * le repli quand la lecture echoue.
 */
export const DOCUMENTS_DE_DEPART: Document[] = [
  {
    id: 'pfs-la-loutre-2026',
    titre: "Étude de préfaisabilité NI 43-101 du projet La Loutre",
    auteur: 'DRA Americas pour Lomiko Metals',
    annee: 2026,
    type: 'rapport',
    resume:
      "Le rapport technique déposé le 8 mai 2026 chiffre des réserves probables de 46,8 millions de tonnes à 4,79 pour cent de carbone graphitique, soit 2,24 millions de tonnes de graphite contenu. Il décrit une fosse à ciel ouvert exploitée sur vingt-huit ans, avec la halde à stériles, le parc à résidus et les infrastructures que cela suppose.",
    url: 'https://lomiko.com/wp-content/uploads/2026/05/I6976-PFS-LaLoutre.pdf',
    format: 'PDF',
    poids: '14 Mo',
    ajouteLe: '2026-09-01',
  },
  {
    id: 'guide-citoyen-eau-secours-2024',
    titre: "Guide citoyen sur les impacts de l'industrie minière",
    auteur: 'Eau Secours, Coalition Québec meilleure mine et MiningWatch Canada',
    annee: 2024,
    type: 'rapport',
    resume:
      "Le manuel suit un projet minier depuis le jalonnement du claim jusqu'à la restauration du site, et nomme à chaque étape ce qu'une population peut exiger. Une bonne partie du document porte sur l'eau, les résidus et les recours ouverts aux citoyens.",
    url: 'https://eausecours.org/wp-content/uploads/2024/11/GuideCitoyen_FR_Final_oct2024.pdf',
    format: 'PDF',
    poids: '12 Mo',
    ajouteLe: '2026-09-01',
  },
  {
    id: 'alliance-actions-concretes',
    titre: "Les actions concrètes de l'Alliance Petite-Nation Nord",
    auteur: 'Alliance des municipalités Petite-Nation Nord',
    annee: 2026,
    type: 'communique',
    resume:
      "La page officielle retrace les assemblées publiques, la formation du comité d'évaluation indépendant et le référendum consultatif du 31 août 2025. Elle donne aussi accès aux comptes rendus du comité, réunion par réunion.",
    url: 'https://alliancepetitenation.org/les-actions-concretes/',
    format: 'page web',
    ajouteLe: '2026-09-01',
  },
  {
    id: 'alliance-constitution-comite',
    titre: "Document de constitution du comité d'évaluation",
    auteur: 'Alliance des municipalités Petite-Nation Nord',
    annee: 2025,
    type: 'reglement',
    resume:
      "Le document fixe le mandat, la composition et les règles de fonctionnement du comité chargé d'évaluer le projet pour le compte des cinq municipalités. On y trouve les organismes qui y siègent, de la chambre de commerce à Tourisme Outaouais.",
    url: 'https://alliancepetitenation.org/wp-content/uploads/Document-de-constitution-du-Comite-devaluation.pdf',
    format: 'PDF',
    poids: '138 ko',
    ajouteLe: '2026-09-01',
  },
  {
    id: 'alliance-compte-rendu-2026-02-25',
    titre: "Comité d'évaluation, compte rendu du 25 février 2026",
    auteur: 'Alliance des municipalités Petite-Nation Nord',
    annee: 2026,
    type: 'rapport',
    resume:
      "Le compte rendu de la dernière rencontre publiée du comité d'évaluation. Il montre où en était la réflexion des organismes régionaux quelques semaines avant la déclaration d'incompatibilité de la MRC de Papineau.",
    url: 'https://alliancepetitenation.org/wp-content/uploads/Comite-devaluation-Compte-rendu-du-25-fevrier-2026.pdf',
    format: 'PDF',
    poids: '1,1 Mo',
    ajouteLe: '2026-09-01',
  },
  {
    id: 'mrc-papineau-memoire-tiam',
    titre: "Mémoire de la MRC de Papineau sur les territoires incompatibles",
    auteur: 'MRC de Papineau',
    annee: 2024,
    type: 'memoire',
    resume:
      "La MRC y explique que la liste d'activités et les critères de l'orientation gouvernementale ne tiennent pas assez compte des particularités de son territoire. C'est la pièce qui a préparé sa position sur l'activité minière.",
    url: 'https://mrcpapineau.com/la-mrc-de-papineau-depose-un-memoire-concernant-les-territoires-incompatibles-avec-lactivite-miniere/',
    format: 'page web',
    ajouteLe: '2026-09-01',
  },
  {
    id: 'mrc-papineau-sadr',
    titre: "Schéma d'aménagement et de développement révisé",
    auteur: 'MRC de Papineau',
    annee: 2025,
    type: 'reglement',
    resume:
      "Le règlement 159-2017 dans sa version administrative mise à jour le 24 novembre 2025. C'est le document qui gouverne l'affectation du territoire de la MRC, et donc le cadre dans lequel se juge la compatibilité d'une mine.",
    url: 'https://mrcpapineau.com/wp-content/uploads/2025/11/sadr-en-vigueur-21-02-2018-version-administrative-vf-maj-24-11-2025.pdf',
    format: 'PDF',
    poids: '15 Mo',
    ajouteLe: '2026-09-01',
  },
  {
    id: 'mrc-papineau-carte16-tiam',
    titre: 'Carte 16, territoires incompatibles avec l’activité minière',
    auteur: 'MRC de Papineau',
    annee: 2025,
    type: 'carte',
    resume:
      "La carte des terres publiques que la MRC considère incompatibles avec l'activité minière, dans sa mise à jour d'octobre 2025. Elle se lit avec le schéma d'aménagement, dont elle est une annexe.",
    url: 'https://mrcpapineau.com/wp-content/uploads/2025/10/carte16-tiam-terrespubliques-maj-octobre-2025.pdf',
    format: 'PDF',
    poids: '1,7 Mo',
    ajouteLe: '2026-09-01',
  },
  {
    id: 'mrc-papineau-revision-sad-2026',
    titre: "Version préliminaire de la révision du schéma d'aménagement",
    auteur: 'MRC de Papineau',
    annee: 2026,
    type: 'reglement',
    resume:
      "La version préliminaire déposée le 20 mai 2026, un mois après la déclaration d'incompatibilité de l'activité minière. Elle donne à lire comment la MRC compte inscrire cette position dans son cadre d'aménagement.",
    url: 'https://mrcpapineau.com/wp-content/uploads/2026/06/mrc-papineau-revision-sad-vp-deposee-20-05-2026.pdf',
    format: 'PDF',
    poids: '1,9 Mo',
    ajouteLe: '2026-09-01',
  },
  {
    id: 'ldl-droit-environnement-sain-2026',
    titre: 'Face au projet minier La Loutre, défendre le droit à un environnement sain',
    auteur: 'Revue Droits et libertés, Ligue des droits et libertés',
    annee: 2026,
    type: 'article',
    resume:
      "Un entretien avec Louis St-Hilaire, du Regroupement de protection des lacs de la Petite-Nation, recueilli par Léanne Rheault. L'article situe la mobilisation dans le cadre du droit à un environnement sain reconnu au Québec.",
    url: 'https://liguedesdroits.ca/revue-face-au-projet-minier-la-loutre-defendre-le-droit-a-un-environnement-sain/',
    format: 'page web',
    ajouteLe: '2026-09-01',
  },
  {
    id: 'cqde-reforme-loi-mines',
    titre: 'Réforme de la Loi sur les mines, quels changements et quels enjeux',
    auteur: "Centre québécois du droit de l'environnement",
    annee: 2024,
    type: 'article',
    resume:
      "La fiche du CQDE décortique le projet de loi 63 et ce qu'il change au régime des claims, aux pouvoirs des municipalités et à l'évaluation environnementale. Elle nomme aussi les protections que les groupes environnementaux jugent insuffisantes.",
    url: 'https://cqde.org/nouvelles/reforme-loi-mines/',
    format: 'page web',
    ajouteLe: '2026-09-01',
  },
  {
    id: 'assnat-projet-loi-63',
    titre: 'Projet de loi 63, Loi modifiant la Loi sur les mines',
    auteur: 'Assemblée nationale du Québec',
    annee: 2024,
    type: 'reglement',
    resume:
      "Le texte législatif lui-même, avec l'historique de son cheminement parlementaire. Il remplace le claim par un droit exclusif d'exploration et redéfinit ce qu'une municipalité peut soustraire à l'activité minière.",
    url: 'https://www.assnat.qc.ca/fr/travaux-parlementaires/projets-loi/projet-loi-63-43-1.html',
    format: 'page web',
    ajouteLe: '2026-09-01',
  },
  {
    id: 'apls-dossier-la-loutre',
    titre: 'Dossier La Loutre de l’Association des propriétaires du lac Simon',
    auteur: 'Association des propriétaires du lac Simon',
    annee: 2026,
    type: 'article',
    resume:
      "L'association tient depuis des années la chronologie du projet vue du lac Simon, avec ses lettres, ses séances d'information et ses prises de position. C'est la mémoire longue du dossier du côté des riverains.",
    url: 'https://www.apls.ca/dossiers/projet-la-loutre',
    format: 'page web',
    ajouteLe: '2026-09-01',
  },
  {
    id: 'lomiko-entente-gbm-2026',
    titre: 'Entente définitive de vente de Lomiko à Global Battery Materials',
    auteur: 'Lomiko Metals',
    annee: 2026,
    type: 'communique',
    resume:
      "Le communiqué du 28 juillet 2026 annonce l'acquisition de Lomiko à 0,13 dollar l'action, une transaction d'environ 11 millions de dollars canadiens. Le vote des détenteurs de titres est fixé au 23 septembre 2026.",
    url: 'https://lomiko.com/2026-news/lomiko-metals-enters-into-definitive-agreement-to-be-acquired-by-global-battery-materials/',
    format: 'page web',
    ajouteLe: '2026-09-01',
  },
];

/** Le plus recent en premier, puis l'annee, puis le titre. */
const parFraicheur = (a: Document, b: Document): number =>
  b.ajouteLe.localeCompare(a.ajouteLe) ||
  b.annee - a.annee ||
  a.titre.localeCompare(b.titre, 'fr');

const versDocument = (id: string, data: Record<string, unknown>): Document => {
  const annee = Number(data.annee);
  return {
    id,
    titre: texte(
      (typeof data.titre === 'string' ? data.titre : (data.title as string)) ?? '',
      MAX_TITRE
    ),
    auteur: texte(typeof data.auteur === 'string' ? data.auteur : '', MAX_AUTEUR),
    annee: Number.isFinite(annee) ? annee : new Date().getFullYear(),
    type: estType(data.type_document) ? data.type_document : 'rapport',
    resume: texte(typeof data.resume === 'string' ? data.resume : '', MAX_RESUME),
    url: texte(typeof data.url === 'string' ? data.url : '', MAX_URL),
    format: estFormat(data.format) ? data.format : 'page web',
    poids: typeof data.poids === 'string' && data.poids ? texte(data.poids, MAX_POIDS) : undefined,
    ajouteLe: typeof data.ajouteLe === 'string' ? data.ajouteLe : '',
  };
};

/**
 * Abonnement en direct au fonds documentaire.
 * Tant que Firestore ne rend aucun document, la liste de depart tient lieu de fonds.
 * Rend la fonction de desabonnement, a appeler dans le retour du useEffect.
 */
export const suivreBibliotheque = (
  onChange: (documents: Document[]) => void,
  onErreur?: (erreur: Error) => void
): (() => void) =>
  onSnapshot(
    query(collection(db, 'resources'), where('type', '==', 'document')),
    (snap) => {
      const liste = snap.docs
        .map((d) => versDocument(d.id, d.data() as Record<string, unknown>))
        .filter((d) => d.titre !== '' && urlSure(d.url));
      onChange(liste.length > 0 ? liste.sort(parFraicheur) : DOCUMENTS_DE_DEPART);
    },
    (erreur) => {
      onChange(DOCUMENTS_DE_DEPART);
      onErreur?.(erreur);
    }
  );

/**
 * Ajout d'un document. Reserve a l'administration par les regles de securite.
 * Le champ « title » est ecrit pour satisfaire la regle de creation de /resources,
 * et « type » vaut toujours 'document' pour que la requete de lecture retrouve la piece.
 */
export const ajouterDocument = async (data: NouveauDocument): Promise<string> => {
  const titre = texte(data.titre, MAX_TITRE);
  const url = texte(data.url, MAX_URL);
  if (!titre) {
    throw new Error('Le titre du document est requis.');
  }
  if (!urlSure(url)) {
    throw new Error('L’adresse doit être une adresse web complète, en http ou en https.');
  }
  const annee = Number(data.annee);
  const ref = await addDoc(collection(db, 'resources'), {
    type: 'document',
    title: titre,
    titre,
    auteur: texte(data.auteur, MAX_AUTEUR),
    annee: Number.isFinite(annee) ? annee : new Date().getFullYear(),
    type_document: estType(data.type) ? data.type : 'rapport',
    resume: texte(data.resume, MAX_RESUME),
    url,
    format: estFormat(data.format) ? data.format : 'page web',
    poids: texte(data.poids, MAX_POIDS),
    ajouteLe: new Date().toISOString().slice(0, 10),
    creeLe: serverTimestamp(),
  });
  return ref.id;
};

/** Retrait d'un document. Reserve a l'administration par les regles de securite. */
export const supprimerDocument = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'resources', id));
};
