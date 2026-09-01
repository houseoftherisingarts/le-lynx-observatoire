import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export type NewsCategory =
  | 'gouvernement'
  | 'municipal'
  | 'miniere'
  | 'mobilisation'
  | 'autochtone'
  | 'juridique'
  | 'media';

export interface AuditNewsItem {
  id: string;
  title: string;
  summary: string;
  category: NewsCategory;
  source: string;
  url: string;
  date: string;
  sortDate: string;
  importance: 'haute' | 'moyenne' | 'basse';
  isGovernment: boolean;
}

export interface AuditStatus {
  lastRunAt: string;
  trigger: string;
  found: number;
  written: number;
  ok: boolean;
}

/** Flux en direct de la veille. Rend la fonction de desabonnement. */
export const subscribeToNews = (
  onChange: (items: AuditNewsItem[]) => void,
  onError?: (err: unknown) => void
): (() => void) => {
  const q = query(collection(db, 'news'), orderBy('sortDate', 'desc'), limit(80));
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditNewsItem, 'id'>) }))
      );
    },
    (err) => onError?.(err)
  );
};

/** Etat de la derniere passe de veille, pour afficher la fraicheur. */
export const subscribeToAuditStatus = (
  onChange: (status: AuditStatus | null) => void
): (() => void) =>
  onSnapshot(doc(db, 'auditStatus', 'latest'), (snap) => {
    onChange(snap.exists() ? (snap.data() as AuditStatus) : null);
  });

const CATEGORY_LABELS: Record<NewsCategory, { fr: string; en: string }> = {
  gouvernement: { fr: 'Gouvernement', en: 'Government' },
  municipal: { fr: 'Municipal', en: 'Municipal' },
  miniere: { fr: 'La minière', en: 'The miner' },
  mobilisation: { fr: 'Mobilisation', en: 'Mobilization' },
  autochtone: { fr: 'Position anishinabe', en: 'Anishinabe position' },
  juridique: { fr: 'Juridique', en: 'Legal' },
  media: { fr: 'Médias', en: 'Media' },
};

export const categoryLabel = (c: NewsCategory, lang: 'fr' | 'en' | 'ani'): string =>
  CATEGORY_LABELS[c]?.[lang === 'en' ? 'en' : 'fr'] ?? c;

const CATEGORY_TONE: Record<NewsCategory, string> = {
  gouvernement: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
  municipal: 'bg-sky-950/40 text-sky-300 border-sky-800/50',
  miniere: 'bg-red-950/40 text-red-300 border-red-800/50',
  mobilisation: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50',
  autochtone: 'bg-violet-950/40 text-violet-300 border-violet-800/50',
  juridique: 'bg-slate-800/60 text-slate-300 border-slate-600/50',
  media: 'bg-cyan-950/40 text-cyan-300 border-cyan-800/50',
};

export const categoryTone = (c: NewsCategory): string =>
  CATEGORY_TONE[c] ?? CATEGORY_TONE.media;

/** « il y a 3 heures », sans dependance de date externe. */
export const relativeTime = (iso: string, lang: 'fr' | 'en' | 'ani'): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.max(1, Math.round((Date.now() - then) / 60000));
  const en = lang === 'en';
  if (minutes < 60) return en ? `${minutes} min ago` : `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return en ? `${hours} h ago` : `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return en ? `${days} d ago` : `il y a ${days} j`;
};
