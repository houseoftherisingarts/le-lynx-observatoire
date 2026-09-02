import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Inbox,
  LifeBuoy,
  Lock,
  RotateCcw,
  Send,
  Shield,
} from 'lucide-react';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { avatarTone, clockTime, timeAgo } from '../../services/socialService';
import {
  FilSoutien,
  LONGUEUR_MAX_SOUTIEN,
  MessageSoutien,
  changerStatutFil,
  ecrireAuSoutien,
  marquerLuSoutien,
  ouvrirFil,
  repondreAuMembre,
  suivreMessagesSoutien,
  suivreMonFil,
  suivreTousLesFils,
} from '../../services/soutienService';

interface SoutienProps {
  language: Language;
  isAdmin?: boolean;
}

const TEXTES = {
  fr: {
    titre: 'Soutien',
    sousTitre: "Une ligne directe entre vous et l'équipe de l'Observatoire.",
    accueil:
      "Ce canal vous relie directement à l'équipe de l'Observatoire. Vous pouvez poser une question sur le dossier de la mine, signaler quelque chose que vous avez vu sur le terrain, ou demander de l'aide pour vous impliquer. Une personne de l'équipe vous répond ici même.",
    equipe: "Équipe de l'Observatoire",
    premierTitre: 'Le fil est encore vide',
    premierTexte:
      "Écrivez votre premier message. Il arrive tout de suite chez l'équipe, et la réponse revient dans ce même fil.",
    saisie: 'Écrivez votre message',
    envoyer: 'Envoyer',
    retour: 'Retour',
    connexionTitre: 'Réservé aux membres',
    connexionTexte:
      "Le soutien demande un compte, pour que la réponse vous revienne au bon endroit. Connectez-vous avec Google pour ouvrir votre fil.",
    erreur:
      "Le fil de soutien n'a pas pu se charger. Vérifiez votre connexion, il se rétablira tout seul.",
    // Administration
    titreAdmin: 'Soutien des membres',
    sousTitreAdmin: "Les fils ouverts par les membres, et vos réponses au nom de l'équipe.",
    fils: 'Fils',
    listeVideTitre: 'Aucun fil pour le moment',
    listeVideTexte:
      "Dès qu'une personne écrira à l'équipe, son fil apparaîtra ici avec le nombre de messages non lus.",
    filVideTitre: 'Choisissez un fil',
    filVideTexte:
      "La liste de gauche rassemble les personnes qui ont écrit à l'équipe. Sélectionnez un nom pour lire la conversation et répondre.",
    marquerTraite: 'Marquer traité',
    rouvrir: 'Rouvrir le fil',
    traite: 'Traité',
    ouvert: 'Ouvert',
    reponse: "Répondez au nom de l'équipe",
  },
  en: {
    titre: 'Support',
    sousTitre: 'A direct line between you and the Observatory team.',
    accueil:
      'This channel connects you straight to the Observatory team. You can ask a question about the mining file, report something you saw on the ground, or ask for help getting involved. Someone from the team answers you right here.',
    equipe: 'Observatory team',
    premierTitre: 'This thread is still empty',
    premierTexte:
      'Write your first message. It reaches the team right away, and the answer comes back in this same thread.',
    saisie: 'Write your message',
    envoyer: 'Send',
    retour: 'Back',
    connexionTitre: 'Members only',
    connexionTexte:
      'Support requires an account, so the answer finds its way back to you. Sign in with Google to open your thread.',
    erreur: 'The support thread could not load. Check your connection, it will come back on its own.',
    titreAdmin: 'Member support',
    sousTitreAdmin: 'Threads opened by members, and your answers on behalf of the team.',
    fils: 'Threads',
    listeVideTitre: 'No thread yet',
    listeVideTexte:
      'As soon as someone writes to the team, their thread shows up here with the number of unread messages.',
    filVideTitre: 'Pick a thread',
    filVideTexte:
      'The list on the left holds the people who wrote to the team. Select a name to read the conversation and answer.',
    marquerTraite: 'Mark as handled',
    rouvrir: 'Reopen thread',
    traite: 'Handled',
    ouvert: 'Open',
    reponse: 'Answer on behalf of the team',
  },
};

const initiale = (nom: string): string => (nom || '?').trim().charAt(0).toUpperCase();

const Avatar: React.FC<{ nom: string; seed: string; taille?: 'sm' | 'md' }> = ({
  nom,
  seed,
  taille = 'md',
}) => (
  <div
    className={`${taille === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'} ${avatarTone(seed)} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
  >
    {initiale(nom)}
  </div>
);

const Etiquette: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{children}</p>
);

const EtatVide: React.FC<{ icone: React.ReactNode; titre: string; texte: string }> = ({
  icone,
  titre,
  texte,
}) => (
  <div className="flex flex-col items-center justify-center text-center px-8 py-12 h-full">
    <div className="text-slate-600 mb-4">{icone}</div>
    <h4 className="text-white font-medium mb-2">{titre}</h4>
    <p className="text-sm text-slate-400 max-w-sm leading-relaxed">{texte}</p>
  </div>
);

const Bulles: React.FC<{
  messages: MessageSoutien[];
  cotéEquipe: boolean;
  vide: React.ReactNode;
}> = ({ messages, cotéEquipe, vide }) => (
  <>
    {messages.length === 0
      ? vide
      : messages.map((m) => {
          const aMoi = m.cotéEquipe === cotéEquipe;
          return (
            <div key={m.id} className={`flex ${aMoi ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  aMoi ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200'
                }`}
              >
                <p className="text-[10px] uppercase tracking-widest mb-1 opacity-70">
                  {m.auteurNom}
                </p>
                <p className="text-sm whitespace-pre-wrap break-words">{m.texte}</p>
                <p className={`text-[10px] mt-1 ${aMoi ? 'text-emerald-100/70' : 'text-slate-500'}`}>
                  {clockTime(m.creeLe)}
                </p>
              </div>
            </div>
          );
        })}
  </>
);

const Saisie: React.FC<{
  valeur: string;
  onChange: (v: string) => void;
  onEnvoyer: () => void;
  placeholder: string;
  etiquetteEnvoyer: string;
  bloque: boolean;
}> = ({ valeur, onChange, onEnvoyer, placeholder, etiquetteEnvoyer, bloque }) => (
  <div className="p-3 border-t border-white/5 flex items-end gap-2">
    <textarea
      value={valeur}
      onChange={(ev) => onChange(ev.target.value.slice(0, LONGUEUR_MAX_SOUTIEN))}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' && !ev.shiftKey) {
          ev.preventDefault();
          onEnvoyer();
        }
      }}
      rows={1}
      placeholder={placeholder}
      className="flex-1 resize-none bg-white/5 border border-white/5 focus:border-emerald-500/40 rounded-2xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all max-h-32"
    />
    <button
      onClick={onEnvoyer}
      disabled={!valeur.trim() || bloque}
      aria-label={etiquetteEnvoyer}
      title={etiquetteEnvoyer}
      className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/5 disabled:text-slate-600 text-white flex items-center justify-center transition-all shrink-0"
    >
      <Send size={16} />
    </button>
  </div>
);

const Soutien: React.FC<SoutienProps> = ({ language, isAdmin = false }) => {
  const { profile } = useAuth();
  const t = TEXTES[language === 'fr' ? 'fr' : 'en'];

  const [monFil, setMonFil] = useState<FilSoutien | null>(null);
  const [fils, setFils] = useState<FilSoutien[]>([]);
  const [actif, setActif] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageSoutien[]>([]);
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [voletMobile, setVoletMobile] = useState<'liste' | 'fil'>('liste');

  const basDuFil = useRef<HTMLDivElement | null>(null);
  const uid = profile?.uid || '';
  const vueAdmin = isAdmin && profile?.role === 'admin';

  // Cote membre : le fil personnel, cree des la premiere visite.
  useEffect(() => {
    if (!profile || vueAdmin) return;
    let annule = false;
    void ouvrirFil(profile).catch(() => {
      if (!annule) setErreur(true);
    });
    const stop = suivreMonFil(
      profile.uid,
      (fil) => {
        setErreur(false);
        setMonFil(fil);
      },
      () => setErreur(true)
    );
    return () => {
      annule = true;
      stop();
    };
  }, [profile, vueAdmin]);

  // Cote administration : tous les fils.
  useEffect(() => {
    if (!vueAdmin) return;
    const stop = suivreTousLesFils(
      (liste) => {
        setErreur(false);
        setFils(liste);
      },
      () => setErreur(true)
    );
    return () => stop();
  }, [vueAdmin]);

  const filOuvert = vueAdmin ? actif : uid;

  // Messages du fil affiche.
  useEffect(() => {
    if (!filOuvert) {
      setMessages([]);
      return;
    }
    const stop = suivreMessagesSoutien(
      filOuvert,
      (m) => {
        setErreur(false);
        setMessages(m);
      },
      () => setErreur(true)
    );
    return () => stop();
  }, [filOuvert]);

  const filActif = useMemo<FilSoutien | null>(
    () => (vueAdmin ? fils.find((f) => f.id === actif) || null : monFil),
    [vueAdmin, fils, actif, monFil]
  );

  // Un fil ouvert vaut lecture, y compris pour ce qui arrive pendant la lecture.
  useEffect(() => {
    if (!filActif) return;
    const attendus = vueAdmin ? filActif.nonLusEquipe : filActif.nonLusMembre;
    if (!attendus) return;
    void marquerLuSoutien(filActif.id, vueAdmin ? 'equipe' : 'membre').catch(() => setErreur(true));
  }, [filActif, vueAdmin]);

  useEffect(() => {
    basDuFil.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, filOuvert]);

  const envoyer = async () => {
    const propre = texte.trim();
    if (!propre || !profile || envoiEnCours) return;
    if (vueAdmin && !actif) return;
    setEnvoiEnCours(true);
    setTexte('');
    try {
      if (vueAdmin && actif) await repondreAuMembre(actif, profile, propre);
      else await ecrireAuSoutien(profile, propre);
    } catch {
      setErreur(true);
      setTexte(propre);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const basculerStatut = async (fil: FilSoutien) => {
    try {
      await changerStatutFil(fil.id, fil.statut === 'traite' ? 'ouvert' : 'traite');
    } catch {
      setErreur(true);
    }
  };

  if (!profile) {
    return (
      <div className="glass-card rounded-3xl border border-white/5 p-10 animate-fade-in">
        <EtatVide
          icone={<Lock size={40} strokeWidth={1.5} />}
          titre={t.connexionTitre}
          texte={t.connexionTexte}
        />
      </div>
    );
  }

  const banniereErreur = erreur && (
    <div className="glass-card rounded-2xl border border-amber-500/20 px-4 py-3 mb-4">
      <p className="text-sm text-amber-400">{t.erreur}</p>
    </div>
  );

  // --- Vue d'un membre ------------------------------------------------------

  if (!vueAdmin) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <Etiquette>{t.equipe}</Etiquette>
          <h3 className="font-serif text-2xl md:text-3xl text-white mt-2">{t.titre}</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">{t.sousTitre}</p>
        </div>

        {banniereErreur}

        <div className="glass-panel rounded-3xl border border-white/5 p-5 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <LifeBuoy size={18} />
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{t.accueil}</p>
          </div>
        </div>

        <div className="glass-card rounded-3xl border border-white/5 hover:border-white/10 transition-all flex flex-col overflow-hidden h-[60vh] min-h-[440px]">
          <div className="flex items-center gap-3 p-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
              <Shield size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium truncate">{t.equipe}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">
                {monFil?.statut === 'traite' ? t.traite : t.ouvert}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <Bulles
              messages={messages}
              cotéEquipe={false}
              vide={
                <EtatVide
                  icone={<Send size={36} strokeWidth={1.5} />}
                  titre={t.premierTitre}
                  texte={t.premierTexte}
                />
              }
            />
            <div ref={basDuFil} />
          </div>

          <Saisie
            valeur={texte}
            onChange={setTexte}
            onEnvoyer={() => void envoyer()}
            placeholder={t.saisie}
            etiquetteEnvoyer={t.envoyer}
            bloque={envoiEnCours}
          />
        </div>
      </div>
    );
  }

  // --- Vue de l'administration ---------------------------------------------

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Etiquette>{t.equipe}</Etiquette>
        <h3 className="font-serif text-2xl md:text-3xl text-white mt-2">{t.titreAdmin}</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-xl">{t.sousTitreAdmin}</p>
      </div>

      {banniereErreur}

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[70vh] min-h-[520px]">
        <div
          className={`${
            voletMobile === 'fil' ? 'hidden md:flex' : 'flex'
          } glass-card rounded-3xl border border-white/5 hover:border-white/10 transition-all flex-col overflow-hidden`}
        >
          <div className="px-4 pt-4 pb-2">
            <Etiquette>{t.fils}</Etiquette>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {fils.length === 0 ? (
              <EtatVide
                icone={<Inbox size={36} strokeWidth={1.5} />}
                titre={t.listeVideTitre}
                texte={t.listeVideTexte}
              />
            ) : (
              fils.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setTexte('');
                    setActif(f.id);
                    setVoletMobile('fil');
                  }}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl transition-all border ${
                    actif === f.id
                      ? 'bg-white/5 border-white/10'
                      : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <Avatar nom={f.nom} seed={f.uid || f.id} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">{f.nom}</p>
                      <span className="text-[10px] text-slate-600 shrink-0">
                        {timeAgo(f.majLe, language)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{f.dernierMessage}</p>
                  </div>
                  {f.nonLusEquipe > 0 ? (
                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-[11px] font-bold text-black flex items-center justify-center">
                      {f.nonLusEquipe > 99 ? '99+' : f.nonLusEquipe}
                    </span>
                  ) : (
                    f.statut === 'traite' && (
                      <Check size={14} className="text-slate-600 shrink-0" />
                    )
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div
          className={`${
            voletMobile === 'liste' ? 'hidden md:flex' : 'flex'
          } glass-card rounded-3xl border border-white/5 flex-col overflow-hidden`}
        >
          {!filActif ? (
            <EtatVide
              icone={<LifeBuoy size={40} strokeWidth={1.5} />}
              titre={t.filVideTitre}
              texte={t.filVideTexte}
            />
          ) : (
            <>
              <div className="flex items-center gap-3 p-4 border-b border-white/5">
                <button
                  onClick={() => setVoletMobile('liste')}
                  aria-label={t.retour}
                  title={t.retour}
                  className="md:hidden w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center transition-all"
                >
                  <ArrowLeft size={16} />
                </button>
                <Avatar nom={filActif.nom} seed={filActif.uid || filActif.id} />
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium truncate">{filActif.nom}</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 truncate">
                    {filActif.courriel || (filActif.statut === 'traite' ? t.traite : t.ouvert)}
                  </p>
                </div>
                <button
                  onClick={() => void basculerStatut(filActif)}
                  className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
                    filActif.statut === 'traite'
                      ? 'border-white/10 text-slate-400 hover:bg-white/5'
                      : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {filActif.statut === 'traite' ? <RotateCcw size={12} /> : <Check size={12} />}
                  <span className="hidden sm:inline">
                    {filActif.statut === 'traite' ? t.rouvrir : t.marquerTraite}
                  </span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <Bulles
                  messages={messages}
                  cotéEquipe
                  vide={
                    <EtatVide
                      icone={<Send size={36} strokeWidth={1.5} />}
                      titre={t.premierTitre}
                      texte={t.premierTexte}
                    />
                  }
                />
                <div ref={basDuFil} />
              </div>

              <Saisie
                valeur={texte}
                onChange={setTexte}
                onEnvoyer={() => void envoyer()}
                placeholder={t.reponse}
                etiquetteEnvoyer={t.envoyer}
                bloque={envoiEnCours}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Soutien;
