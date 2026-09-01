import React, { useEffect, useMemo, useState } from 'react';
import { Language } from '../types';
import {
  AuditNewsItem,
  AuditStatus,
  NewsCategory,
  categoryLabel,
  categoryTone,
  relativeTime,
  subscribeToAuditStatus,
  subscribeToNews,
} from '../services/newsService';
import {
  ExternalLink,
  Globe,
  Radio,
  Info,
  Landmark,
  AlertTriangle,
  Inbox,
} from 'lucide-react';

interface NewsFeedProps {
  language: Language;
}

const ORDER: NewsCategory[] = [
  'gouvernement',
  'municipal',
  'miniere',
  'mobilisation',
  'autochtone',
  'juridique',
  'media',
];

export const NewsFeed: React.FC<NewsFeedProps> = ({ language }) => {
  const [news, setNews] = useState<AuditNewsItem[]>([]);
  const [status, setStatus] = useState<AuditStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<NewsCategory | 'tout'>('tout');

  useEffect(() => {
    const stopNews = subscribeToNews(
      (items) => {
        setNews(items);
        setLoading(false);
        setError(false);
      },
      () => {
        setLoading(false);
        setError(true);
      }
    );
    const stopStatus = subscribeToAuditStatus(setStatus);
    return () => {
      stopNews();
      stopStatus();
    };
  }, []);

  const t = useMemo(() => {
    const fr = {
      title: 'Veille et signaux',
      subtitle:
        "Chaque matin, le systeme relit les registres gouvernementaux, les conseils municipaux, les communiques de la miniere et la presse regionale, puis depose ici ce qui a bouge.",
      all: 'Tout',
      gov: 'Sources gouvernementales',
      lastRun: 'Derniere veille',
      never: "La premiere veille n'a pas encore tourne.",
      emptyTitle: 'Rien de nouveau pour le moment',
      emptyBody:
        "La prochaine passe part demain matin a 6 h 05. Ce qui sera trouve dans les registres et dans la presse apparaitra ici sans que personne ait a l'ajouter a la main.",
      errorTitle: 'La veille est momentanement injoignable',
      errorBody: 'Le flux se rebranche tout seul des que la connexion revient.',
      read: "Lire a la source",
      count: (n: number) => `${n} element${n > 1 ? 's' : ''} suivi${n > 1 ? 's' : ''}`,
      tooltip:
        'GESTIM, Gazette officielle, ministere des Ressources naturelles, BAPE, Assemblee nationale, MRC de Papineau et conseils municipaux, Lomiko Metals, Le Droit, Radio-Canada, Info Petite-Nation.',
      high: 'Prioritaire',
    };
    const en = {
      ...fr,
      title: 'Monitoring and signals',
      subtitle:
        'Every morning the system re-reads the government registries, the municipal councils, the mining company releases and the regional press, then posts here whatever moved.',
      all: 'All',
      gov: 'Government sources',
      lastRun: 'Last sweep',
      never: 'The first sweep has not run yet.',
      emptyTitle: 'Nothing new right now',
      emptyBody:
        'The next sweep runs tomorrow at 6:05. Whatever turns up in the registries and the press lands here on its own.',
      errorTitle: 'The monitoring feed is unreachable',
      errorBody: 'It reconnects by itself as soon as the connection returns.',
      read: 'Read at the source',
      count: (n: number) => `${n} item${n > 1 ? 's' : ''} tracked`,
      high: 'Priority',
    };
    return language === 'en' ? en : fr;
  }, [language]);

  const available = useMemo(() => {
    const present = new Set(news.map((n) => n.category));
    return ORDER.filter((c) => present.has(c));
  }, [news]);

  const shown = filter === 'tout' ? news : news.filter((n) => n.category === filter);
  const govCount = news.filter((n) => n.isGovernment).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Radio className="text-emerald-500 animate-pulse" />
              {t.title}
            </h2>
            <p className="text-slate-400 mt-3 font-light leading-relaxed">{t.subtitle}</p>
          </div>

          <div className="glass-card rounded-2xl px-5 py-4 border border-white/5 min-w-[13rem]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              {t.lastRun}
            </p>
            {status ? (
              <>
                <p className="text-emerald-400 font-mono text-sm mt-1">
                  {relativeTime(status.lastRunAt, language)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">{t.count(news.length)}</p>
              </>
            ) : (
              <p className="text-slate-500 text-xs mt-1 leading-snug">{t.never}</p>
            )}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-400/80">
              <Landmark size={12} />
              <span>
                {govCount} · {t.gov}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter('tout')}
            className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all ${
              filter === 'tout'
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-transparent text-slate-500 border-white/5 hover:text-slate-300'
            }`}
          >
            {t.all}
          </button>
          {available.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all ${
                filter === c
                  ? categoryTone(c)
                  : 'bg-transparent text-slate-500 border-white/5 hover:text-slate-300'
              }`}
            >
              {categoryLabel(c, language)}
            </button>
          ))}
          <div className="group relative ml-1">
            <Info size={14} className="text-slate-600 cursor-help" />
            <div className="absolute left-full top-0 ml-2 w-64 p-3 bg-slate-900 border border-white/10 text-[10px] text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 leading-relaxed">
              {t.tooltip}
            </div>
          </div>
        </div>
      </header>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 rounded-3xl animate-pulse">
              <div className="h-6 bg-white/5 rounded w-3/4 mb-3" />
              <div className="h-4 bg-white/10 rounded w-1/4 mb-4" />
              <div className="h-4 bg-white/5 rounded w-full mb-2" />
              <div className="h-4 bg-white/5 rounded w-5/6" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="glass-card p-8 rounded-3xl border border-red-900/30 text-center">
          <AlertTriangle className="mx-auto text-red-400 mb-3" size={24} />
          <h3 className="text-white font-bold mb-2">{t.errorTitle}</h3>
          <p className="text-slate-400 text-sm font-light">{t.errorBody}</p>
        </div>
      )}

      {!loading && !error && shown.length === 0 && (
        <div className="glass-card p-10 rounded-3xl text-center border border-white/5">
          <Inbox className="mx-auto text-slate-600 mb-4" size={28} />
          <h3 className="text-white font-bold mb-2">{t.emptyTitle}</h3>
          <p className="text-slate-400 text-sm font-light max-w-md mx-auto leading-relaxed">
            {t.emptyBody}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {shown.map((item) => (
          <article
            key={item.id}
            className={`glass-card p-6 rounded-3xl hover:bg-white/5 transition-all group border-l-4 ${
              item.importance === 'haute'
                ? 'border-l-emerald-500'
                : 'border-l-transparent hover:border-l-emerald-500/50'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${categoryTone(
                  item.category
                )}`}
              >
                {categoryLabel(item.category, language)}
              </span>
              {item.isGovernment && (
                <span className="px-3 py-1 bg-amber-950/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-800/50 flex items-center gap-1.5">
                  <Landmark size={10} />
                  {t.gov}
                </span>
              )}
              {item.importance === 'haute' && (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-500/30">
                  {t.high}
                </span>
              )}
              <span className="text-xs text-slate-500 font-mono ml-auto">{item.date}</span>
            </div>

            <h3 className="text-xl font-bold text-slate-200 mb-3 group-hover:text-emerald-400 transition-colors leading-snug">
              {item.title}
            </h3>

            <p className="text-slate-400 leading-relaxed mb-4 text-sm font-light">
              {item.summary}
            </p>

            <div className="flex items-center gap-4">
              <span className="text-[10px] text-slate-500 flex items-center gap-1.5 font-mono">
                <Globe size={10} />
                {item.source}
              </span>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  {t.read} <ExternalLink size={12} />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
