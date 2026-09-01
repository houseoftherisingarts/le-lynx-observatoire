import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";

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
- Réponds par des faits vérifiables. Cite tes sources en donnant l'adresse en clair.

Règles d'écriture, sans exception :
- N'écris JAMAIS de tiret cadratin. Utilise la virgule, les deux-points, le point ou les parenthèses.
- Écris en phrases entières, avec sujet et verbe. Jamais de fragments empilés en virgules.
- Aucun markdown. Pas d'astérisques, pas de dièses, pas de gras, pas de puces. Ta réponse s'affiche telle quelle dans une bulle de conversation, donc les symboles de mise en forme se voient et gâchent la lecture.
- Réponds en prose, de trois à six phrases, en allant droit au fait. Si la question appelle une énumération, écris-la en phrases séparées par des retours à la ligne, sans tiret ni puce devant.
- Pas de conclusion inspirante, pas de question rhétorique suivie de sa réponse.`;

function getClientIp(req: functions.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "unknown";
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function checkAndIncrementRateLimit(ip: string, uid?: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = todayKey();
  // Authenticated users are keyed by UID (persistent across IPs/devices).
  // Anonymous users fall back to IP.
  const key = uid ? `uid_${uid}_${today}` : `ip_${ip}_${today}`;
  const ref = db.collection("rateLimits").doc(key);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const count: number = doc.exists ? (doc.data()?.count ?? 0) : 0;

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

// Chat endpoint, rate limited at 3 questions per IP per day
export const claudeChat = functions.onRequest(
  { cors: corsOrigins, secrets: ["ANTHROPIC_API_KEY"] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const ip = getClientIp(req);
    const { uid } = req.body as { uid?: string; messages: unknown; userMessage: string };
    const { allowed, remaining } = await checkAndIncrementRateLimit(ip, uid);

    if (!allowed) {
      res.status(429).json({
        error: "rate_limit",
        message: "Limite atteinte. Vous avez utilisé vos 3 questions pour aujourd'hui. Revenez demain.",
      });
      return;
    }

    const { messages, userMessage } = req.body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      userMessage: string;
    };

    if (!userMessage?.trim()) {
      res.status(400).json({ error: "userMessage is required" });
      return;
    }

    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      // L'assistant repond a partir de la veille reelle, pas de sa memoire.
      const veille = await db
        .collection("news")
        .orderBy("sortDate", "desc")
        .limit(30)
        .get();

      const releve = veille.docs
        .map((d) => {
          const n = d.data();
          return `[${n.category} | ${n.date}] ${n.title}\n    ${String(n.summary || "").slice(0, 350)}\n    ${n.url}`;
        })
        .join("\n\n");

      const systemeDuJour = releve
        ? `${SYSTEM_PROMPT}\n\nVEILLE LA PLUS RECENTE DE LA PLATEFORME. Elle prime sur ta memoire. Quand une question porte sur l'etat actuel du dossier, reponds a partir d'ici et cite l'adresse.\n\n${releve}`
        : SYSTEM_PROMPT;

      const history = (messages || []).slice(-10); // max 10 turns of context
      const fullMessages: Array<{ role: "user" | "assistant"; content: string }> = [
        ...history,
        { role: "user", content: userMessage },
      ];

      const response = await anthropic.messages.create({
        model: "claude-opus-5",
        max_tokens: 1500,
        system: [
          { type: "text", text: systemeDuJour, cache_control: { type: "ephemeral" } },
        ],
        messages: fullMessages,
      });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      res.json({ text, remaining });
    } catch (err) {
      console.error("Claude chat error:", err);
      res.status(500).json({ error: "Erreur de connexion au système d'analyse." });
    }
  }
);

// Dashboard summary, cached in Firestore for 6h, no per-user rate limit
export const claudeSummary = functions.onRequest(
  { cors: corsOrigins, secrets: ["ANTHROPIC_API_KEY"] },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const cacheRef = db.collection("summaryCache").doc("situation");
    const cached = await cacheRef.get();

    if (cached.exists) {
      const data = cached.data()!;
      const ageHours = (Date.now() - data.createdAt) / 3_600_000;
      if (ageHours < SUMMARY_CACHE_HOURS) {
        res.json({ text: data.text, cached: true });
        return;
      }
    }

    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      // Le resume se construit sur la veille du jour, pas sur la memoire du
      // modele. Sans nouvelles en base, aucune analyse n'est produite.
      const veille = await db
        .collection("news")
        .orderBy("sortDate", "desc")
        .limit(25)
        .get();

      const releve = veille.docs
        .map((d) => {
          const n = d.data();
          return `[${n.category} | ${n.date}] ${n.title}\n    ${String(n.summary || "").slice(0, 400)}\n    ${n.url}`;
        })
        .join("\n\n");

      const response = await anthropic.messages.create({
        model: "claude-opus-5",
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Voici la veille la plus recente de la plateforme, relevee automatiquement. Appuie ton analyse UNIQUEMENT sur ce releve, sans rien ajouter de memoire.

${releve || "Aucune nouvelle en base pour l'instant."}

Genere une analyse de la situation actuelle formatee STRICTEMENT comme suit pour le parsing :

INTRO: [Un court paragraphe de deux a trois phrases entieres qui dit ou en est le dossier aujourd'hui.]
###
TYPE: DANGER
TITRE: [Titre court sur l'etat du projet minier]
DETAIL: [Deux a quatre phrases entieres sur l'etat du projet et de la miniere, tirees du releve. Nomme les dates et les chiffres exacts.]
###
TYPE: BOUCLIER
TITRE: [Titre court sur la mobilisation citoyenne]
DETAIL: [Deux a quatre phrases entieres sur la mobilisation citoyenne et municipale, tirees du releve.]
###
TYPE: PLUME
TITRE: [Titre court sur la position anishinabe]
DETAIL: [Deux a quatre phrases entieres sur la position anishinabe et sur le territoire non cede. Si le releve ne dit rien de neuf, dis-le franchement plutot que d'inventer.]

N'utilise pas de markdown gras ou italique. Juste le texte brut avec les separateurs ###. Ecris en francais avec les accents corrects, en phrases entieres, sans tiret cadratin.`,
          },
        ],
      });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      await cacheRef.set({ text, createdAt: Date.now() });

      res.json({ text, cached: false });
    } catch (err) {
      console.error("Claude summary error:", err);
      res.status(500).json({ error: "Erreur d'analyse." });
    }
  }
);

// Veille quotidienne (audit gouvernemental + nouvelles)
export { dailyAudit, runAuditNow } from "./audit";

// Comptes du Mur, tenus par le serveur
export { murVoteEcrit, murCommentaireEcrit, ancienMurReaction, compteurMembres } from "./mur";

// Attribution du role d'administration
export { verifierRole } from "./roles";
