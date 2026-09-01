import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Share2,
  Trash2,
  Pin,
  ShieldCheck,
  Check,
  Send,
  Loader2,
} from 'lucide-react';
import { Language } from '../../types';
import { timeAgo, avatarTone } from '../../services/socialService';
import {
  BilletMur as Billet,
  CommentaireMur,
  LONGUEUR_MAX_COMMENTAIRE,
  commenter,
  epingler,
  supprimerBillet,
  suivreCommentaires,
  voter,
} from '../../services/murService';

const T = {
  fr: {
    officiel: 'Officiel',
    epingle: 'Épinglé',
    commentaires: 'Commentaires',
    partager: 'Partager',
    lienCopie: 'Lien copié',
    supprimer: 'Supprimer',
    epinglerAction: 'Épingler',
    desepingler: 'Retirer l’épingle',
    ecrire: 'Écrivez votre réponse',
    envoyer: 'Envoyer',
    aucunCommentaire: 'Personne n’a encore répondu. La première réponse ouvre la discussion.',
    connexionRequise: 'Connectez-vous pour répondre et pour voter.',
    erreur: 'La discussion ne se charge pas pour le moment. Réessayez dans un instant.',
  },
  en: {
    officiel: 'Official',
    epingle: 'Pinned',
    commentaires: 'Comments',
    partager: 'Share',
    lienCopie: 'Link copied',
    supprimer: 'Delete',
    epinglerAction: 'Pin',
    desepingler: 'Unpin',
    ecrire: 'Write your reply',
    envoyer: 'Send',
    aucunCommentaire: 'Nobody has replied yet. The first reply opens the discussion.',
    connexionRequise: 'Sign in to reply and to vote.',
    erreur: 'The discussion is not loading right now. Try again in a moment.',
  },
};

export interface BilletMurProps {
  billet: Billet;
  language: Language;
  monVote?: 1 | -1 | 0;
  moiUid?: string | null;
  monNom?: string;
  monAvatar?: string;
  isAdmin?: boolean;
}

const Avatar: React.FC<{ url?: string; nom: string; uid: string; taille: string }> = ({
  url,
  nom,
  uid,
  taille,
}) =>
  url ? (
    <img src={url} alt={nom} className={`${taille} rounded-full object-cover border border-white/10`} />
  ) : (
    <div
      className={`${taille} rounded-full ${avatarTone(uid)} flex items-center justify-center text-white font-bold`}
    >
      {(nom || '?').charAt(0).toUpperCase()}
    </div>
  );

const BilletMur: React.FC<BilletMurProps> = ({
  billet,
  language,
  monVote = 0,
  moiUid = null,
  monNom = '',
  monAvatar = '',
  isAdmin = false,
}) => {
  const t = T[language === 'fr' ? 'fr' : 'en'];
  const [filOuvert, setFilOuvert] = useState(false);
  const [commentaires, setCommentaires] = useState<CommentaireMur[]>([]);
  const [erreurFil, setErreurFil] = useState(false);
  const [reponse, setReponse] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [copie, setCopie] = useState(false);
  const minuterie = useRef<number | null>(null);

  useEffect(() => {
    if (!filOuvert) return;
    setErreurFil(false);
    const desabonner = suivreCommentaires(
      billet.id,
      setCommentaires,
      () => setErreurFil(true)
    );
    return () => desabonner();
  }, [filOuvert, billet.id]);

  useEffect(() => () => {
    if (minuterie.current) window.clearTimeout(minuterie.current);
  }, []);

  const peutSupprimer = isAdmin || (moiUid !== null && moiUid === billet.uid);

  const changerVote = async (valeur: 1 | -1) => {
    if (!moiUid) return;
    await voter(billet.id, moiUid, monNom, monVote === valeur ? 0 : valeur);
  };

  const partager = async () => {
    const lien = `${window.location.origin}${window.location.pathname}#billet-${billet.id}`;
    const partageNatif = (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share;
    if (partageNatif) {
      try {
        await partageNatif.call(navigator, { title: billet.nom, text: billet.texte.slice(0, 180), url: lien });
        return;
      } catch {
        // La personne a fermé la feuille de partage, on retombe sur la copie.
      }
    }
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      minuterie.current = window.setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  };

  const envoyerReponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moiUid || !reponse.trim() || envoiEnCours) return;
    setEnvoiEnCours(true);
    try {
      await commenter(billet.id, { uid: moiUid, nom: monNom, avatarUrl: monAvatar }, reponse);
      setReponse('');
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const couleurVote =
    monVote === 1 ? 'text-emerald-400' : monVote === -1 ? 'text-amber-400' : 'text-slate-200';

  return (
    <article
      id={`billet-${billet.id}`}
      className="glass-card rounded-3xl border border-white/5 hover:border-white/10 transition-all animate-fade-in overflow-hidden"
    >
      <div className="flex">
        {/* Colonne de vote */}
        <div className="flex flex-col items-center gap-1 px-3 py-5 border-r border-white/5 bg-black/20">
          <button
            type="button"
            aria-label="Pour"
            disabled={!moiUid}
            onClick={() => changerVote(1)}
            className={`p-1.5 rounded-full transition-all hover:bg-white/5 disabled:opacity-30 ${
              monVote === 1 ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <span className={`text-sm font-bold tabular-nums ${couleurVote}`}>{billet.score ?? 0}</span>
          <button
            type="button"
            aria-label="Contre"
            disabled={!moiUid}
            onClick={() => changerVote(-1)}
            className={`p-1.5 rounded-full transition-all hover:bg-white/5 disabled:opacity-30 ${
              monVote === -1 ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 min-w-0 p-4 sm:p-5">
          <header className="flex items-center gap-3 flex-wrap">
            <Avatar url={billet.avatarUrl} nom={billet.nom} uid={billet.uid} taille="w-9 h-9" />
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{billet.nom}</p>
              <p className="text-slate-500 text-xs">{timeAgo(billet.creeLe, language)}</p>
            </div>
            {billet.officiel && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-sky-500/10 text-sky-300 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3" />
                {t.officiel}
              </span>
            )}
            {billet.epingle && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-bold uppercase tracking-widest">
                <Pin className="w-3 h-3" />
                {t.epingle}
              </span>
            )}
          </header>

          {billet.texte && (
            <p className="mt-3 text-slate-200 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {billet.texte}
            </p>
          )}

          {billet.photoUrl && (
            <img
              src={billet.photoUrl}
              alt=""
              loading="lazy"
              className="mt-4 w-full max-h-96 object-cover rounded-2xl border border-white/5"
            />
          )}

          <footer className="mt-4 flex items-center gap-2 flex-wrap text-slate-400">
            <button
              type="button"
              onClick={() => setFilOuvert((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium hover:bg-white/5 hover:text-slate-200 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              {billet.nbCommentaires ?? 0}
            </button>
            <button
              type="button"
              onClick={partager}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium hover:bg-white/5 hover:text-slate-200 transition-all"
            >
              {copie ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copie ? t.lienCopie : t.partager}</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => epingler(billet.id, !billet.epingle)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium hover:bg-white/5 transition-all ${
                  billet.epingle ? 'text-emerald-400' : 'hover:text-slate-200'
                }`}
              >
                <Pin className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {billet.epingle ? t.desepingler : t.epinglerAction}
                </span>
              </button>
            )}
            {peutSupprimer && (
              <button
                type="button"
                onClick={() => supprimerBillet(billet.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium hover:bg-red-500/10 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t.supprimer}</span>
              </button>
            )}
          </footer>

          {filOuvert && (
            <section className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-fade-in">
              {erreurFil && <p className="text-xs text-amber-400">{t.erreur}</p>}
              {!erreurFil && commentaires.length === 0 && (
                <p className="text-xs text-slate-500">{t.aucunCommentaire}</p>
              )}
              {commentaires.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar url={c.avatarUrl} nom={c.nom} uid={c.uid} taille="w-7 h-7 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-400">
                      <span className="text-slate-200 font-semibold">{c.nom}</span>
                      <span className="ml-2">{timeAgo(c.creeLe, language)}</span>
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                      {c.texte}
                    </p>
                  </div>
                </div>
              ))}

              {moiUid ? (
                <form onSubmit={envoyerReponse} className="flex items-center gap-2">
                  <input
                    value={reponse}
                    onChange={(e) => setReponse(e.target.value.slice(0, LONGUEUR_MAX_COMMENTAIRE))}
                    placeholder={t.ecrire}
                    className="flex-1 bg-black/40 border border-white/5 focus:border-emerald-500/40 rounded-full px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!reponse.trim() || envoiEnCours}
                    aria-label={t.envoyer}
                    className="p-2.5 rounded-full bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-30 transition-all"
                  >
                    {envoiEnCours ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-slate-500">{t.connexionRequise}</p>
              )}
            </section>
          )}
        </div>
      </div>
    </article>
  );
};

export default BilletMur;
