"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEED_EVENTS = exports.SEED_NEWS = exports.SEED_VERSION = void 0;
exports.seedIfNeeded = seedIfNeeded;
const admin = require("firebase-admin");
const crypto_1 = require("crypto");
/**
 * Socle de depart de la veille : quatorze faits verifies un par un le
 * 1er septembre 2026, chacun avec une adresse ouverte et confirmee. Le socle
 * s'ecrit une seule fois, sous une version. Si l'administration en efface un,
 * il ne revient pas tout seul.
 */
exports.SEED_VERSION = "2026-09-01-b";
exports.SEED_NEWS = [
    {
        title: "Assemblée de Chénéville : l'Alliance dévoile son contre-plan, une aire protégée de 115 km²",
        summary: "Le dimanche 30 août 2026, un an jour pour jour après le référendum, environ 400 personnes ont rempli le Centre St-Félix-de-Valois de Chénéville. L'Alliance des municipalités de la Petite-Nation Nord y a dévoilé sa réponse au projet La Loutre : une aire protégée d'utilisation durable de 115 km² à cheval sur Duhamel, Chénéville et Lac-des-Plages, couvrant tout le territoire visé par les claims, avec interdiction de l'activité minière, maintien de la foresterie et de la récréation, et environ la moitié du territoire laissée en libre évolution. Le porte-parole est Jérémie Vachon, maire de Lac-des-Plages. Radio-Canada pose la limite dans le même article : une aire protégée d'utilisation durable n'interdit pas automatiquement l'exploitation minière, et la protection réelle dépendra du statut que Québec retiendra.",
        category: "mobilisation",
        source: "ici.radio-canada.ca",
        url: "https://ici.radio-canada.ca/nouvelle/2279039/aire-protegee-mine-la-loutre-petite-nation-outaouais",
        date: "2026-08-30",
        importance: "haute",
        isGovernment: false,
    },
    {
        title: "Lomiko obtient l'ordonnance intérimaire de la Cour et convoque le vote du 23 septembre 2026",
        summary: "Le 26 août 2026, Lomiko Metals annonce avoir reçu l'ordonnance intérimaire de la Cour suprême de Colombie-Britannique et avoir posté la circulaire de sollicitation de procurations pour le plan d'arrangement avec Global Battery Materials. L'assemblée extraordinaire des détenteurs de titres se tient en personne le 23 septembre 2026 à 10 h, heure de Vancouver, chez Fasken Martineau DuMoulin. C'est ce vote qui décide si le projet La Loutre change de mains.",
        category: "miniere",
        source: "lomiko.com",
        url: "https://lomiko.com/2026-news/lomiko-metals-announces-receipt-of-interim-court-order-and-mailing-of-management-information-circular-relating-to-arrangement-with-global-battery-materials/",
        date: "2026-08-26",
        importance: "haute",
        isGovernment: false,
    },
    {
        title: "Un an après le 95 pour cent de NON, l'Alliance demande pourquoi le projet survit",
        summary: "Communiqué de l'Alliance des municipalités Petite-Nation Nord, publié le 25 août 2026. Un an après le référendum du 31 août 2025, où 95 pour cent des citoyens de cinq municipalités ont rejeté le projet de mine de graphite à ciel ouvert La Loutre, l'Alliance pose publiquement la question de la survie du projet et convoque l'assemblée du 30 août à Chénéville. Le communiqué rappelle que Global Battery Materials rachète Lomiko Metals et ses droits d'exploration.",
        category: "mobilisation",
        source: "alliancepetitenation.org",
        url: "https://alliancepetitenation.org/communique-de-presse-2/",
        date: "2026-08-25",
        importance: "haute",
        isGovernment: false,
    },
    {
        title: "La CAQ promet de doubler l'enveloppe de partage des redevances sur les ressources naturelles, à 76 M$",
        summary: "Le 24 août 2026 à Val-d'Or, la ministre des Ressources naturelles et des Forêts Kateri Champagne Jourdain annonce un engagement électoral : ajouter 38 M$ aux 38 M$ déjà prévus au Programme de partage des redevances sur les ressources naturelles, pour une enveloppe annuelle de 76 M$ dès 2027, et prolonger le programme jusqu'en 2031. Le gouvernement choisit donc de mieux partager la rente minière plutôt que de suspendre des titres.",
        category: "gouvernement",
        source: "tvaabitibi.ca",
        url: "https://tvaabitibi.ca/2026/08/24/la-caq-souhaite-bonifier-les-redevances-minieres/",
        date: "2026-08-24",
        importance: "moyenne",
        isGovernment: true,
    },
    {
        title: "Date de référence fixée au 19 août 2026 pour le vote des actionnaires de Lomiko",
        summary: "L'ordonnance intérimaire de la Cour suprême de la Colombie-Britannique fixe la clôture des registres au 19 août 2026 pour déterminer qui reçoit l'avis et peut voter à l'assemblée extraordinaire du 23 septembre. Le vote porte sur l'acquisition de Lomiko Metals par Global Battery Materials.",
        category: "miniere",
        source: "stocktitan.net",
        url: "https://www.stocktitan.net/news/LMRMF/lomiko-metals-announces-receipt-of-interim-court-order-and-mailing-4no49gvwr9xy.html",
        date: "2026-08-19",
        importance: "basse",
        isGovernment: false,
    },
    {
        title: "L'Alliance annonce l'événement du 30 août à Chénéville",
        summary: "Publication d'amorce de l'Alliance Petite-Nation Nord, le 13 août 2026. La page tient en une ligne qui invite à surveiller sa boîte aux lettres, et elle annonce le rendez-vous du 30 août 2026 au 77, rue Hôtel-de-Ville à Chénéville. La convocation est confirmée sur la page des événements et sur la page d'accueil du site de l'Alliance.",
        category: "mobilisation",
        source: "alliancepetitenation.org",
        url: "https://alliancepetitenation.org/vous-etes-prets-un-evenement-arrive-bientot/",
        date: "2026-08-13",
        importance: "basse",
        isGovernment: false,
    },
    {
        title: "L'Association des propriétaires du lac Simon publie son bilan un an après le référendum",
        summary: "Le 10 août 2026, l'APLS publie un billet de bilan un an après le référendum consultatif du 31 août 2025 tenu dans cinq municipalités de la Petite-Nation. L'association tient un dossier La Loutre avec une revue de presse classée par année depuis 2007, et le billet existe aussi en anglais.",
        category: "mobilisation",
        source: "apls.ca",
        url: "https://www.apls.ca/feed/",
        date: "2026-08-10",
        importance: "basse",
        isGovernment: false,
    },
    {
        title: "Lomiko fait le point sur l'arrangement, sa facilité de prêt et le financement du projet Yellow Fox",
        summary: "Mise à jour du 7 août 2026 sur la transaction avec Global Battery Materials, sur une facilité de prêt et sur le financement du projet Yellow Fox à Terre-Neuve. La page de nouvelles du site affiche une date différente de celle du fil RSS de la même entreprise ; la date retenue ici est celle du fil, qui est la donnée machine.",
        category: "miniere",
        source: "lomiko.com",
        url: "https://lomiko.com/2026-news/lomiko-metals-provides-update-on-arrangement-with-global-battery-materials-loan-facility-and-funding-of-the-yellow-fox-project/",
        date: "2026-08-07",
        importance: "basse",
        isGovernment: false,
    },
    {
        title: "Des opposants s'inquiètent de ne pas savoir qui rachète Lomiko",
        summary: "Reportage de Radio-Canada publié le 29 juillet 2026. Louis St-Hilaire, président du Regroupement de protection des lacs de la Petite-Nation, dit ne pas connaître les actionnaires de Global Battery Materials et veut savoir qui se cache derrière l'acheteur. Il rappelle que le projet se situe au sommet de deux bassins versants qui irriguent toute la région.",
        category: "media",
        source: "ici.radio-canada.ca",
        url: "https://ici.radio-canada.ca/nouvelle/2272285/lomiko-rachat-mine-graphite-loutre",
        date: "2026-07-29",
        importance: "moyenne",
        isGovernment: false,
    },
    {
        title: "Global Battery Materials acquiert Lomiko Metals pour environ 11 M$",
        summary: "Le 28 juillet 2026, Global Battery Materials Corp. conclut une entente d'arrangement définitive pour acquérir toutes les actions ordinaires de Lomiko Metals à 0,13 $ canadien l'action en espèces. La valeur d'équité avoisine 11 M$ canadiens sur une base entièrement diluée, soit une prime de 71 pour cent sur le cours moyen pondéré de vingt jours à la Bourse de croissance TSX au 27 juillet 2026.",
        category: "miniere",
        source: "lomiko.com",
        url: "https://lomiko.com/2026-news/lomiko-metals-enters-into-definitive-agreement-to-be-acquired-by-global-battery-materials/",
        date: "2026-07-28",
        importance: "haute",
        isGovernment: false,
    },
    {
        title: "Le règlement de contrôle intérimaire 222-2026 de la MRC de Papineau entre en vigueur",
        summary: "Le règlement numéro 222-2026 encadre la gestion de l'urbanisation à l'extérieur des périmètres d'urbanisation sur le territoire de la MRC de Papineau. Il a été adopté par le conseil des maires le 15 avril 2026, par la résolution 2026-04-096, et la ministre des Affaires municipales en a attesté la conformité le 9 juin 2026.",
        category: "municipal",
        source: "mrcpapineau.com",
        url: "https://mrcpapineau.com/avis-public-20/",
        date: "2026-06-09",
        importance: "moyenne",
        isGovernment: true,
    },
    {
        title: "La MRC de Papineau réserve jusqu'à 100 000 $ pour un mémoire d'experts sur les projets miniers",
        summary: "Le 22 mai 2026, le Réseau d'information municipale rapporte que les maires et mairesses de la MRC de Papineau prévoient un investissement maximal de 100 000 $ pour faire produire un mémoire d'experts sur les projets miniers. Radio-Canada confirme le fait le 30 août 2026, quand le préfet Paul-André David indique qu'une firme d'experts a été retenue.",
        category: "municipal",
        source: "rimq.qc.ca",
        url: "https://rimq.qc.ca/article/municipal/categorie/environnement/13/1202202/la-mrc-de-papineau-passe-de-la-parole-aux-gestes-.html",
        date: "2026-05-22",
        importance: "moyenne",
        isGovernment: true,
    },
    {
        title: "Lomiko dépose sur SEDAR+ l'étude de préfaisabilité de La Loutre : 46,8 Mt à 4,79 pour cent de graphite",
        summary: "Le 8 mai 2026, Lomiko dépose le rapport technique NI 43-101 de niveau préfaisabilité et l'estimation des ressources mise à jour, préparés par DRA Americas. Les réserves probables atteignent 46,8 Mt à 4,79 pour cent de carbone graphitique, soit 2,24 Mt de graphite contenu en date de février 2026. Le projet double par rapport à l'étude précédente, et sa durée de vie passe de quinze à vingt-huit ans.",
        category: "miniere",
        source: "lomiko.com",
        url: "https://lomiko.com/2026-news/lomiko-metals-inc-files-a-positive-preliminary-feasibility-study-for-la-loutre-graphite-project-on-sedar/",
        date: "2026-05-08",
        importance: "haute",
        isGovernment: false,
    },
    {
        title: "La MRC de Papineau déclare l'activité minière incompatible avec son territoire",
        summary: "Le 20 avril 2026, l'Alliance publie le texte de la résolution adoptée par le conseil de la MRC de Papineau. Le conseil déclare que l'activité minière, tant en phase d'exploration qu'en phase d'exploitation, est incompatible avec la vocation du territoire de la MRC, avec son modèle de développement durable, avec la protection de ses ressources naturelles et avec le maintien de la qualité de vie de ses communautés.",
        category: "municipal",
        source: "alliancepetitenation.org",
        url: "https://alliancepetitenation.org/une-autre-page-historique-sest-ecrite-en-petite-nation/",
        date: "2026-04-20",
        importance: "haute",
        isGovernment: true,
    },
];
/** Trois reperes de calendrier que la plateforme doit garder sous les yeux. */
exports.SEED_EVENTS = [
    {
        id: "vote-actionnaires-lomiko-2026-09-23",
        title: "Vote des détenteurs de titres de Lomiko sur la vente à Global Battery Materials",
        description: "Assemblée extraordinaire tenue chez Fasken Martineau DuMoulin, à Vancouver, à 10 h heure de Vancouver. Le vote décide si le projet La Loutre change de mains pour environ 11 M$. La clôture de la transaction est attendue au quatrième trimestre.",
        lieu: "Vancouver (Colombie-Britannique)",
        startsAt: Date.parse("2026-09-23T17:00:00Z"),
        dateDisplay: "Mercredi 23 septembre 2026, 13 h heure de l'Est",
        type: "juridique",
    },
    {
        id: "election-generale-quebec-2026-10-05",
        title: "Élection générale au Québec",
        description: "L'Alliance a décidé de faire de la suspension des claims un enjeu de campagne dans Papineau. C'est la date où la question minière se pose directement aux personnes qui sollicitent un mandat.",
        lieu: "Circonscription de Papineau",
        startsAt: Date.parse("2026-10-05T12:00:00Z"),
        dateDisplay: "Lundi 5 octobre 2026",
        type: "autre",
    },
];
function docIdFor(url) {
    return (0, crypto_1.createHash)("sha1").update(url.trim().toLowerCase()).digest("hex").slice(0, 20);
}
/**
 * Ecrit le socle une seule fois. Rend le nombre d'elements ecrits, ou zero
 * quand le socle de cette version est deja pose.
 */
async function seedIfNeeded(db) {
    var _a;
    const marker = db.collection("auditStatus").doc("seed");
    const existing = await marker.get();
    if (existing.exists && ((_a = existing.data()) === null || _a === void 0 ? void 0 : _a.version) === exports.SEED_VERSION)
        return 0;
    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();
    for (const item of exports.SEED_NEWS) {
        batch.set(db.collection("news").doc(docIdFor(item.url)), Object.assign(Object.assign({}, item), { sortDate: item.date, firstSeenAt: now, lastSeenAt: now, runId: `seed-${exports.SEED_VERSION}`, verifiedBySource: true }), { merge: true });
    }
    for (const ev of exports.SEED_EVENTS) {
        const { id } = ev, rest = __rest(ev, ["id"]);
        batch.set(db.collection("events").doc(id), Object.assign(Object.assign({}, rest), { auteurUid: "systeme", auteurNom: "Observatoire", rsvpCount: 0, creeLe: now }), { merge: true });
    }
    batch.set(marker, {
        version: exports.SEED_VERSION,
        posedLe: new Date().toISOString(),
        items: exports.SEED_NEWS.length,
        evenements: exports.SEED_EVENTS.length,
    });
    await batch.commit();
    return exports.SEED_NEWS.length;
}
//# sourceMappingURL=seed.js.map