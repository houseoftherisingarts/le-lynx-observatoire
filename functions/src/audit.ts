import { onSchedule } from "firebase-functions/v2/scheduler";
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";

const db = admin.firestore();

/**
 * Audit quotidien du projet minier La Loutre (Lomiko Metals) et de la lutte
 * citoyenne dans la Petite-Nation. Une passe par jour, recherche web reelle,
 * ecriture dans Firestore. Le client ne fait que lire.
 */

const REGION = "us-central1";
const MAX_ITEMS = 12;

const AUDIT_SYSTEM = `Tu es le systeme de veille de la plateforme "Le Lynx — Observatoire".

Ta mission : surveiller tout ce qui touche le projet minier de graphite "La Loutre" de Lomiko Metals, dans la Petite-Nation (MRC de Papineau, Outaouais, Quebec), et la mobilisation citoyenne qui s'y oppose.

Territoire vise : Duhamel, Lac-des-Plages, Cheneville, Namur, Saint-Emile-de-Suffolk, Ripon, Lac-Simon, Montpellier, Chenier, et la MRC de Papineau.
Acteurs suivis : Lomiko Metals, Alliance Petite-Nation, Kitigan Zibi Anishinabeg, le conseil de la MRC de Papineau et les conseils municipaux, le ministere des Ressources naturelles et des Forets, le BAPE, l'Assemblee nationale du Quebec, les groupes citoyens locaux.

CONTEXTE AUTOCHTONE : le projet se situe sur un territoire anishinabe non cede. La position de Kitigan Zibi Anishinabeg fait partie de la veille, jamais en note de bas de page.

REGLES ABSOLUES :
- Tu ne rapportes que ce que tu as reellement trouve par recherche web. Aucune invention.
- Chaque element porte une URL qui existe vraiment et que tu as consultee.
- Si tu n'es pas certain d'une date, ecris la date approximative telle que la source la donne.
- Ecris en francais, dans des phrases completes avec sujet et verbe. Jamais de fragments empiles en virgules.
- Pas de tiret cadratin. Pas de conclusion inspirante. Pas de formule creuse.
- Le ton est celui d'un observatoire : factuel, precis, protecteur du territoire sans etre militant dans la formulation.`;

const CATEGORIES = [
  "gouvernement",
  "municipal",
  "miniere",
  "mobilisation",
  "autochtone",
  "juridique",
  "media",
] as const;

function auditPrompt(sinceLabel: string): string {
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

interface AuditItem {
  title: string;
  summary: string;
  category: string;
  source: string;
  url: string;
  date: string;
  importance: string;
  isGovernment: boolean;
}

function extractJsonArray(text: string): AuditItem[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function docIdFor(item: AuditItem): string {
  const key = (item.url || item.title || "").trim().toLowerCase();
  return createHash("sha1").update(key).digest("hex").slice(0, 20);
}

function normalizeCategory(raw: string): string {
  const c = (raw || "").toLowerCase().trim();
  return (CATEGORIES as readonly string[]).includes(c) ? c : "media";
}

/** Rend une date triable meme quand la source ne donne qu'un mois. */
function sortableDate(raw: string, fallbackIso: string): string {
  const iso = (raw || "").match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  return fallbackIso.slice(0, 10);
}

export async function runAudit(trigger: string): Promise<{ found: number; added: number; runId: string }> {
  const startedAt = new Date();
  const nowIso = startedAt.toISOString();
  const sinceLabel = "les 30 derniers jours, en insistant sur les 10 derniers";

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    system: AUDIT_SYSTEM,
    tools: [
      {
        type: "web_search_20260209",
        name: "web_search",
        max_uses: 25,
      } as unknown as Anthropic.Tool,
    ],
    messages: [{ role: "user", content: auditPrompt(sinceLabel) }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const items = extractJsonArray(text).slice(0, MAX_ITEMS);

  const runRef = db.collection("auditRuns").doc();
  let added = 0;

  const batch = db.batch();
  for (const item of items) {
    if (!item?.url || !item?.title) continue;
    const ref = db.collection("news").doc(docIdFor(item));
    batch.set(
      ref,
      {
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
      },
      { merge: true }
    );
    added += 1;
  }

  batch.set(runRef, {
    trigger,
    startedAt: nowIso,
    finishedAt: new Date().toISOString(),
    found: items.length,
    written: added,
    model: response.model,
    ok: items.length > 0,
    rawPreview: text.slice(0, 1500),
  });

  // Etat public de la veille, lisible par tout le monde sur la page Nouvelles.
  batch.set(db.collection("auditStatus").doc("latest"), {
    lastRunAt: new Date().toISOString(),
    trigger,
    found: items.length,
    written: added,
    ok: items.length > 0,
  });

  await batch.commit();

  return { found: items.length, added, runId: runRef.id };
}

/** Une passe par jour, 6h05 heure de l'Est. */
export const dailyAudit = onSchedule(
  {
    schedule: "5 6 * * *",
    timeZone: "America/Toronto",
    region: REGION,
    secrets: ["ANTHROPIC_API_KEY"],
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const result = await runAudit("schedule");
    console.log("dailyAudit", JSON.stringify(result));
  }
);

/**
 * Declenchement manuel, reserve aux comptes admin.
 * Appel : POST avec un jeton Firebase ID dans l'entete Authorization.
 */
export const runAuditNow = functions.onRequest(
  {
    region: REGION,
    secrets: ["ANTHROPIC_API_KEY"],
    timeoutSeconds: 540,
    memory: "512MiB",
    cors: true,
  },
  async (req, res) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token) {
      res.status(401).json({ error: "Authentification requise." });
      return;
    }

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      const profile = await db.collection("users").doc(decoded.uid).get();
      if (profile.data()?.role !== "admin") {
        res.status(403).json({ error: "Reserve a l'administration." });
        return;
      }
    } catch {
      res.status(401).json({ error: "Jeton invalide." });
      return;
    }

    try {
      const result = await runAudit("manual");
      res.json(result);
    } catch (err) {
      console.error("runAuditNow error", err);
      res.status(500).json({ error: "L'audit a echoue." });
    }
  }
);
