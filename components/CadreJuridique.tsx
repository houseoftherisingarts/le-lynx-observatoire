import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ClipboardList,
  Compass,
  ExternalLink,
  Feather,
  FileText,
  Gavel,
  Inbox,
  Landmark,
  Scale,
} from 'lucide-react';
import type { Language } from '../types';
import {
  CategorieJuridique,
  ORDRE_CATEGORIES,
  PieceJuridique,
  dateLisible,
  libelleCategorie,
  suivreCadreJuridique,
  texte,
  tonCategorie,
} from '../services/juridiqueService';

interface CadreJuridiqueProps {
  language: Language;
  isAdmin?: boolean;
}

const ICONES: Record<CategorieJuridique, React.ComponentType<{ size?: number; className?: string }>> = {
  loi: Landmark,
  reglement: FileText,
  procedure: ClipboardList,
  'droit-autochtone': Feather,
  recours: Gavel,
};

const titrePage = (language: Language): string => {
  if (language === 'fr') return 'Cadre juridique';
  if (language === 'ani') return 'Dibaakonigewin';
  return 'Legal framework';
};

const OUVERTURE = {
  etiquette: { fr: 'Où en est le dossier', en: 'Where the file stands' },
  titre: {
    fr: "Rien n'est encore devant un juge",
    en: 'Nothing is before a judge yet',
  },
  corps: {
    fr: "Au 1er septembre 2026, il n'existe aucun dossier La Loutre au BAPE ni au Registre des évaluations environnementales, et le processus provincial d'autorisation n'est donc pas commencé. Cela veut dire qu'il n'y a rien à contester devant un tribunal aujourd'hui, et que la partie se joue devant le conseil de la MRC de Papineau, devant les conseils municipaux et devant les actionnaires de la minière. Les pièces qui suivent servent à savoir sur quel levier appuyer, et à quel moment.",
    en: 'As of September 1, 2026, there is no La Loutre file at the BAPE or in the Environmental Assessment Registry, so the provincial authorization process has not begun. That means there is nothing to challenge in court today, and that the fight is being decided by the council of the MRC de Papineau, by the municipal councils and by the mining company’s shareholders. The pieces below are here so you know which lever to push, and when.',
  },
};

const ETIQUETTES = {
  sousTitre: {
    fr: 'Les lois, les règlements et les procédures qui décident de La Loutre.',
    en: 'The statutes, regulations and procedures that decide La Loutre.',
  },
  effet: { fr: 'Ce que ça change pour nous', en: 'What this changes for us' },
  lire: { fr: 'Lire le texte officiel', en: 'Read the official text' },
  chargement: { fr: 'Chargement du cadre juridique', en: 'Loading the legal framework' },
  erreur: {
    fr: "La connexion à la base a échoué. Voici le socle de référence vérifié le 1er septembre 2026, il reste exact même hors ligne.",
    en: 'The database connection failed. Here is the reference set verified on September 1, 2026, still accurate offline.',
  },
  vide: {
    fr: "Aucune pièce juridique n'est publiée pour l'instant.",
    en: 'No legal reference has been published yet.',
  },
  verifie: { fr: 'Vérifié le', en: 'Verified on' },
  socle: {
    fr: 'Socle de référence local, rien de publié dans la base',
    en: 'Local reference set, nothing published in the database',
  },
};

const Pastille: React.FC<{ categorie: CategorieJuridique; language: Language }> = ({
  categorie,
  language,
}) => {
  const Icone = ICONES[categorie] ?? Landmark;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${tonCategorie(
        categorie
      )}`}
    >
      <Icone size={12} />
      {libelleCategorie(categorie, language)}
    </span>
  );
};

const Carte: React.FC<{ piece: PieceJuridique; language: Language; isAdmin: boolean }> = ({
  piece,
  language,
  isAdmin,
}) => (
  <article className="glass-card flex flex-col gap-4 rounded-2xl border border-white/5 p-6 transition-colors duration-300 hover:border-white/10">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <Pastille categorie={piece.categorie} language={language} />
      {texte(piece.statut, language) && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {texte(piece.statut, language)}
        </span>
      )}
    </div>

    <div className="space-y-2">
      <h3 className="text-lg font-bold leading-snug text-white">{texte(piece.titre, language)}</h3>
      {piece.source && (
        <p className="font-mono text-[11px] leading-relaxed text-slate-500 break-words">
          {piece.source}
        </p>
      )}
    </div>

    {texte(piece.resume, language) && (
      <p className="text-sm leading-relaxed text-slate-400">{texte(piece.resume, language)}</p>
    )}

    {texte(piece.ceQueCaChange, language) && (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          {texte(ETIQUETTES.effet, language)}
        </p>
        <p className="text-sm leading-relaxed text-slate-300">
          {texte(piece.ceQueCaChange, language)}
        </p>
      </div>
    )}

    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-4">
      <a
        href={piece.url}
        target="_blank"
        rel="noreferrer"
        className="group inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-emerald-400"
      >
        {texte(ETIQUETTES.lire, language)}
        <ExternalLink size={14} className="text-slate-600 transition-colors group-hover:text-emerald-400" />
      </a>
      {piece.majLe && (
        <span className="text-[10px] uppercase tracking-widest text-slate-600">
          {texte(ETIQUETTES.verifie, language)} {dateLisible(piece.majLe, language)}
        </span>
      )}
    </div>

    {isAdmin && (
      <p className="font-mono text-[10px] text-slate-600 break-all">
        resources/{piece.id} · {piece.categorie}
      </p>
    )}
  </article>
);

export const CadreJuridique: React.FC<CadreJuridiqueProps> = ({ language, isAdmin = false }) => {
  const [pieces, setPieces] = useState<PieceJuridique[]>([]);
  const [local, setLocal] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    const stop = suivreCadreJuridique(
      (snapshot) => {
        setPieces(snapshot.pieces);
        setLocal(snapshot.local);
        setChargement(false);
      },
      () => {
        setErreur(true);
        setChargement(false);
      }
    );
    return () => stop();
  }, []);

  const groupes = useMemo(
    () =>
      ORDRE_CATEGORIES.map((categorie) => ({
        categorie,
        nombre: pieces.filter((p) => p.categorie === categorie).length,
      })).filter((g) => g.nombre > 0),
    [pieces]
  );

  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-in space-y-10 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="w-fit rounded-2xl border border-emerald-500/20 bg-emerald-900/20 p-4 text-emerald-400">
          <Scale size={30} />
        </div>
        <div className="min-w-0">
          <h2 className="font-serif text-3xl font-semibold leading-tight text-white sm:text-4xl">
            {titrePage(language)}
          </h2>
          <p className="mt-1 text-sm font-light text-slate-400">
            {texte(ETIQUETTES.sousTitre, language)}
          </p>
        </div>
      </header>

      <section className="glass-panel rounded-3xl border border-white/5 p-6 sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          {texte(OUVERTURE.etiquette, language)}
        </p>
        <h3 className="mt-3 font-serif text-2xl leading-snug text-white sm:text-3xl">
          {texte(OUVERTURE.titre, language)}
        </h3>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
          {texte(OUVERTURE.corps, language)}
        </p>
        {groupes.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {groupes.map((g) => (
              <span
                key={g.categorie}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${tonCategorie(
                  g.categorie
                )}`}
              >
                {libelleCategorie(g.categorie, language)}
                <span className="text-slate-400">{g.nombre}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {erreur && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 text-sm text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <p className="leading-relaxed">{texte(ETIQUETTES.erreur, language)}</p>
        </div>
      )}

      {!erreur && local && isAdmin && (
        <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-sm text-slate-400">
          <Compass size={18} className="mt-0.5 shrink-0 text-slate-500" />
          <p className="leading-relaxed">{texte(ETIQUETTES.socle, language)}</p>
        </div>
      )}

      {chargement ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card h-64 animate-pulse rounded-2xl border border-white/5"
              aria-hidden="true"
            />
          ))}
          <p className="sr-only">{texte(ETIQUETTES.chargement, language)}</p>
        </div>
      ) : pieces.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <Inbox size={28} className="text-slate-600" />
          <p className="text-sm text-slate-500">{texte(ETIQUETTES.vide, language)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {pieces.map((piece) => (
            <Carte key={piece.id} piece={piece} language={language} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CadreJuridique;
