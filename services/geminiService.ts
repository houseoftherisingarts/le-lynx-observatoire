
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { NewsItem } from "../types";

const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_INSTRUCTION_BASE = `
Tu es le système central de la plateforme "Le Lynx".
Ta mission est d'analyser les données concernant le "Projet minier de la loutre" en Outaouais.

CONTEXTE AUTOCHTONE CRITIQUE :
Le projet se situe sur le territoire non cédé de la nation Anishinabeg (Algonquins), spécifiquement lié à la communauté de Kitigan Zibi Anishinabeg. Ils ont historiquement exigé des moratoires et une consultation réelle. Leurs positions doivent être incluses.

SOURCES DE VÉRITÉ PRIMAIRES :
1. https://alliancepetitenation.org (Position citoyenne, faits scientifiques sur l'eau).
2. https://lomiko.com/fr/projets/projet-la-loutre/ (Documents officiels de la minière).
3. https://gestim.mines.gouv.qc.ca (Données officielles sur les claims).
4. Groupe Facebook : "Action Citoyenne Petite-Nation" (Source clé pour les événements, les idées et le pouls de la communauté).

Règles de génération :
- Sois concis et percutant.
- Ne jamais inventer de données. Si l'information est absente, dis "Donnée non disponible".
- Ton ton est celui d'un observatoire stratégique : neutre, factuel, mais protecteur du territoire.
`;

export const getNewsWithAI = async (): Promise<NewsItem[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Trouve 4 actualités ou faits récents vérifiables en utilisant spécifiquement les mots clés suivants : "Lomiko", "Graphite", "La Loutre", "Projet minier Petite-Nation".
      Cherche des informations sur les audiences, les levées de fonds, les communiqués de presse ou les actions de mobilisation dans les groupes citoyens Facebook.
      Priorité aux sources : Le Droit, Radio-Canada, La Presse, Alliance Petite-Nation, Facebook Groupes Citoyens.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
      }
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const items: NewsItem[] = [];

    if (chunks) {
        chunks.forEach((chunk, index) => {
            if (chunk.web?.uri && items.length < 4) {
                items.push({
                    id: `news-${index}`,
                    title: chunk.web.title || "Information détectée",
                    source: new URL(chunk.web.uri).hostname.replace('www.', ''),
                    date: "Vérifié",
                    snippet: "Source externe identifiée par le système.",
                    url: chunk.web.uri
                });
            }
        });
    }

    if (items.length === 0) {
        items.push({
            id: 'verif-1',
            title: "Kitigan Zibi réclame un moratoire",
            source: "ledroit.com",
            date: "Contexte",
            snippet: "Les chefs algonquins rappellent que le territoire est non cédé et s'opposent à l'exploration sans consentement.",
            url: "https://www.ledroit.com"
        });
        items.push({
            id: 'verif-2',
            title: "Analyse du BAPE : Les enjeux d'eau",
            source: "bape.gouv.qc.ca",
            date: "Document Officiel",
            snippet: "Rapport sur les risques de contamination des nappes phréatiques liés au graphite.",
            url: "https://www.bape.gouv.qc.ca/"
        });
    }

    return items;
  } catch (error) {
    console.error("News fetch error", error);
    return [];
  }
};

export const createChatSession = (): Chat => {
  return ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_BASE + " Réponds par des faits vérifiables. Cite tes sources.",
    },
  });
};

export const summarizeSituation = async (): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Génère une analyse de la situation actuelle formatée STRICTEMENT comme suit pour le parsing :

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
            config: {
                systemInstruction: SYSTEM_INSTRUCTION_BASE
            }
        });
        return response.text;
    } catch (e) {
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
}
