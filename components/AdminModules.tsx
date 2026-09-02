import React, { useEffect, useState } from 'react';
import { Language } from '../types';
import { useAuth } from '../context/AuthContext';
import Connexion from './social/Connexion';
import {
  CleModule,
  DESCRIPTIONS,
  EtatModules,
  MODULES_PAR_DEFAUT,
  NOMS,
  basculerModule,
  suivreModules,
} from '../services/modulesService';
import { PanneauDirect } from './social/DirectEnCours';
import { SlidersHorizontal, Lock, Loader } from 'lucide-react';

/**
 * Page /admin. Les interrupteurs décident de ce que le réseau montre.
 * Un module éteint disparaît de l'interface sans que ses données bougent.
 */

const ORDRE: CleModule[] = ['cellules', 'galerie', 'badges', 'engagement', 'soutien', 'moderation', 'finances'];

const TEXTES = {
  fr: {
    surtitre: 'Administration',
    titre: 'Ce que le réseau montre',
    intro:
      "Chaque interrupteur allume ou éteint un module pour tout le monde. Éteindre un module le retire de l'interface et laisse ses données intactes, donc le geste se reprend à tout moment.",
    refuseTitre: 'Cette page appartient à l\'administration',
    refuseTexte:
      "Connectez-vous avec le compte inscrit au registre de l'Observatoire. Les autres comptes ne voient pas cet écran.",
    allume: 'Allumé',
    eteint: 'Éteint',
    chargement: 'Nous lisons les réglages.',
    erreur: "Le réglage n'a pas été enregistré. Réessayez dans un moment.",
    connecteComme: 'Connecté comme',
    direct: 'Direct en cours',
  },
  en: {
    surtitre: 'Administration',
    titre: 'What the network shows',
    intro:
      'Each switch turns a module on or off for everyone. Turning one off removes it from the interface and leaves its data untouched, so the move can be undone at any time.',
    refuseTitre: 'This page belongs to the administration',
    refuseTexte:
      'Sign in with the account recorded in the Observatory registry. Other accounts do not see this screen.',
    allume: 'On',
    eteint: 'Off',
    chargement: 'Reading the settings.',
    erreur: 'The setting was not saved. Try again shortly.',
    connecteComme: 'Signed in as',
    direct: 'Live now',
  },
};

interface AdminModulesProps {
  language: Language;
}

const AdminModules: React.FC<AdminModulesProps> = ({ language }) => {
  const { profile, loading } = useAuth();
  const t = language === 'en' ? TEXTES.en : TEXTES.fr;
  const langue = language === 'en' ? 'en' : 'fr';

  const [etat, setEtat] = useState<EtatModules>(MODULES_PAR_DEFAUT);
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<CleModule | null>(null);

  useEffect(() => {
    const arreter = suivreModules(
      (e) => {
        setEtat(e);
        setPret(true);
      },
      () => setPret(true)
    );
    return arreter;
  }, []);

  const basculer = async (cle: CleModule) => {
    setErreur(null);
    setEnCours(cle);
    const cible = !etat[cle];
    setEtat((e) => ({ ...e, [cle]: cible }));
    try {
      await basculerModule(cle, cible);
    } catch {
      setEtat((e) => ({ ...e, [cle]: !cible }));
      setErreur(t.erreur);
    } finally {
      setEnCours(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <Loader className="mx-auto text-emerald-500 animate-spin mb-3" size={22} />
        <p className="text-slate-400 text-sm font-light">{t.chargement}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto py-16 flex justify-center animate-fade-in">
        <Connexion language={language} />
      </div>
    );
  }

  if (profile.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto py-24 animate-fade-in">
        <div className="glass-card rounded-3xl border border-white/5 p-8 text-center">
          <Lock className="mx-auto text-slate-600 mb-4" size={24} />
          <h2 className="text-xl font-bold text-white mb-3">{t.refuseTitre}</h2>
          <p className="text-slate-400 text-sm font-light leading-relaxed">{t.refuseTexte}</p>
          <p className="text-[11px] text-slate-600 mt-5 font-mono">
            {t.connecteComme} {profile.email}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-fade-in space-y-8">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3">
          {t.surtitre}
        </p>
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4 leading-tight flex items-center gap-3">
          <SlidersHorizontal className="text-emerald-500 shrink-0" size={26} />
          {t.titre}
        </h2>
        <p className="text-slate-400 font-light leading-relaxed max-w-2xl">{t.intro}</p>
        <p className="text-[11px] text-slate-600 mt-3 font-mono">
          {t.connecteComme} {profile.email}
        </p>
      </header>

      {erreur && (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-500/20 rounded-2xl px-4 py-3">
          {erreur}
        </p>
      )}

      <div className="space-y-3">
        {ORDRE.map((cle) => {
          const actif = etat[cle];
          return (
            <div
              key={cle}
              className="glass-card rounded-2xl border border-white/5 hover:border-white/10 transition-all p-5 flex items-start justify-between gap-5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <h3 className="text-white font-bold text-sm">{NOMS[cle][langue]}</h3>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      actif
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                        : 'bg-slate-800/60 text-slate-500 border-slate-700/50'
                    }`}
                  >
                    {actif ? t.allume : t.eteint}
                  </span>
                </div>
                <p className="text-slate-400 text-xs font-light leading-relaxed">
                  {DESCRIPTIONS[cle][langue]}
                </p>
              </div>

              <button
                onClick={() => basculer(cle)}
                disabled={!pret || enCours === cle}
                aria-label={NOMS[cle][langue]}
                aria-pressed={actif}
                className={`shrink-0 w-14 h-7 rounded-full p-1 transition-colors duration-300 disabled:opacity-50 ${
                  actif ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                    actif ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {etat.moderation && (
        <section className="pt-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
            {t.direct}
          </h3>
          <PanneauDirect language={language} />
        </section>
      )}
    </div>
  );
};

export default AdminModules;
