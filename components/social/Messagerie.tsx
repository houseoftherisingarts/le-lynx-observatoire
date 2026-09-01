import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Handshake,
  Lock,
  MessageSquare,
  Send,
  Users,
  X,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { avatarTone, clockTime, timeAgo } from '../../services/socialService';
import {
  Alliance,
  Conversation,
  MesAlliances,
  MessagePrive,
  LONGUEUR_MAX_MESSAGE,
  accepterAlliance,
  autreDeLaPaire,
  clePaire,
  marquerLu,
  nomPublic,
  ouvrirConversation,
  retirerAlliance,
  suivreMesAlliances,
  suivreMesConversations,
  suivreMessages,
  envoyerMessage,
} from '../../services/dmService';

interface MessagerieProps {
  language: Language;
  ouvrirAvec?: string | null;
}

interface Entree {
  pairId: string;
  autreUid: string;
  autreNom: string;
  extrait: string;
  quand: Timestamp | null;
  nonLus: number;
}

const TEXTES = {
  fr: {
    titre: 'Messagerie',
    sousTitre: 'Vos échanges privés avec les autres membres de la lutte.',
    demandes: "Demandes d'alliance",
    envoyees: 'Demandes envoyées',
    attente: 'En attente de réponse',
    accepter: 'Accepter',
    refuser: 'Refuser',
    conversations: 'Conversations',
    videTitre: 'Aucune conversation pour le moment',
    videTexte: "Vos alliances apparaîtront ici dès qu'une personne aura accepté votre demande. Vous pourrez alors lui écrire directement, sans passer par le mur public.",
    filVideTitre: 'Choisissez une conversation',
    filVideTexte: 'La liste de gauche rassemble vos alliances et vos échanges en cours. Sélectionnez un nom pour ouvrir le fil.',
    premierTitre: 'Le fil est encore vide',
    premierTexte: 'Écrivez le premier message. Votre alliée ou allié le recevra en direct, et la conversation restera visible entre vous deux seulement.',
    saisie: 'Écrivez votre message',
    envoyer: 'Envoyer',
    retour: 'Retour',
    connexionTitre: 'Réservé aux membres',
    connexionTexte: 'La messagerie privée demande un compte. Connectez-vous avec Google pour retrouver vos alliances et vos fils de discussion.',
    erreur: "La messagerie n'a pas pu se charger. Vérifiez votre connexion, la liste se rétablira toute seule.",
  },
  en: {
    titre: 'Messages',
    sousTitre: 'Your private exchanges with other members of the fight.',
    demandes: 'Alliance requests',
    envoyees: 'Requests sent',
    attente: 'Waiting for an answer',
    accepter: 'Accept',
    refuser: 'Decline',
    conversations: 'Conversations',
    videTitre: 'No conversation yet',
    videTexte: 'Your alliances will show up here as soon as someone accepts your request. You will then be able to write to them directly, away from the public wall.',
    filVideTitre: 'Pick a conversation',
    filVideTexte: 'The list on the left holds your alliances and your ongoing threads. Select a name to open it.',
    premierTitre: 'This thread is still empty',
    premierTexte: 'Write the first message. Your ally receives it live, and the conversation stays visible to the two of you only.',
    saisie: 'Write your message',
    envoyer: 'Send',
    retour: 'Back',
    connexionTitre: 'Members only',
    connexionTexte: 'Private messages require an account. Sign in with Google to find your alliances and your threads again.',
    erreur: 'Messages could not load. Check your connection, the list will come back on its own.',
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

const Messagerie: React.FC<MessagerieProps> = ({ language, ouvrirAvec = null }) => {
  const { profile } = useAuth();
  const t = TEXTES[language === 'fr' ? 'fr' : 'en'];

  const [alliances, setAlliances] = useState<MesAlliances>({
    recues: [],
    envoyees: [],
    acceptees: [],
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<MessagePrive[]>([]);
  const [actif, setActif] = useState<string | null>(null);
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [voletMobile, setVoletMobile] = useState<'liste' | 'fil'>('liste');

  const basDuFil = useRef<HTMLDivElement | null>(null);
  const uid = profile?.uid || '';
  const moi = useMemo(() => ({ uid, nom: profile?.displayName || 'Membre' }), [uid, profile?.displayName]);

  // Alliances en direct.
  useEffect(() => {
    if (!uid) return;
    const stop = suivreMesAlliances(
      uid,
      (a) => {
        setErreur(false);
        setAlliances(a);
      },
      () => setErreur(true)
    );
    return () => stop();
  }, [uid]);

  // Conversations en direct.
  useEffect(() => {
    if (!uid) return;
    const stop = suivreMesConversations(
      uid,
      (c) => {
        setErreur(false);
        setConversations(c);
      },
      () => setErreur(true)
    );
    return () => stop();
  }, [uid]);

  // Fil de la conversation choisie.
  useEffect(() => {
    if (!actif) {
      setMessages([]);
      return;
    }
    const stop = suivreMessages(
      actif,
      (m) => {
        setErreur(false);
        setMessages(m);
      },
      () => setErreur(true)
    );
    return () => stop();
  }, [actif]);

  // Liste unifiee : conversations existantes, puis alliances sans fil encore ouvert.
  const entrees = useMemo<Entree[]>(() => {
    const liste: Entree[] = conversations.map((c) => {
      const autreUid = autreDeLaPaire(c.participantUids, uid);
      return {
        pairId: c.id,
        autreUid,
        autreNom: c.participantNoms?.[autreUid] || 'Membre',
        extrait: c.dernierMessage || '',
        quand: c.majLe,
        nonLus: c.nonLus?.[uid] || 0,
      };
    });
    const dejaLa = new Set(liste.map((e) => e.pairId));
    alliances.acceptees.forEach((a) => {
      const pairId = clePaire(a.paire[0], a.paire[1]);
      if (dejaLa.has(pairId)) return;
      const autreUid = autreDeLaPaire(a.paire, uid);
      liste.push({
        pairId,
        autreUid,
        autreNom: a.noms?.[autreUid] || 'Membre',
        extrait: '',
        quand: a.majLe,
        nonLus: 0,
      });
    });
    return liste;
  }, [conversations, alliances.acceptees, uid]);

  const entreeActive = entrees.find((e) => e.pairId === actif) || null;

  // Ouverture directe demandee par le parent.
  useEffect(() => {
    if (!uid || !ouvrirAvec || ouvrirAvec === uid) return;
    let annule = false;
    const ouvrir = async () => {
      const pairId = clePaire(uid, ouvrirAvec);
      const connu =
        conversations.find((c) => c.id === pairId)?.participantNoms?.[ouvrirAvec] ||
        alliances.acceptees.find((a) => a.id === pairId)?.noms?.[ouvrirAvec] ||
        '';
      const nom = connu || (await nomPublic(ouvrirAvec)) || 'Membre';
      if (annule) return;
      try {
        await ouvrirConversation(moi, { uid: ouvrirAvec, nom });
        if (annule) return;
        setActif(pairId);
        setVoletMobile('fil');
      } catch {
        setErreur(true);
      }
    };
    void ouvrir();
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, ouvrirAvec, moi]);

  // Le fil ouvert vaut lecture, y compris pour ce qui arrive pendant la lecture.
  useEffect(() => {
    if (!uid || !actif || !entreeActive || entreeActive.nonLus === 0) return;
    void marquerLu(actif, uid).catch(() => setErreur(true));
  }, [uid, actif, entreeActive]);

  // Descend au dernier message.
  useEffect(() => {
    basDuFil.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, actif]);

  const choisir = async (entree: Entree) => {
    setTexte('');
    try {
      await ouvrirConversation(moi, { uid: entree.autreUid, nom: entree.autreNom });
      setActif(entree.pairId);
      setVoletMobile('fil');
    } catch {
      setErreur(true);
    }
  };

  const envoyer = async () => {
    const propre = texte.trim();
    if (!propre || !actif || !entreeActive || envoiEnCours) return;
    setEnvoiEnCours(true);
    setTexte('');
    try {
      await envoyerMessage(actif, moi, propre, entreeActive.autreUid);
    } catch {
      setErreur(true);
      setTexte(propre);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const repondreDemande = async (a: Alliance, accepte: boolean) => {
    try {
      if (accepte) await accepterAlliance(a.id, uid);
      else await retirerAlliance(a.id);
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

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h3 className="font-serif text-2xl md:text-3xl text-white mt-2">{t.titre}</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-xl">{t.sousTitre}</p>
      </div>

      {erreur && (
        <div className="glass-card rounded-2xl border border-amber-500/20 px-4 py-3 mb-4">
          <p className="text-sm text-amber-400">{t.erreur}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[70vh] min-h-[520px]">
        {/* Volet gauche */}
        <div
          className={`${
            voletMobile === 'fil' ? 'hidden md:flex' : 'flex'
          } glass-card rounded-3xl border border-white/5 hover:border-white/10 transition-all flex-col overflow-hidden`}
        >
          {(alliances.recues.length > 0 || alliances.envoyees.length > 0) && (
            <div className="p-4 border-b border-white/5 space-y-3 max-h-64 overflow-y-auto">
              <Etiquette>{t.demandes}</Etiquette>
              {alliances.recues.map((a) => {
                const autre = autreDeLaPaire(a.paire, uid);
                const nom = a.noms?.[autre] || 'Membre';
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar nom={nom} seed={autre} taille="sm" />
                    <p className="flex-1 text-sm text-slate-200 truncate">{nom}</p>
                    <button
                      onClick={() => repondreDemande(a, true)}
                      aria-label={t.accepter}
                      title={t.accepter}
                      className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => repondreDemande(a, false)}
                      aria-label={t.refuser}
                      title={t.refuser}
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 flex items-center justify-center transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
              {alliances.envoyees.length > 0 && (
                <div className="pt-2 space-y-2">
                  <Etiquette>{t.envoyees}</Etiquette>
                  {alliances.envoyees.map((a) => {
                    const autre = autreDeLaPaire(a.paire, uid);
                    return (
                      <div key={a.id} className="flex items-center gap-3">
                        <Avatar nom={a.noms?.[autre] || 'Membre'} seed={autre} taille="sm" />
                        <p className="flex-1 text-sm text-slate-400 truncate">
                          {a.noms?.[autre] || 'Membre'}
                        </p>
                        <span className="text-[10px] uppercase tracking-widest text-slate-600">
                          {t.attente}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="px-4 pt-4 pb-2">
            <Etiquette>{t.conversations}</Etiquette>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {entrees.length === 0 ? (
              <EtatVide
                icone={<Users size={36} strokeWidth={1.5} />}
                titre={t.videTitre}
                texte={t.videTexte}
              />
            ) : (
              entrees.map((e) => (
                <button
                  key={e.pairId}
                  onClick={() => choisir(e)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl transition-all border ${
                    actif === e.pairId
                      ? 'bg-white/5 border-white/10'
                      : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <Avatar nom={e.autreNom} seed={e.autreUid} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">{e.autreNom}</p>
                      <span className="text-[10px] text-slate-600 shrink-0">
                        {timeAgo(e.quand, language)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{e.extrait}</p>
                  </div>
                  {e.nonLus > 0 && (
                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-[11px] font-bold text-black flex items-center justify-center">
                      {e.nonLus > 99 ? '99+' : e.nonLus}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Volet droit */}
        <div
          className={`${
            voletMobile === 'liste' ? 'hidden md:flex' : 'flex'
          } glass-card rounded-3xl border border-white/5 flex-col overflow-hidden`}
        >
          {!entreeActive ? (
            <EtatVide
              icone={<MessageSquare size={40} strokeWidth={1.5} />}
              titre={t.filVideTitre}
              texte={t.filVideTexte}
            />
          ) : (
            <>
              <div className="flex items-center gap-3 p-4 border-b border-white/5">
                <button
                  onClick={() => setVoletMobile('liste')}
                  aria-label={t.retour}
                  className="md:hidden w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center transition-all"
                >
                  <ArrowLeft size={16} />
                </button>
                <Avatar nom={entreeActive.autreNom} seed={entreeActive.autreUid} />
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{entreeActive.autreNom}</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
                    <Handshake size={11} /> {t.titre}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <EtatVide
                    icone={<Send size={36} strokeWidth={1.5} />}
                    titre={t.premierTitre}
                    texte={t.premierTexte}
                  />
                ) : (
                  messages.map((m) => {
                    const aMoi = m.uid === uid;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${aMoi ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            aMoi ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{m.texte}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              aMoi ? 'text-emerald-100/70' : 'text-slate-500'
                            }`}
                          >
                            {clockTime(m.creeLe)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={basDuFil} />
              </div>

              <div className="p-3 border-t border-white/5 flex items-end gap-2">
                <textarea
                  value={texte}
                  onChange={(ev) => setTexte(ev.target.value.slice(0, LONGUEUR_MAX_MESSAGE))}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' && !ev.shiftKey) {
                      ev.preventDefault();
                      void envoyer();
                    }
                  }}
                  rows={1}
                  placeholder={t.saisie}
                  className="flex-1 resize-none bg-white/5 border border-white/5 focus:border-emerald-500/40 rounded-2xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all max-h-32"
                />
                <button
                  onClick={() => void envoyer()}
                  disabled={!texte.trim() || envoiEnCours}
                  aria-label={t.envoyer}
                  className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/5 disabled:text-slate-600 text-white flex items-center justify-center transition-all shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messagerie;
