"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAuditNow = exports.dailyAudit = void 0;
exports.runAudit = runAudit;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const functions = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const sdk_1 = require("@anthropic-ai/sdk");
const crypto_1 = require("crypto");
const sources_1 = require("./sources");
const seed_1 = require("./seed");
const db = admin.firestore();
/**
 * Audit quotidien du projet minier La Loutre (Lomiko Metals) et de la lutte
 * citoyenne dans la Petite-Nation. Une passe par jour, recherche web reelle,
 * ecriture dans Firestore. Le client ne fait que lire.
 */
const REGION = "us-central1";
const MAX_ITEMS = 12;
const AUDIT_SYSTEM = `Tu es le systeme de veille de la plateforme "Le Lynx, Observatoire citoyen".

Ta mission : surveiller tout ce qui touche le projet minier de graphite "La Loutre" de Lomiko Metals, dans la Petite-Nation (MRC de Papineau, Outaouais, Quebec), et la mobilisation citoyenne qui s'y oppose.

Territoire vise : Duhamel, Lac-des-Plages, Cheneville, Namur, Saint-Emile-de-Suffolk, Ripon, Lac-Simon, Montpellier, Chenier, et la MRC de Papineau.
Acteurs suivis : Lomiko Metals, Alliance Petite-Nation, Kitigan Zibi Anishinabeg, le conseil de la MRC de Papineau et les conseils municipaux, le ministere des Ressources naturelles et des Forets, le BAPE, l'Assemblee nationale du Quebec, les groupes citoyens locaux.

CONTEXTE AUTOCHTONE : le projet se situe sur un territoire anishinabe non cede. La position de Kitigan Zibi Anishinabeg fait partie de la veille, jamais en note de bas de page.

REGLES ABSOLUES :
- Tu ne rapportes que ce que tu as reellement trouve par recherche web. Aucune invention.
- Chaque element porte une URL qui existe vraiment et que tu as consultee.
- Si tu n'es pas certain d'une date, ecris la date approximative telle que la source la donne.
- Ecris en francais, dans des phrases completes avec sujet et verbe. Jamais de fragments empiles en virgules.
- N'ecris JAMAIS de tiret cadratin (le caractere long). Utilise la virgule, les deux-points, le point ou les parentheses.
- Pas de conclusion inspirante, pas de formule creuse, pas de question rhetorique suivie de sa reponse.
- Ecris les accents francais correctement. « evenement » sans accent est une faute.
- Le ton est celui d'un observatoire : factuel, precis, protecteur du territoire sans etre militant dans la formulation.`;
const CATEGORIES = [
    "gouvernement",
    "municipal",
    "miniere",
    "mobilisation",
    "autochtone",
    "juridique",
    "media",
];
function auditPrompt(sinceLabel) {
    return `Fais la veille du jour. Cherche activement sur le web, en francais et en anglais, et ouvre les pages avant de conclure.

Couvre ces sept fronts, un par un :

1. GOUVERNEMENT PROVINCIAL ET FEDERAL. Nouveaux claims miniers ou changements de statut dans GESTIM pour le secteur, avis publies a la Gazette officielle du Quebec, communiques du ministere des Ressources naturelles et des Forets, mandats ou audiences du BAPE, avancement de la reforme de la Loi sur les mines et des projets de loi a l'Assemblee nationale, decisions sur les territoires incompatibles avec l'activite miniere (TIAM), subventions ou financements publics lies au graphite et a la filiere batterie.
2. MUNICIPAL. Seances et resolutions des conseils municipaux de la Petite-Nation et du conseil de la MRC de Papineau, memoires deposes, rencontres publiques avec les elus, contre-propositions ou plans alternatifs mis sur la table par des elus.
3. LA MINIERE. Communiques de Lomiko Metals, depots reglementaires, financements et levees de fonds, forages, resultats techniques, changements de direction ou d'actionnariat.
4. MOBILISATION CITOYENNE. Actions de l'Alliance Petite-Nation, petitions, assemblees, manifestations, campagnes, prises de position d'organismes.
5. POSITION AUTOCHTONE. Declarations et demarches de Kitigan Zibi Anishinabeg et des autorites anishinabeg sur le territoire non cede et sur le consentement.
6. JURIDIQUE. Recours, mises en demeure, jugements, avis juridiques rendus publics.
7. MEDIAS. Reportages et analyses du Droit, de Radio-Canada Ottawa-Gatineau, de La Presse, de L'Info Petite-Nation et des medias regionaux.

Periode prioritaire : ${sinceLabel}. Remonte plus loin seulement si un fait ancien est indispensable pour comprendre un fait recent.

Reponds UNIQUEMENT avec un tableau JSON valide, sans texte autour et sans bloc de code markdown. Au plus ${MAX_ITEMS} elements, les plus importants d'abord. Format exact de chaque element :

{
  "title": "Titre factuel en francais, une seule ligne",
  "summary": "Deux a quatre phrases completes qui disent ce qui s'est passe et ce que ca change pour la lutte.",
  "category": "gouvernement | municipal | miniere | mobilisation | autochtone | juridique | media",
  "source": "nom du site, par exemple ledroit.com",
  "url": "https://url-complete-verifiee",
  "date": "AAAA-MM-JJ si connue, sinon Mois AAAA",
  "importance": "haute | moyenne | basse",
  "isGovernment": true ou false
}

Si tu ne trouves rien de neuf sur un front, ne remplis pas de vide : n'ajoute simplement aucun element pour ce front.`;
}
function extractJsonArray(text) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced ? fenced[1] : text;
    const start = candidate.indexOf("[");
    const end = candidate.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start)
        return [];
    try {
        const parsed = JSON.parse(candidate.slice(start, end + 1));
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (_a) {
        return [];
    }
}
function docIdFor(item) {
    const key = (item.url || item.title || "").trim().toLowerCase();
    return (0, crypto_1.createHash)("sha1").update(key).digest("hex").slice(0, 20);
}
function normalizeCategory(raw) {
    const c = (raw || "").toLowerCase().trim();
    return CATEGORIES.includes(c) ? c : "media";
}
/** Rend une date triable meme quand la source ne donne qu'un mois. */
function sortableDate(raw, fallbackIso) {
    const iso = (raw || "").match(/\d{4}-\d{2}-\d{2}/);
    if (iso)
        return iso[0];
    return fallbackIso.slice(0, 10);
}
/** Resume les items de fils en une liste compacte pour le modele. */
function feedDigest(items) {
    return items
        .slice(0, 60)
        .map((i, n) => `${n + 1}. [${i.source.name} | ${i.source.category}] ${i.title}\n   ${i.link}\n   ${i.pubDate}\n   ${i.description.slice(0, 300)}`)
        .join("\n");
}
async function runAudit(trigger) {
    const startedAt = new Date();
    const nowIso = startedAt.toISOString();
    const db2 = db;
    // Le socle verifie se pose une seule fois, avant toute chose.
    const seeded = await (0, seed_1.seedIfNeeded)(db2);
    // Passe 1 : les fils machine, deterministes et sans invention possible.
    const feedItems = await (0, sources_1.collectFeedItems)(45);
    // Passe 2 : le modele classe les items des fils, puis cherche sur le web ce
    // qu'aucun fil ne publie (registres, proces-verbaux municipaux, Gazette).
    const anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    const userMessage = auditPrompt("les 30 derniers jours, en insistant sur les 10 derniers") +
        (feedItems.length
            ? `\n\nRELEVE BRUT DES FILS SURVEILLES, releve a l'instant. Classe d'abord ce qui touche au dossier, reprends l'adresse telle quelle, et ecris le resume en francais dans tes mots :\n\n${feedDigest(feedItems)}`
            : "\n\nAucun fil n'a repondu cette fois. Appuie-toi entierement sur la recherche web.");
    const response = await anthropic.messages.create({
        model: "claude-opus-5",
        max_tokens: 16000,
        system: AUDIT_SYSTEM,
        tools: [
            {
                type: "web_search_20260209",
                name: "web_search",
                max_uses: 25,
            },
        ],
        messages: [{ role: "user", content: userMessage }],
    });
    const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
    const items = extractJsonArray(text).slice(0, MAX_ITEMS);
    const runRef = db2.collection("auditRuns").doc();
    let added = 0;
    const batch = db2.batch();
    for (const item of items) {
        if (!(item === null || item === void 0 ? void 0 : item.url) || !(item === null || item === void 0 ? void 0 : item.title))
            continue;
        if (!/^https?:\/\//i.test(item.url))
            continue;
        const ref = db2.collection("news").doc(docIdFor(item));
        batch.set(ref, {
            title: String(item.title).slice(0, 300),
            summary: String(item.summary || "").slice(0, 1200),
            category: normalizeCategory(item.category),
            source: String(item.source || "").slice(0, 120),
            url: String(item.url).slice(0, 800),
            date: String(item.date || "").slice(0, 40),
            sortDate: sortableDate(String(item.date || ""), nowIso),
            importance: ["haute", "moyenne", "basse"].includes(item.importance) ? item.importance : "moyenne",
            isGovernment: item.isGovernment === true,
            firstSeenAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
            runId: runRef.id,
        }, { merge: true });
        added += 1;
    }
    batch.set(runRef, {
        trigger,
        startedAt: nowIso,
        finishedAt: new Date().toISOString(),
        feedItems: feedItems.length,
        found: items.length,
        written: added,
        seeded,
        model: response.model,
        ok: items.length > 0,
        rawPreview: text.slice(0, 1500),
    });
    // Etat public de la veille, lisible par tout le monde sur la page Nouvelles.
    batch.set(db2.collection("auditStatus").doc("latest"), {
        lastRunAt: new Date().toISOString(),
        trigger,
        found: items.length,
        feedItems: feedItems.length,
        written: added,
        ok: items.length > 0,
    });
    await batch.commit();
    return { found: items.length, added, feedItems: feedItems.length, seeded, runId: runRef.id };
}
/** Une passe par jour, 6h05 heure de l'Est. */
exports.dailyAudit = (0, scheduler_1.onSchedule)({
    schedule: "5 6 * * *",
    timeZone: "America/Toronto",
    region: REGION,
    secrets: ["ANTHROPIC_API_KEY"],
    timeoutSeconds: 540,
    memory: "512MiB",
}, async () => {
    const result = await runAudit("schedule");
    console.log("dailyAudit", JSON.stringify(result));
});
/**
 * Declenchement manuel, reserve aux comptes admin.
 * Appel : POST avec un jeton Firebase ID dans l'entete Authorization.
 */
exports.runAuditNow = functions.onRequest({
    region: REGION,
    secrets: ["ANTHROPIC_API_KEY"],
    timeoutSeconds: 540,
    memory: "512MiB",
    cors: true,
}, async (req, res) => {
    var _a;
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
        res.status(401).json({ error: "Authentification requise." });
        return;
    }
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        const profile = await db.collection("users").doc(decoded.uid).get();
        if (((_a = profile.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
            res.status(403).json({ error: "Reserve a l'administration." });
            return;
        }
    }
    catch (_b) {
        res.status(401).json({ error: "Jeton invalide." });
        return;
    }
    try {
        const result = await runAudit("manual");
        res.json(result);
    }
    catch (err) {
        console.error("runAuditNow error", err);
        res.status(500).json({ error: "L'audit a echoue." });
    }
});
//# sourceMappingURL=audit.js.map