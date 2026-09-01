import * as admin from "firebase-admin";
import { createHash } from "crypto";

/**
 * Socle de depart de la veille : quatorze faits verifies un par un le
 * 1er septembre 2026, chacun avec une adresse ouverte et confirmee. Le socle
 * s'ecrit une seule fois, sous une version. Si l'administration en efface un,
 * il ne revient pas tout seul.
 */

export const SEED_VERSION = "2026-09-01-a";

export interface SeedItem {
  title: string;
  summary: string;
  category: string;
  source: string;
  url: string;
  date: string;
  importance: "haute" | "moyenne" | "basse";
  isGovernment: boolean;
}

export const SEED_NEWS: SeedItem[] = [
  {
    title: "Assemblee de Cheneville : l'Alliance devoile son contre-plan, une aire protegee de 115 km2",
    summary:
      "Le dimanche 30 aout 2026, un an jour pour jour apres le referendum, environ 400 personnes ont rempli le Centre St-Felix-de-Valois de Cheneville. L'Alliance des municipalites de la Petite-Nation Nord y a devoile sa reponse au projet La Loutre : une aire protegee d'utilisation durable de 115 km2 a cheval sur Duhamel, Cheneville et Lac-des-Plages, couvrant tout le territoire vise par les claims, avec interdiction de l'activite miniere, maintien de la foresterie et de la recreation, et environ la moitie du territoire laissee en libre evolution. Le porte-parole est Jeremie Vachon, maire de Lac-des-Plages. Radio-Canada pose la limite dans le meme article : une aire protegee d'utilisation durable n'interdit pas automatiquement l'exploitation miniere, et la protection reelle dependra du statut que Quebec retiendra.",
    category: "mobilisation",
    source: "ici.radio-canada.ca",
    url: "https://ici.radio-canada.ca/nouvelle/2279039/aire-protegee-mine-la-loutre-petite-nation-outaouais",
    date: "2026-08-30",
    importance: "haute",
    isGovernment: false,
  },
  {
    title: "Lomiko obtient l'ordonnance interimaire de la Cour et convoque le vote du 23 septembre 2026",
    summary:
      "Le 26 aout 2026, Lomiko Metals annonce avoir recu l'ordonnance interimaire de la Cour supreme de Colombie-Britannique et avoir poste la circulaire de sollicitation de procurations pour le plan d'arrangement avec Global Battery Materials. L'assemblee extraordinaire des detenteurs de titres se tient en personne le 23 septembre 2026 a 10 h, heure de Vancouver, chez Fasken Martineau DuMoulin. C'est ce vote qui decide si le projet La Loutre change de mains.",
    category: "miniere",
    source: "lomiko.com",
    url: "https://lomiko.com/2026-news/lomiko-metals-announces-receipt-of-interim-court-order-and-mailing-of-management-information-circular-relating-to-arrangement-with-global-battery-materials/",
    date: "2026-08-26",
    importance: "haute",
    isGovernment: false,
  },
  {
    title: "Un an apres le 95 pour cent de NON, l'Alliance demande pourquoi le projet survit",
    summary:
      "Communique de l'Alliance des municipalites Petite-Nation Nord, publie le 25 aout 2026. Un an apres le referendum du 31 aout 2025, ou 95 pour cent des citoyens de cinq municipalites ont rejete le projet de mine de graphite a ciel ouvert La Loutre, l'Alliance pose publiquement la question de la survie du projet et convoque l'assemblee du 30 aout a Cheneville. Le communique rappelle que Global Battery Materials rachete Lomiko Metals et ses droits d'exploration.",
    category: "mobilisation",
    source: "alliancepetitenation.org",
    url: "https://alliancepetitenation.org/communique-de-presse-2/",
    date: "2026-08-25",
    importance: "haute",
    isGovernment: false,
  },
  {
    title: "La CAQ promet de doubler l'enveloppe de partage des redevances sur les ressources naturelles, a 76 M$",
    summary:
      "Le 24 aout 2026 a Val-d'Or, la ministre des Ressources naturelles et des Forets Kateri Champagne Jourdain annonce un engagement electoral : ajouter 38 M$ aux 38 M$ deja prevus au Programme de partage des redevances sur les ressources naturelles, pour une enveloppe annuelle de 76 M$ des 2027, et prolonger le programme jusqu'en 2031. Le gouvernement choisit donc de mieux partager la rente miniere plutot que de suspendre des titres.",
    category: "gouvernement",
    source: "tvaabitibi.ca",
    url: "https://tvaabitibi.ca/2026/08/24/la-caq-souhaite-bonifier-les-redevances-minieres/",
    date: "2026-08-24",
    importance: "moyenne",
    isGovernment: true,
  },
  {
    title: "Date de reference fixee au 19 aout 2026 pour le vote des actionnaires de Lomiko",
    summary:
      "L'ordonnance interimaire de la Cour supreme de la Colombie-Britannique fixe la cloture des registres au 19 aout 2026 pour determiner qui recoit l'avis et peut voter a l'assemblee extraordinaire du 23 septembre. Le vote porte sur l'acquisition de Lomiko Metals par Global Battery Materials.",
    category: "miniere",
    source: "stocktitan.net",
    url: "https://www.stocktitan.net/news/LMRMF/lomiko-metals-announces-receipt-of-interim-court-order-and-mailing-4no49gvwr9xy.html",
    date: "2026-08-19",
    importance: "basse",
    isGovernment: false,
  },
  {
    title: "L'Alliance annonce l'evenement du 30 aout a Cheneville",
    summary:
      "Publication d'amorce de l'Alliance Petite-Nation Nord, le 13 aout 2026. La page tient en une ligne qui invite a surveiller sa boite aux lettres, et elle annonce le rendez-vous du 30 aout 2026 au 77, rue Hotel-de-Ville a Cheneville. La convocation est confirmee sur la page des evenements et sur la page d'accueil du site de l'Alliance.",
    category: "mobilisation",
    source: "alliancepetitenation.org",
    url: "https://alliancepetitenation.org/vous-etes-prets-un-evenement-arrive-bientot/",
    date: "2026-08-13",
    importance: "basse",
    isGovernment: false,
  },
  {
    title: "L'Association des proprietaires du lac Simon publie son bilan un an apres le referendum",
    summary:
      "Le 10 aout 2026, l'APLS publie un billet de bilan un an apres le referendum consultatif du 31 aout 2025 tenu dans cinq municipalites de la Petite-Nation. L'association tient un dossier La Loutre avec une revue de presse classee par annee depuis 2007, et le billet existe aussi en anglais.",
    category: "mobilisation",
    source: "apls.ca",
    url: "https://www.apls.ca/feed/",
    date: "2026-08-10",
    importance: "basse",
    isGovernment: false,
  },
  {
    title: "Lomiko fait le point sur l'arrangement, sa facilite de pret et le financement du projet Yellow Fox",
    summary:
      "Mise a jour du 7 aout 2026 sur la transaction avec Global Battery Materials, sur une facilite de pret et sur le financement du projet Yellow Fox a Terre-Neuve. La page de nouvelles du site affiche une date differente de celle du fil RSS de la meme entreprise ; la date retenue ici est celle du fil, qui est la donnee machine.",
    category: "miniere",
    source: "lomiko.com",
    url: "https://lomiko.com/2026-news/lomiko-metals-provides-update-on-arrangement-with-global-battery-materials-loan-facility-and-funding-of-the-yellow-fox-project/",
    date: "2026-08-07",
    importance: "basse",
    isGovernment: false,
  },
  {
    title: "Des opposants s'inquietent de ne pas savoir qui rachete Lomiko",
    summary:
      "Reportage de Radio-Canada publie le 29 juillet 2026. Louis St-Hilaire, president du Regroupement de protection des lacs de la Petite-Nation, dit ne pas connaitre les actionnaires de Global Battery Materials et veut savoir qui se cache derriere l'acheteur. Il rappelle que le projet se situe au sommet de deux bassins versants qui irriguent toute la region.",
    category: "media",
    source: "ici.radio-canada.ca",
    url: "https://ici.radio-canada.ca/nouvelle/2272285/lomiko-rachat-mine-graphite-loutre",
    date: "2026-07-29",
    importance: "moyenne",
    isGovernment: false,
  },
  {
    title: "Global Battery Materials acquiert Lomiko Metals pour environ 11 M$",
    summary:
      "Le 28 juillet 2026, Global Battery Materials Corp. conclut une entente d'arrangement definitive pour acquerir toutes les actions ordinaires de Lomiko Metals a 0,13 $ canadien l'action en especes. La valeur d'equite avoisine 11 M$ canadiens sur une base entierement diluee, soit une prime de 71 pour cent sur le cours moyen pondere de vingt jours a la Bourse de croissance TSX au 27 juillet 2026.",
    category: "miniere",
    source: "lomiko.com",
    url: "https://lomiko.com/2026-news/lomiko-metals-enters-into-definitive-agreement-to-be-acquired-by-global-battery-materials/",
    date: "2026-07-28",
    importance: "haute",
    isGovernment: false,
  },
  {
    title: "Le reglement de controle interimaire 222-2026 de la MRC de Papineau entre en vigueur",
    summary:
      "Le reglement numero 222-2026 encadre la gestion de l'urbanisation a l'exterieur des perimetres d'urbanisation sur le territoire de la MRC de Papineau. Il a ete adopte par le conseil des maires le 15 avril 2026, par la resolution 2026-04-096, et la ministre des Affaires municipales en a atteste la conformite le 9 juin 2026.",
    category: "municipal",
    source: "mrcpapineau.com",
    url: "https://mrcpapineau.com/avis-public-20/",
    date: "2026-06-09",
    importance: "moyenne",
    isGovernment: true,
  },
  {
    title: "La MRC de Papineau reserve jusqu'a 100 000 $ pour un memoire d'experts sur les projets miniers",
    summary:
      "Le 22 mai 2026, le Reseau d'information municipale rapporte que les maires et mairesses de la MRC de Papineau prevoient un investissement maximal de 100 000 $ pour faire produire un memoire d'experts sur les projets miniers. Radio-Canada confirme le fait le 30 aout 2026, quand le prefet Paul-Andre David indique qu'une firme d'experts a ete retenue.",
    category: "municipal",
    source: "rimq.qc.ca",
    url: "https://rimq.qc.ca/article/municipal/categorie/environnement/13/1202202/la-mrc-de-papineau-passe-de-la-parole-aux-gestes-.html",
    date: "2026-05-22",
    importance: "moyenne",
    isGovernment: true,
  },
  {
    title: "Lomiko depose sur SEDAR+ l'etude de prefaisabilite de La Loutre : 46,8 Mt a 4,79 pour cent de graphite",
    summary:
      "Le 8 mai 2026, Lomiko depose le rapport technique NI 43-101 de niveau prefaisabilite et l'estimation des ressources mise a jour, prepares par DRA Americas. Les reserves probables atteignent 46,8 Mt a 4,79 pour cent de carbone graphitique, soit 2,24 Mt de graphite contenu en date de fevrier 2026. Le projet double par rapport a l'etude precedente, et sa duree de vie passe de quinze a vingt-huit ans.",
    category: "miniere",
    source: "lomiko.com",
    url: "https://lomiko.com/2026-news/lomiko-metals-inc-files-a-positive-preliminary-feasibility-study-for-la-loutre-graphite-project-on-sedar/",
    date: "2026-05-08",
    importance: "haute",
    isGovernment: false,
  },
  {
    title: "La MRC de Papineau declare l'activite miniere incompatible avec son territoire",
    summary:
      "Le 20 avril 2026, l'Alliance publie le texte de la resolution adoptee par le conseil de la MRC de Papineau. Le conseil declare que l'activite miniere, tant en phase d'exploration qu'en phase d'exploitation, est incompatible avec la vocation du territoire de la MRC, avec son modele de developpement durable, avec la protection de ses ressources naturelles et avec le maintien de la qualite de vie de ses communautes.",
    category: "municipal",
    source: "alliancepetitenation.org",
    url: "https://alliancepetitenation.org/une-autre-page-historique-sest-ecrite-en-petite-nation/",
    date: "2026-04-20",
    importance: "haute",
    isGovernment: true,
  },
];

/** Trois reperes de calendrier que la plateforme doit garder sous les yeux. */
export const SEED_EVENTS = [
  {
    id: "vote-actionnaires-lomiko-2026-09-23",
    title: "Vote des detenteurs de titres de Lomiko sur la vente a Global Battery Materials",
    description:
      "Assemblee extraordinaire tenue chez Fasken Martineau DuMoulin, a Vancouver, a 10 h heure de Vancouver. Le vote decide si le projet La Loutre change de mains pour environ 11 M$. La cloture de la transaction est attendue au quatrieme trimestre.",
    lieu: "Vancouver (Colombie-Britannique)",
    startsAt: Date.parse("2026-09-23T17:00:00Z"),
    dateDisplay: "Mercredi 23 septembre 2026, 13 h heure de l'Est",
    type: "juridique",
  },
  {
    id: "election-generale-quebec-2026-10-05",
    title: "Election generale au Quebec",
    description:
      "L'Alliance a decide de faire de la suspension des claims un enjeu de campagne dans Papineau. C'est la date ou la question minerale se pose directement aux personnes qui sollicitent un mandat.",
    lieu: "Circonscription de Papineau",
    startsAt: Date.parse("2026-10-05T12:00:00Z"),
    dateDisplay: "Lundi 5 octobre 2026",
    type: "autre",
  },
];

function docIdFor(url: string): string {
  return createHash("sha1").update(url.trim().toLowerCase()).digest("hex").slice(0, 20);
}

/**
 * Ecrit le socle une seule fois. Rend le nombre d'elements ecrits, ou zero
 * quand le socle de cette version est deja pose.
 */
export async function seedIfNeeded(db: admin.firestore.Firestore): Promise<number> {
  const marker = db.collection("auditStatus").doc("seed");
  const existing = await marker.get();
  if (existing.exists && existing.data()?.version === SEED_VERSION) return 0;

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const item of SEED_NEWS) {
    batch.set(
      db.collection("news").doc(docIdFor(item.url)),
      {
        ...item,
        sortDate: item.date,
        firstSeenAt: now,
        lastSeenAt: now,
        runId: `seed-${SEED_VERSION}`,
        verifiedBySource: true,
      },
      { merge: true }
    );
  }

  for (const ev of SEED_EVENTS) {
    const { id, ...rest } = ev;
    batch.set(
      db.collection("events").doc(id),
      {
        ...rest,
        auteurUid: "systeme",
        auteurNom: "Observatoire",
        rsvpCount: 0,
        creeLe: now,
      },
      { merge: true }
    );
  }

  batch.set(marker, {
    version: SEED_VERSION,
    posedLe: new Date().toISOString(),
    items: SEED_NEWS.length,
    evenements: SEED_EVENTS.length,
  });

  await batch.commit();
  return SEED_NEWS.length;
}
