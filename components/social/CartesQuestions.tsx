import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Inbox,
  Loader2,
  Mail,
  MapPin,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Language } from '../../types';
import {
  changerStatut,
  Question,
  suivreQuestions,
} from '../../services/questionsService';

interface CartesQuestionsProps {
  language: Language;
  onClose: () => void;
  isAdmin?: boolean;
}

const T = {
  fr: {
    etiquette: 'Questions du public',
    fermer: 'Fermer',
    precedente: 'Question précédente',
    suivante: 'Question suivante',
    chargement: 'Nous ouvrons le paquet de questions.',
    videTitre: 'Aucune question pour le moment',
    videTexte:
      'Le paquet se remplit dès qu’une personne dépose sa question. Les nouvelles arrivées s’ajoutent en direct, sans que vous ayez à recharger la page.',
    erreurTitre: 'Les questions restent hors de portée',
    erreurTexte:
      'La connexion à la base de données a été refusée. Rechargez la page dans un moment et le paquet reviendra.',
    inscription: 'Question déposée à l’avance',
    direct: 'Question posée en direct',
    masquer: 'Masquer',
    approuver: 'Approuver',
    masquee: 'Masquée',
    approuvee: 'Approuvée',
    attente: 'En attente',
    ans: 'ans',
    aide: 'Les flèches font défiler le paquet et Échap le referme.',
    erreurStatut: 'Le changement de statut n’a pas été enregistré. Réessayez dans un moment.',
  },
  en: {
    etiquette: 'Questions from the public',
    fermer: 'Close',
    precedente: 'Previous question',
    suivante: 'Next question',
    chargement: 'We are opening the deck of questions.',
    videTitre: 'No question yet',
    videTexte:
      'The deck fills up as soon as someone leaves a question. New arrivals are added live, with no need to reload the page.',
    erreurTitre: 'The questions stay out of reach',
    erreurTexte:
      'The database connection was refused. Reload the page in a moment and the deck will come back.',
    inscription: 'Question sent ahead of time',
    direct: 'Question asked live',
    masquer: 'Hide',
    approuver: 'Approve',
    masquee: 'Hidden',
    approuvee: 'Approved',
    attente: 'Pending',
    ans: 'years old',
    aide: 'The arrow keys move through the deck and Esc closes it.',
    erreurStatut: 'The status change was not saved. Please try again in a moment.',
  },
};

const CartesQuestions: React.FC<CartesQuestionsProps> = ({ language, onClose, isAdmin = false }) => {
  const t = language === 'fr' ? T.fr : T.en;
  const [toutes, setToutes] = useState<Question[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [index, setIndex] = useState(0);
  const [erreurStatut, setErreurStatut] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const desabonner = suivreQuestions(
      (liste) => {
        setToutes(liste);
        setChargement(false);
      },
      () => {
        setErreur(true);
        setChargement(false);
      }
    );
    return desabonner;
  }, []);

  const questions = useMemo(
    () => (isAdmin ? toutes : toutes.filter((q) => q.status !== 'hidden')),
    [toutes, isAdmin]
  );

  // La carte courante reste en place quand une question arrive à la fin du paquet.
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, questions.length - 1)));
  }, [questions.length]);

  const dernier = Math.max(0, questions.length - 1);

  const avancer = useCallback(
    (pas: number) => setIndex((i) => Math.min(dernier, Math.max(0, i + pas))),
    [dernier]
  );

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        avancer(-1);
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        avancer(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        setIndex(dernier);
      }
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [avancer, dernier]);

  const carte = questions[index];
  const teinte =
    carte?.origin === 'direct'
      ? 'from-sky-950/40 via-slate-900/40 to-black/50'
      : 'from-red-950/40 via-amber-950/20 to-black/50';

  const statut = (s: Question['status']) =>
    s === 'hidden' ? t.masquee : s === 'approved' ? t.approuvee : t.attente;

  // Les regles Firestore n'acceptent ce changement que d'un compte administrateur.
  // Sans ce catch, un refus laissait la carte inchangee sans rien dire a personne.
  const marquer = async (id: string, nouveau: Question['status']) => {
    setErreurStatut(false);
    try {
      await changerStatut(id, nouveau);
    } catch {
      setErreurStatut(true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.etiquette}
      className="fixed inset-0 z-50 flex flex-col overflow-x-hidden bg-[#02040a] animate-fade-in"
    >
      <header className="flex items-center justify-between px-5 py-4 md:px-8">
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          {t.etiquette}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.fermer}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-black/40 text-slate-400 transition-all hover:border-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-6 md:px-8 overflow-hidden">
        {chargement && (
          <div className="flex flex-col items-center gap-4 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
            <p className="text-sm">{t.chargement}</p>
          </div>
        )}

        {!chargement && erreur && (
          <div className="max-w-md text-center">
            <ShieldAlert className="mx-auto mb-5 h-12 w-12 text-slate-600" />
            <h3 className="font-serif text-2xl text-white mb-3">{t.erreurTitre}</h3>
            <p className="text-sm leading-relaxed text-slate-400">{t.erreurTexte}</p>
          </div>
        )}

        {!chargement && !erreur && !carte && (
          <div className="max-w-md text-center">
            <Inbox className="mx-auto mb-5 h-12 w-12 text-slate-600" />
            <h3 className="font-serif text-2xl text-white mb-3">{t.videTitre}</h3>
            <p className="text-sm leading-relaxed text-slate-400">{t.videTexte}</p>
          </div>
        )}

        {!chargement && !erreur && carte && (
          <div className="flex w-full max-w-6xl items-center gap-3 md:gap-6">
            <button
              type="button"
              onClick={() => avancer(-1)}
              disabled={index === 0}
              aria-label={t.precedente}
              className="hidden md:flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/5 bg-black/40 text-slate-400 transition-all hover:border-white/10 hover:text-white disabled:opacity-20"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>

            <article
              key={carte.id}
              className={`glass-card animate-fade-in flex h-[72vh] w-full flex-col rounded-[30px] border border-white/5 bg-gradient-to-br ${teinte} p-6 md:p-12`}
            >
              <div className="flex items-start gap-5">
                {carte.photoURL ? (
                  <img
                    src={carte.photoURL}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-full border border-white/10 object-cover md:h-24 md:w-24"
                  />
                ) : null}
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {carte.origin === 'direct' ? t.direct : t.inscription}
                  </span>
                  <h2 className="mt-2 truncate font-serif text-4xl leading-tight text-white md:text-6xl">
                    {carte.name}
                  </h2>
                  <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-400">
                    {carte.town && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-slate-600" />
                        {carte.town}
                      </span>
                    )}
                    {carte.age && <span>{carte.age} {t.ans}</span>}
                    {carte.email && (
                      <span className="flex min-w-0 max-w-full items-center gap-1.5 text-[11px] text-slate-600">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{carte.email}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-1 items-center overflow-y-auto py-6">
                <p className="w-full break-words font-serif text-2xl leading-snug text-slate-100 md:text-4xl md:leading-snug">
                  {carte.question}
                </p>
              </div>

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {statut(carte.status)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void marquer(carte.id, 'approved')}
                    className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t.approuver}
                  </button>
                  <button
                    type="button"
                    onClick={() => void marquer(carte.id, 'hidden')}
                    className="flex items-center gap-2 rounded-full border border-white/5 bg-black/40 px-4 py-2 text-xs font-semibold text-slate-400 transition-all hover:border-white/10 hover:text-white"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    {t.masquer}
                  </button>
                  {erreurStatut && (
                    <p role="alert" className="w-full text-xs leading-relaxed text-red-300">
                      {t.erreurStatut}
                    </p>
                  )}
                </div>
              )}
            </article>

            <button
              type="button"
              onClick={() => avancer(1)}
              disabled={index >= questions.length - 1}
              aria-label={t.suivante}
              className="hidden md:flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/5 bg-black/40 text-slate-400 transition-all hover:border-white/10 hover:text-white disabled:opacity-20"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </div>
        )}
      </main>

      {!chargement && !erreur && carte && (
        <footer className="flex items-center justify-center gap-6 px-5 pb-6 md:pb-8">
          <button
            type="button"
            onClick={() => avancer(-1)}
            disabled={index === 0}
            aria-label={t.precedente}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/5 bg-black/40 text-slate-400 transition-all hover:text-white disabled:opacity-20 md:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <span className="text-xs font-bold tracking-widest text-slate-500">
              {index + 1} / {questions.length}
            </span>
            <p className="mt-1 hidden text-[10px] uppercase tracking-widest text-slate-700 md:block">
              {t.aide}
            </p>
          </div>
          <button
            type="button"
            onClick={() => avancer(1)}
            disabled={index >= questions.length - 1}
            aria-label={t.suivante}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/5 bg-black/40 text-slate-400 transition-all hover:text-white disabled:opacity-20 md:hidden"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </footer>
      )}
    </div>
  );
};

export default CartesQuestions;
