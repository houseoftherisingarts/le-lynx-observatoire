// Le collant « Site créé par Vexel Webstudio », en foil holographique (porté du
// composant de Terre Sauvage/Xena Horizon, règle d'Alex du 11 sept 2026 : toujours en
// foil, sur tout site). Liseré blanc découpé, reflet irisé qui suit le pointeur et
// reste visible au repos, léger basculement 3D, logo complet. Le clic ouvre une carte
// (portal) qui présente Vexel Webstudio et, en bas à droite, le sigle du Salon des
// Inconnus dont Vexel est un projet.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight } from 'lucide-react';
import type { Language } from '../types';

const VEXEL_URL = 'https://vexelwebstudio.com/';
const SALON_URL = 'https://lesalondesinconnus.com/';
const LOGO_SALON = '/salon-logo-or.png';

const T = {
  fr: {
    kicker: 'Site créé par',
    nom: 'Vexel Webstudio',
    sousTitre: 'un projet du Salon des Inconnus',
    salon: 'Le Salon des Inconnus',
    libelle: 'Site créé par Vexel Webstudio : en savoir plus',
    titre: 'Un site bâti pour durer',
    corps: "Ce site a été conçu et bâti par Vexel Webstudio, un studio du Québec qui fait des sites sur mesure, du design jusqu'à l'administration que vous voyez ici. Si vous portez un projet qui mérite le même soin, le studio se visite d'un clic.",
    oui: 'Visiter Vexel Webstudio',
    non: 'Pas maintenant',
    fermer: 'Fermer',
  },
  en: {
    kicker: 'Site by',
    nom: 'Vexel Webstudio',
    sousTitre: 'a project of Le Salon des Inconnus',
    salon: 'Le Salon des Inconnus',
    libelle: 'Site by Vexel Webstudio: learn more',
    titre: 'A site built to last',
    corps: 'This site was designed and built by Vexel Webstudio, a Quebec studio that makes tailored websites, from the design to the administration you see here. If you carry a project that deserves the same care, the studio is one click away.',
    oui: 'Visit Vexel Webstudio',
    non: 'Not now',
    fermer: 'Close',
  },
};

export default function CollantVexel({ language, className = '' }: { language: Language; className?: string }) {
  const t = language === 'en' ? T.en : T.fr;
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  const suivre = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    el.style.setProperty('--rx', `${((0.5 - y) * 10).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((x - 0.5) * 12).toFixed(2)}deg`);
  }, []);
  const relacher = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', '30%');
    el.style.setProperty('--my', '30%');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ouvert]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOuvert(true)}
        onPointerMove={suivre}
        onPointerLeave={relacher}
        aria-label={t.libelle}
        className={`lynx-foil inline-flex items-center gap-3 rounded-[15px] px-4 py-3 select-none ${className}`}
      >
        <span aria-hidden className="lynx-foil-sheen" />
        <span aria-hidden className="lynx-foil-grain" />
        <img src="/vexel-logo.png" alt="" width={329} height={320} className="relative h-10 w-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
        <span className="relative flex flex-col leading-none">
          <span className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-white/70">{t.kicker}</span>
          <span className="mt-1 font-serif text-[1.05rem] text-white">{t.nom}</span>
        </span>
      </button>

      {ouvert && createPortal(
        <div
          className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOuvert(false); }}
          role="dialog"
          aria-modal="true"
          aria-label={t.titre}
        >
          <div className="w-full max-w-[880px] sm:aspect-[16/9] bg-dark-900 rounded-[20px] overflow-hidden shadow-2xl flex flex-col sm:flex-row border border-white/10">
            <div className="sm:w-[42%] bg-black flex items-center justify-center p-8">
              <img src="/vexel-logo.png" alt="Vexel Webstudio" width={329} height={320} className="w-40 h-40 object-contain drop-shadow-[0_20px_40px_rgba(34,197,94,0.35)]" />
            </div>
            <div className="flex-1 p-6 md:p-10 flex flex-col relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-emerald-500">{t.nom}</p>
                  <p className="text-[13px] text-slate-400 mt-1">{t.sousTitre}</p>
                  <h3 className="font-serif text-3xl text-white mt-2 leading-tight">{t.titre}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOuvert(false)}
                  aria-label={t.fermer}
                  className="shrink-0 w-11 h-11 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-[15px] text-slate-300 leading-relaxed mt-5 max-w-prose">{t.corps}</p>
              <div className="mt-auto pt-8 flex flex-wrap gap-3 pr-20 sm:pr-24">
                <a
                  href={VEXEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 text-black font-semibold text-sm min-h-[44px] px-6 hover:bg-emerald-400 transition-colors"
                >
                  {t.oui} <ArrowRight size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setOuvert(false)}
                  className="inline-flex items-center justify-center rounded-full border border-white/20 text-slate-300 text-sm min-h-[44px] px-5 hover:border-white/40 transition-colors"
                >
                  {t.non}
                </button>
              </div>
              {/* Le Salon des Inconnus, en bas à droite de la carte : Vexel est un projet du Salon. */}
              <a href={SALON_URL} target="_blank" rel="noopener noreferrer" aria-label={t.salon} className="absolute bottom-5 right-5 md:bottom-7 md:right-7">
                <img src={LOGO_SALON} alt={t.salon} className="h-16 md:h-20 w-auto object-contain drop-shadow-[0_2px_6px_rgba(197,160,89,0.35)]" />
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .lynx-foil {
          --mx: 30%; --my: 30%; --rx: 0deg; --ry: 0deg;
          position: relative;
          overflow: hidden;
          isolation: isolate;
          color: #fff;
          border: 2px solid #fff;
          background:
            radial-gradient(120% 120% at var(--mx) var(--my), rgba(255,255,255,0.18), transparent 55%),
            linear-gradient(135deg, #0f2418 0%, #020617 60%, #0b1a12 100%);
          box-shadow: 0 0 0 1px rgba(0,0,0,0.35), 0 10px 24px -10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25);
          transform: perspective(600px) rotateX(var(--rx)) rotateY(var(--ry));
          transition: transform 220ms cubic-bezier(0.16,0.8,0.24,1), box-shadow 220ms cubic-bezier(0.16,0.8,0.24,1);
          will-change: transform;
        }
        .lynx-foil:hover { box-shadow: 0 0 0 1px rgba(0,0,0,0.35), 0 18px 34px -12px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.35); }
        .lynx-foil-sheen {
          position: absolute; inset: -40%;
          pointer-events: none;
          background: repeating-conic-gradient(from 200deg at var(--mx) var(--my),
            #ff9ecb 0deg, #ffe08a 24deg, #9bffcf 48deg, #8ad4ff 72deg, #c9a4ff 96deg, #ff9ecb 120deg);
          opacity: 0.18;
          mix-blend-mode: color-dodge;
          filter: saturate(1.2) blur(2px);
          transition: opacity 260ms cubic-bezier(0.16,0.8,0.24,1);
          z-index: 0;
        }
        .lynx-foil:hover .lynx-foil-sheen { opacity: 0.34; }
        .lynx-foil-grain {
          position: absolute; inset: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>");
          mix-blend-mode: soft-light;
          opacity: 0.35;
          z-index: 0;
        }
        .lynx-foil > *:not(.lynx-foil-sheen):not(.lynx-foil-grain) { position: relative; z-index: 1; }
        @media (prefers-reduced-motion: reduce) { .lynx-foil { transform: none; transition: none; } }
      `}</style>
    </>
  );
}
