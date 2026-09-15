import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

// ─── La visite guidée du Lynx ───────────────────────────────────────
// Portée telle quelle du back-office de l'Alliance alimentaire le 14
// septembre 2026, parce qu'un second moteur de visite n'apporterait rien.
// Elle présente ici les sections publiques de l'observatoire.
// Une carte posée par-dessus l'admin, un anneau de lumière autour du
// bouton dont on parle, et la section qui s'ouvre d'elle-même à chaque
// étape. La zone se marque par `data-visite="<id>"`; une ancre absente
// ne casse rien, la carte se centre et la visite continue.

export interface EtapeVisite {
  titre: string;
  /** Deux ou trois phrases : la carte se lit d'un souffle. */
  corps: string;
  /** L'élément à mettre en évidence, marqué `data-visite`. */
  ancre?: string;
  /** La section à ouvrir en arrivant sur l'étape (par défaut, l'ancre). */
  aller?: string;
}

const CLE = 'lynx.visite-guidee';

export function visiteVue(): boolean {
  try { return localStorage.getItem(CLE) === '1'; } catch { return true; }
}
export function marquerVisiteVue(): void {
  try { localStorage.setItem(CLE, '1'); } catch { /* navigation privée */ }
}

/** La visite s'offre d'elle-même la première fois, puis se rouvre par le bouton. */
export function useVisiteGuidee(auto = true) {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    if (!auto || visiteVue()) return;
    const h = window.setTimeout(() => setOuvert(true), 1400);
    return () => window.clearTimeout(h);
  }, [auto]);
  return { ouvert, ouvrir: () => setOuvert(true), fermer: () => { marquerVisiteVue(); setOuvert(false); } };
}

interface Props {
  etapes: EtapeVisite[];
  ouvert: boolean;
  onFermer: () => void;
  /** Ouvre la section nommée par l'étape. */
  onAller?: (id: string) => void;
  libelles: { visite: string; etape: string; precedent: string; suivant: string; terminer: string; quitter: string };
}

interface Cadre { x: number; y: number; w: number; h: number; /** La zone déborde de l'écran : la vignette parle pour elle, sans anneau. */ ample: boolean }

const VisiteGuidee: React.FC<Props> = ({ etapes, ouvert, onFermer, onAller, libelles }) => {
  const [i, setI] = useState(0);
  const cadreRef = React.useRef<HTMLDivElement>(null);
  const [cadre, setCadre] = useState<Cadre | null>(null);
  const etape = etapes[i];

  useEffect(() => { if (ouvert) setI(0); }, [ouvert]);

  // La section s'ouvre, puis l'ancre se mesure une fois posée.
  useEffect(() => {
    if (!ouvert || !etape) return;
    const cible = etape.aller ?? etape.ancre;
    if (cible && onAller) onAller(cible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert, i]);

  const mesurer = useCallback(() => {
    if (!ouvert || !etape?.ancre) { setCadre(null); return; }
    const el = document.querySelector<HTMLElement>(`[data-visite="${etape.ancre}"]`);
    if (!el || el.offsetParent === null) { setCadre(null); return; }
    const r = el.getBoundingClientRect();
    // Un menu replié hors de l'écran (le tiroir du téléphone) ne se cerne pas : la carte se centre.
    if (r.width === 0 || r.right < 0 || r.left > window.innerWidth) { setCadre(null); return; }
    // Une section plus haute que l'écran (un hero en pleine hauteur) donnerait un cadre grand comme
    // la fenêtre, et le voile n'assombrirait plus rien du tout : le cadre se plafonne alors à une
    // bande centrée sur la partie visible de la section.
    // La carte occupe le bas de l'écran quand la zone est large : l'anneau s'arrête au-dessus d'elle,
    // sinon la carte recouvre précisément ce dont elle parle.
    const placeCarte = r.width > window.innerWidth * 0.7 ? 330 : 0;
    const hauteurMax = Math.max(240, window.innerHeight - placeCarte - 96);
    let y = r.top - 6;
    let h = r.height + 12;
    const ample = h > hauteurMax || r.width > window.innerWidth * 0.92;
    if (h > hauteurMax) {
      const centre = Math.max(0, Math.min(window.innerHeight - placeCarte, r.top + r.height / 2));
      y = Math.max(76, Math.min(window.innerHeight - placeCarte - hauteurMax - 12, centre - hauteurMax / 2));
      h = hauteurMax;
    }
    setCadre({ x: r.left - 6, y, w: r.width + 12, h, ample });
  }, [ouvert, etape]);

  useLayoutEffect(() => {
    mesurer();
    const h = window.setTimeout(mesurer, 380);
    window.addEventListener('resize', mesurer);
    window.addEventListener('scroll', mesurer, true);
    return () => { window.clearTimeout(h); window.removeEventListener('resize', mesurer); window.removeEventListener('scroll', mesurer, true); };
  }, [mesurer]);

  useEffect(() => {
    if (!ouvert) return;
    const clavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer();
      if (e.key === 'ArrowRight') setI((n) => Math.min(etapes.length - 1, n + 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, [ouvert, etapes.length, onFermer]);

  if (!ouvert || !etape) return null;
  const derniere = i === etapes.length - 1;
  const large = typeof window !== 'undefined' && window.innerWidth >= 900;
  // Sur un grand écran, la carte se pose à droite de l'ancre; sur un
  // téléphone, elle monte du bas.
  const pleineLargeur = Boolean(cadre && cadre.w > window.innerWidth * 0.7);
  // À droite seulement s'il reste vraiment la place : collée au bord, la carte recouvrait l'élément
  // dont elle parle (le bouton « Mon espace », tout en haut à droite de la barre).
  const placeADroite = Boolean(cadre && cadre.x + cadre.w + 18 + 380 <= window.innerWidth - 12);
  const styleCarte: React.CSSProperties = large && cadre && !pleineLargeur && placeADroite
    ? { position: 'fixed', left: cadre.x + cadre.w + 18, top: Math.max(16, Math.min(cadre.y, window.innerHeight - 340)), width: 380 }
    : large && cadre && !pleineLargeur
    ? { position: 'fixed', left: Math.max(12, Math.min(cadre.x + cadre.w - 380, window.innerWidth - 392)), top: Math.min(cadre.y + cadre.h + 16, window.innerHeight - 340), width: 380 }
    : large && cadre
      ? { position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 460, ...(cadre.y + cadre.h + 24 + 300 < window.innerHeight ? { top: cadre.y + cadre.h + 24 } : { bottom: 24 }) }
      : large
        ? { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 420 }
        : { position: 'fixed', left: 12, right: 12, bottom: 12 };

  return createPortal(
    <div ref={cadreRef} className="fixed inset-0 z-[700] pointer-events-none" role="dialog" aria-modal="true" aria-label={libelles.visite}>
      {/* La vignette referme l'écran par les bords plutôt que d'y découper un rectangle : une
          section plus haute ou plus large que la fenêtre donnait des bandes sombres qui ne
          correspondaient à rien de visible. Le liseré irisé signe le mode visite. */}
      <motion.div
        aria-hidden
        className="vignette-visite lisere-irise fixed inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      {cadre && !cadre.ample && (
        <motion.div
          aria-hidden
          className="anneau-irise fixed rounded-3xl"
          initial={false}
          animate={{ left: cadre.x, top: cadre.y, width: cadre.w, height: cadre.h }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
      <AnimatePresence mode="wait">
      {/* La carte se prend et se pose où la personne veut : sur une petite fenêtre, elle finit
          toujours par couvrir ce dont elle parle, et la tasser vaut mieux que la refermer. Elle est
          translucide à neuf dixièmes, avec un flou derrière, pour laisser deviner ce qui est dessous. */}
      <motion.div
        key={i}
        drag
        dragConstraints={cadreRef}
        dragElastic={0.04}
        dragMomentum={false}
        whileDrag={{ scale: 1.02, opacity: 1, cursor: 'grabbing' }}
        className="bg-[#0a0f14]/95 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl shadow-black/60 text-slate-100 p-6 z-[701] pointer-events-auto cursor-grab select-none"
        style={styleCarte}
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 0.9, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/10" />
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">{libelles.visite} · {i + 1} / {etapes.length}</p>
          <button type="button" onPointerDownCapture={(e) => e.stopPropagation()} onClick={onFermer} aria-label={libelles.quitter} className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-100 text-xl leading-none">×</button>
        </div>
        <h2 className="font-serif text-2xl text-slate-100 leading-snug mb-2">{etape.titre}</h2>
        <p className="text-sm text-slate-300 leading-relaxed">{etape.corps}</p>
        <div className="flex gap-1 my-4" aria-hidden>
          {etapes.map((_, k) => <span key={k} className={`h-[3px] flex-1 rounded-full ${k <= i ? 'bg-emerald-500' : 'bg-white/10'}`} />)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onPointerDownCapture={(e) => e.stopPropagation()} onClick={onFermer} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5">{libelles.quitter}</button>
          <div className="flex gap-2">
            <button type="button" disabled={i === 0} onPointerDownCapture={(e) => e.stopPropagation()} onClick={() => setI((n) => n - 1)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-40">{libelles.precedent}</button>
            <button type="button" onPointerDownCapture={(e) => e.stopPropagation()} onClick={() => (derniere ? onFermer() : setI((n) => n + 1))} className="rounded-full bg-emerald-500 text-black font-bold px-5 py-2 text-sm hover:bg-emerald-400">
              {derniere ? libelles.terminer : libelles.suivant}
            </button>
          </div>
        </div>
      </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
};

export default VisiteGuidee;

export const BoutonVisite: React.FC<{ onClick: () => void; className?: string; children: React.ReactNode }> = ({ onClick, className = '', children }) => (
  <button type="button" onClick={onClick} className={className}>{children}</button>
);
