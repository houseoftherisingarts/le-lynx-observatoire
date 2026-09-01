"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifierRole = exports.compteurMembres = exports.ancienMurReaction = exports.murCommentaireEcrit = exports.murVoteEcrit = exports.runAuditNow = exports.dailyAudit = exports.claudeSummary = exports.claudeChat = void 0;
const functions = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const sdk_1 = require("@anthropic-ai/sdk");
admin.initializeApp();
const db = admin.firestore();
const DAILY_LIMIT = 3;
const SUMMARY_CACHE_HOURS = 6;
const SYSTEM_PROMPT = `Tu es le système central de la plateforme "Le Lynx".
Ta mission est d'analyser les données concernant le "Projet minier de la loutre" en Outaouais.

CONTEXTE AUTOCHTONE CRITIQUE :
Le projet se situe sur le territoire non cédé de la nation Anishinabeg (Algonquins), spécifiquement lié à la communauté de Kitigan Zibi Anishinabeg. Ils ont historiquement exigé des moratoires et une consultation réelle. Leurs positions doivent être incluses.

SOURCES DE VÉRITÉ PRIMAIRES :
1. https://alliancepetitenation.org (Position citoyenne, faits scientifiques sur l'eau).
2. https://lomiko.com/fr/projets/projet-la-loutre/ (Documents officiels de la minière).
3. https://gestim.mines.gouv.qc.ca (Données officielles sur les claims).

Règles de génération :
- Sois concis et percutant.
- Ne jamais inventer de données. Si l'information est absente, dis "Donnée non disponible".
- Ton ton est celui d'un observatoire stratégique : neutre, factuel, mais protecteur du territoire.
- Réponds par des faits vérifiables. Cite tes sources.`;
function getClientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || "unknown";
}
function todayKey() {
    return new Date().toISOString().slice(0, 10);
}
async function checkAndIncrementRateLimit(ip, uid) {
    const today = todayKey();
    // Authenticated users are keyed by UID (persistent across IPs/devices).
    // Anonymous users fall back to IP.
    const key = uid ? `uid_${uid}_${today}` : `ip_${ip}_${today}`;
    const ref = db.collection("rateLimits").doc(key);
    return db.runTransaction(async (tx) => {
        var _a, _b;
        const doc = await tx.get(ref);
        const count = doc.exists ? ((_b = (_a = doc.data()) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0) : 0;
        if (count >= DAILY_LIMIT) {
            return { allowed: false, remaining: 0 };
        }
        tx.set(ref, { key, date: today, count: count + 1 }, { merge: true });
        return { allowed: true, remaining: DAILY_LIMIT - count - 1 };
    });
}
const corsOrigins = [
    "https://le-lynx-observatoire.web.app",
    "https://le-lynx-observatoire.firebaseapp.com",
    "https://lynxobservatoire.netlify.app",
    "http://localhost:3000",
    "http://localhost:3001",
];
// Chat endpoint — rate limited at 3 questions per IP per day
exports.claudeChat = functions.onRequest({ cors: corsOrigins, secrets: ["ANTHROPIC_API_KEY"] }, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    const ip = getClientIp(req);
    const { uid } = req.body;
    const { allowed, remaining } = await checkAndIncrementRateLimit(ip, uid);
    if (!allowed) {
        res.status(429).json({
            error: "rate_limit",
            message: "Limite atteinte. Vous avez utilisé vos 3 questions pour aujourd'hui. Revenez demain.",
        });
        return;
    }
    const { messages, userMessage } = req.body;
    if (!(userMessage === null || userMessage === void 0 ? void 0 : userMessage.trim())) {
        res.status(400).json({ error: "userMessage is required" });
        return;
    }
    try {
        const anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
        const history = (messages || []).slice(-10); // max 10 turns of context
        const fullMessages = [
            ...history,
            { role: "user", content: userMessage },
        ];
        const response = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 512,
            system: SYSTEM_PROMPT,
            messages: fullMessages,
        });
        const text = response.content[0].type === "text" ? response.content[0].text : "";
        res.json({ text, remaining });
    }
    catch (err) {
        console.error("Claude chat error:", err);
        res.status(500).json({ error: "Erreur de connexion au système d'analyse." });
    }
});
// Dashboard summary — cached in Firestore for 6h, no per-user rate limit
exports.claudeSummary = functions.onRequest({ cors: corsOrigins, secrets: ["ANTHROPIC_API_KEY"] }, async (req, res) => {
    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    const cacheRef = db.collection("summaryCache").doc("situation");
    const cached = await cacheRef.get();
    if (cached.exists) {
        const data = cached.data();
        const ageHours = (Date.now() - data.createdAt) / 3600000;
        if (ageHours < SUMMARY_CACHE_HOURS) {
            res.json({ text: data.text, cached: true });
            return;
        }
    }
    try {
        const anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
        const response = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 600,
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: "user",
                    content: `Génère une analyse de la situation actuelle formatée STRICTEMENT comme suit pour le parsing :

INTRO: [Un court paragraphe de 2-3 phrases résumant l'ambiance générale (tensions, calme, ou mobilisation).]
###
TYPE: DANGER
TITRE: [Titre court sur l'état du projet minier]
DETAIL: [Détails précis sur les activités de Lomiko, les forages ou les levées de fonds. Mentionne les claims.]
###
TYPE: BOUCLIER
TITRE: [Titre court sur la mobilisation citoyenne]
DETAIL: [Détails sur l'Alliance Petite Nation, les discussions Facebook récentes, les pétitions ou les actions juridiques en cours.]
###
TYPE: PLUME
TITRE: [Titre court sur la position Autochtone]
DETAIL: [La position de Kitigan Zibi Anishinabeg concernant le territoire et le projet.]

N'utilise pas de markdown gras ou italique. Juste le texte brut avec les séparateurs ###.`,
                },
            ],
        });
        const text = response.content[0].type === "text" ? response.content[0].text : "";
        await cacheRef.set({ text, createdAt: Date.now() });
        res.json({ text, cached: false });
    }
    catch (err) {
        console.error("Claude summary error:", err);
        res.status(500).json({ error: "Erreur d'analyse." });
    }
});
// Veille quotidienne (audit gouvernemental + nouvelles)
var audit_1 = require("./audit");
Object.defineProperty(exports, "dailyAudit", { enumerable: true, get: function () { return audit_1.dailyAudit; } });
Object.defineProperty(exports, "runAuditNow", { enumerable: true, get: function () { return audit_1.runAuditNow; } });
// Comptes du Mur, tenus par le serveur
var mur_1 = require("./mur");
Object.defineProperty(exports, "murVoteEcrit", { enumerable: true, get: function () { return mur_1.murVoteEcrit; } });
Object.defineProperty(exports, "murCommentaireEcrit", { enumerable: true, get: function () { return mur_1.murCommentaireEcrit; } });
Object.defineProperty(exports, "ancienMurReaction", { enumerable: true, get: function () { return mur_1.ancienMurReaction; } });
Object.defineProperty(exports, "compteurMembres", { enumerable: true, get: function () { return mur_1.compteurMembres; } });
// Attribution du role d'administration
var roles_1 = require("./roles");
Object.defineProperty(exports, "verifierRole", { enumerable: true, get: function () { return roles_1.verifierRole; } });
//# sourceMappingURL=index.js.map