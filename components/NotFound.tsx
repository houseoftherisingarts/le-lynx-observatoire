import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Moon } from 'lucide-react';
import { Language } from '../types';

// 404 de l'observatoire : la nuit de la forêt, l'œil du lynx qui ne trouve
// rien à cet endroit. Reprend le fond, le halo ambré et le logo déjà
// utilisés dans App.tsx, aucune image nouvelle.

interface NotFoundProps {
  language: Language;
  onRetour: () => void;
}

const COPY: Record<Language, { eyebrow: string; quote: string; line1: string; line2: string; cta: string }> = {
  fr: {
    eyebrow: 'Piste perdue dans la forêt',
    quote: "« Le lynx a suivi cette piste jusque dans les bois et n'a trouvé que la nuit. »",
    line1: "Cette adresse n'existe pas sur l'observatoire du Lynx, ou elle a changé depuis votre dernier passage.",
    line2: 'Le tableau de bord garde la veille pendant ce temps, avec les dossiers et les signaux à jour.',
    cta: 'Retour au tableau de bord',
  },
  en: {
    eyebrow: 'Lost trail in the forest',
    quote: '"The lynx followed this trail into the woods and found only the night."',
    line1: "This address does not exist on the Lynx observatory, or it has changed since your last visit.",
    line2: 'The dashboard keeps watch in the meantime, with the files and the signals up to date.',
    cta: 'Back to the dashboard',
  },
  ani: {
    eyebrow: 'Lost trail in the forest',
    quote: '"The lynx followed this trail into the woods and found only the night."',
    line1: "This address does not exist on the Lynx observatory, or it has changed since your last visit.",
    line2: 'The dashboard keeps watch in the meantime, with the files and the signals up to date.',
    cta: 'Back to the dashboard',
  },
};

const NotFound: React.FC<NotFoundProps> = ({ language, onRetour }) => {
  const t = COPY[language] || COPY.fr;

  useEffect(() => {
    const titrePrecedent = document.title;
    document.title = 'Page introuvable';
    return () => {
      document.title = titrePrecedent;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative w-full min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center text-center px-6 overflow-hidden"
    >
      {/* Halo ambré de l'œil du lynx, même recette que le fond global */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-40 mix-blend-screen pointer-events-none">
        <div className="w-full h-full bg-gradient-radial from-amber-900/40 via-transparent to-transparent blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[260px] bg-amber-500/30 blur-[16px] rounded-full" />
      </div>

      <NotFoundCorners />

      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10"
      >
        <p className="text-amber-500/70 text-[11px] font-bold uppercase tracking-[0.4em] mb-4">
          {t.eyebrow}
        </p>
        <h1
          className="font-serif text-7xl sm:text-8xl md:text-9xl font-semibold text-white leading-none"
          style={{ textShadow: '0 0 40px rgba(217, 119, 6, 0.18), 0 6px 30px rgba(0,0,0,0.6)' }}
        >
          404
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-20 h-20 md:w-24 md:h-24 my-8 rounded-full bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center overflow-hidden"
      >
        <img src="https://i.imgur.com/nGSeeID.png" className="w-14 h-14 md:w-16 md:h-16 object-contain" alt="Le Lynx" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-xl"
      >
        <p className="font-serif text-lg md:text-xl text-slate-200 mb-5">{t.quote}</p>
        <p className="text-sm md:text-base text-slate-400 mb-1">{t.line1}</p>
        <p className="text-sm md:text-base text-slate-500 mb-8">{t.line2}</p>

        <button
          onClick={onRetour}
          className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl font-bold uppercase tracking-[0.2em] text-[11px] text-white bg-emerald-900/60 border border-emerald-500/30 hover:bg-emerald-800/60 hover:border-emerald-500/50 transition-all hover:scale-[1.03]"
        >
          <ArrowLeft size={14} />
          {t.cta}
        </button>
      </motion.div>
    </motion.div>
  );
};

const NotFoundCorners: React.FC = () => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    pointerEvents: 'none',
  };
  return (
    <>
      <span aria-hidden style={{ ...base, top: 8, left: 8, borderTop: '2px solid', borderLeft: '2px solid' }} />
      <span aria-hidden style={{ ...base, top: 8, right: 8, borderTop: '2px solid', borderRight: '2px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 8, left: 8, borderBottom: '2px solid', borderLeft: '2px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 8, right: 8, borderBottom: '2px solid', borderRight: '2px solid' }} />
      <Moon aria-hidden size={16} className="absolute top-10 right-1/4 text-slate-600/40 hidden md:block" />
    </>
  );
};

export default NotFound;
