import React, { useEffect, useMemo, useState } from 'react';
import { Loader, MapPin, Search, Users, WifiOff, X } from 'lucide-react';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  MembreFiche,
  MUNICIPALITES,
  assurerFicheMembre,
  suivreAnnuaire,
} from '../../services/membresService';
import FicheMembre from './FicheMembre';

const T = {
  fr: {
    titre: 'Annuaire du réseau',
    compteurUn: 'personne dans le réseau',
    compteurPlusieurs: 'personnes dans le réseau',
    recherche: 'Chercher une personne par son nom',
    toutes: 'Toutes les municipalités',
    effacer: 'Effacer les filtres',
    chargement: 'Chargement de l’annuaire',
    videTitre: 'Personne ne correspond',
    videTexte:
      'Votre recherche ne trouve aucune fiche pour le moment. Retirez le filtre de municipalité et la liste complète revient.',
    neufTitre: 'Le réseau commence ici',
    neufTexte:
      'Aucune fiche n’a encore été ouverte. La vôtre apparaîtra dès que vous aurez rempli votre nom et votre municipalité.',
    erreurTitre: 'Annuaire indisponible',
    erreurTexte:
      'La lecture des fiches a échoué. Reconnectez-vous à votre compte et l’annuaire se remplira de nouveau.',
    resultat: 'affichée',
    resultats: 'affichées',
  },
  en: {
    titre: 'Network directory',
    compteurUn: 'person in the network',
    compteurPlusieurs: 'people in the network',
    recherche: 'Search someone by name',
    toutes: 'All municipalities',
    effacer: 'Clear filters',
    chargement: 'Loading the directory',
    videTitre: 'Nobody matches',
    videTexte:
      'Your search finds no profile right now. Remove the municipality filter and the full list comes back.',
    neufTitre: 'The network starts here',
    neufTexte:
      'No profile has been opened yet. Yours will appear as soon as you fill in your name and municipality.',
    erreurTitre: 'Directory unavailable',
    erreurTexte: 'Reading the profiles failed. Sign in again and the directory will fill up once more.',
    resultat: 'shown',
    resultats: 'shown',
  },
};

const textes = (language: Language) => (language === 'fr' ? T.fr : T.en);

const sansAccent = (valeur: string): string =>
  valeur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export interface AnnuaireProps {
  language: Language;
  onOuvrirFiche: (uid: string) => void;
  onEcrire: (uid: string) => void;
  onAllier: (uid: string) => void;
}

const Annuaire: React.FC<AnnuaireProps> = ({ language, onOuvrirFiche, onEcrire, onAllier }) => {
  const t = textes(language);
  const { profile } = useAuth();
  const [fiches, setFiches] = useState<MembreFiche[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [ville, setVille] = useState('');

  useEffect(() => {
    if (!profile) return;
    assurerFicheMembre(profile).catch(() => {
      /* La fiche se créera au prochain passage. */
    });
  }, [profile]);

  useEffect(() => {
    setChargement(true);
    const stop = suivreAnnuaire(
      (recues) => {
        setFiches(recues);
        setErreur(null);
        setChargement(false);
      },
      (message) => {
        setErreur(message);
        setChargement(false);
      },
    );
    return stop;
  }, []);

  const visibles = useMemo(() => {
    const terme = sansAccent(recherche.trim());
    return fiches.filter((fiche) => {
      const parNom = terme.length === 0 || sansAccent(fiche.nom).includes(terme);
      const parVille = ville.length === 0 || fiche.municipalite === ville;
      return parNom && parVille;
    });
  }, [fiches, recherche, ville]);

  const filtreActif = recherche.trim().length > 0 || ville.length > 0;

  return (
    <section className="animate-fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">{t.titre}</p>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl text-white leading-tight">
            {fiches.length} {fiches.length === 1 ? t.compteurUn : t.compteurPlusieurs}
          </h2>
          {filtreActif && (
            <p className="mt-1 text-xs text-slate-500">
              {visibles.length} {visibles.length === 1 ? t.resultat : t.resultats}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder={t.recherche}
              className="w-full sm:w-64 rounded-full bg-black/40 border border-white/10 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 transition-all"
            />
          </div>

          <div className="relative">
            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={ville}
              onChange={(event) => setVille(event.target.value)}
              className="w-full sm:w-56 appearance-none rounded-full bg-black/40 border border-white/10 py-2 pl-9 pr-8 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 transition-all"
            >
              <option value="">{t.toutes}</option>
              {MUNICIPALITES.map((municipalite) => (
                <option key={municipalite} value={municipalite}>
                  {municipalite}
                </option>
              ))}
            </select>
          </div>

          {filtreActif && (
            <button
              type="button"
              onClick={() => {
                setRecherche('');
                setVille('');
              }}
              className="flex items-center justify-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-white hover:border-white/20 transition-all"
            >
              <X size={13} />
              {t.effacer}
            </button>
          )}
        </div>
      </header>

      <div className="mt-8">
        {chargement && (
          <div className="glass-panel rounded-3xl border border-white/5 p-12 flex items-center justify-center gap-3 text-slate-500">
            <Loader size={18} className="animate-spin" />
            <span className="text-sm">{t.chargement}</span>
          </div>
        )}

        {!chargement && erreur && (
          <div className="glass-panel rounded-3xl border border-white/5 p-12 text-center">
            <WifiOff size={32} className="mx-auto text-slate-600" />
            <h3 className="mt-4 font-serif text-xl text-white">{t.erreurTitre}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{t.erreurTexte}</p>
          </div>
        )}

        {!chargement && !erreur && visibles.length === 0 && (
          <div className="glass-panel rounded-3xl border border-white/5 p-12 text-center">
            <Users size={32} className="mx-auto text-slate-600" />
            <h3 className="mt-4 font-serif text-xl text-white">
              {fiches.length === 0 ? t.neufTitre : t.videTitre}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              {fiches.length === 0 ? t.neufTexte : t.videTexte}
            </p>
          </div>
        )}

        {!chargement && !erreur && visibles.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibles.map((fiche) => (
              <FicheMembre
                key={fiche.uid}
                uid={fiche.uid}
                fiche={fiche}
                language={language}
                mode="plein"
                onOuvrir={onOuvrirFiche}
                onEcrire={onEcrire}
                onAllier={onAllier}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Annuaire;
