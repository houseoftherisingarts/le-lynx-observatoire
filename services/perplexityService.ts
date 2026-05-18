import { NewsItem } from "../types";

const API_KEY = process.env.PERPLEXITY_API_KEY || '';
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

const SEARCH_QUERY = `Trouve 4 actualités récentes (2024-2025) vérifiables sur les sujets suivants :
- Lomiko Metals et le projet minier "La Loutre" en Outaouais, Québec
- Mobilisation citoyenne Alliance Petite-Nation contre les mines
- Kitigan Zibi Anishinabeg et le projet minier graphite Outaouais
- Claims miniers GESTIM secteur La Loutre

Retourne UNIQUEMENT un tableau JSON valide avec exactement ce format (sans markdown, sans texte autour) :
[
  {
    "title": "Titre de l'article en français",
    "source": "nom-du-site.com",
    "date": "Mois AAAA",
    "snippet": "Résumé factuel de 1-2 phrases.",
    "url": "https://url-complete-de-larticle.com"
  }
]

Sources prioritaires : Le Droit, Radio-Canada, La Presse, lomiko.com, alliancepetitenation.org, gestim.mines.gouv.qc.ca`;

export const getNewsWithPerplexity = async (): Promise<NewsItem[]> => {
  if (!API_KEY) {
    console.error('PERPLEXITY_API_KEY not set');
    return getFallbackNews();
  }

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Tu es un agrégateur de nouvelles factuel. Tu retournes uniquement du JSON valide, sans aucun markdown ni texte supplémentaire.'
          },
          {
            role: 'user',
            content: SEARCH_QUERY
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        return_citations: true,
        search_recency_filter: 'month',
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array in Perplexity response', content.slice(0, 200));
      return getFallbackNews();
    }

    const parsed: Array<{ title: string; source: string; date: string; snippet: string; url: string }> = JSON.parse(jsonMatch[0]);

    const citations: string[] = data.citations || [];

    return parsed.slice(0, 4).map((item, index) => ({
      id: `perp-${Date.now()}-${index}`,
      title: item.title || 'Information détectée',
      source: item.source || extractHost(item.url) || 'Source externe',
      date: item.date || 'Récent',
      snippet: item.snippet || 'Voir la source.',
      url: item.url || citations[index] || undefined,
    }));
  } catch (error) {
    console.error('Perplexity news fetch error:', error);
    return getFallbackNews();
  }
};

function extractHost(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function getFallbackNews(): NewsItem[] {
  return [
    {
      id: 'fallback-1',
      title: 'Kitigan Zibi réclame un moratoire sur le projet La Loutre',
      source: 'ledroit.com',
      date: 'Contexte',
      snippet: 'Les chefs algonquins rappellent que le territoire est non cédé et s\'opposent à l\'exploration sans consentement préalable.',
      url: 'https://www.ledroit.com',
    },
    {
      id: 'fallback-2',
      title: 'Analyse des enjeux d\'eau — Projet minier graphite Outaouais',
      source: 'bape.gouv.qc.ca',
      date: 'Document officiel',
      snippet: 'Rapport sur les risques de contamination des nappes phréatiques liés à l\'exploitation du graphite.',
      url: 'https://www.bape.gouv.qc.ca/',
    },
  ];
}
