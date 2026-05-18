
import React, { useEffect, useState } from 'react';
import { getNewsWithPerplexity } from '../services/perplexityService';
import { NewsItem, Language } from '../types';
import { RefreshCw, ExternalLink, Globe, Radio, History, Info, Facebook } from 'lucide-react';

interface NewsFeedProps {
    language: Language;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ language }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const translations = {
      fr: {
          title: "Veille Médiatique",
          subtitle: "Agrégateur d'articles et revue de presse automatisée.",
          refresh: "Actualiser",
          identifiedNews: "Actualités Identifiées",
          infoTooltip: "Le système scanne les grands titres et les groupes Facebook pour les mots-clés : Lomiko, La Loutre, Claims miniers.",
          fbGroup: "Groupe de Soutien Facebook",
          fbDesc: "Source surveillée pour événements et idées",
          active: "Actif",
          access: "Accéder à l'article",
          archives: "Archives Presse (2018-2024)",
          readArchive: "Lire l'archive"
      },
      en: {
          title: "Media Monitoring",
          subtitle: "Article aggregator and automated press review.",
          refresh: "Refresh",
          identifiedNews: "Identified News",
          infoTooltip: "The system scans headlines and Facebook groups for keywords: Lomiko, La Loutre, Mining claims.",
          fbGroup: "Facebook Support Group",
          fbDesc: "Monitored source for events and ideas",
          active: "Active",
          access: "Read article",
          archives: "Press Archives (2018-2024)",
          readArchive: "Read Archive"
      },
      ani: {
          title: "Babaamajimowin", // News/Reporting
          subtitle: "Article aggregator and automated press review.",
          refresh: "Refresh",
          identifiedNews: "Identified News",
          infoTooltip: "The system scans headlines and Facebook groups for keywords: Lomiko, La Loutre, Mining claims.",
          fbGroup: "Facebook Support Group",
          fbDesc: "Monitored source for events and ideas",
          active: "Active",
          access: "Read article",
          archives: "Gaa-bi-izhiwebag (Archives)",
          readArchive: "Read Archive"
      }
  };

  const t = translations[language];

  // Static Historical Data for accurate timeline back to 2018
  const historicalNews: NewsItem[] = [
      {
          id: 'hist-2024-1',
          title: "Lomiko Metals annonce une mise à jour de ses ressources minérales",
          source: "lomiko.com",
          date: "Avril 2024",
          snippet: "La compagnie publie une estimation révisée pour le projet La Loutre, augmentant les volumes projetés.",
          url: "https://lomiko.com/fr/nouvelles/"
      },
      {
          id: 'hist-2024-2',
          title: "Mobilisation citoyenne : L'Alliance Petite-Nation organise une grande marche",
          source: "Le Droit",
          date: "Mars 2024",
          snippet: "Plus de 500 citoyens marchent pour demander l'arrêt des travaux d'exploration.",
          url: "https://www.ledroit.com"
      },
      {
          id: 'hist-2023-1',
          title: "Kitigan Zibi réitère son opposition formelle",
          source: "Radio-Canada",
          date: "Novembre 2023",
          snippet: "Le chef Dylan Whiteduck déclare qu'aucune consultation significative n'a eu lieu.",
          url: "https://ici.radio-canada.ca"
      },
      {
          id: 'hist-2022-1',
          title: "Dépôt des résultats préliminaires du BAPE",
          source: "BAPE",
          date: "Juin 2022",
          snippet: "Le rapport soulève des inquiétudes majeures concernant l'impact sur les milieux humides.",
          url: "https://www.bape.gouv.qc.ca"
      },
      {
          id: 'hist-2021-1',
          title: "Lomiko acquiert 100% du projet La Loutre",
          source: "Yahoo Finance",
          date: "Février 2021",
          snippet: "Transaction majeure consolidant la position de la minière dans la région.",
          url: "https://finance.yahoo.com"
      },
      {
          id: 'hist-2020-1',
          title: "Premières inquiétudes des riverains du Lac des Plages",
          source: "Info Petite Nation",
          date: "Août 2020",
          snippet: "Des résidents signalent des activités de forage proches des résidences.",
          url: "https://infopetitenation.ca"
      },
       {
          id: 'hist-2018-1',
          title: "Début de la phase d'exploration intensive",
          source: "MERN",
          date: "Mai 2018",
          snippet: "Approbation des permis de forage initiaux pour le secteur La Loutre.",
          url: "https://mern.gouv.qc.ca"
      }
  ];

  const fetchNews = async () => {
    setLoading(true);
    const aiNews = await getNewsWithPerplexity();
    setNews(aiNews);
    setLoading(false);
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const formatSource = (urlHost: string) => {
      if (urlHost.includes('youtube')) return 'Radio-Canada / Média';
      if (urlHost.includes('facebook')) return 'Communauté';
      return urlHost;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in h-full flex flex-col pb-20">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
             <Radio className="text-emerald-500 animate-pulse" />
             {t.title}
          </h2>
          <p className="text-slate-400 mt-2 font-light">{t.subtitle}</p>
        </div>
        <button 
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition-all shadow-lg backdrop-blur-sm"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span className="text-xs font-bold uppercase tracking-wide">{t.refresh}</span>
        </button>
      </div>

      <div className="grid gap-4 overflow-y-auto custom-scrollbar pr-2 pb-10">
        {/* Recent AI Detected News */}
        <div>
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {t.identifiedNews}
                </h3>
                <div className="group relative">
                    <Info size={14} className="text-slate-600 cursor-help" />
                    <div className="absolute left-full top-0 ml-2 w-48 p-2 bg-slate-900 border border-white/10 text-[10px] text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {t.infoTooltip}
                    </div>
                </div>
            </div>

            {/* Added Facebook Group as a pinned Monitored Source */}
            <div className="mb-4">
                <div className="glass-card p-4 rounded-2xl bg-blue-900/10 border border-blue-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                            <Facebook size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">{t.fbGroup}</h4>
                            <p className="text-xs text-blue-200/60">{t.fbDesc}</p>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase rounded-full border border-blue-500/20 animate-pulse">
                        {t.active}
                    </span>
                </div>
            </div>
            
            <div className="space-y-4">
                {loading ? (
                    [1, 2].map(i => (
                        <div key={i} className="glass-card p-6 rounded-3xl animate-pulse">
                            <div className="h-6 bg-white/5 rounded w-3/4 mb-3"></div>
                            <div className="h-4 bg-white/10 rounded w-1/4 mb-4"></div>
                            <div className="h-4 bg-white/5 rounded w-full mb-2"></div>
                        </div>
                    ))
                ) : (
                    news.map((item) => (
                        <div key={item.id} className="glass-card p-6 rounded-3xl hover:bg-white/5 transition-all group border-l-4 border-l-transparent hover:border-l-emerald-500">
                            <h3 className="text-xl font-bold text-slate-200 mb-3 group-hover:text-emerald-400 transition-colors">
                                {item.title}
                            </h3>
                             <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 bg-cyan-950/50 text-cyan-300 text-[10px] font-bold uppercase tracking-wider rounded-full border border-cyan-800/50 flex items-center gap-2">
                                    <Globe size={10} />
                                    {formatSource(item.source)}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">{item.date}</span>
                            </div>
                            <p className="text-slate-400 leading-relaxed mb-4 text-sm font-light">
                                {item.snippet}
                            </p>
                            {item.url && (
                                <a 
                                    href={item.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-500 hover:text-emerald-400 transition-colors"
                                >
                                    {t.access} <ExternalLink size={12} />
                                </a>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Historical Timeline */}
        <div className="pt-8 border-t border-white/5">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <History size={14} />
                {t.archives}
            </h3>
            <div className="space-y-4 relative">
                 <div className="absolute left-4 top-0 bottom-0 w-px bg-white/5"></div>
                 {historicalNews.map((item) => (
                    <div key={item.id} className="relative pl-10">
                        <div className="absolute left-[13px] top-6 w-1.5 h-1.5 rounded-full bg-slate-700 ring-4 ring-[#02040a]"></div>
                        <div className="glass-card p-5 rounded-2xl hover:bg-white/5 transition-all group">
                             <h3 className="text-lg font-bold text-slate-300 mb-2 group-hover:text-emerald-400 transition-colors">
                                {item.title}
                            </h3>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{item.date}</span>
                                <span className="text-[10px] text-slate-600 px-2 py-0.5 rounded bg-white/5">{item.source}</span>
                            </div>
                             <p className="text-slate-400 text-sm font-light mb-3">
                                {item.snippet}
                            </p>
                             <a 
                                href={item.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-white transition-colors"
                            >
                                {t.readArchive} <ExternalLink size={10} className="inline ml-1" />
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
