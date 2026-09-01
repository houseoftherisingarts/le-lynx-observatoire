import React, { useEffect, useState } from 'react';
import { Language } from '../types';
import { useAuth } from '../context/AuthContext';
import { assurerFicheMembre } from '../services/membresService';
import Annuaire from './social/Annuaire';
import FicheMembre from './social/FicheMembre';
import Messagerie from './social/Messagerie';
import Cellules from './social/Cellules';
import Evenements from './social/Evenements';
import Photos from './social/Photos';
import Moderation from './social/Moderation';
import CartesQuestions from './social/CartesQuestions';
import PoserQuestion from './social/PoserQuestion';
import { demanderAlliance } from '../services/dmService';
import {
  Users,
  Mail,
  Network,
  CalendarDays,
  Images,
  ShieldAlert,
  MessageCircleQuestion,
  Presentation,
  X,
  LogIn,
} from 'lucide-react';

export type OngletReseau =
  | 'annuaire'
  | 'messagerie'
  | 'cellules'
  | 'evenements'
  | 'galerie'
  | 'questions'
  | 'moderation';

interface ReseauProps {
  language: Language;
  isAdmin?: boolean;
  onSignIn: () => Promise<void>;
  ongletInitial?: OngletReseau;
  ouvrirAvec?: string | null;
}

const TEXTES = {
  fr: {
    surtitre: 'Le réseau',
    titre: 'Les gens de la lutte',
    intro:
      "L'Observatoire n'est pas seulement un tableau de bord. Les personnes qui tiennent la ligne s'y retrouvent, s'y écrivent, s'organisent en cellules et se donnent rendez-vous.",
    onglets: {
      annuaire: 'Annuaire',
      messagerie: 'Messages',
      cellules: 'Cellules',
      evenements: 'Rendez-vous',
      galerie: 'Galerie',
      questions: 'Questions',
      moderation: 'Modération',
    },
    connexionTitre: 'Le réseau demande un compte',
    connexionTexte:
      "Le mur, les messages et les cellules appartiennent aux personnes qui portent la lutte. La connexion se fait avec un compte Google, et votre fiche se crée toute seule au premier passage.",
    connexion: 'Se connecter',
    connexionEnCours: 'Connexion en cours',
    maFiche: 'Ma fiche',
    fermer: 'Fermer',
    projeter: 'Projeter les questions',
    allianceEnvoyee: "La demande d'alliance est partie.",
    allianceRefusee: "La demande d'alliance n'a pas pu partir.",
  },
  en: {
    surtitre: 'The network',
    titre: 'The people behind the fight',
    intro:
      'The Observatory is more than a dashboard. The people holding the line meet here, write to each other, organize into local cells and set their next meeting.',
    onglets: {
      annuaire: 'Directory',
      messagerie: 'Messages',
      cellules: 'Cells',
      evenements: 'Events',
      galerie: 'Gallery',
      questions: 'Questions',
      moderation: 'Moderation',
    },
    connexionTitre: 'The network needs an account',
    connexionTexte:
      'The wall, the messages and the cells belong to the people carrying the fight. Sign in with a Google account, and your card is created on your first visit.',
    connexion: 'Sign in',
    connexionEnCours: 'Signing in',
    maFiche: 'My card',
    fermer: 'Close',
    projeter: 'Project the questions',
    allianceEnvoyee: 'The alliance request was sent.',
    allianceRefusee: 'The alliance request could not be sent.',
  },
};

const ONGLETS: Array<{ id: OngletReseau; icone: React.ElementType; adminSeulement?: boolean }> = [
  { id: 'annuaire', icone: Users },
  { id: 'messagerie', icone: Mail },
  { id: 'cellules', icone: Network },
  { id: 'evenements', icone: CalendarDays },
  { id: 'galerie', icone: Images },
  { id: 'questions', icone: MessageCircleQuestion },
  { id: 'moderation', icone: ShieldAlert, adminSeulement: true },
];

const Reseau: React.FC<ReseauProps> = ({
  language,
  isAdmin = false,
  onSignIn,
  ongletInitial = 'annuaire',
  ouvrirAvec = null,
}) => {
  const { profile } = useAuth();
  const t = language === 'en' ? TEXTES.en : TEXTES.fr;

  const [onglet, setOnglet] = useState<OngletReseau>(ongletInitial);
  const [ficheOuverte, setFicheOuverte] = useState<string | null>(null);
  const [conversationAvec, setConversationAvec] = useState<string | null>(ouvrirAvec);
  const [projection, setProjection] = useState(false);
  const [connexionEnCours, setConnexionEnCours] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);

  // La fiche publique se crée au premier passage, sans que personne la demande.
  useEffect(() => {
    if (!profile) return;
    assurerFicheMembre(profile).catch((e) => console.error('Fiche membre', e));
  }, [profile?.uid]);

  useEffect(() => {
    if (ouvrirAvec) {
      setConversationAvec(ouvrirAvec);
      setOnglet('messagerie');
    }
  }, [ouvrirAvec]);

  useEffect(() => {
    if (!avis) return;
    const timer = setTimeout(() => setAvis(null), 4000);
    return () => clearTimeout(timer);
  }, [avis]);

  const seConnecter = async () => {
    setConnexionEnCours(true);
    try {
      await onSignIn();
    } catch (e) {
      console.error('Connexion refusee', e);
    } finally {
      setConnexionEnCours(false);
    }
  };

  const ecrireA = (uid: string) => {
    setConversationAvec(uid);
    setFicheOuverte(null);
    setOnglet('messagerie');
  };

  const allierA = async (uid: string) => {
    if (!profile) return;
    try {
      await demanderAlliance(
        { uid: profile.uid, nom: profile.displayName },
        { uid, nom: '' }
      );
      setAvis(t.allianceEnvoyee);
    } catch (e) {
      console.error('Alliance refusee', e);
      setAvis(t.allianceRefusee);
    }
  };

  const ongletsVisibles = ONGLETS.filter((o) => !o.adminSeulement || isAdmin);

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto pb-20 animate-fade-in">
        <header className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3">
            {t.surtitre}
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4 leading-tight">
            {t.titre}
          </h2>
          <p className="text-slate-400 font-light leading-relaxed">{t.intro}</p>
        </header>

        <div className="glass-card rounded-3xl border border-white/5 p-8 md:p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-emerald-900/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">{t.connexionTitre}</h3>
          <p className="text-slate-400 text-sm font-light leading-relaxed max-w-lg mx-auto mb-7">
            {t.connexionTexte}
          </p>
          <button
            onClick={seConnecter}
            disabled={connexionEnCours}
            className="inline-flex items-center gap-2 px-7 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-full text-xs font-bold uppercase tracking-widest transition-colors"
          >
            <LogIn size={14} />
            {connexionEnCours ? t.connexionEnCours : t.connexion}
          </button>
        </div>

        <div className="mt-10">
          <PoserQuestion language={language} origin="inscription" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-fade-in">
      <header className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3">
          {t.surtitre}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3 leading-tight">
              {t.titre}
            </h2>
            <p className="text-slate-400 font-light leading-relaxed">{t.intro}</p>
          </div>
          <button
            onClick={() => setFicheOuverte(profile.uid)}
            className="shrink-0 flex items-center gap-3 glass-card rounded-full pl-2 pr-5 py-2 border border-white/5 hover:border-white/10 transition-all"
          >
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                {(profile.displayName || '?').charAt(0)}
              </span>
            )}
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
              {t.maFiche}
            </span>
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-8">
        {ongletsVisibles.map(({ id, icone: Icone }) => (
          <button
            key={id}
            onClick={() => setOnglet(id)}
            className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 ${
              onglet === id
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-transparent text-slate-500 border-white/5 hover:text-slate-200 hover:border-white/10'
            }`}
          >
            <Icone size={13} />
            {t.onglets[id]}
          </button>
        ))}
      </div>

      {avis && (
        <div className="mb-6 glass-card rounded-2xl border border-emerald-500/20 px-5 py-3 text-sm text-emerald-300">
          {avis}
        </div>
      )}

      {onglet === 'annuaire' && (
        <Annuaire
          language={language}
          onOuvrirFiche={setFicheOuverte}
          onEcrire={ecrireA}
          onAllier={allierA}
        />
      )}

      {onglet === 'messagerie' && (
        <Messagerie language={language} ouvrirAvec={conversationAvec} />
      )}

      {onglet === 'cellules' && <Cellules language={language} isAdmin={isAdmin} />}

      {onglet === 'evenements' && <Evenements language={language} isAdmin={isAdmin} />}

      {onglet === 'galerie' && <Photos language={language} isAdmin={isAdmin} />}

      {onglet === 'questions' && (
        <div className="space-y-8">
          <div className="flex justify-end">
            <button
              onClick={() => setProjection(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 glass-card rounded-full border border-white/5 hover:border-white/10 text-xs font-bold uppercase tracking-widest text-slate-300 transition-all"
            >
              <Presentation size={14} className="text-emerald-500" />
              {t.projeter}
            </button>
          </div>
          <PoserQuestion language={language} origin="direct" />
        </div>
      )}

      {onglet === 'moderation' && isAdmin && (
        <Moderation language={language} isAdmin={isAdmin} />
      )}

      {ficheOuverte && (
        <div className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-xl overflow-y-auto animate-fade-in">
          <div className="min-h-full flex items-start md:items-center justify-center p-4 py-10">
            <div className="w-full max-w-lg relative">
              <button
                onClick={() => setFicheOuverte(null)}
                className="absolute -top-3 -right-3 z-10 p-2 bg-slate-900 border border-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                aria-label={t.fermer}
              >
                <X size={16} />
              </button>
              <FicheMembre
                uid={ficheOuverte}
                language={language}
                mode="plein"
                onEcrire={ecrireA}
                onAllier={allierA}
              />
            </div>
          </div>
        </div>
      )}

      {projection && (
        <CartesQuestions
          language={language}
          onClose={() => setProjection(false)}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};

export default Reseau;
