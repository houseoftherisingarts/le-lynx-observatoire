// L'ecran de bienvenue du Lynx, porte de l'Alliance alimentaire le 14 septembre 2026.
//
// La lettre d'invitation envoyee a chaque municipalite, a chaque groupe et a Kitigan Zibi porte un
// lien nomme : `lelynx.ca/?bonjour=Aaron`. La personne arrive alors sur son prenom en grand, puis
// choisit entre la visite guidee et l'entree directe. Sans prenom dans l'adresse, l'ecran ne joue
// pas du tout : le site public reste sobre pour qui arrive de lui-meme.
//
// La matiere est le foil iriseVexel (`.feuille-foil`, `.texte-irise`), mais l'ecran ne porte aucun
// logo de studio : Le Lynx est une plateforme citoyenne, pas une demo commerciale.
//
// `?sansBienvenue=1` le coupe pour les captures de la boucle verdict.
import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_PRENOM = 40;

/** Le prenom lu dans l'adresse, nettoye. Chaine vide si l'invitation n'en porte pas. */
export const prenomInvite = (): string => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('sansBienvenue')) return '';
    const brut = (params.get('bonjour') || params.get('bienvenue') || '').trim();
    return brut.replace(/[^\p{L}\p{M}' -]/gu, '').slice(0, MAX_PRENOM);
  } catch {
    return '';
  }
};

interface Props {
  prenom: string;
  onVisite: () => void;
  onEntrer: () => void;
}

const EcranBienvenue: React.FC<Props> = ({ prenom, onVisite, onEntrer }) => {
  const sansMouvement = useReducedMotion();
  const [acte, setActe] = useState(sansMouvement ? 2 : 0);
  const [passage, setPassage] = useState(false);

  /** Le flash irise part d'abord, la visite s'ouvre derriere lui. */
  const ouvrirLaVisite = () => {
    if (sansMouvement) {
      onVisite();
      return;
    }
    setPassage(true);
    window.setTimeout(onVisite, 620);
  };

  useEffect(() => {
    if (sansMouvement) return;
    const a = window.setTimeout(() => setActe(1), 1450);
    const b = window.setTimeout(() => setActe(2), 2450);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [sansMouvement]);

  // Le defilement reste bloque tant que la porte n'est pas franchie.
  useEffect(() => {
    const precedent = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = precedent;
    };
  }, []);

  const lettres = 'Bienvenue'.split('');

  return (
    <motion.div
      className="feuille-foil fixed inset-0 z-[900] flex flex-col items-center justify-center overflow-hidden px-6 text-center"
      initial={{ opacity: 1 }}
      animate={passage ? { scale: 1.12, filter: 'brightness(1.3)' } : { scale: 1, filter: 'brightness(1)' }}
      exit={{ opacity: 0, scale: 1.18, filter: 'blur(10px)' }}
      transition={{ duration: passage ? 0.62 : 0.8, ease: EASE }}
      role="dialog"
      aria-modal="true"
      aria-label={`Bienvenue ${prenom}`}
    >
      <div aria-hidden className="feuille-foil-voile" />
      <div aria-hidden className="feuille-foil-voile-2" />

      {passage && (
        <motion.div
          aria-hidden
          className="flash-irise pointer-events-none absolute left-1/2 top-1/2 z-10 h-[150vmax] w-[150vmax] rounded-full"
          initial={{ scale: 0.04, opacity: 0, x: '-50%', y: '-50%' }}
          animate={{ scale: 1, opacity: [0, 0.95, 0.75], x: '-50%', y: '-50%' }}
          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      <div className="relative z-[1] flex w-full max-w-4xl flex-col items-center">
        <motion.p
          className="text-[0.8125rem] font-bold uppercase leading-none tracking-[0.22em] text-white/70"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: acte >= 1 ? 1 : 0, y: acte >= 1 ? 0 : 8 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          Le Lynx · Observatoire citoyen
        </motion.p>

        <motion.h1
          className="texte-irise mt-8 flex flex-wrap justify-center font-serif leading-none tracking-[-0.02em]"
          animate={{
            fontSize: acte >= 1 ? 'clamp(1.5rem, 1rem + 1.8vw, 2.3rem)' : 'clamp(2.8rem, 1.4rem + 6vw, 7rem)',
          }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          {lettres.map((lettre, i) => (
            <motion.span
              key={`${lettre}-${i}`}
              initial={sansMouvement ? false : { opacity: 0, y: 26, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, delay: sansMouvement ? 0 : 0.18 + i * 0.075, ease: EASE }}
            >
              {lettre}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          className="texte-irise mt-3 font-serif leading-none tracking-[-0.03em]"
          style={{ fontSize: 'clamp(3rem, 1.4rem + 7vw, 8rem)' }}
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{
            opacity: acte >= 1 ? 1 : 0,
            y: acte >= 1 ? 0 : 30,
            filter: acte >= 1 ? 'blur(0px)' : 'blur(10px)',
          }}
          transition={{ duration: 1, ease: EASE }}
        >
          {prenom}
        </motion.p>

        <motion.div
          className="mt-10 flex w-full flex-col items-center gap-7"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: acte >= 2 ? 1 : 0, y: acte >= 2 ? 0 : 24 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
          style={{ pointerEvents: acte >= 2 ? 'auto' : 'none' }}
        >
          <p className="max-w-[46ch] text-[1.0625rem] leading-relaxed text-white/80">
            Voici l’observatoire citoyen du dossier La Loutre. Nous pouvons en faire le tour
            ensemble, section par section, si le cœur vous en dit.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={ouvrirLaVisite}
              className="bouton-irise min-h-[52px] rounded-full px-8 text-sm font-bold uppercase tracking-[0.1em] transition-transform duration-200 hover:scale-[1.03]"
            >
              Faire la visite
            </button>
            <button
              type="button"
              onClick={onEntrer}
              className="min-h-[52px] rounded-full border border-white/25 px-8 text-sm font-medium text-white/80 transition-colors hover:border-white/70 hover:text-white"
            >
              Entrer directement
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EcranBienvenue;
