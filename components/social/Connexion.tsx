import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, ShieldCheck, ArrowLeft, Loader, X, Info } from 'lucide-react';

/**
 * Création de compte et connexion. Deux chemins mènent au même endroit :
 * une adresse courriel avec un mot de passe, ou le compte Google déjà ouvert
 * dans le navigateur. La note sur Google est affichée à côté du bouton parce
 * que la formule inquiète des gens qui ont raison de se méfier.
 */

type Mode = 'choix' | 'inscription' | 'connexion' | 'oubli';

interface ConnexionProps {
  language: Language;
  onFerme?: () => void;
  /** Rendu en fenêtre modale quand le parent le demande. */
  enModale?: boolean;
}

const TEXTES = {
  fr: {
    titre: 'Entrer dans le réseau',
    intro:
      "Le compte sert à écrire sur le mur, à rejoindre une cellule, à confirmer une présence et à recevoir la veille. Il ne sert à rien d'autre, et rien n'est revendu.",
    creer: 'Créer un compte',
    dejaMembre: "J'ai déjà un compte",
    avecGoogle: 'Continuer avec le compte Google déjà ouvert',
    noteGoogleTitre: 'Ce que fait ce bouton',
    noteGoogle:
      "Ce bouton lit simplement le compte Google déjà ouvert dans votre navigateur pour remplir votre nom et votre adresse. Nous n'envoyons aucune information à Google, et l'Observatoire ne voit jamais votre mot de passe.",
    ou: 'ou avec une adresse courriel',
    nom: 'Votre nom',
    nomAide: 'Le nom que les autres membres verront.',
    courriel: 'Votre adresse courriel',
    motDePasse: 'Mot de passe',
    motDePasseAide: 'Huit caractères au minimum.',
    inscrire: "Créer mon compte",
    connecter: 'Me connecter',
    oubli: "J'ai oublié mon mot de passe",
    envoyerLien: 'Envoyer le lien de réinitialisation',
    retour: 'Revenir',
    enCours: 'Un instant',
    lienEnvoye:
      "Le lien vient de partir vers votre boîte de réception. Ouvrez-le pour choisir un nouveau mot de passe.",
    erreurs: {
      'auth/email-already-in-use': 'Cette adresse a déjà un compte. Connectez-vous avec.',
      'auth/invalid-email': "Cette adresse ne ressemble pas à une adresse courriel.",
      'auth/weak-password': 'Le mot de passe doit faire au moins huit caractères.',
      'auth/invalid-credential': "L'adresse ou le mot de passe ne correspond pas.",
      'auth/wrong-password': "L'adresse ou le mot de passe ne correspond pas.",
      'auth/user-not-found': "Aucun compte ne porte cette adresse.",
      'auth/too-many-requests': 'Trop de tentatives. Reprenez dans quelques minutes.',
      'auth/popup-closed-by-user': 'La fenêtre de Google a été refermée avant la fin.',
      'auth/network-request-failed': 'La connexion au réseau a échoué. Réessayez.',
      defaut: "La connexion n'a pas abouti. Réessayez dans un moment.",
    } as Record<string, string>,
    champsManquants: 'Il manque votre nom, votre adresse ou votre mot de passe.',
    confidentialite:
      "Votre adresse ne paraît jamais sur le site. Les autres membres voient votre nom, votre municipalité si vous la donnez, et ce que vous écrivez.",
  },
  en: {
    titre: 'Join the network',
    intro:
      'The account lets you post on the wall, join a cell, confirm attendance and receive the daily watch. It serves nothing else, and nothing is sold on.',
    creer: 'Create an account',
    dejaMembre: 'I already have an account',
    avecGoogle: 'Continue with the Google account already open',
    noteGoogleTitre: 'What this button does',
    noteGoogle:
      'This button simply reads the Google account already open in your browser to fill in your name and address. We send nothing to Google, and the Observatory never sees your password.',
    ou: 'or with an email address',
    nom: 'Your name',
    nomAide: 'The name other members will see.',
    courriel: 'Your email address',
    motDePasse: 'Password',
    motDePasseAide: 'Eight characters minimum.',
    inscrire: 'Create my account',
    connecter: 'Sign in',
    oubli: 'I forgot my password',
    envoyerLien: 'Send the reset link',
    retour: 'Back',
    enCours: 'One moment',
    lienEnvoye: 'The link is on its way to your inbox. Open it to choose a new password.',
    erreurs: {
      'auth/email-already-in-use': 'That address already has an account. Sign in with it.',
      'auth/invalid-email': 'That does not look like an email address.',
      'auth/weak-password': 'The password must be at least eight characters.',
      'auth/invalid-credential': 'The address or the password does not match.',
      'auth/wrong-password': 'The address or the password does not match.',
      'auth/user-not-found': 'No account carries that address.',
      'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
      'auth/popup-closed-by-user': "Google's window closed before finishing.",
      'auth/network-request-failed': 'The network request failed. Try again.',
      defaut: 'Sign-in did not go through. Try again shortly.',
    } as Record<string, string>,
    champsManquants: 'Your name, your address or your password is missing.',
    confidentialite:
      'Your address never appears on the site. Other members see your name, your municipality if you give it, and what you write.',
  },
};

const Connexion: React.FC<ConnexionProps> = ({ language, onFerme, enModale = false }) => {
  const { signInWithGoogle } = useAuth();
  const t = language === 'en' ? TEXTES.en : TEXTES.fr;

  const [mode, setMode] = useState<Mode>('choix');
  const [nom, setNom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [avis, setAvis] = useState<string | null>(null);

  const messageErreur = (e: unknown): string => {
    const code = (e as { code?: string })?.code || '';
    return t.erreurs[code] || t.erreurs.defaut;
  };

  const avecGoogle = async () => {
    setErreur(null);
    setEnCours(true);
    try {
      await signInWithGoogle();
      onFerme?.();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(false);
    }
  };

  const inscrire = async () => {
    if (!nom.trim() || !courriel.trim() || motDePasse.length < 8) {
      setErreur(motDePasse.length < 8 && nom.trim() && courriel.trim()
        ? t.erreurs['auth/weak-password']
        : t.champsManquants);
      return;
    }
    setErreur(null);
    setEnCours(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, courriel.trim(), motDePasse);
      await updateProfile(res.user, { displayName: nom.trim().slice(0, 80) });
      onFerme?.();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(false);
    }
  };

  const connecter = async () => {
    if (!courriel.trim() || !motDePasse) {
      setErreur(t.champsManquants);
      return;
    }
    setErreur(null);
    setEnCours(true);
    try {
      await signInWithEmailAndPassword(auth, courriel.trim(), motDePasse);
      onFerme?.();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(false);
    }
  };

  const reinitialiser = async () => {
    if (!courriel.trim()) {
      setErreur(t.champsManquants);
      return;
    }
    setErreur(null);
    setEnCours(true);
    try {
      await sendPasswordResetEmail(auth, courriel.trim());
      setAvis(t.lienEnvoye);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(false);
    }
  };

  const champ = (
    icone: React.ReactNode,
    valeur: string,
    onChange: (v: string) => void,
    etiquette: string,
    type: string,
    aide?: string,
    autoComplete?: string
  ) => (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
        {etiquette}
      </span>
      <span className="relative block">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">{icone}</span>
        <input
          type={type}
          value={valeur}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            if (mode === 'inscription') inscrire();
            else if (mode === 'connexion') connecter();
            else if (mode === 'oubli') reinitialiser();
          }}
          className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500/60 transition-colors"
        />
      </span>
      {aide && <span className="block text-[11px] text-slate-600 mt-1.5">{aide}</span>}
    </label>
  );

  const boutonGoogle = (
    <div className="space-y-3">
      <button
        onClick={avecGoogle}
        disabled={enCours}
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-bold py-3.5 rounded-2xl transition-colors text-sm"
      >
        <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.7-.4-3.9H24v7.1h12.1c-.2 1.8-1.6 4.6-4.5 6.5l6.9 5.3c4.1-3.8 6.6-9.4 6.6-15z" />
          <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.3 15.4 46 24 46z" />
          <path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10z" />
          <path fill="#EA4335" d="M24 10.6c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.500 29.9 2 24 2 15.4 2 8 6.7 4.4 14l7.1 5.5c1.8-5.3 6.7-8.9 12.5-8.9z" />
        </svg>
        {t.avecGoogle}
      </button>

      <div className="flex gap-3 items-start bg-emerald-950/20 border border-emerald-500/15 rounded-2xl p-4">
        <Info size={15} className="text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[12px] text-slate-300 leading-relaxed">
          <span className="font-bold text-emerald-300 block mb-1">{t.noteGoogleTitre}</span>
          {t.noteGoogle}
        </p>
      </div>
    </div>
  );

  const corps = (
    <div className="space-y-6">
      {mode !== 'choix' && (
        <button
          onClick={() => {
            setMode('choix');
            setErreur(null);
            setAvis(null);
          }}
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={13} />
          {t.retour}
        </button>
      )}

      <div>
        <h3 className="text-2xl font-serif font-bold text-white mb-3 leading-tight">{t.titre}</h3>
        <p className="text-slate-400 text-sm font-light leading-relaxed">{t.intro}</p>
      </div>

      {erreur && (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-500/20 rounded-2xl px-4 py-3 leading-relaxed">
          {erreur}
        </p>
      )}
      {avis && (
        <p className="text-sm text-emerald-300 bg-emerald-950/30 border border-emerald-500/20 rounded-2xl px-4 py-3 leading-relaxed">
          {avis}
        </p>
      )}

      {mode === 'choix' && (
        <div className="space-y-5">
          {boutonGoogle}

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] uppercase tracking-widest text-slate-600">{t.ou}</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setMode('inscription')}
              className="py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors"
            >
              {t.creer}
            </button>
            <button
              onClick={() => setMode('connexion')}
              className="py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors"
            >
              {t.dejaMembre}
            </button>
          </div>
        </div>
      )}

      {mode === 'inscription' && (
        <div className="space-y-4">
          {champ(<User size={15} />, nom, setNom, t.nom, 'text', t.nomAide, 'name')}
          {champ(<Mail size={15} />, courriel, setCourriel, t.courriel, 'email', undefined, 'email')}
          {champ(
            <Lock size={15} />,
            motDePasse,
            setMotDePasse,
            t.motDePasse,
            'password',
            t.motDePasseAide,
            'new-password'
          )}
          <button
            onClick={inscrire}
            disabled={enCours}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors"
          >
            {enCours && <Loader size={14} className="animate-spin" />}
            {enCours ? t.enCours : t.inscrire}
          </button>
          <p className="flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed">
            <ShieldCheck size={13} className="shrink-0 mt-0.5 text-slate-700" />
            {t.confidentialite}
          </p>
        </div>
      )}

      {mode === 'connexion' && (
        <div className="space-y-4">
          {champ(<Mail size={15} />, courriel, setCourriel, t.courriel, 'email', undefined, 'email')}
          {champ(
            <Lock size={15} />,
            motDePasse,
            setMotDePasse,
            t.motDePasse,
            'password',
            undefined,
            'current-password'
          )}
          <button
            onClick={connecter}
            disabled={enCours}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors"
          >
            {enCours && <Loader size={14} className="animate-spin" />}
            {enCours ? t.enCours : t.connecter}
          </button>
          <button
            onClick={() => {
              setMode('oubli');
              setErreur(null);
            }}
            className="w-full text-center text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            {t.oubli}
          </button>
        </div>
      )}

      {mode === 'oubli' && (
        <div className="space-y-4">
          {champ(<Mail size={15} />, courriel, setCourriel, t.courriel, 'email', undefined, 'email')}
          <button
            onClick={reinitialiser}
            disabled={enCours}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors"
          >
            {enCours && <Loader size={14} className="animate-spin" />}
            {enCours ? t.enCours : t.envoyerLien}
          </button>
        </div>
      )}
    </div>
  );

  if (!enModale) {
    return (
      <div className="glass-card rounded-3xl border border-white/5 p-6 md:p-8 max-w-lg w-full">
        {corps}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[95] bg-black/85 backdrop-blur-xl overflow-y-auto animate-fade-in">
      <div className="min-h-full flex items-start md:items-center justify-center p-4 py-10">
        <div className="glass-card rounded-3xl border border-white/10 p-6 md:p-8 max-w-lg w-full relative">
          {onFerme && (
            <button
              onClick={onFerme}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
              aria-label={t.retour}
            >
              <X size={17} />
            </button>
          )}
          {corps}
        </div>
      </div>
    </div>
  );
};

export default Connexion;
