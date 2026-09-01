import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  ExternalLink,
  Feather,
  Landmark,
  Mountain,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Language } from '../types';
import {
  CategorieJalon,
  Jalon,
  JALONS_DE_DEPART,
  formaterDate,
  suivreChronologie,
  trierJalons,
} from '../services/chronologieService';

interface ArchiveTimelineProps {
  language: Language;
}

type IconeCategorie = React.ComponentType<{ size?: number; className?: string }>;

interface StyleCategorie {
  pastille: string;
  point: string;
  icone: string;
  Icone: IconeCategorie;
}

/** Une couleur par famille de jalon. L'emerald reste l'accent de la page, il est reserve a la mobilisation. */
const STYLES: Record<CategorieJalon, StyleCategorie> = {
  projet: {
    pastille: 'bg-red-950/40 text-red-300 border-red-800/50',
    point: 'bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.55)]',
    icone: 'text-red-400',
    Icone: Mountain,
  },
  municipal: {
    pastille: 'bg-sky-950/40 text-sky-300 border-sky-800/50',
    point: 'bg-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.5)]',
    icone: 'text-sky-400',
    Icone: Building2,
  },
  gouvernement: {
    pastille: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
    point: 'bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.5)]',
    icone: 'text-amber-400',
    Icone: Landmark,
  },
  mobilisation: {
    pastille: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50',
    point: 'bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.6)]',
    icone: 'text-emerald-400',
    Icone: Users,
  },
  autochtone: {
    pastille: 'bg-violet-950/40 text-violet-300 border-violet-800/50',
    point: 'bg-violet-400 shadow-[0_0_14px_rgba(167,139,250,0.5)]',
    icone: 'text-violet-400',
    Icone: Feather,
  },
  precedent: {
    pastille: 'bg-slate-800/60 text-slate-300 border-slate-600/50',
    point: 'bg-slate-400 shadow-[0_0_12px_rgba(148,163,184,0.4)]',
    icone: 'text-slate-400',
    Icone: Scale,
  },
};

const TRADUCTIONS = {
  fr: {
    etiquette: 'Ligne du temps',
    titre: 'Le dossier La Loutre, jalon par jalon',
    intro:
      "Chaque jalon porte sa source et son lien vers le document d'origine. La mention de vérification n'apparaît que sur les faits dont la source a été ouverte et lue. Ce qui ne repose que sur un seul récit reste marqué comme à confirmer.",
    compte: (n: number) => (n > 1 ? `${n} jalons au dossier` : `${n} jalon au dossier`),
    tout: 'Tout',
    categories: {
      projet: 'Le projet minier',
      municipal: 'Municipal',
      gouvernement: 'Gouvernement',
      mobilisation: 'Mobilisation',
      autochtone: 'Position anishinabe',
      precedent: 'Précédent',
    } as Record<CategorieJalon, string>,
    verifie: 'Source consultée le 1er septembre 2026',
    aConfirmer: "Ce fait reste à confirmer auprès d'une source officielle.",
    consulter: 'Consulter la source',
    vide: 'Aucun jalon dans cette catégorie pour le moment.',
    videTout: "La chronologie est vide. Elle se remplira dès qu'un jalon sera versé au dossier.",
    erreur:
      "La connexion à la base de données n'a pas répondu. La chronologie affichée ci-dessous vient de la copie locale du site, elle peut avoir quelques jours de retard.",
    chargement: 'Lecture de la chronologie',
    precedentsTitre: "Ce que d'autres régions ont déjà obtenu",
    precedentsIntro: (n: number) =>
      `${n} dossiers québécois où un gouvernement, un tribunal ou une municipalité a fait reculer un projet industriel. Ils ne racontent pas La Loutre. Ils montrent quels leviers ont déjà tenu devant les tribunaux et devant l'État, et ce que chacun a coûté.`,
  },
  en: {
    etiquette: 'Timeline',
    titre: 'The La Loutre file, milestone by milestone',
    intro:
      'Every milestone carries its source and a link to the original document. The verification note appears only on facts whose source was opened and read. Anything resting on a single account stays marked as unconfirmed.',
    compte: (n: number) => (n > 1 ? `${n} milestones on file` : `${n} milestone on file`),
    tout: 'All',
    categories: {
      projet: 'The mining project',
      municipal: 'Municipal',
      gouvernement: 'Government',
      mobilisation: 'Mobilization',
      autochtone: 'Anishinabe position',
      precedent: 'Precedent',
    } as Record<CategorieJalon, string>,
    verifie: 'Source consulted on September 1, 2026',
    aConfirmer: 'This fact still needs confirmation from an official source.',
    consulter: 'Open the source',
    vide: 'No milestone in this category yet.',
    videTout: 'The timeline is empty. It will fill in as soon as a milestone is added to the file.',
    erreur:
      'The database did not answer. The timeline below comes from the local copy of the site and may be a few days behind.',
    chargement: 'Reading the timeline',
    precedentsTitre: 'What other regions have already won',
    precedentsIntro: (n: number) =>
      `${n} Quebec files where a government, a court or a municipality pushed an industrial project back. They do not tell the story of La Loutre. They show which levers have already held up in court and before the state, and what each one cost.`,
  },
};

const CarteJalon: React.FC<{ jalon: Jalon; t: typeof TRADUCTIONS.fr; francais: boolean; delai: number }> = ({
  jalon,
  t,
  francais,
  delai,
}) => {
  const style = STYLES[jalon.categorie];
  const Icone = style.Icone;

  return (
    <article
      className="relative pl-8 sm:pl-12 animate-fade-in opacity-0"
      style={{ animationDelay: `${delai}ms` }}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 top-7 h-3.5 w-3.5 rounded-full ring-4 ring-[#02040a] ${style.point}`}
      />
      <div className="glass-card rounded-2xl border border-white/5 p-5 transition-colors duration-300 hover:border-white/10 sm:p-7">
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <time className="font-mono text-xs tracking-tight text-slate-400" dateTime={jalon.date}>
            {formaterDate(jalon.date, francais)}
          </time>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${style.pastille}`}
          >
            <Icone size={11} className={style.icone} />
            {t.categories[jalon.categorie]}
          </span>
        </div>

        <h3
          className="mb-3 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-100 sm:text-lg"
          title={jalon.titre}
        >
          {jalon.titre}
        </h3>

        <p className="text-sm font-light leading-relaxed text-slate-400">{jalon.recit}</p>

        <div className="mt-5 flex flex-col gap-3 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={jalon.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-emerald-300"
          >
            <span className="truncate">{jalon.source}</span>
            <ExternalLink size={11} className="shrink-0" />
            <span className="sr-only">{t.consulter}</span>
          </a>

          {jalon.verifie ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">
              <ShieldCheck size={12} />
              {t.verifie}
            </span>
          ) : (
            <span className="inline-flex items-start gap-1.5 text-[10px] font-medium normal-case leading-relaxed tracking-wide text-amber-400/80">
              <AlertTriangle size={12} className="mt-px shrink-0" />
              {t.aConfirmer}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

const Squelette: React.FC = () => (
  <div className="space-y-6" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <div key={i} className="relative pl-8 sm:pl-12">
        <span className="absolute left-0 top-7 h-3.5 w-3.5 rounded-full bg-white/10 ring-4 ring-[#02040a]" />
        <div className="glass-card animate-pulse rounded-2xl border border-white/5 p-5 sm:p-7">
          <div className="mb-4 h-3 w-32 rounded bg-white/10" />
          <div className="mb-3 h-4 w-3/4 rounded bg-white/10" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-white/5" />
            <div className="h-3 w-11/12 rounded bg-white/5" />
            <div className="h-3 w-2/3 rounded bg-white/5" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const ArchiveTimeline: React.FC<ArchiveTimelineProps> = ({ language }) => {
  const francais = language === 'fr';
  const t = francais ? TRADUCTIONS.fr : TRADUCTIONS.en;

  const [distants, setDistants] = useState<Jalon[] | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [filtre, setFiltre] = useState<CategorieJalon | 'tout'>('tout');

  useEffect(() => {
    const desabonner = suivreChronologie(
      (liste) => {
        setDistants(liste);
        setErreur(false);
        setChargement(false);
      },
      () => {
        setErreur(true);
        setChargement(false);
      }
    );
    return desabonner;
  }, []);

  /** La collection Firestore prime. Tant qu'elle est vide ou muette, la copie locale tient l'ecran. */
  const jalons = useMemo(
    () => trierJalons(distants && distants.length > 0 ? distants : JALONS_DE_DEPART),
    [distants]
  );

  const dossier = useMemo(() => jalons.filter((j) => j.categorie !== 'precedent'), [jalons]);
  const precedents = useMemo(() => jalons.filter((j) => j.categorie === 'precedent'), [jalons]);

  const comptes = useMemo(() => {
    const total: Partial<Record<CategorieJalon, number>> = {};
    dossier.forEach((j) => {
      total[j.categorie] = (total[j.categorie] ?? 0) + 1;
    });
    return total;
  }, [dossier]);

  const categoriesPresentes = useMemo(
    () => (Object.keys(comptes) as CategorieJalon[]).sort((a, b) => (comptes[b] ?? 0) - (comptes[a] ?? 0)),
    [comptes]
  );

  const affiches = useMemo(
    () => (filtre === 'tout' ? dossier : dossier.filter((j) => j.categorie === filtre)),
    [dossier, filtre]
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 sm:px-6">
      <header className="mb-10 animate-fade-in">
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          {t.etiquette}
        </span>
        <h2 className="mt-3 font-serif text-3xl leading-tight text-white sm:text-4xl">{t.titre}</h2>
        <p className="mt-4 max-w-2xl text-sm font-light leading-relaxed text-slate-400">{t.intro}</p>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-slate-600">
          {t.compte(dossier.length)}
        </p>
      </header>

      {erreur && (
        <div className="glass-panel mb-8 flex items-start gap-3 rounded-2xl border border-amber-800/40 p-5 text-sm font-light leading-relaxed text-amber-200/90">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
          <p>{t.erreur}</p>
        </div>
      )}

      {categoriesPresentes.length > 1 && (
        <nav className="mb-10 flex flex-wrap gap-2" aria-label={t.etiquette}>
          <button
            type="button"
            onClick={() => setFiltre('tout')}
            className={`rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              filtre === 'tout'
                ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                : 'border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'
            }`}
          >
            {t.tout}
            <span className="ml-2 font-mono text-[10px] opacity-60">{dossier.length}</span>
          </button>
          {categoriesPresentes.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFiltre(c)}
              className={`rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                filtre === c
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                  : 'border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'
              }`}
            >
              {t.categories[c]}
              <span className="ml-2 font-mono text-[10px] opacity-60">{comptes[c]}</span>
            </button>
          ))}
        </nav>
      )}

      {chargement ? (
        <>
          <p className="sr-only">{t.chargement}</p>
          <Squelette />
        </>
      ) : (
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute bottom-4 left-[7px] top-4 w-px bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent"
          />
          {affiches.length > 0 ? (
            <div className="space-y-6 sm:space-y-8">
              {affiches.map((jalon, i) => (
                <CarteJalon
                  key={jalon.id}
                  jalon={jalon}
                  t={t}
                  francais={francais}
                  delai={Math.min(i, 8) * 60}
                />
              ))}
            </div>
          ) : (
            <div className="glass-card ml-8 rounded-2xl border border-white/5 p-8 text-center text-sm font-light text-slate-500 sm:ml-12">
              {dossier.length === 0 ? t.videTout : t.vide}
            </div>
          )}
        </div>
      )}

      {precedents.length > 0 && (
        <section className="mt-20">
          <header className="mb-8">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {t.categories.precedent}
            </span>
            <h2 className="mt-3 font-serif text-2xl leading-tight text-white sm:text-3xl">
              {t.precedentsTitre}
            </h2>
            <p className="mt-4 max-w-2xl text-sm font-light leading-relaxed text-slate-400">
              {t.precedentsIntro(precedents.length)}
            </p>
          </header>

          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute bottom-4 left-[7px] top-4 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"
            />
            <div className="space-y-6 sm:space-y-8">
              {precedents.map((jalon, i) => (
                <CarteJalon
                  key={jalon.id}
                  jalon={jalon}
                  t={t}
                  francais={francais}
                  delai={Math.min(i, 8) * 60}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ArchiveTimeline;
