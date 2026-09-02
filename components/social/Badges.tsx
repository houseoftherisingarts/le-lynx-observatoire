import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Camera,
  CalendarCheck,
  Check,
  DoorOpen,
  Droplets,
  Feather,
  FileText,
  Flag,
  Handshake,
  HelpCircle,
  Landmark,
  Languages,
  Loader2,
  Lock,
  MessageSquare,
  Newspaper,
  Radar,
  Star,
  Users,
  Vote,
  type LucideIcon,
} from 'lucide-react';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Badge,
  CATALOGUE_BADGES,
  FicheBadges,
  MAX_EXPOSES,
  TeinteBadge,
  accorderBadge,
  exposerBadges,
  retirerBadge,
  suivreBadges,
} from '../../services/badgesService';

interface BadgesProps {
  language: Language;
  uid: string;
  isAdmin?: boolean;
  compact?: boolean;
}

const TEXTES = {
  fr: {
    etiquette: 'Marques de la lutte',
    titre: 'Ce que la personne a porté',
    intro:
      "Les badges de l'Observatoire ne s'achètent pas et ne se demandent pas. Le comité les accorde à mesure que le travail se fait, et chacun choisit les trois qu'il met en vitrine sur sa fiche.",
    obtenus: 'Obtenus',
    vitrine: 'En vitrine',
    vitrineAide: `Choisissez jusqu'à ${MAX_EXPOSES} badges. Ce sont ceux que les autres membres verront à côté de votre nom.`,
    vitrinePleine: `Votre vitrine est pleine. Retirez un badge avant d'en ajouter un autre.`,
    aucun: 'Aucun badge pour le moment',
    aucunDesc:
      "Rien n'est encore inscrit ici. Le premier badge arrivera après une première prise de parole ou une présence en assemblée.",
    aucunCompact: 'Aucun badge en vitrine',
    chargement: 'Chargement des badges',
    erreur: 'Les badges ne se chargent pas',
    erreurDesc: 'La connexion a été coupée. Rechargez la page dans un instant.',
    echecEcriture: "La modification n'a pas été enregistrée. Reprenez dans un moment.",
    accorder: 'Accorder',
    retirer: 'Retirer',
    critere: 'Critère',
    obtenuLe: 'Obtenu le',
    verrouille: 'Pas encore obtenu',
  },
  en: {
    etiquette: 'Marks of the fight',
    titre: 'What this person carried',
    intro:
      'Observatory badges cannot be bought and cannot be requested. The committee grants them as the work gets done, and each member picks the three shown on their profile.',
    obtenus: 'Earned',
    vitrine: 'On display',
    vitrineAide: `Pick up to ${MAX_EXPOSES} badges. These are the ones other members see beside your name.`,
    vitrinePleine: 'Your display is full. Remove one badge before adding another.',
    aucun: 'No badge yet',
    aucunDesc:
      'Nothing is recorded here yet. The first badge arrives after a first post or a council meeting attended.',
    aucunCompact: 'No badge on display',
    chargement: 'Loading badges',
    erreur: 'The badges will not load',
    erreurDesc: 'The connection was cut. Reload the page in a moment.',
    echecEcriture: 'The change was not saved. Try again in a moment.',
    accorder: 'Grant',
    retirer: 'Remove',
    critere: 'Criterion',
    obtenuLe: 'Earned on',
    verrouille: 'Not earned yet',
  },
} as const;

const ICONES: Record<string, LucideIcon> = {
  Award,
  Camera,
  CalendarCheck,
  DoorOpen,
  Droplets,
  Feather,
  FileText,
  Flag,
  Handshake,
  HelpCircle,
  Landmark,
  Languages,
  MessageSquare,
  Newspaper,
  Radar,
  Users,
  Vote,
};

interface Palette {
  fond: string;
  bordure: string;
  texte: string;
  lueur: string;
}

const TEINTES: Record<TeinteBadge, Palette> = {
  emerald: {
    fond: 'bg-emerald-500/10',
    bordure: 'border-emerald-500/30',
    texte: 'text-emerald-400',
    lueur: 'shadow-[0_0_24px_-8px_rgba(16,185,129,0.7)]',
  },
  amber: {
    fond: 'bg-amber-500/10',
    bordure: 'border-amber-500/30',
    texte: 'text-amber-400',
    lueur: 'shadow-[0_0_24px_-8px_rgba(245,158,11,0.7)]',
  },
  red: {
    fond: 'bg-red-500/10',
    bordure: 'border-red-500/30',
    texte: 'text-red-400',
    lueur: 'shadow-[0_0_24px_-8px_rgba(239,68,68,0.7)]',
  },
  violet: {
    fond: 'bg-violet-500/10',
    bordure: 'border-violet-500/30',
    texte: 'text-violet-400',
    lueur: 'shadow-[0_0_24px_-8px_rgba(139,92,246,0.7)]',
  },
};

const ETIQUETTE = 'text-[10px] font-bold uppercase tracking-widest';

const IconeBadge: React.FC<{ nom: string; taille: number; classe?: string }> = ({
  nom,
  taille,
  classe,
}) => {
  const Icone = ICONES[nom] ?? Award;
  return <Icone size={taille} className={classe} aria-hidden="true" />;
};

const dateCourte = (valeur: Date, lang: 'fr' | 'en'): string =>
  valeur.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

// --- Rangee compacte --------------------------------------------------------

const RangeeCompacte: React.FC<{
  badges: Badge[];
  fiche: FicheBadges;
  lang: 'fr' | 'en';
  vide: string;
}> = ({ badges, fiche, lang, vide }) => {
  if (badges.length === 0) {
    return <p className="text-[11px] text-slate-500">{vide}</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {badges.map((badge) => {
        const palette = TEINTES[badge.teinte];
        const obtenu = fiche.obtenus[badge.id];
        return (
          <span key={badge.id} className="group relative inline-flex">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${palette.fond} ${palette.bordure} ${palette.texte}`}
              title={badge.nom[lang]}
            >
              <IconeBadge nom={badge.icone} taille={16} />
            </span>
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 max-w-[70vw] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#02040a]/95 p-3 text-left shadow-2xl backdrop-blur-md md:group-hover:block"
            >
              <span className={`block ${ETIQUETTE} ${palette.texte}`}>{badge.nom[lang]}</span>
              <span className="mt-1.5 block text-[11px] leading-relaxed text-slate-300">
                {badge.description[lang]}
              </span>
              {obtenu && (
                <span className="mt-1.5 block text-[10px] text-slate-500">
                  {TEXTES[lang].obtenuLe} {dateCourte(obtenu.toDate(), lang)}
                </span>
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
};

// --- Carte de badge ---------------------------------------------------------

const CarteBadge: React.FC<{
  badge: Badge;
  obtenu: boolean;
  obtenuLe: Date | null;
  expose: boolean;
  lang: 'fr' | 'en';
  peutExposer: boolean;
  admin: boolean;
  enCours: boolean;
  onExposer: () => void;
  onAccorder: () => void;
  onRetirer: () => void;
}> = ({
  badge,
  obtenu,
  obtenuLe,
  expose,
  lang,
  peutExposer,
  admin,
  enCours,
  onExposer,
  onAccorder,
  onRetirer,
}) => {
  const t = TEXTES[lang];
  const palette = TEINTES[badge.teinte];

  return (
    <article
      className={`glass-card relative rounded-2xl border p-4 transition-all ${
        obtenu
          ? `${palette.bordure} ${expose ? palette.lueur : ''} hover:border-white/10`
          : 'border-white/5 hover:border-white/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
            obtenu
              ? `${palette.fond} ${palette.bordure} ${palette.texte}`
              : 'border-white/5 bg-white/5 text-slate-600'
          }`}
        >
          <IconeBadge nom={badge.icone} taille={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h4
            className={`break-words text-sm font-bold ${obtenu ? 'text-white' : 'text-slate-500'}`}
          >
            {badge.nom[lang]}
          </h4>
          {obtenu ? (
            <p className="mt-1 break-words text-xs leading-relaxed text-slate-400">
              {badge.description[lang]}
            </p>
          ) : (
            <p className="mt-1 break-words text-xs leading-relaxed text-slate-500">
              <span className={`${ETIQUETTE} text-slate-600`}>{t.critere}</span>{' '}
              <span className="ml-1">{badge.critere[lang]}</span>
            </p>
          )}
          {obtenu && obtenuLe && (
            <p className="mt-2 text-[10px] text-slate-500">
              {t.obtenuLe} {dateCourte(obtenuLe, lang)}
            </p>
          )}
          {!obtenu && (
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600">
              <Lock size={11} aria-hidden="true" />
              {t.verrouille}
            </p>
          )}
        </div>
      </div>

      {(peutExposer || admin) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
          {peutExposer && obtenu && (
            <button
              type="button"
              onClick={onExposer}
              disabled={enCours}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all disabled:opacity-50 ${
                expose
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                  : 'border border-white/10 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400'
              }`}
            >
              {expose ? <Check size={12} /> : <Star size={12} />}
              {t.vitrine}
            </button>
          )}
          {admin && (
            <button
              type="button"
              onClick={obtenu ? onRetirer : onAccorder}
              disabled={enCours}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all disabled:opacity-50 ${
                obtenu
                  ? 'border-red-500/30 text-red-400 hover:border-red-500/60'
                  : 'border-amber-500/30 text-amber-400 hover:border-amber-500/60'
              }`}
            >
              {enCours ? <Loader2 size={12} className="animate-spin" /> : <Award size={12} />}
              {obtenu ? t.retirer : t.accorder}
            </button>
          )}
        </div>
      )}
    </article>
  );
};

// --- Composant principal ----------------------------------------------------

const Badges: React.FC<BadgesProps> = ({ language, uid, isAdmin, compact }) => {
  const lang: 'fr' | 'en' = language === 'fr' ? 'fr' : 'en';
  const t = TEXTES[lang];
  const { profile } = useAuth();
  const admin = isAdmin === true || profile?.role === 'admin';
  const estMoi = profile?.uid === uid;

  const [fiche, setFiche] = useState<FicheBadges | null>(null);
  const [erreur, setErreur] = useState(false);
  const [avis, setAvis] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);

  useEffect(() => {
    setFiche(null);
    setErreur(false);
    setAvis('');
    const desabonner = suivreBadges(
      uid,
      (recue) => {
        setFiche(recue);
        setErreur(false);
      },
      () => setErreur(true),
    );
    return desabonner;
  }, [uid]);

  const exposes = useMemo<Badge[]>(() => {
    if (!fiche) return [];
    return fiche.exposes
      .map((id) => CATALOGUE_BADGES.find((badge) => badge.id === id))
      .filter((badge): badge is Badge => badge !== undefined);
  }, [fiche]);

  const nbObtenus = fiche ? Object.keys(fiche.obtenus).length : 0;

  const basculerVitrine = async (badgeId: string): Promise<void> => {
    if (!fiche) return;
    const dejaExpose = fiche.exposes.includes(badgeId);
    if (!dejaExpose && fiche.exposes.length >= MAX_EXPOSES) {
      setAvis(t.vitrinePleine);
      return;
    }
    setAvis('');
    setEnCours(badgeId);
    try {
      const suite = dejaExpose
        ? fiche.exposes.filter((id) => id !== badgeId)
        : [...fiche.exposes, badgeId];
      await exposerBadges(uid, suite);
    } catch {
      setAvis(t.echecEcriture);
    } finally {
      setEnCours(null);
    }
  };

  const changerAttribution = async (badgeId: string, accorde: boolean): Promise<void> => {
    setAvis('');
    setEnCours(badgeId);
    try {
      if (accorde) await retirerBadge(uid, badgeId);
      else await accorderBadge(uid, badgeId);
    } catch {
      setAvis(t.echecEcriture);
    } finally {
      setEnCours(null);
    }
  };

  if (erreur) {
    if (compact) return <p className="text-[11px] text-red-400">{t.erreur}</p>;
    return (
      <div className="glass-card animate-fade-in rounded-3xl border border-red-500/20 p-8 text-center">
        <Award size={28} className="mx-auto text-red-400" aria-hidden="true" />
        <h3 className="mt-3 text-lg font-bold text-white">{t.erreur}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">{t.erreurDesc}</p>
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className={compact ? 'flex items-center gap-2' : 'flex items-center justify-center py-12'}>
        <Loader2 size={compact ? 14 : 20} className="animate-spin text-slate-500" aria-hidden="true" />
        <span className="text-[11px] text-slate-500">{t.chargement}</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="animate-fade-in">
        <RangeeCompacte badges={exposes} fiche={fiche} lang={lang} vide={t.aucunCompact} />
      </div>
    );
  }

  return (
    <section className="animate-fade-in space-y-6">
      <header>
        <p className={`${ETIQUETTE} text-emerald-400`}>{t.etiquette}</p>
        <h3 className="mt-2 font-serif text-2xl text-white md:text-3xl">{t.titre}</h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{t.intro}</p>
        <p className="mt-3 text-[11px] text-slate-500">
          {t.obtenus} : {nbObtenus} / {CATALOGUE_BADGES.length}
        </p>
      </header>

      {nbObtenus === 0 && !admin ? (
        <div className="glass-card rounded-3xl border border-white/5 p-10 text-center">
          <Award size={28} className="mx-auto text-slate-600" aria-hidden="true" />
          <h4 className="mt-3 text-base font-bold text-white">{t.aucun}</h4>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">{t.aucunDesc}</p>
        </div>
      ) : null}

      {estMoi && nbObtenus > 0 && (
        <div className="glass-panel rounded-3xl border border-white/5 p-5">
          <p className={`${ETIQUETTE} text-slate-400`}>{t.vitrine}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{t.vitrineAide}</p>
          <div className="mt-4">
            <RangeeCompacte badges={exposes} fiche={fiche} lang={lang} vide={t.aucunCompact} />
          </div>
        </div>
      )}

      {avis && <p className="text-xs text-red-400">{avis}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CATALOGUE_BADGES.map((badge) => {
          const horodatage = fiche.obtenus[badge.id];
          const obtenu = badge.id in fiche.obtenus;
          return (
            <CarteBadge
              key={badge.id}
              badge={badge}
              obtenu={obtenu}
              obtenuLe={horodatage ? horodatage.toDate() : null}
              expose={fiche.exposes.includes(badge.id)}
              lang={lang}
              peutExposer={estMoi}
              admin={admin}
              enCours={enCours === badge.id}
              onExposer={() => {
                void basculerVitrine(badge.id);
              }}
              onAccorder={() => {
                void changerAttribution(badge.id, false);
              }}
              onRetirer={() => {
                void changerAttribution(badge.id, true);
              }}
            />
          );
        })}
      </div>
    </section>
  );
};

export default Badges;
