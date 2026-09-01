import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, X, Loader2, Send, Megaphone, LogIn, AlertTriangle } from 'lucide-react';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { avatarTone } from '../../services/socialService';
import BilletMur from './BilletMur';
import {
  BilletMur as Billet,
  FIL_PAR_DEFAUT,
  LONGUEUR_MAX_BILLET,
  MesVotes,
  publierSurLeMur,
  suivreLeMur,
  suivreMesVotes,
  televerserPhotoMur,
} from '../../services/murService';

const SEUIL_COMPTEUR = 3800;

const T = {
  fr: {
    etiquette: 'La place publique',
    invite: 'Racontez ce que vous voyez sur le terrain',
    publier: 'Publier',
    photo: 'Ajouter une photo',
    retirerPhoto: 'Retirer la photo',
    connexion: 'Connectez-vous pour prendre la parole',
    connexionTexte:
      'Votre compte relie votre nom à vos publications et vous donne le droit de vote sur les billets du mur.',
    seConnecter: 'Se connecter',
    videTitre: 'Le mur attend sa première voix',
    videTexte1: 'Aucun billet n’a encore été publié dans ce fil.',
    videTexte2: 'Le vôtre ouvrira la conversation et restera en haut le temps qu’il fasse réagir.',
    erreurTitre: 'Le mur ne se charge pas',
    erreurTexte:
      'La connexion à la base a échoué. Rechargez la page dans un instant, les billets reviendront.',
    erreurPublication: 'La publication a échoué. Réessayez dans un instant.',
    erreurPhoto: 'Cette image n’a pas pu être téléversée.',
  },
  en: {
    etiquette: 'The public square',
    invite: 'Tell us what you are seeing on the ground',
    publier: 'Post',
    photo: 'Add a photo',
    retirerPhoto: 'Remove the photo',
    connexion: 'Sign in to speak up',
    connexionTexte:
      'Your account ties your name to what you publish and gives you a vote on every post on the wall.',
    seConnecter: 'Sign in',
    videTitre: 'The wall is waiting for its first voice',
    videTexte1: 'No post has been published in this thread yet.',
    videTexte2: 'Yours will open the conversation and stay on top for as long as it draws replies.',
    erreurTitre: 'The wall is not loading',
    erreurTexte:
      'The connection to the database failed. Reload the page in a moment and the posts will come back.',
    erreurPublication: 'Publishing failed. Try again in a moment.',
    erreurPhoto: 'This image could not be uploaded.',
  },
};

export interface MurProps {
  language: Language;
  fil?: string;
  isAdmin?: boolean;
  onSignIn?: () => Promise<void> | void;
}

const Mur: React.FC<MurProps> = ({ language, fil = FIL_PAR_DEFAUT, isAdmin = false, onSignIn }) => {
  const t = T[language === 'fr' ? 'fr' : 'en'];
  const { profile } = useAuth();

  const [billets, setBillets] = useState<Billet[]>([]);
  const [mesVotes, setMesVotes] = useState<MesVotes>({});
  const [chargement, setChargement] = useState(true);
  const [erreurMur, setErreurMur] = useState(false);

  const [texte, setTexte] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [publication, setPublication] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);

  const zoneTexte = useRef<HTMLTextAreaElement>(null);
  const champFichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setChargement(true);
    setErreurMur(false);
    const desabonner = suivreLeMur(
      fil,
      (liste) => {
        setBillets(liste);
        setChargement(false);
      },
      100,
      () => {
        setErreurMur(true);
        setChargement(false);
      }
    );
    return () => desabonner();
  }, [fil]);

  useEffect(() => {
    if (!profile) {
      setMesVotes({});
      return;
    }
    const desabonner = suivreMesVotes(profile.uid, setMesVotes, () => setMesVotes({}));
    return () => desabonner();
  }, [profile?.uid]);

  useEffect(() => {
    if (!fichier) {
      setApercu(null);
      return;
    }
    const url = URL.createObjectURL(fichier);
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [fichier]);

  const restants = useMemo(() => LONGUEUR_MAX_BILLET - texte.length, [texte]);

  const ajusterHauteur = () => {
    const el = zoneTexte.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  };

  const retirerPhoto = () => {
    setFichier(null);
    if (champFichier.current) champFichier.current.value = '';
  };

  const publier = async () => {
    if (!profile || publication) return;
    if (!texte.trim() && !fichier) return;
    setPublication(true);
    setErreurEnvoi(null);
    try {
      let photoUrl: string | undefined;
      if (fichier) {
        try {
          photoUrl = await televerserPhotoMur(profile.uid, fichier);
        } catch {
          setErreurEnvoi(t.erreurPhoto);
          setPublication(false);
          return;
        }
      }
      await publierSurLeMur({
        uid: profile.uid,
        nom: profile.displayName,
        avatarUrl: profile.photoURL,
        texte,
        photoUrl,
        fil,
        officiel: isAdmin,
      });
      setTexte('');
      retirerPhoto();
      if (zoneTexte.current) zoneTexte.current.style.height = 'auto';
    } catch {
      setErreurEnvoi(t.erreurPublication);
    } finally {
      setPublication(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Composeur */}
      {profile ? (
        <div className="glass-panel glass-card rounded-3xl border border-white/5 p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 mb-4">
            {t.etiquette}
          </p>
          <div className="flex gap-3">
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div
                className={`w-10 h-10 rounded-full ${avatarTone(profile.uid)} flex items-center justify-center text-white font-bold shrink-0`}
              >
                {(profile.displayName || '?').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <textarea
                ref={zoneTexte}
                value={texte}
                rows={2}
                onChange={(e) => {
                  setTexte(e.target.value.slice(0, LONGUEUR_MAX_BILLET));
                  ajusterHauteur();
                }}
                placeholder={t.invite}
                className="w-full bg-transparent resize-none text-slate-200 placeholder-slate-600 text-[15px] leading-relaxed outline-none"
              />

              {apercu && (
                <div className="relative mt-3 inline-block">
                  <img
                    src={apercu}
                    alt=""
                    className="max-h-64 rounded-2xl border border-white/5 object-cover"
                  />
                  <button
                    type="button"
                    onClick={retirerPhoto}
                    aria-label={t.retirerPhoto}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-slate-200 hover:text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {erreurEnvoi && (
                <p className="mt-3 text-xs text-amber-400">{erreurEnvoi}</p>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    ref={champFichier}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => champFichier.current?.click()}
                    aria-label={t.photo}
                    className="p-2 rounded-full text-slate-400 hover:text-emerald-300 hover:bg-white/5 transition-all"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  {texte.length >= SEUIL_COMPTEUR && (
                    <span className="text-xs tabular-nums text-amber-400">{restants}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={publier}
                  disabled={publication || (!texte.trim() && !fichier)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 text-[#02040a] text-sm font-bold hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 transition-all"
                >
                  {publication ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {t.publier}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel glass-card rounded-3xl border border-white/5 p-6 text-center">
          <h3 className="font-serif text-xl text-white">{t.connexion}</h3>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            {t.connexionTexte}
          </p>
          {onSignIn && (
            <button
              type="button"
              onClick={() => onSignIn()}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 text-[#02040a] text-sm font-bold hover:bg-emerald-400 transition-all"
            >
              <LogIn className="w-4 h-4" />
              {t.seConnecter}
            </button>
          )}
        </div>
      )}

      {/* Liste */}
      {erreurMur ? (
        <div className="glass-card rounded-3xl border border-white/5 p-10 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
          <h3 className="mt-4 font-serif text-xl text-white">{t.erreurTitre}</h3>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            {t.erreurTexte}
          </p>
        </div>
      ) : chargement ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
        </div>
      ) : billets.length === 0 ? (
        <div className="glass-card rounded-3xl border border-white/5 p-10 text-center">
          <Megaphone className="w-8 h-8 mx-auto text-slate-600" />
          <h3 className="mt-4 font-serif text-xl text-white">{t.videTitre}</h3>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            {t.videTexte1} {t.videTexte2}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {billets.map((billet) => (
            <BilletMur
              key={billet.id}
              billet={billet}
              language={language}
              monVote={mesVotes[billet.id] ?? 0}
              moiUid={profile?.uid ?? null}
              monNom={profile?.displayName ?? ''}
              monAvatar={profile?.photoURL ?? ''}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Mur;
