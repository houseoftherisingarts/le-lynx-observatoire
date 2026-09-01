import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Ligne du temps du dossier La Loutre.
 * Collection Firestore : chronologie/{id}.
 *
 * Le champ `date` est une chaine partielle en ordre ISO : '1988', '2013-11' ou '2025-08-31'.
 * Elle se trie lexicographiquement dans le bon ordre parce que l'annee vient toujours en premier,
 * ce qui evite de fabriquer un Timestamp pour un jalon dont on ne connait que l'annee.
 * Le champ `ordre` ne sert qu'a departager deux jalons de meme date.
 *
 * `verifie` dit si la source a ete ouverte et lue. Rien d'autre ne doit porter une mention
 * de verification a l'ecran.
 */

export type CategorieJalon =
  | 'projet'
  | 'municipal'
  | 'gouvernement'
  | 'mobilisation'
  | 'autochtone'
  | 'precedent';

export interface Jalon {
  id: string;
  date: string;
  titre: string;
  recit: string;
  categorie: CategorieJalon;
  source: string;
  url: string;
  verifie: boolean;
  ordre: number;
}

export type NouveauJalon = Omit<Jalon, 'id'>;

const CATEGORIES: readonly CategorieJalon[] = [
  'projet',
  'municipal',
  'gouvernement',
  'mobilisation',
  'autochtone',
  'precedent',
];

const MAX_TITRE = 200;
const MAX_RECIT = 4000;
const MAX_COURT = 200;
const MAX_URL = 1000;
const LIMITE_LECTURE = 60;

const texte = (valeur: unknown, max: number): string =>
  typeof valeur === 'string' ? valeur.trim().slice(0, max) : '';

const categorieValide = (valeur: unknown): CategorieJalon =>
  CATEGORIES.includes(valeur as CategorieJalon) ? (valeur as CategorieJalon) : 'projet';

/** Plus recent en haut. `ordre` decroissant departage deux jalons de meme date. */
export const trierJalons = (jalons: readonly Jalon[]): Jalon[] =>
  [...jalons].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.ordre - a.ordre;
  });

/**
 * Abonnement en direct a la chronologie.
 * Rend la fonction de desabonnement, a appeler dans le retour du useEffect.
 */
export const suivreChronologie = (
  onChange: (jalons: Jalon[]) => void,
  onErreur?: (erreur: Error) => void
): (() => void) =>
  onSnapshot(
    query(collection(db, 'chronologie'), orderBy('date', 'desc'), limit(LIMITE_LECTURE)),
    (snap) => {
      const liste = snap.docs.map((d) => {
        const data = d.data() as Partial<Jalon>;
        return {
          id: d.id,
          date: texte(data.date, 20),
          titre: texte(data.titre, MAX_TITRE),
          recit: texte(data.recit, MAX_RECIT),
          categorie: categorieValide(data.categorie),
          source: texte(data.source, MAX_COURT),
          url: texte(data.url, MAX_URL),
          verifie: data.verifie === true,
          ordre: typeof data.ordre === 'number' ? data.ordre : 0,
        } satisfies Jalon;
      });
      onChange(trierJalons(liste));
    },
    (erreur) => onErreur?.(erreur)
  );

/** Reserve a l'administration. Rend l'identifiant du document cree. */
export const ajouterJalon = async (data: NouveauJalon): Promise<string> => {
  const date = texte(data.date, 20);
  const titre = texte(data.titre, MAX_TITRE);
  if (!/^\d{4}(-\d{2}){0,2}$/.test(date)) {
    throw new Error("La date doit s'écrire 1988, 2013-11 ou 2025-08-31.");
  }
  if (titre.length < 5) {
    throw new Error('Le titre du jalon est requis.');
  }
  const ref = await addDoc(collection(db, 'chronologie'), {
    date,
    titre,
    recit: texte(data.recit, MAX_RECIT),
    categorie: categorieValide(data.categorie),
    source: texte(data.source, MAX_COURT),
    url: texte(data.url, MAX_URL),
    verifie: data.verifie === true,
    ordre: typeof data.ordre === 'number' ? data.ordre : 0,
  });
  return ref.id;
};

/** Reserve a l'administration. Ne touche que les champs fournis. */
export const majJalon = async (id: string, champs: Partial<NouveauJalon>): Promise<void> => {
  const patch: Record<string, string | number | boolean> = {};
  if (champs.date !== undefined) patch.date = texte(champs.date, 20);
  if (champs.titre !== undefined) patch.titre = texte(champs.titre, MAX_TITRE);
  if (champs.recit !== undefined) patch.recit = texte(champs.recit, MAX_RECIT);
  if (champs.categorie !== undefined) patch.categorie = categorieValide(champs.categorie);
  if (champs.source !== undefined) patch.source = texte(champs.source, MAX_COURT);
  if (champs.url !== undefined) patch.url = texte(champs.url, MAX_URL);
  if (champs.verifie !== undefined) patch.verifie = champs.verifie === true;
  if (champs.ordre !== undefined) patch.ordre = Number(champs.ordre) || 0;
  if (Object.keys(patch).length === 0) return;
  await updateDoc(doc(db, 'chronologie', id), patch);
};

/** Reserve a l'administration. */
export const supprimerJalon = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'chronologie', id));
};

const MOIS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

const MOIS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** '2025-08-31' devient '31 août 2025' en francais et 'August 31, 2025' en anglais. '1988' reste '1988'. */
export const formaterDate = (date: string, francais: boolean): string => {
  const [annee, mois, jour] = date.split('-');
  if (!annee) return date;
  if (!mois) return annee;
  const nomMois = (francais ? MOIS_FR : MOIS_EN)[Number(mois) - 1];
  if (!nomMois) return annee;
  if (!jour) return `${nomMois} ${annee}`;
  return francais ? `${Number(jour)} ${nomMois} ${annee}` : `${nomMois} ${Number(jour)}, ${annee}`;
};

/**
 * Repli local, affiche quand la collection Firestore est encore vide.
 * Ce tableau ne s'ecrit jamais dans Firestore, il ne fait que remplir l'ecran.
 * Chaque jalon a ete ouvert et lu le 1er septembre 2026, sauf celui de 1988,
 * marque non verifie parce qu'il ne repose que sur le recit d'un groupe citoyen.
 */
export const JALONS_DE_DEPART: readonly Jalon[] = [
  {
    id: 'soquem-1988',
    date: '1988',
    titre: 'SOQUEM prend les premiers claims sur le gisement de graphite',
    recit:
      "Selon l'historique publié par le Regroupement de protection des lacs de la Petite-Nation, ce sont les claims pris en 1988 par SOQUEM, filiale d'Investissement Québec, qui ouvrent le dossier sur ce territoire. Le gisement passe ensuite entre les mains de Canada Strategic Metals avant d'aboutir chez Lomiko Metals. Cette généalogie explique pourquoi les titres miniers couvrent aujourd'hui un secteur habité et fréquenté depuis des décennies par des villégiateurs. Je marque ce jalon comme non vérifié parce que l'année de 1988 ne repose ici que sur le récit du groupe citoyen, sans confirmation par le registre GESTIM du ministère des Ressources naturelles ni par une source gouvernementale que j'aurais pu ouvrir.",
    categorie: 'projet',
    source: 'Regroupement de protection des lacs de la Petite-Nation',
    url: 'https://protectionpetitenation.com/en/lomiko-projects-history/',
    verifie: false,
    ordre: 1,
  },
  {
    id: 'option-lomiko-2015',
    date: '2015-02-06',
    titre: 'Lomiko Metals prend une option sur La Loutre auprès de Canada Strategic Metals',
    recit:
      "L'entente d'option sur la propriété La Loutre est datée du 6 février 2015 et annoncée le 9 février. Elle donne à Lomiko le droit exclusif d'acquérir une participation additionnelle de 40 % dans La Loutre et de 80 % dans Lac des Îles, contre 10 000 $, l'émission de 3 000 000 d'actions ordinaires et 2,75 millions de dollars de dépenses d'exploration sur deux ans. Canada Strategic Metals, qui cherchait alors à se départir de ses actifs de graphite, conservait une participation non diluable de 20 %. C'est le moment où le projet cesse d'être un actif dormant et entre dans un cycle d'exploration financé.",
    categorie: 'projet',
    source: 'Investing News Network',
    url: 'https://investingnews.com/daily/resource-investing/battery-metals-investing/graphite-investing/canada-strategic-metals-lomiko-metals-new-option-agreement/',
    verifie: true,
    ordre: 3,
  },
  {
    id: 'riverains-duhamel-2019',
    date: '2019-07-26',
    titre: 'Les premiers résidents montent au front à Duhamel',
    recit:
      "Radio-Canada consacre le 26 juillet 2019 un reportage aux inquiétudes des riverains devant un projet de mine de graphite entre Duhamel et Lac-des-Plages. Bernard Descôteaux, propriétaire de chalet depuis vingt ans, y résume la crainte centrale du dossier, celle de la contamination de la nappe phréatique puis des lacs et des rivières. Louis St-Hilaire, porte-parole d'un groupe de protection des lacs, y oppose l'économie réelle de la région, qui vit de villégiature et d'écotourisme. Le président-directeur général de Lomiko, A. Paul Gill, répond qu'il n'y a pas encore de projet et qu'aucune mine ne verrait le jour avant 2023. Le maire de Duhamel, David Pharand, demande dès ce moment un comité régional pour aller chercher l'information.",
    categorie: 'mobilisation',
    source: 'Radio-Canada',
    url: 'https://ici.radio-canada.ca/nouvelle/1236889/projet-mine-graphite-duhamel-outaouais-lomiko-metals-petite-nation',
    verifie: true,
    ordre: 7,
  },
  {
    id: 'lomiko-100-pourcent-2021',
    date: '2021-01-31',
    titre: 'Lomiko devient propriétaire à 100 % de La Loutre',
    recit:
      "Lomiko complète l'option en versant 1 125 000 $ à Quebec Precious Metals, l'ancienne Canada Strategic Metals, et devient seule propriétaire du gisement. L'entreprise annonce du même souffle qu'elle vise le graphite sphérique destiné aux anodes de batteries lithium-ion, en misant sur une demande qu'elle dit appelée à croître de 500 % d'ici 2040. Le communiqué annonce aussi qu'une étude économique préliminaire sera commandée pour établir un modèle d'affaires. À partir de là, le dossier n'a plus qu'un seul interlocuteur en face des municipalités.",
    categorie: 'projet',
    source: 'Investing News Network',
    url: 'https://investingnews.com/news/graphite-investing/lomiko-completes-100-la-loutre-purchase-and-sets-targets-on-spherical-graphite-for-anodes-production-strategy/',
    verifie: true,
    ordre: 8,
  },
  {
    id: 'etude-economique-preliminaire-2021',
    date: '2021-07-29',
    titre: "L'étude économique préliminaire chiffre une mine de quinze ans",
    recit:
      "L'étude économique préliminaire réalisée par Ausenco Engineering Canada décrit une fosse à ciel ouvert exploitée sur 14,7 ans. Elle prévoit une production annuelle moyenne de 97 400 tonnes de concentré de graphite, soit 1,4 million de tonnes sur la vie de la mine, pour un investissement initial de 236,1 millions de dollars canadiens. La valeur actualisée nette après impôts est établie à 186 millions et le taux de rendement interne à 21,5 %, sur la base d'un prix de 916 dollars la tonne. Ce sont ces chiffres qui serviront de référence à toute la région pendant cinq ans, jusqu'à ce que la préfaisabilité de 2026 les double.",
    categorie: 'projet',
    source: 'Ahead of the Herd',
    url: 'https://aheadoftheherd.com/lomiko-metals-looks-to-build-on-positive-pea-for-la-loutre-graphite-project/',
    verifie: true,
    ordre: 9,
  },
  {
    id: 'mrc-moratoire-2022',
    date: '2022-08-18',
    titre: 'La MRC de Papineau réclame un moratoire sur le développement minier',
    recit:
      "Les maires de la MRC de Papineau adoptent une résolution accompagnant un troisième mémoire au gouvernement du Québec. Ils demandent la protection de toutes les terres agricoles, l'assujettissement de toute nouvelle mine à une évaluation environnementale et à des audiences du BAPE, et un moratoire dans les régions de villégiature tant que les territoires incompatibles avec l'activité minière ne sont pas délimités. Le préfet Benoit Lauzon précise que la MRC ne s'oppose pas aux projets en cours et qu'elle veut des mines aux bons endroits. La coalition Pour que le Québec ait meilleure mine chiffrait alors à 211 % en dix-huit mois la hausse des claims en Outaouais.",
    categorie: 'municipal',
    source: 'Radio-Canada',
    url: 'https://ici.radio-canada.ca/nouvelle/1906253/outaouais-memoire-delimitations-developpement-minier-hausse-claims',
    verifie: true,
    ordre: 10,
  },
  {
    id: 'alliance-fondation-2023',
    date: '2023-12-20',
    titre: "Cinq municipalités fondent l'Alliance des municipalités Petite-Nation Nord",
    recit:
      "Lac-des-Plages, Duhamel, Saint-Émile-de-Suffolk, Lac-Simon et Chénéville adoptent une déclaration commune et mettent leurs voix et leurs moyens ensemble. L'Alliance se donne pour mandat de devenir une force politique capable de faire contrepoids à Lomiko, d'embaucher une ressource spécialisée et de servir d'interlocuteur unique entre les citoyens, les gouvernements et l'entreprise. Elle annonce d'emblée qu'elle veut mesurer l'acceptabilité sociale, éventuellement par référendum, en s'appuyant sur l'engagement pris par François Legault en 2022. David Pharand, maire de Duhamel, en devient le porte-parole. Namur et Ripon manifesteront plus tard leur intérêt sans être membres.",
    categorie: 'municipal',
    source: 'MRC de Papineau',
    url: 'https://mrcpapineau.com/des-municipalites-sallient-pour-se-defendre-contre-le-boom-minier/',
    verifie: true,
    ordre: 11,
  },
  {
    id: 'financement-dod-rncan-2024',
    date: '2024-05-16',
    titre: 'Washington et Ottawa financent les études de La Loutre',
    recit:
      "Lomiko annonce une subvention de 8,35 millions de dollars américains du département de la Défense des États-Unis, accordée par entente d'investissement technologique en vertu du titre III du Defense Production Act et financée par l'Inflation Reduction Act. L'entreprise doit verser une contrepartie équivalente sur cinq ans, ce qui porte l'entente totale à 16,7 millions de dollars américains. Ressources naturelles Canada y ajoute 4,9 millions de dollars canadiens non remboursables sur trois ans, dans le cadre du programme de recherche et développement sur les minéraux critiques. Le plan de travail prévoit une étude de préfaisabilité, un échantillon en vrac et des essais métallurgiques, puis une étude de faisabilité définitive. C'est ce financement militaire américain qui va cristalliser l'opposition régionale.",
    categorie: 'gouvernement',
    source: 'Lomiko Metals',
    url: 'https://lomiko.com/2024-news/lomiko-metals-awarded-us8-35m-grant-from-the-united-states-of-america-department-of-defense-dod-in-a-technology-investment-agreement-tia-and-funding-of-ca4-9m/',
    verifie: true,
    ordre: 12,
  },
  {
    id: 'lomiko-retrait-rencontres-2024',
    date: '2024-08-16',
    titre: "Lomiko se retire des rencontres publiques de l'Alliance",
    recit:
      "Après une première séance tenue en juillet à Duhamel devant des centaines de citoyens, l'entreprise annonce qu'elle ne participera plus aux rencontres d'information organisées par l'Alliance. Deux séances restaient au calendrier, le 25 août à Chénéville et le 15 septembre à Saint-Émile-de-Suffolk. Lomiko dit vouloir poursuivre ses échanges dans un format différent, en petits groupes. Le maire David Pharand y voit une volonté d'informer la population sans avoir à débattre du projet. Les municipalités tiendront les séances quand même, en consignant les questions des citoyens pour les transmettre à l'entreprise.",
    categorie: 'mobilisation',
    source: 'Radio-Canada',
    url: 'https://ici.radio-canada.ca/nouvelle/2097402/lomiko-metals-retire-rencontres-projet-loutre',
    verifie: true,
    ordre: 13,
  },
  {
    id: 'quebec-refus-financement-2024',
    date: '2024-09-16',
    titre: "Québec annonce qu'il ne financera pas La Loutre",
    recit:
      "À Gatineau, le ministre responsable de l'Outaouais, Mathieu Lacombe, déclare que le projet minier de Lomiko n'a pas son appui ni celui du gouvernement. Le cabinet de la ministre des Ressources naturelles, Maïté Blanchette Vézina, précise que la demande d'aide financière déposée à Investissement Québec ne satisfaisait pas aux critères d'acceptabilité sociale et que le promoteur n'était pas parvenu à informer la population ni à obtenir son adhésion. La décision découle de l'engagement électoral de la Coalition avenir Québec voulant qu'aucun projet minier n'aille de l'avant sans acceptabilité sociale. Le refus ne retire aucun titre minier à l'entreprise et ne touche ni le financement américain ni le financement fédéral.",
    categorie: 'gouvernement',
    source: 'Radio-Canada',
    url: 'https://ici.radio-canada.ca/nouvelle/2104875/acceptabilite-sociale-mines-la-loutre',
    verifie: true,
    ordre: 14,
  },
  {
    id: 'loi-63-sanctionnee-2024',
    date: '2024-11-29',
    titre: 'La réforme de la Loi sur les mines est sanctionnée',
    recit:
      "Le projet de loi 63, Loi modifiant la Loi sur les mines et d'autres dispositions, présenté le 28 mai 2024 par la ministre Maïté Blanchette Vézina, est adopté le 28 novembre et sanctionné le 29 novembre 2024. Il devient le chapitre 36 des lois de 2024 et entre en vigueur le jour de sa sanction, sauf exceptions. La réforme assujettit notamment les nouveaux projets miniers à la procédure d'évaluation et d'examen des impacts sur l'environnement et encadre la délimitation des territoires incompatibles avec l'activité minière par les MRC. La Coalition Québec meilleure mine lui a reproché de ne pas exiger le consentement des communautés avant l'octroi des droits miniers.",
    categorie: 'gouvernement',
    source: 'Assemblée nationale du Québec',
    url: 'https://www.assnat.qc.ca/fr/travaux-parlementaires/projets-loi/projet-loi-63-43-1.html',
    verifie: true,
    ordre: 15,
  },
  {
    id: 'echantillon-vrac-2025',
    date: '2025-06-30',
    titre: "Québec autorise l'échantillonnage en vrac de 250 tonnes",
    recit:
      "Lomiko annonce avoir obtenu de la province une autorisation pour travaux d'exploration à impacts, qui lui permet d'extraire un échantillon en vrac de 250 tonnes de matériel brut à La Loutre. L'entreprise prévoit de la cartographie et des travaux non invasifs durant l'été, puis l'excavation et le traitement de l'échantillon à l'automne, après la saison estivale et la période de chasse. L'objectif déclaré est de confirmer le procédé de transformation du graphite en matériau d'anode pour batteries. C'est la perspective de ces premiers dynamitages à l'automne qui donne son urgence à la campagne référendaire de l'été.",
    categorie: 'projet',
    source: 'Lomiko Metals',
    url: 'https://lomiko.com/fr/nouvelles/lomiko-metals-annonce-avoir-recu-les-permis-de-la-province-de-quebec-pour-commencer-les-travaux-dechantillonnage-en-vrac-au-projet-de-graphite-la-loutre-et-presente-une-mise-a-jour-sur-le-pla/',
    verifie: true,
    ordre: 16,
  },
  {
    id: 'reglement-215-2025',
    date: '2025-08-25',
    titre: 'Le règlement 215-2025 de la MRC de Papineau entre en vigueur',
    recit:
      "Le règlement 215-2025 modifie le schéma d'aménagement et de développement révisé de la MRC de Papineau afin de délimiter des territoires incompatibles avec l'activité minière sur le territoire public. Il entre en vigueur le 25 août 2025, après avoir été notifié à la ministre des Affaires municipales le 7 juillet et avoir reçu l'avis gouvernemental le 26 août. Le règlement ajoute au schéma une orientation sur la cohabitation de l'activité minière avec les autres usages et inscrit les activités minières parmi les contraintes à l'occupation du sol. La délimitation suit les critères de l'orientation gouvernementale en aménagement du territoire portant sur l'activité minière, en vigueur depuis le 1er décembre 2024. Elle vise le territoire public, ce qui laisse entière la question des droits miniers détenus ailleurs.",
    categorie: 'municipal',
    source: "MRC de Papineau, schéma d'aménagement et de développement révisé, version administrative",
    url: 'https://mrcpapineau.com/wp-content/uploads/2025/11/sadr-en-vigueur-21-02-2018-version-administrative-vf-maj-24-11-2025.pdf',
    verifie: true,
    ordre: 17,
  },
  {
    id: 'referendum-2025',
    date: '2025-08-31',
    titre: 'Le référendum des cinq municipalités rejette le projet à 95 %',
    recit:
      "Les électeurs de Duhamel, Lac-des-Plages, Lac-Simon, Chénéville et Saint-Émile-de-Suffolk répondent à la question suivante, adaptée à chaque municipalité : êtes-vous en faveur de l'implantation d'une mine de graphite à ciel ouvert. Le NON l'emporte à 95 % avec un taux de participation de 57 %, et les résultats vont de 90 % à Chénéville jusqu'à 98 % à Duhamel et à Lac-Simon. Le scrutin s'est tenu selon les règles d'Élections Québec, ce qui en fait le premier référendum municipal québécois portant sur l'acceptabilité sociale d'un projet minier. La coalition du NON demande le jour même que Québec retire à Lomiko ses droits miniers sur ce territoire et que le conseil de la MRC de Papineau appuie une demande de déclaration d'incompatibilité. Aucune organisation n'a appuyé publiquement Lomiko et l'entreprise n'a assuré aucune présence dans les municipalités pendant la campagne.",
    categorie: 'mobilisation',
    source: 'Alliance des municipalités Petite-Nation Nord',
    url: 'https://alliancepetitenation.org/communique-de-presse-1er-septembre-2025',
    verifie: true,
    ordre: 18,
  },
  {
    id: 'kza-titre-ancestral-2025',
    date: '2025-10-27',
    titre: 'Kitigan Zibi Anishinabeg revendique un titre ancestral devant la Cour supérieure',
    recit:
      "La Première Nation de Kitigan Zibi Anishinabeg dépose une demande en Cour supérieure du Québec contre le Canada, le Québec, Hydro-Québec et la Commission de la capitale nationale. Elle revendique un titre ancestral sur huit secteurs, dont le parc de la Gatineau, les îles de la rivière des Outaouais, le réservoir Baskatong, la zec Bras-Coupé-Désert et la réserve faunique de Papineau-Labelle, voisine immédiate de Duhamel. La communauté réclame cinq milliards de dollars en dommages, sauf à parfaire, pour la perte de terres, d'occasions, de culture et de profits, ainsi que pour la restauration de l'honneur de la Couronne. Le chef Jean-Guy Whiteduck précise que la démarche vise les terres publiques et ne cherche pas à déloger des propriétaires privés. Lomiko elle-même décrit La Loutre, dans son étude de préfaisabilité, comme située en territoire de la Première Nation de Kitigan Zibi Anishinabeg.",
    categorie: 'autochtone',
    source: 'Gouvernement du Canada, note pour la période de questions CIR-2025-QP-2906',
    url: 'https://search.open.canada.ca/qpnotes/record/aandc-aadnc,CIR-2025-QP-2906',
    verifie: true,
    ordre: 19,
  },
  {
    id: 'prefaisabilite-2026',
    date: '2026-03-24',
    titre: "L'étude de préfaisabilité double la taille du projet",
    recit:
      "L'étude de préfaisabilité réalisée par DRA Global fait passer le projet de 21,9 à 46,8 millions de tonnes de minerai, à une teneur moyenne de 4,79 % de graphite, pour 2,24 millions de tonnes de graphite en place. La durée de vie de la mine grimpe de quinze à vingt-huit ans, avec 112,1 millions de tonnes de stériles. L'investissement initial est établi à 504,6 millions de dollars canadiens, la valeur actualisée nette après impôts à 617,4 millions et le taux de rendement interne à 24,7 %, sur la base d'un prix de 1 524 dollars américains la tonne. Le rapport technique NI 43-101 daté du 24 mars 2026 est déposé sur SEDAR le 8 mai. Dans la Petite-Nation, où le référendum venait de dire non, l'annonce d'une fosse deux fois plus grande relance la colère.",
    categorie: 'projet',
    source: 'Lomiko Metals',
    url: 'https://lomiko.com/2026-news/lomiko-metals-inc-files-a-positive-preliminary-feasibility-study-for-la-loutre-graphite-project-on-sedar/',
    verifie: true,
    ordre: 20,
  },
  {
    id: 'acquisition-gbm-2026',
    date: '2026-07-28',
    titre: "Lomiko accepte d'être achetée par Global Battery Materials",
    recit:
      "Lomiko conclut une entente d'arrangement définitive prévoyant l'acquisition de toutes ses actions par Global Battery Materials, au comptant, à 0,13 dollar canadien l'action. La transaction valorise l'entreprise à environ 11 millions de dollars canadiens et représente une prime de 71 % sur le cours moyen pondéré des vingt jours terminés le 27 juillet. Elle doit être approuvée aux deux tiers par les actionnaires lors d'une assemblée extraordinaire tenue en septembre 2026, puis par la Cour, pour une clôture visée au quatrième trimestre. Global Battery Materials avance en parallèle un prêt garanti de premier rang pouvant atteindre 800 000 dollars, extensible à 1,2 million, à 8 % d'intérêt. L'acquéreur exploite une usine pilote en Corée du Sud et une installation à Mont-Laurier, et cherche à bâtir une filière du graphite intégrée de la mine à l'anode.",
    categorie: 'projet',
    source: 'Lomiko Metals',
    url: 'https://lomiko.com/2026-news/lomiko-metals-enters-into-definitive-agreement-to-be-acquired-by-global-battery-materials/',
    verifie: true,
    ordre: 21,
  },
  {
    id: 'aire-protegee-2026',
    date: '2026-08-30',
    titre: "L'Alliance dévoile un projet d'aire protégée de 115 kilomètres carrés",
    recit:
      "Un an après le référendum, l'Alliance des municipalités Petite-Nation Nord présente au centre St-Félix-de-Valois de Chénéville un projet d'aire protégée d'utilisation durable de 115 kilomètres carrés. Le territoire visé chevauche Duhamel, Chénéville et Lac-des-Plages et couvre l'entièreté du secteur convoité par les claims miniers. Le statut interdirait toute activité minière tout en laissant place à la foresterie et aux usages récréatifs, et s'inscrirait dans la cible québécoise de protéger 30 % du territoire d'ici 2030. Jérémie Vachon, maire de Lac-des-Plages, résume la stratégie ainsi : dire non au projet minier ne suffit pas, il faut être pour autre chose. La MRC de Papineau a réservé jusqu'à 100 000 dollars pour une étude d'experts et devait retenir une firme d'ici décembre.",
    categorie: 'mobilisation',
    source: 'Radio-Canada',
    url: 'https://ici.radio-canada.ca/nouvelle/2279039/aire-protegee-mine-la-loutre-petite-nation-outaouais',
    verifie: true,
    ordre: 22,
  },
  {
    id: 'precedent-matoush-2013',
    date: '2013-11',
    titre: "Précédent : Québec refuse le certificat au projet d'uranium Matoush",
    recit:
      "En mars 2013, le ministre de l'Environnement Yves-François Blanchet impose un moratoire sur la délivrance des certificats d'autorisation pour les projets d'uranium. En novembre, le gouvernement refuse formellement le certificat d'autorisation à Ressources Strateco pour la phase d'exploration souterraine du projet Matoush, à 275 kilomètres au nord de Chibougamau, en invoquant l'absence d'acceptabilité sociale chez les Cris. Strateco réclame 200 millions de dollars, soit 189 millions d'investissements allégués et 10 millions en dommages punitifs. Le 21 juin 2017, le juge Denis Jacques rejette la réclamation dans une décision de 115 pages et conclut que l'entreprise n'a droit à aucune compensation. Le jugement établit qu'un décideur public peut, et même doit, tenir compte de l'acceptabilité sociale d'un projet.",
    categorie: 'precedent',
    source: 'Radio-Canada',
    url: 'https://ici.radio-canada.ca/nouvelle/1041095/la-requete-de-ressources-strateco-rejetee-par-la-cour-superieure-du-quebec',
    verifie: true,
    ordre: 2,
  },
  {
    id: 'precedent-cacouna-2015',
    date: '2015-04',
    titre: 'Précédent : TransCanada abandonne le port pétrolier de Cacouna',
    recit:
      "Le Centre québécois du droit de l'environnement obtient de la Cour supérieure, le 23 septembre 2014, la suspension des forages géotechniques prévus dans la pouponnière des bélugas du Saint-Laurent. Une seconde demande d'injonction est déposée en Cour fédérale le 4 février 2015. En avril 2015, TransCanada renonce au terminal maritime de Cacouna, après la recommandation d'un comité fédéral de reclasser le béluga du Saint-Laurent parmi les espèces en voie de disparition. Le CQDE inscrit l'épisode comme une victoire dans sa chronologie du dossier. L'oléoduc Énergie Est lui-même sera abandonné plus tard, mais la région avait déjà fait tomber l'infrastructure la plus lourde du projet.",
    categorie: 'precedent',
    source: 'Centre québécois du droit de l’environnement',
    url: 'https://cqde.org/fr/nos-actions/port-petrolier-a-cacouna-protection-des-belugas',
    verifie: true,
    ordre: 4,
  },
  {
    id: 'precedent-anticosti-2017',
    date: '2017-07-28',
    titre: "Précédent : Québec met fin à l'exploration pétrolière sur Anticosti",
    recit:
      "Un arrêté ministériel pris en vertu de la Loi sur les mines soustrait définitivement l'ensemble du territoire de l'île d'Anticosti à l'exploration et à l'exploitation des hydrocarbures. Le gouvernement conclut des ententes avec Junex ainsi qu'avec Maurel & Prom et Corridor, partenaires d'Hydrocarbures Anticosti, puis annonce le 10 août 2017 une compensation de 20,5 millions de dollars à Pétrolia. Les indemnités versées aux autres partenaires portent le total à plus de 40 millions. Le gouvernement invoque l'intérêt public et l'appui à la candidature d'Anticosti au patrimoine mondial de l'UNESCO, en précisant que la décision ne reproche rien aux entreprises. Le précédent montre qu'un gouvernement peut retirer un territoire entier au régime minier et payer pour le faire.",
    categorie: 'precedent',
    source: 'Gouvernement du Québec',
    url: 'https://www.quebec.ca/nouvelles/actualites/details/ile-danticosti-entente-avec-petrolia',
    verifie: true,
    ordre: 5,
  },
  {
    id: 'precedent-ristigouche-2018',
    date: '2018-02-28',
    titre: 'Précédent : Ristigouche-Partie-Sud-Est gagne contre Gastem',
    recit:
      "La municipalité gaspésienne de Ristigouche-Partie-Sud-Est, 157 habitants, avait adopté en 2013 un règlement interdisant tout forage à moins de deux kilomètres de ses sources d'eau potable. La pétrolière Gastem l'avait poursuivie pour un million de dollars. Le 28 février 2018, la juge Nicole Tremblay donne raison à la municipalité, écrit que le règlement résulte d'un travail sérieux et que Ristigouche devait assurer la protection de son eau, et condamne l'entreprise à verser 154 000 dollars dans les trente jours plus 10 000 dollars de frais de défense. Les citoyens avaient amassé plus de 340 000 dollars par la campagne Solidarité Ristigouche pour tenir quatre ans devant les tribunaux. Le jugement confirme le pouvoir d'une petite municipalité de réglementer pour protéger son eau potable, et 334 municipalités québécoises réclamaient alors le passage de la distance séparatrice de 500 mètres à deux kilomètres.",
    categorie: 'precedent',
    source: 'Radio-Canada',
    url: 'https://ici.radio-canada.ca/nouvelle/1086340/ristigouche-sud-est-gastem-deboutee',
    verifie: true,
    ordre: 6,
  },
];
