import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  ExternalLink,
  FileText,
  Globe,
  Headphones,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Language } from '../types';
import {
  DOCUMENTS_DE_DEPART,
  Document,
  FORMATS_DOCUMENT,
  FormatDocument,
  NouveauDocument,
  TYPES_DOCUMENT,
  TypeDocument,
  ajouterDocument,
  libelleType,
  suivreBibliotheque,
  supprimerDocument,
  tonType,
  urlSure,
} from '../services/bibliothequeService';

interface BibliothequeProps {
  language: Language;
  isAdmin?: boolean;
}

const T = {
  fr: {
    titre: 'Bibliothèque',
    intro:
      "Les pièces du dossier La Loutre, telles qu’elles ont été publiées par leurs auteurs. Chaque adresse a été ouverte et vérifiée.",
    recherche: 'Chercher par titre',
    tous: 'Tous',
    ouvrir: 'Ouvrir le document',
    compte: (n: number) => (n === 1 ? '1 document' : `${n} documents`),
    videTitre: 'Aucun document ne correspond',
    videTexte:
      'Changez le type retenu ou effacez les mots de la recherche pour retrouver le fonds complet.',
    erreurTitre: 'La lecture en direct a échoué',
    erreurTexte:
      'Le fonds vérifié reste affiché. Rechargez la page pour tenter une nouvelle connexion.',
    ajouter: 'Ajouter un document',
    supprimer: 'Retirer ce document',
    confirmer: 'Retirer ce document de la bibliothèque ?',
    formTitre: 'Nouveau document',
    champTitre: 'Titre',
    champAuteur: 'Auteur',
    champAnnee: 'Année',
    champType: 'Type',
    champFormat: 'Format',
    champPoids: 'Poids (facultatif)',
    champResume: 'Résumé, deux phrases',
    champUrl: 'Adresse du document',
    annuler: 'Annuler',
    enregistrer: 'Enregistrer',
    enCours: 'Enregistrement',
    manqueTitre: 'Le titre est requis.',
    manqueUrl: 'L’adresse doit commencer par http ou https.',
  },
  en: {
    titre: 'Library',
    intro:
      'The documents of the La Loutre file, as published by their authors. Every address was opened and verified.',
    recherche: 'Search by title',
    tous: 'All',
    ouvrir: 'Open the document',
    compte: (n: number) => (n === 1 ? '1 document' : `${n} documents`),
    videTitre: 'No document matches',
    videTexte: 'Change the selected type or clear the search words to see the whole collection.',
    erreurTitre: 'The live feed failed',
    erreurTexte: 'The verified collection stays on screen. Reload the page to try again.',
    ajouter: 'Add a document',
    supprimer: 'Remove this document',
    confirmer: 'Remove this document from the library?',
    formTitre: 'New document',
    champTitre: 'Title',
    champAuteur: 'Author',
    champAnnee: 'Year',
    champType: 'Type',
    champFormat: 'Format',
    champPoids: 'Size (optional)',
    champResume: 'Summary, two sentences',
    champUrl: 'Document address',
    annuler: 'Cancel',
    enregistrer: 'Save',
    enCours: 'Saving',
    manqueTitre: 'The title is required.',
    manqueUrl: 'The address must start with http or https.',
  },
};

const textes = (language: Language) => (language === 'en' || language === 'ani' ? T.en : T.fr);

const iconeFormat = (format: FormatDocument) => {
  if (format === 'PDF') return FileText;
  if (format === 'audio') return Headphones;
  return Globe;
};

const CHAMP =
  'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 transition-colors';
const ETIQUETTE = 'block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2';

const FORMULAIRE_VIDE: NouveauDocument = {
  titre: '',
  auteur: '',
  annee: new Date().getFullYear(),
  type: 'rapport',
  resume: '',
  url: '',
  format: 'PDF',
  poids: '',
};

const Bibliotheque: React.FC<BibliothequeProps> = ({ language, isAdmin = false }) => {
  const t = textes(language);
  const [documents, setDocuments] = useState<Document[]>(DOCUMENTS_DE_DEPART);
  const [erreur, setErreur] = useState(false);
  const [typeRetenu, setTypeRetenu] = useState<TypeDocument | 'tous'>('tous');
  const [recherche, setRecherche] = useState('');
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [formulaire, setFormulaire] = useState<NouveauDocument>(FORMULAIRE_VIDE);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState('');

  useEffect(() => {
    const desabonner = suivreBibliotheque(
      (liste) => {
        setDocuments(liste);
        setErreur(false);
      },
      () => setErreur(true)
    );
    return () => desabonner();
  }, []);

  // Les pieces du fonds de depart ne vivent pas dans Firestore, donc rien a y supprimer.
  const fondsLocal = documents === DOCUMENTS_DE_DEPART;

  const typesPresents = useMemo(
    () => TYPES_DOCUMENT.filter((type) => documents.some((d) => d.type === type)),
    [documents]
  );

  const visibles = useMemo(() => {
    const mots = recherche.trim().toLowerCase();
    return documents.filter((d) => {
      if (typeRetenu !== 'tous' && d.type !== typeRetenu) return false;
      if (!mots) return true;
      return d.titre.toLowerCase().includes(mots) || d.auteur.toLowerCase().includes(mots);
    });
  }, [documents, typeRetenu, recherche]);

  const majFormulaire = <C extends keyof NouveauDocument>(
    champ: C,
    valeur: NouveauDocument[C]
  ): void => setFormulaire((precedent) => ({ ...precedent, [champ]: valeur }));

  const fermerModale = (): void => {
    setModaleOuverte(false);
    setFormulaire(FORMULAIRE_VIDE);
    setErreurFormulaire('');
  };

  const enregistrer = async (evenement: React.FormEvent): Promise<void> => {
    evenement.preventDefault();
    if (!formulaire.titre.trim()) {
      setErreurFormulaire(t.manqueTitre);
      return;
    }
    if (!urlSure(formulaire.url.trim())) {
      setErreurFormulaire(t.manqueUrl);
      return;
    }
    setEnregistrement(true);
    setErreurFormulaire('');
    try {
      await ajouterDocument(formulaire);
      fermerModale();
    } catch (souci) {
      setErreurFormulaire(souci instanceof Error ? souci.message : t.erreurTitre);
    } finally {
      setEnregistrement(false);
    }
  };

  const retirer = async (id: string): Promise<void> => {
    if (!window.confirm(t.confirmer)) return;
    try {
      await supprimerDocument(id);
    } catch {
      setErreur(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-900/30 rounded-2xl border border-emerald-500/20 text-emerald-400 shrink-0">
            <BookOpen size={32} />
          </div>
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-white leading-tight">
              {t.titre}
            </h2>
            <p className="text-sm text-slate-400 font-light mt-1 max-w-xl">{t.intro}</p>
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setModaleOuverte(true)}
            className="shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest transition-colors"
          >
            <Plus size={14} /> {t.ajouter}
          </button>
        )}
      </div>

      {erreur && (
        <div className="glass-panel rounded-2xl border border-red-500/20 bg-red-950/20 p-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-300">{t.erreurTitre}</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.erreurTexte}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
          />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={t.recherche}
            aria-label={t.recherche}
            className={`${CHAMP} pl-11`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTypeRetenu('tous')}
            className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
              typeRetenu === 'tous'
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
            }`}
          >
            {t.tous}
          </button>
          {typesPresents.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeRetenu(type)}
              className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
                typeRetenu === type
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
              }`}
            >
              {libelleType(type, language)}
            </button>
          ))}
          <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-600">
            {t.compte(visibles.length)}
          </span>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="glass-card rounded-3xl border border-white/5 p-12 text-center">
          <BookOpen size={32} className="mx-auto text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-300">{t.videTitre}</h3>
          <p className="text-sm text-slate-500 font-light mt-2 max-w-sm mx-auto leading-relaxed">
            {t.videTexte}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visibles.map((document) => {
            const Icone = iconeFormat(document.format);
            return (
              <article
                key={document.id}
                className="glass-card rounded-2xl border border-white/5 hover:border-white/10 transition-colors p-6 flex flex-col md:flex-row gap-5"
              >
                <div className="p-3 h-fit bg-white/5 rounded-xl text-emerald-400 shrink-0">
                  <Icone size={22} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${tonType(
                        document.type
                      )}`}
                    >
                      {libelleType(document.type, language)}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      {document.format}
                      {document.poids ? ` · ${document.poids}` : ''}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 leading-snug line-clamp-2">
                    {document.titre}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mt-2">
                    {document.auteur}
                    {document.annee ? ` · ${document.annee}` : ''}
                  </p>
                  <p className="text-sm text-slate-400 font-light leading-relaxed mt-3">
                    {document.resume}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mt-5">
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-emerald-600 border border-white/5 hover:border-emerald-500 text-slate-300 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                      {t.ouvrir} <ExternalLink size={12} />
                    </a>
                    {isAdmin && !fondsLocal && (
                      <button
                        type="button"
                        onClick={() => void retirer(document.id)}
                        aria-label={t.supprimer}
                        title={t.supprimer}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 hover:border-red-500/40 text-slate-500 hover:text-red-400 text-[10px] font-bold uppercase tracking-widest transition-colors"
                      >
                        <Trash2 size={12} /> {t.supprimer}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isAdmin && modaleOuverte && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-xl animate-fade-in p-4 md:p-8">
          <form
            onSubmit={(e) => void enregistrer(e)}
            className="glass-panel max-w-2xl mx-auto rounded-3xl border border-white/10 p-6 md:p-8 space-y-5"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-serif text-2xl font-bold text-white">{t.formTitre}</h3>
              <button
                type="button"
                onClick={fermerModale}
                aria-label={t.annuler}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className={ETIQUETTE} htmlFor="bib-titre">
                {t.champTitre}
              </label>
              <input
                id="bib-titre"
                value={formulaire.titre}
                onChange={(e) => majFormulaire('titre', e.target.value)}
                maxLength={200}
                required
                className={CHAMP}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className={ETIQUETTE} htmlFor="bib-auteur">
                  {t.champAuteur}
                </label>
                <input
                  id="bib-auteur"
                  value={formulaire.auteur}
                  onChange={(e) => majFormulaire('auteur', e.target.value)}
                  maxLength={160}
                  className={CHAMP}
                />
              </div>
              <div>
                <label className={ETIQUETTE} htmlFor="bib-annee">
                  {t.champAnnee}
                </label>
                <input
                  id="bib-annee"
                  type="number"
                  min={1900}
                  max={2100}
                  value={formulaire.annee}
                  onChange={(e) => majFormulaire('annee', Number(e.target.value))}
                  className={CHAMP}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={ETIQUETTE} htmlFor="bib-type">
                  {t.champType}
                </label>
                <select
                  id="bib-type"
                  value={formulaire.type}
                  onChange={(e) => majFormulaire('type', e.target.value as TypeDocument)}
                  className={CHAMP}
                >
                  {TYPES_DOCUMENT.map((type) => (
                    <option key={type} value={type} className="bg-slate-900">
                      {libelleType(type, language)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={ETIQUETTE} htmlFor="bib-format">
                  {t.champFormat}
                </label>
                <select
                  id="bib-format"
                  value={formulaire.format}
                  onChange={(e) => majFormulaire('format', e.target.value as FormatDocument)}
                  className={CHAMP}
                >
                  {FORMATS_DOCUMENT.map((format) => (
                    <option key={format} value={format} className="bg-slate-900">
                      {format}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={ETIQUETTE} htmlFor="bib-poids">
                  {t.champPoids}
                </label>
                <input
                  id="bib-poids"
                  value={formulaire.poids ?? ''}
                  onChange={(e) => majFormulaire('poids', e.target.value)}
                  maxLength={24}
                  placeholder="2,4 Mo"
                  className={CHAMP}
                />
              </div>
            </div>

            <div>
              <label className={ETIQUETTE} htmlFor="bib-url">
                {t.champUrl}
              </label>
              <input
                id="bib-url"
                type="url"
                value={formulaire.url}
                onChange={(e) => majFormulaire('url', e.target.value)}
                maxLength={1200}
                required
                placeholder="https://"
                className={CHAMP}
              />
            </div>

            <div>
              <label className={ETIQUETTE} htmlFor="bib-resume">
                {t.champResume}
              </label>
              <textarea
                id="bib-resume"
                value={formulaire.resume}
                onChange={(e) => majFormulaire('resume', e.target.value)}
                maxLength={900}
                rows={4}
                className={`${CHAMP} resize-none`}
              />
            </div>

            {erreurFormulaire && (
              <p className="text-xs text-red-400 leading-relaxed">{erreurFormulaire}</p>
            )}

            <div className="flex flex-col md:flex-row gap-3 md:justify-end pt-2">
              <button
                type="button"
                onClick={fermerModale}
                className="px-5 py-3 rounded-xl border border-white/5 hover:border-white/10 text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
              >
                {t.annuler}
              </button>
              <button
                type="submit"
                disabled={enregistrement}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest transition-colors inline-flex items-center justify-center gap-2"
              >
                {enregistrement && <Loader2 size={14} className="animate-spin" />}
                {enregistrement ? t.enCours : t.enregistrer}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Bibliotheque;
