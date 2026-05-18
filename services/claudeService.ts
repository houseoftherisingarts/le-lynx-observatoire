const FUNCTIONS_BASE = process.env.FUNCTIONS_BASE_URL || "https://us-central1-le-lynx-observatoire.cloudfunctions.net";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  text: string;
  remaining: number;
}

export interface SummaryResponse {
  text: string;
  cached: boolean;
}

export const sendChatMessage = async (
  history: ClaudeMessage[],
  userMessage: string,
  uid?: string
): Promise<ChatResponse> => {
  const res = await fetch(`${FUNCTIONS_BASE}/claudeChat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history, userMessage, uid }),
  });

  if (res.status === 429) {
    const data = await res.json();
    throw new RateLimitError(data.message || "Limite atteinte pour aujourd'hui.");
  }

  if (!res.ok) {
    throw new Error("Erreur de connexion au serveur d'analyse.");
  }

  return res.json();
};

export const getSituationSummary = async (): Promise<string> => {
  const res = await fetch(`${FUNCTIONS_BASE}/claudeSummary`);

  if (!res.ok) {
    return getFallbackSummary();
  }

  const data: SummaryResponse = await res.json();
  return data.text;
};

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

function getFallbackSummary(): string {
  return `INTRO: Analyse des données en cours. Le système récupère les derniers statuts des claims et les communiqués de presse.
###
TYPE: DANGER
TITRE: Statut des Claims
DETAIL: Vérification de la carte GESTIM en cours pour identifier les nouveaux jalonnements.
###
TYPE: BOUCLIER
TITRE: Mobilisation
DETAIL: L'Alliance Petite Nation continue ses actions de surveillance.`;
}
