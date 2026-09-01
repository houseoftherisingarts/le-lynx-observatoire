import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { Language } from '../types';

/**
 * Cadre juridique de la lutte contre le projet La Loutre.
 * Chaque piece porte une adresse officielle verifiee le 1er septembre 2026.
 */

export type CategorieJuridique =
  | 'loi'
  | 'reglement'
  | 'procedure'
  | 'droit-autochtone'
  | 'recours';

export interface TexteBilingue {
  fr: string;
  en: string;
}

export interface PieceJuridique {
  id: string;
  titre: TexteBilingue;
  categorie: CategorieJuridique;
  resume: TexteBilingue;
  ceQueCaChange: TexteBilingue;
  statut: TexteBilingue;
  url: string;
  source: string;
  /** Date ISO de la derniere verification de la piece. */
  majLe: string;
}

export const ORDRE_CATEGORIES: CategorieJuridique[] = [
  'loi',
  'reglement',
  'procedure',
  'droit-autochtone',
  'recours',
];

const LIBELLES: Record<CategorieJuridique, TexteBilingue> = {
  loi: { fr: 'Loi', en: 'Statute' },
  reglement: { fr: 'Règlement', en: 'Regulation' },
  procedure: { fr: 'Procédure', en: 'Procedure' },
  'droit-autochtone': { fr: 'Droit autochtone', en: 'Indigenous law' },
  recours: { fr: 'Recours', en: 'Legal remedy' },
};

const TONS: Record<CategorieJuridique, string> = {
  loi: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
  reglement: 'bg-slate-800/60 text-slate-300 border-slate-600/50',
  procedure: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50',
  'droit-autochtone': 'bg-violet-950/40 text-violet-300 border-violet-800/50',
  recours: 'bg-cyan-950/40 text-cyan-300 border-cyan-800/50',
};

/** Le francais est la langue de reference. L'anishinabe retombe sur l'anglais. */
export const texte = (t: TexteBilingue | undefined, langue: Language): string => {
  if (!t) return '';
  return langue === 'fr' ? t.fr : t.en || t.fr;
};

export const libelleCategorie = (c: CategorieJuridique, langue: Language): string =>
  texte(LIBELLES[c] ?? LIBELLES.loi, langue);

export const tonCategorie = (c: CategorieJuridique): string => TONS[c] ?? TONS.loi;

/** « 1er septembre 2026 » a partir d'une date ISO, sans dependance externe. */
export const dateLisible = (iso: string, langue: Language): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(langue === 'fr' ? 'fr-CA' : 'en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const VERIFIE_LE = '2026-09-01';

export const PIECES_DE_DEPART: PieceJuridique[] = [
  {
    id: 'loi-sur-les-mines',
    categorie: 'loi',
    titre: { fr: 'Loi sur les mines', en: 'The Mining Act' },
    statut: {
      fr: 'En vigueur, modifiée le 29 novembre 2024',
      en: 'In force, amended on November 29, 2024',
    },
    resume: {
      fr: "C'est la loi qui organise l'accès au sous-sol québécois. Elle repose sur le principe du free mining, ce qui veut dire que le sous-sol appartient à l'État et que quiconque paie les droits obtient un titre d'exploration par simple désignation sur une carte, sans demander la permission au propriétaire du terrain ni à la municipalité. La réforme de 2024 a rebaptisé le claim en droit exclusif d'exploration et l'a assorti de travaux minimaux à réaliser, sans toucher au principe de la préséance du minier sur les autres usages.",
      en: 'This is the statute that governs access to Quebec’s subsurface. It rests on the free mining principle, meaning the subsurface belongs to the State and anyone who pays the fees obtains an exploration title by map designation, without asking the landowner or the municipality for permission. The 2024 reform renamed the claim an exclusive exploration right and attached minimum work requirements to it, without touching the principle that mining takes precedence over other land uses.',
    },
    ceQueCaChange: {
      fr: "Les titres qui couvrent La Loutre existent parce que cette loi les rend presque automatiques. Aucun conseil municipal, aucune MRC et aucun propriétaire ne peut les faire disparaître directement. Pour arrêter le projet, il faut passer par les leviers que la loi laisse ouverts, soit le zonage du territoire par la MRC, soit l'autorisation environnementale du gouvernement, soit le refus des actionnaires de financer la suite.",
      en: 'The titles covering La Loutre exist because this statute makes them almost automatic. No municipal council, no regional county municipality and no landowner can cancel them directly. Stopping the project means using the levers the statute leaves open, which are the zoning of the territory by the regional county municipality, the environmental authorization by the government, or the refusal of shareholders to fund what comes next.',
    },
    url: 'https://www.legisquebec.gouv.qc.ca/fr/document/lc/M-13.1',
    source: 'LegisQuébec · RLRQ, chapitre M-13.1',
    majLe: VERIFIE_LE,
  },
  {
    id: 'reforme-miniere-2024',
    categorie: 'loi',
    titre: { fr: 'La réforme minière de 2024', en: 'The 2024 mining reform' },
    statut: {
      fr: 'Sanctionnée le 29 novembre 2024',
      en: 'Assented to on November 29, 2024',
    },
    resume: {
      fr: "Le projet de loi 63 a été présenté le 28 mai 2024 par la ministre des Ressources naturelles et des Forêts, adopté le 28 novembre et sanctionné le lendemain. Il remplace le claim par un droit exclusif d'exploration valide trois ans, il oblige le titulaire à réaliser de vrais travaux pour obtenir un renouvellement, et il soumet toute nouvelle mine à la procédure d'évaluation environnementale. Il permet aussi à une municipalité de demander la levée d'une protection déjà inscrite au schéma, avec un délai de dix ans avant de pouvoir la redemander.",
      en: 'Bill 63 was tabled on May 28, 2024 by the Minister of Natural Resources and Forests, passed on November 28 and assented to the following day. It replaces the claim with a three-year exclusive exploration right, it requires the holder to carry out real work in order to renew, and it subjects every new mine to the environmental assessment procedure. It also lets a municipality ask that a protection already written into its land use plan be lifted, with a ten-year wait before it can be requested again.',
    },
    ceQueCaChange: {
      fr: "C'est la pièce la plus utile du dossier. Avant cette réforme, une mine échappait au BAPE tant qu'elle restait sous les seuils de tonnage. Depuis le 29 novembre 2024, l'ouverture d'une nouvelle mine déclenche la procédure quelle que soit sa taille, ce qui veut dire que La Loutre ne pourra pas ouvrir sans audience publique. La contrepartie est que la même loi ouvre une porte de sortie aux protections municipales, alors il faut surveiller les conseils autant que la minière.",
      en: 'This is the most useful piece in the file. Before the reform, a mine escaped the BAPE as long as it stayed under the tonnage thresholds. Since November 29, 2024, opening a new mine triggers the procedure whatever its size, which means La Loutre cannot open without a public hearing. The trade-off is that the same statute opens an exit door for municipal protections, so the councils deserve as much watching as the mining company.',
    },
    url: 'https://www.assnat.qc.ca/fr/travaux-parlementaires/projets-loi/projet-loi-63-43-1.html',
    source: 'Assemblée nationale du Québec · projet de loi 63, 2024, chapitre 36',
    majLe: VERIFIE_LE,
  },
  {
    id: 'loi-qualite-environnement',
    categorie: 'loi',
    titre: {
      fr: "Loi sur la qualité de l'environnement",
      en: 'Environment Quality Act',
    },
    statut: { fr: 'En vigueur', en: 'In force' },
    resume: {
      fr: "Cette loi interdit de rejeter un contaminant et impose une autorisation ministérielle avant d'entreprendre une activité qui touche l'eau, l'air, les sols ou les milieux humides. C'est elle qui crée la procédure d'évaluation et d'examen des impacts sur l'environnement, celle qui mène au BAPE. Son article 31.5 est celui par lequel le gouvernement autorise ou refuse un projet minier au bout de cette procédure.",
      en: 'This statute forbids releasing a contaminant and requires a ministerial authorization before undertaking an activity that affects water, air, soil or wetlands. It creates the environmental impact assessment and review procedure, the one that leads to the BAPE. Its section 31.5 is where the government authorizes or refuses a mining project at the end of that procedure.',
    },
    ceQueCaChange: {
      fr: "Tout ce qui pourrait arrêter La Loutre du côté provincial passe par cette loi. La décision finale appartient au gouvernement, pas à un fonctionnaire, ce qui garde le dossier politique jusqu'à la dernière minute. L'élection générale du 5 octobre 2026 se tient avant même le dépôt d'un avis de projet, alors les engagements pris par les candidats de la circonscription pèsent sur la suite.",
      en: 'Everything that could stop La Loutre on the provincial side runs through this statute. The final decision belongs to the government, not to a civil servant, which keeps the file political until the very last minute. The general election of October 5, 2026 comes before any project notice is even filed, so the commitments made by the riding’s candidates weigh on what follows.',
    },
    url: 'https://www.legisquebec.gouv.qc.ca/fr/document/lc/Q-2',
    source: 'LegisQuébec · RLRQ, chapitre Q-2',
    majLe: VERIFIE_LE,
  },
  {
    id: 'reglement-evaluation-impacts',
    categorie: 'reglement',
    titre: {
      fr: "Règlement sur l'évaluation des impacts",
      en: 'Impact assessment regulation',
    },
    statut: {
      fr: 'En vigueur, article 22 modifié le 29 novembre 2024',
      en: 'In force, section 22 amended on November 29, 2024',
    },
    resume: {
      fr: "Ce règlement contient la liste des projets qui déclenchent la procédure. L'article 22 de la partie II de son annexe 1 vise l'activité minière et assujettit maintenant les travaux requis pour l'exploitation de toute nouvelle mine, sans seuil de tonnage. Les anciens seuils de 2 000 tonnes par jour pour un minerai métallifère et de 500 tonnes pour un autre minerai ne servent plus qu'aux agrandissements de mines déjà autorisées avant le 29 novembre 2024.",
      en: 'This regulation holds the list of projects that trigger the procedure. Section 22 of Part II of its Schedule 1 covers mining activity and now captures the work required to operate any new mine, with no tonnage threshold. The former thresholds of 2,000 tonnes per day for metallic ore and 500 tonnes for other ore now apply only to expansions of mines already authorized before November 29, 2024.',
    },
    ceQueCaChange: {
      fr: "L'étude de préfaisabilité déposée le 8 mai 2026 décrit une exploitation sur vingt-huit ans. Un projet de cette taille tombe carrément sous l'article 22 et ne peut pas passer par une autorisation de routine. Le promoteur devra déposer un avis de projet, traverser une période d'information publique et faire face à une demande d'audience que la population d'ici est parfaitement en mesure de déposer.",
      en: 'The prefeasibility study filed on May 8, 2026 describes twenty-eight years of operation. A project of that size falls squarely under section 22 and cannot go through a routine authorization. The proponent will have to file a project notice, go through a public information period and face a hearing request that people here are perfectly able to file.',
    },
    url: 'https://www.legisquebec.gouv.qc.ca/fr/document/rc/Q-2,%20r.%2023.1',
    source: 'LegisQuébec · chapitre Q-2, r. 23.1, annexe 1, article 22',
    majLe: VERIFIE_LE,
  },
  {
    id: 'amenagement-urbanisme-tiam',
    categorie: 'loi',
    titre: {
      fr: "Loi sur l'aménagement et l'urbanisme",
      en: 'Act respecting land use planning',
    },
    statut: { fr: 'En vigueur', en: 'In force' },
    resume: {
      fr: "Cette loi donne aux MRC le pouvoir d'écrire un schéma d'aménagement et de développement, et aux municipalités celui d'adopter leur règlement de zonage. Depuis le 14 décembre 2016, une MRC peut y délimiter des territoires incompatibles avec l'activité minière, les TIAM, afin d'interdire de nouveaux sites d'exploration et d'exploitation. La délimitation doit être approuvée par le ministère des Ressources naturelles et des Forêts et par celui des Affaires municipales, puis inscrite au registre des droits miniers pour produire son plein effet.",
      en: 'This statute gives regional county municipalities the power to write a land use and development plan, and municipalities the power to adopt their zoning by-law. Since December 14, 2016, a regional county municipality may delimit territories incompatible with mining activity, known as TIAM, in order to prohibit new exploration and mining sites. The delimitation must be approved by the Ministry of Natural Resources and Forests and by the Ministry of Municipal Affairs, then entered in the mining rights register to take full effect.',
    },
    ceQueCaChange: {
      fr: "La déclaration du conseil de la MRC de Papineau du 20 avril 2026, qui juge l'activité minière incompatible avec la vocation de son territoire, est une position politique. Pour qu'elle devienne opposable à un promoteur, elle doit descendre dans le schéma d'aménagement sous forme de TIAM et franchir l'approbation des deux ministères. C'est là que se joue la partie municipale du dossier, et c'est le geste concret à réclamer aux élus.",
      en: 'The April 20, 2026 declaration by the council of the MRC de Papineau, which finds mining activity incompatible with the vocation of its territory, is a political position. For it to be enforceable against a proponent, it has to move down into the land use plan as a TIAM and clear approval by both ministries. That is where the municipal half of the file is decided, and that is the concrete step to demand from elected officials.',
    },
    url: 'https://www.legisquebec.gouv.qc.ca/fr/document/lc/A-19.1',
    source: 'LegisQuébec · RLRQ, chapitre A-19.1',
    majLe: VERIFIE_LE,
  },
  {
    id: 'ogat-activites-minieres',
    categorie: 'procedure',
    titre: {
      fr: 'Orientations gouvernementales, volet minier',
      en: 'Government land use orientations, mining',
    },
    statut: {
      fr: 'Document ministériel en vigueur',
      en: 'Ministerial document in force',
    },
    resume: {
      fr: "Les orientations gouvernementales disent aux MRC ce que le gouvernement attend de leur schéma d'aménagement. Le volet consacré aux activités minières encadre la façon de délimiter un territoire incompatible et la démonstration qu'une MRC doit fournir pour que sa délimitation soit approuvée. Sans cette démonstration, une déclaration d'incompatibilité reste sans effet juridique.",
      en: 'The government orientations tell regional county municipalities what the government expects of their land use plan. The section devoted to mining activity frames how an incompatible territory is delimited and what a regional county municipality must demonstrate for its delimitation to be approved. Without that demonstration, a declaration of incompatibility carries no legal effect.',
    },
    ceQueCaChange: {
      fr: "Ce document est le cahier de charges de la MRC de Papineau. Il dit quelles justifications, quelles cartes et quelles analyses il faut produire pour que le territoire de Duhamel, de Chénéville et de Lac-des-Plages soit reconnu incompatible. L'aire protégée d'utilisation durable de 115 km² dévoilée par l'Alliance le 30 août 2026 sert exactement cette démonstration.",
      en: 'This document is the specification sheet for the MRC de Papineau. It states which justifications, which maps and which analyses have to be produced for the territory of Duhamel, Chénéville and Lac-des-Plages to be recognized as incompatible. The 115 km² protected area for sustainable use unveiled by the Alliance on August 30, 2026 serves exactly that demonstration.',
    },
    url: 'https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/affaires-municipales/publications/amenagement_territoire/orientations_gouvernementales/OGAT_Activites_minieres.pdf',
    source: "Ministère des Affaires municipales et de l'Habitation · OGAT, activités minières",
    majLe: VERIFIE_LE,
  },
  {
    id: 'bape-registre',
    categorie: 'procedure',
    titre: { fr: 'Le BAPE et le registre public', en: 'The BAPE and the public registry' },
    statut: {
      fr: 'Aucun dossier La Loutre au 1er septembre 2026',
      en: 'No La Loutre file as of September 1, 2026',
    },
    resume: {
      fr: "Le Bureau d'audiences publiques sur l'environnement tient la partie publique de la procédure. Le Registre des évaluations environnementales rassemble les documents de chaque projet assujetti, depuis l'avis de projet jusqu'aux rapports d'audience. Les deux sont publics et se consultent gratuitement.",
      en: 'The Bureau d’audiences publiques sur l’environnement runs the public half of the procedure. The Environmental Assessment Registry gathers the documents of every project subject to it, from the project notice through to the hearing reports. Both are public and free to consult.',
    },
    ceQueCaChange: {
      fr: "Nous avons vérifié le 1er septembre 2026 et il n'existe aucun dossier La Loutre, ni au BAPE ni au registre. Le processus provincial d'autorisation n'est pas commencé, ce qui explique pourquoi la bataille se joue devant les conseils municipaux et devant les actionnaires plutôt que devant un tribunal. Le jour où un avis de projet apparaîtra au registre, la période d'information publique commencera et il faudra être prêts.",
      en: 'We checked on September 1, 2026 and there is no La Loutre file, neither at the BAPE nor in the registry. The provincial authorization process has not begun, which is why the fight is happening before municipal councils and before shareholders rather than before a court. The day a project notice appears in the registry, the public information period starts and we need to be ready.',
    },
    url: 'https://www.ree.environnement.gouv.qc.ca/index_RP.asp',
    source: "Registre des évaluations environnementales · ministère de l'Environnement",
    majLe: VERIFIE_LE,
  },
  {
    id: 'gestim-droits-miniers',
    categorie: 'procedure',
    titre: {
      fr: 'GESTIM, le registre des droits miniers',
      en: 'GESTIM, the mining rights registry',
    },
    statut: {
      fr: 'Registre public, mis à jour en continu',
      en: 'Public registry, continuously updated',
    },
    resume: {
      fr: "GESTIM est le système du ministère des Ressources naturelles et des Forêts où les titres miniers se déposent, se renouvellent et s'éteignent. Chaque droit exclusif d'exploration y porte un numéro, un titulaire, une date d'expiration et une position sur la carte. La consultation est gratuite et ouverte à tout le monde.",
      en: 'GESTIM is the system of the Ministry of Natural Resources and Forests where mining titles are registered, renewed and extinguished. Every exclusive exploration right carries a number, a holder, an expiry date and a position on the map. Consulting it is free and open to everyone.',
    },
    ceQueCaChange: {
      fr: "C'est la seule source qui dit avec certitude quels titres couvrent La Loutre aujourd'hui et quand ils viennent à échéance. Un titre qui expire faute de travaux minimaux est un titre qui tombe, et l'entente d'acquisition de Lomiko par Global Battery Materials conclue le 28 juillet 2026 ne change rien à ces échéances. Surveiller le registre apprend plus que de lire les communiqués.",
      en: 'This is the only source that says with certainty which titles cover La Loutre today and when they expire. A title that lapses for want of minimum work is a title that falls, and the definitive agreement for Global Battery Materials to acquire Lomiko, reached on July 28, 2026, changes none of those deadlines. Watching the registry teaches more than reading press releases.',
    },
    url: 'https://gestim.mines.gouv.qc.ca/',
    source: 'Ministère des Ressources naturelles et des Forêts · GESTIM',
    majLe: VERIFIE_LE,
  },
  {
    id: 'titre-ancestral-anishinabe',
    categorie: 'droit-autochtone',
    titre: { fr: 'Titre ancestral anishinabe', en: 'Anishinabe ancestral title' },
    statut: {
      fr: 'Recours déposé le 24 octobre 2025, en cours',
      en: 'Claim filed on October 24, 2025, ongoing',
    },
    resume: {
      fr: "Le territoire visé n'a jamais fait l'objet d'un traité de cession. Le 24 octobre 2025, la Première Nation de Kitigan Zibi Anishinabeg a déposé devant la Cour supérieure du Québec une revendication de titre ancestral portant sur huit zones de l'Outaouais, dont la réserve faunique Papineau-Labelle. S'y ajoute l'obligation constitutionnelle de la Couronne de consulter les communautés autochtones dès qu'une décision risque de porter atteinte à un droit revendiqué.",
      en: 'The territory in question was never covered by a treaty of cession. On October 24, 2025, the Kitigan Zibi Anishinabeg First Nation filed an ancestral title claim before the Superior Court of Quebec covering eight zones of the Outaouais, including the Papineau-Labelle wildlife reserve. The Crown also carries a constitutional duty to consult Indigenous communities whenever a decision risks infringing a claimed right.',
    },
    ceQueCaChange: {
      fr: "Aucune prise de position formelle et datée de Kitigan Zibi Anishinabeg sur La Loutre n'a été retrouvée en 2026, et il ne revient à personne d'ici de parler en leur nom. Ce que le droit établit, par contre, est que l'obligation de consulter s'impose au gouvernement avant d'autoriser un projet sur ce territoire. Une autorisation accordée sans consultation sérieuse serait attaquable, et ce risque juridique appartient au promoteur.",
      en: 'No formal, dated position by Kitigan Zibi Anishinabeg on La Loutre was found for 2026, and it is not for anyone here to speak in their name. What the law does establish is that the duty to consult binds the government before it authorizes a project on this territory. An authorization granted without serious consultation would be open to challenge, and that legal risk belongs to the proponent.',
    },
    url: 'https://ici.radio-canada.ca/espaces-autochtones/2202979/kitigan-zibi-cour-superieure-titre-ancestral-terres-gatinea-autochtones',
    source: 'Radio-Canada · Espaces autochtones',
    majLe: VERIFIE_LE,
  },
  {
    id: 'droit-environnement-sain',
    categorie: 'recours',
    titre: { fr: 'Droit à un environnement sain', en: 'The right to a healthy environment' },
    statut: { fr: 'En vigueur', en: 'In force' },
    resume: {
      fr: "L'article 46.1 de la Charte des droits et libertés de la personne reconnaît à toute personne le droit de vivre dans un environnement sain et respectueux de la biodiversité, dans la mesure et suivant les normes prévues par la loi. Ce droit se plaide devant les tribunaux. La Loi sur la qualité de l'environnement permet en plus à une personne de demander une injonction pour faire cesser une activité menée en contravention de la loi ou de ses règlements.",
      en: 'Section 46.1 of the Charter of Human Rights and Freedoms grants every person the right to live in a healthful environment in which biodiversity is preserved, to the extent and according to the standards provided by law. That right can be argued in court. The Environment Quality Act further allows a person to seek an injunction to stop an activity carried out in breach of the Act or its regulations.',
    },
    ceQueCaChange: {
      fr: "Ces recours ne servent à rien tant qu'il n'y a ni autorisation à contester ni travaux en cours. Ils deviendront pertinents si la minière obtient une autorisation au terme de la procédure, ou si des travaux d'exploration sont menés en marge des règles. La préparation utile, en attendant, consiste à documenter l'état actuel des lacs, des milieux humides et des chemins, parce que c'est cette preuve qui manque toujours le jour où un recours se plaide.",
      en: 'These remedies are worth nothing as long as there is no authorization to challenge and no work under way. They become relevant if the mining company obtains an authorization at the end of the procedure, or if exploration work is carried out outside the rules. The useful preparation, in the meantime, is documenting the present state of the lakes, the wetlands and the roads, because that is the evidence always missing on the day a case is argued.',
    },
    url: 'https://www.legisquebec.gouv.qc.ca/fr/document/lc/C-12',
    source: 'LegisQuébec · RLRQ, chapitre C-12, article 46.1',
    majLe: VERIFIE_LE,
  },
  {
    id: 'chemin-vers-le-bape',
    categorie: 'recours',
    titre: { fr: 'Le chemin qui mène au BAPE', en: 'The road to a BAPE hearing' },
    statut: {
      fr: 'Guide de référence, Centre québécois du droit de l’environnement',
      en: 'Reference guide, Centre québécois du droit de l’environnement',
    },
    resume: {
      fr: "Le Centre québécois du droit de l'environnement décrit la procédure en cinq temps. Le promoteur dépose un avis d'intention et le BAPE ouvre une première période d'information de quinze jours, pendant laquelle le public nomme les enjeux à étudier. Le ministère émet ensuite une directive, l'étude d'impact est produite et jugée recevable, puis une seconde période d'information s'ouvre et n'importe qui peut alors demander une audience publique. Le gouvernement tranche à la fin et il n'est pas tenu de suivre la recommandation du ministère.",
      en: 'The Centre québécois du droit de l’environnement describes the procedure in five stages. The proponent files a notice of intent and the BAPE opens a first fifteen-day information period, during which the public names the issues to be studied. The ministry then issues a directive, the impact study is produced and found admissible, and a second information period opens in which anyone may request a public hearing. The government decides at the end and is not bound by the ministry’s recommendation.',
    },
    ceQueCaChange: {
      fr: "La fenêtre la plus courte de tout le processus est la première période d'information, quinze jours. C'est là que les préoccupations soulevées entrent dans la directive et deviennent des questions auxquelles le promoteur devra répondre. Un observatoire qui surveille le registre et qui prévient sa liste le jour du dépôt fait gagner deux semaines à toute la communauté.",
      en: 'The shortest window in the whole process is that first information period, fifteen days. That is when the concerns raised enter the directive and turn into questions the proponent will have to answer. An observatory that watches the registry and alerts its list the day of filing wins two weeks for the entire community.',
    },
    url: 'https://cqde.org/fr/sinformer-nouvelle/les-bases-du-droit-de-lenvironnement/les-etapes-de-la-procedure-quebecoise-devaluation-des-impacts-menant-devant-le-bape/',
    source: "Centre québécois du droit de l'environnement",
    majLe: VERIFIE_LE,
  },
];

const estCategorie = (v: unknown): v is CategorieJuridique =>
  typeof v === 'string' && (ORDRE_CATEGORIES as string[]).includes(v);

/** Accepte une chaine simple ou un objet bilingue, et ne casse jamais sur une donnee partielle. */
const lireTexte = (valeur: unknown): TexteBilingue => {
  if (typeof valeur === 'string') return { fr: valeur, en: valeur };
  if (valeur && typeof valeur === 'object') {
    const o = valeur as { fr?: unknown; en?: unknown };
    const fr = typeof o.fr === 'string' ? o.fr : '';
    const en = typeof o.en === 'string' ? o.en : '';
    return { fr: fr || en, en: en || fr };
  }
  return { fr: '', en: '' };
};

const lireChaine = (valeur: unknown): string => (typeof valeur === 'string' ? valeur : '');

/** Rend null quand le document est inutilisable, pour ne jamais afficher une carte vide. */
const normaliser = (id: string, data: Record<string, unknown>): PieceJuridique | null => {
  const titre = lireTexte(data.titre);
  const url = lireChaine(data.url).trim();
  if (!titre.fr || !url.startsWith('http')) return null;
  return {
    id,
    titre,
    categorie: estCategorie(data.categorie) ? data.categorie : 'loi',
    resume: lireTexte(data.resume),
    ceQueCaChange: lireTexte(data.ceQueCaChange),
    statut: lireTexte(data.statut),
    url,
    source: lireChaine(data.source),
    majLe: lireChaine(data.majLe),
  };
};

const trier = (pieces: PieceJuridique[]): PieceJuridique[] =>
  [...pieces].sort((a, b) => {
    const rang = ORDRE_CATEGORIES.indexOf(a.categorie) - ORDRE_CATEGORIES.indexOf(b.categorie);
    return rang !== 0 ? rang : a.titre.fr.localeCompare(b.titre.fr, 'fr');
  });

export interface CadreJuridiqueSnapshot {
  pieces: PieceJuridique[];
  /** Vrai quand rien n'est publie dans Firestore et que le socle local est affiche. */
  local: boolean;
}

/**
 * Flux en direct des pieces juridiques publiees dans `resources` (type == 'juridique').
 * Replie sur PIECES_DE_DEPART quand la collection ne rend rien d'exploitable.
 * Rend la fonction de desabonnement.
 */
export const suivreCadreJuridique = (
  cb: (snapshot: CadreJuridiqueSnapshot) => void,
  onErreur?: (err: unknown) => void
): (() => void) => {
  const q = query(collection(db, 'resources'), where('type', '==', 'juridique'));
  return onSnapshot(
    q,
    (snap) => {
      const pieces = snap.docs
        .map((d) => normaliser(d.id, d.data() as Record<string, unknown>))
        .filter((p): p is PieceJuridique => p !== null);
      cb(
        pieces.length > 0
          ? { pieces: trier(pieces), local: false }
          : { pieces: trier(PIECES_DE_DEPART), local: true }
      );
    },
    (err) => {
      cb({ pieces: trier(PIECES_DE_DEPART), local: true });
      onErreur?.(err);
    }
  );
};
