import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  MessageSquare,
  Newspaper,
  UserPlus,
  WifiOff,
} from 'lucide-react';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { relativeTime } from '../../services/newsService';
import {
  EtatNotifications,
  NotifItem,
  NotifType,
  derniereVisite,
  marquerClocheVue,
  suivreNotifications,
} from '../../services/notificationsService';

/**
 * Cloche de l'Observatoire. Elle n'ecrit rien dans Firestore : elle affiche
 * l'agregat rendu par notificationsService et garde le moment de la derniere
 * visite dans le navigateur.
 *
 * Le seuil local sert de tampon : « Tout marquer comme lu » le pousse a
 * l'instant present, ce qui cache tout ce qui est deja arrive, et laisse
 * reapparaitre ce qui arrivera ensuite.
 */

interface ClocheProps {
  language: Language;
  onAller: (item: NotifItem) => void;
}

const TEXTES = {
  fr: {
    ouvrir: 'Ouvrir les notifications',
    titre: 'Notifications',
    vide: 'Rien de neuf pour le moment',
    videDesc:
      "Les messages privés, les demandes d'alliance, la veille du jour et les rendez-vous des 48 prochaines heures arriveront ici. La pastille verte se rallumera dès qu'une entrée vous concernera.",
    erreur: 'Une partie des notifications manque',
    erreurDesc:
      "Une des sources ne répond plus. Rechargez la page pour la remettre en ligne.",
    toutLu: 'Tout marquer comme lu',
    fallback: {
      message: 'Nouveau message privé',
      alliance: 'Vous propose une alliance',
      veille: 'Nouvelle entrée dans la veille',
      evenement: 'Rendez-vous à venir',
    } as Record<NotifType, string>,
  },
  en: {
    ouvrir: 'Open notifications',
    titre: 'Notifications',
    vide: 'Nothing new right now',
    videDesc:
      'Private messages, alliance requests, the daily watch and the gatherings of the next 48 hours land here. The green dot lights up again as soon as an entry concerns you.',
    erreur: 'Some notifications are missing',
    erreurDesc:
      'One of the sources stopped answering. Reload the page to bring it back.',
    toutLu: 'Mark everything as read',
    fallback: {
      message: 'New private message',
      alliance: 'Wants to form an alliance',
      veille: 'New watch entry',
      evenement: 'Upcoming gathering',
    } as Record<NotifType, string>,
  },
} as const;

const ICONES: Record<NotifType, React.ComponentType<{ className?: string }>> = {
  message: MessageSquare,
  alliance: UserPlus,
  veille: Newspaper,
  evenement: CalendarClock,
};

const TONS: Record<NotifType, string> = {
  message: 'bg-sky-950/40 text-sky-300 border-sky-800/40',
  alliance: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
  veille: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
  evenement: 'bg-violet-950/40 text-violet-300 border-violet-800/40',
};

const ETAT_VIDE: EtatNotifications = { total: 0, items: [] };

const Cloche: React.FC<ClocheProps> = ({ language, onAller }) => {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? '';
  const t = TEXTES[language === 'en' || language === 'ani' ? 'en' : 'fr'];
  const langueCourte = language === 'en' || language === 'ani' ? 'en' : 'fr';

  const [etat, setEtat] = useState<EtatNotifications>(ETAT_VIDE);
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [seuil, setSeuil] = useState<number>(() => derniereVisite());
  const enveloppe = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!uid) {
      setEtat(ETAT_VIDE);
      return;
    }
    setErreur(false);
    const stop = suivreNotifications(
      uid,
      // Une source refusee ne revient jamais d'elle-meme : le drapeau reste
      // leve jusqu'au prochain abonnement, et n'est pas remis a zero par les
      // instantanes des trois autres sources.
      setEtat,
      () => setErreur(true),
    );
    return stop;
  }, [uid]);

  const visibles = useMemo(
    () => etat.items.filter((item) => item.quand > seuil),
    [etat.items, seuil],
  );

  const compte = visibles.length;
  const pastille = compte > 9 ? '9+' : String(compte);

  const fermer = useCallback(() => setOuvert(false), []);

  useEffect(() => {
    if (!ouvert) return;
    const surClic = (evenement: MouseEvent) => {
      const cible = evenement.target as Node | null;
      if (cible && enveloppe.current && !enveloppe.current.contains(cible)) fermer();
    };
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') fermer();
    };
    document.addEventListener('mousedown', surClic);
    document.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('mousedown', surClic);
      document.removeEventListener('keydown', surTouche);
    };
  }, [ouvert, fermer]);

  const toutMarquer = () => {
    setSeuil(marquerClocheVue());
  };

  const choisir = (item: NotifItem) => {
    setOuvert(false);
    onAller(item);
  };

  const quandLu = (quand: number): string =>
    quand > 0 ? relativeTime(new Date(quand).toISOString(), langueCourte) : '';

  if (!uid) return null;

  return (
    <div ref={enveloppe} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label={t.ouvrir}
        aria-haspopup="true"
        aria-expanded={ouvert}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
          ouvert
            ? 'border-white/10 bg-white/[0.06] text-white'
            : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10 hover:text-white'
        }`}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {compte > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold leading-none text-[#02040a]">
            {pastille}
          </span>
        )}
      </button>

      {ouvert && (
        // Le panneau s'accroche au bord droit du bouton : la cloche se monte
        // dans le bloc de droite de la navigation, sinon le calcul de largeur
        // ne garantit plus l'absence de debordement sur un petit ecran.
        <div
          role="dialog"
          aria-label={t.titre}
          className="glass-card animate-fade-in absolute right-0 top-full z-50 mt-3 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/5 shadow-2xl shadow-black/60"
        >
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {t.titre}
            </span>
            {compte > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                {compte}
              </span>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {erreur && (
              <div className="flex items-start gap-3 border-b border-white/5 bg-amber-950/20 px-4 py-3">
                <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" strokeWidth={1.5} />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-white">{t.erreur}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-400">
                    {t.erreurDesc}
                  </span>
                </span>
              </div>
            )}

            {compte === 0 && !erreur && (
              <div className="px-5 py-8 text-center">
                <BellOff className="mx-auto h-7 w-7 text-slate-600" strokeWidth={1.5} />
                <p className="mt-3 text-sm font-semibold text-white">{t.vide}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{t.videDesc}</p>
              </div>
            )}

            {visibles.map((item) => {
              const Icone = ICONES[item.type];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => choisir(item)}
                  className="flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition-all last:border-b-0 hover:bg-white/[0.04]"
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${TONS[item.type]}`}
                  >
                    <Icone className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {item.titre}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-400">
                      {item.detail || t.fallback[item.type]}
                    </span>
                  </span>
                  <span className="mt-0.5 shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {quandLu(item.quand)}
                  </span>
                </button>
                );
            })}
          </div>

          {compte > 0 && (
            <div className="border-t border-white/5 p-2">
              <button
                type="button"
                onClick={toutMarquer}
                className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold text-slate-400 transition-all hover:bg-white/[0.04] hover:text-emerald-400"
              >
                <CheckCheck className="h-4 w-4" />
                {t.toutLu}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Cloche;
