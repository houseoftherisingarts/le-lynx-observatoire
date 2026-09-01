"use strict";
/**
 * Sources machine de la veille. Chaque fil a ete teste le 1er septembre 2026.
 * Les fils dedies au dossier sont pris en entier ; les fils generalistes sont
 * filtres par mots-cles avant d'entrer dans la veille.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEEDS = void 0;
exports.parseFeed = parseFeed;
exports.matchesDossier = matchesDossier;
exports.isRecent = isRecent;
exports.collectFeedItems = collectFeedItems;
exports.FEEDS = [
    {
        name: "Alliance Petite-Nation Nord",
        url: "https://alliancepetitenation.org/feed/",
        category: "mobilisation",
        isGovernment: false,
        dedicated: true,
    },
    {
        name: "Lomiko Metals",
        url: "https://lomiko.com/feed/",
        category: "miniere",
        isGovernment: false,
        dedicated: true,
    },
    {
        name: "MRC de Papineau",
        url: "https://mrcpapineau.com/feed/",
        category: "municipal",
        isGovernment: true,
        dedicated: true,
    },
    {
        name: "Association des proprietaires du lac Simon",
        url: "https://www.apls.ca/feed/",
        category: "mobilisation",
        isGovernment: false,
        dedicated: true,
    },
    {
        name: "Regroupement de protection des lacs de la Petite-Nation",
        url: "https://protectionpetitenation.com/feed/",
        category: "mobilisation",
        isGovernment: false,
        dedicated: true,
    },
    {
        name: "Radio-Canada Ottawa-Gatineau",
        url: "https://ici.radio-canada.ca/info/rss/ottawa-gatineau/en-continu",
        category: "media",
        isGovernment: false,
        dedicated: false,
    },
    {
        name: "Le Droit",
        url: "https://www.ledroit.com/arc/outboundfeeds/rss/?outputType=xml",
        category: "media",
        isGovernment: false,
        dedicated: false,
    },
    {
        name: "Assemblee nationale du Quebec",
        url: "https://www.assnat.qc.ca/fr/rss/SyndicationRSS-210.html",
        category: "gouvernement",
        isGovernment: true,
        dedicated: false,
    },
];
/** Mots-cles qui font entrer un item d'un fil generaliste dans la veille. */
const KEYWORDS = [
    "la loutre",
    "lomiko",
    "global battery",
    "graphite",
    "petite-nation",
    "petite nation",
    "papineau",
    "cheneville",
    "chéneville",
    "chénéville",
    "duhamel",
    "lac-des-plages",
    "lac des plages",
    "saint-emile-de-suffolk",
    "saint-émile-de-suffolk",
    "lac simon",
    "lac-simon",
    "namur",
    "ripon",
    "montpellier",
    "claim minier",
    "claims miniers",
    "titre minier",
    "titres miniers",
    "loi sur les mines",
    "redevances minieres",
    "redevances minières",
    "activite miniere",
    "activité minière",
    "aire protegee",
    "aire protégée",
    "territoire incompatible",
    "kitigan zibi",
    "anishinabe",
    "anishinabeg",
    "gestim",
    "bape",
];
function decodeEntities(raw) {
    return raw
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
        .replace(/&amp;/g, "&")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
}
function pick(block, tag) {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    return m ? decodeEntities(m[1]) : "";
}
/** Analyse un RSS 2.0 ou un Atom sans dependance externe. */
function parseFeed(xml, source) {
    const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
    return blocks.map((block) => {
        let link = pick(block, "link");
        if (!link) {
            const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
            link = href ? href[1] : "";
        }
        return {
            title: pick(block, "title"),
            link,
            pubDate: pick(block, "pubDate") || pick(block, "updated") || pick(block, "published"),
            description: (pick(block, "description") || pick(block, "summary")).slice(0, 900),
            source,
        };
    });
}
function matchesDossier(item) {
    if (item.source.dedicated)
        return true;
    const hay = `${item.title} ${item.description}`.toLowerCase();
    return KEYWORDS.some((k) => hay.includes(k));
}
/** Ne garde que ce qui est paru dans la fenetre demandee. */
function isRecent(item, days) {
    if (!item.pubDate)
        return true;
    const t = Date.parse(item.pubDate);
    if (Number.isNaN(t))
        return true;
    return Date.now() - t <= days * 86400000;
}
async function fetchOne(source, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(source.url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "LeLynxObservatoire/1.0 (veille citoyenne; +https://le-lynx-observatoire.web.app)",
                Accept: "application/rss+xml, application/xml, text/xml, */*",
            },
        });
        if (!res.ok) {
            console.warn(`Fil ${source.name} : HTTP ${res.status}`);
            return [];
        }
        return parseFeed(await res.text(), source);
    }
    catch (err) {
        console.warn(`Fil ${source.name} injoignable`, err);
        return [];
    }
    finally {
        clearTimeout(timer);
    }
}
/** Releve tous les fils en parallele et rend ce qui touche au dossier. */
async function collectFeedItems(days = 45) {
    const batches = await Promise.all(exports.FEEDS.map((f) => fetchOne(f)));
    const seen = new Set();
    const kept = [];
    for (const items of batches) {
        for (const item of items) {
            if (!item.title || !item.link)
                continue;
            if (!matchesDossier(item))
                continue;
            if (!isRecent(item, days))
                continue;
            const key = item.link.split("?")[0].toLowerCase();
            if (seen.has(key))
                continue;
            seen.add(key);
            kept.push(item);
        }
    }
    return kept;
}
//# sourceMappingURL=sources.js.map