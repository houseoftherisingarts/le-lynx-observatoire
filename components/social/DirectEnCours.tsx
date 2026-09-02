import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Ban, ExternalLink, Loader2, MapPin, Radio, Save, X,
} from 'lucide-react';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  DIRECT_VIDE, Direct, DonneesDirect, adresseSure, fermerDirect, majDirect,
  ouvrirDirect, suivreDirect,
} from '../../services/directService';

/**
 * Le bandeau « en direct » et son formulaire d'administration.
 * Les deux lisent le meme document, directs/actuel.
 */

const TEXTES = {
  fr: {
    enDirect: 'En direct',
    regarder: 'Regarder',
    rejoindre: 'Rejoindre',
    fermer: 'Masquer le bandeau',
    debute: 'Débute à',
    // Panneau d'administration
    surtitre: 'Assemblée',
    titrePanneau: 'Le direct en cours',
    intro: "Ce bandeau apparaît en haut de chaque page tant que le direct reste ouvert. Remplissez les champs, puis ouvrez le direct quand l'assemblée commence.",
    fTitre: 'Titre',
    fSousTitre: 'Sous-titre (facultatif)',
    fLieu: 'Lieu (facultatif)',
    fUrl: 'Adresse du direct (facultatif)',
    fDebut: 'Heure de début (facultatif)',
    phTitre: "Assemblée citoyenne sur le projet La Loutre",
    phSousTitre: "La période de questions suit la présentation",
    phLieu: 'Salle communautaire de Duhamel',
    phUrl: 'https://',
    ouvrir: 'Ouvrir le direct',
    ferme: 'Fermer le direct',
    enligne: 'Le direct est ouvert',
    horsligne: 'Le direct est fermé',
    enregistrer: 'Enregistrer les changements',
    enregistre: 'Changements enregistrés',
    envoi: 'Envoi',
    titreManquant: 'Le titre est obligatoire.',
    urlInvalide: "L'adresse doit commencer par http ou https.",
    echec: "L'enregistrement a échoué. Réessayez dans un moment.",
    erreur: 'Le direct ne se charge pas',
    erreurDesc: "La connexion s'est interrompue avant que l'état du direct arrive. Rechargez la page dans un instant.",
    reserve: "Cette section appartient à l'administration.",
  },
  en: {
    enDirect: 'Live',
    regarder: 'Watch',
    rejoindre: 'Join',
    fermer: 'Hide this banner',
    debute: 'Starts at',
    surtitre: 'Assembly',
    titrePanneau: 'The live broadcast',
    intro: 'This banner sits at the top of every page for as long as the broadcast stays open. Fill in the fields, then open the broadcast when the assembly begins.',
    fTitre: 'Title',
    fSousTitre: 'Subtitle (optional)',
    fLieu: 'Place (optional)',
    fUrl: 'Broadcast address (optional)',
    fDebut: 'Start time (optional)',
    phTitre: 'Citizens assembly on the La Loutre project',
    phSousTitre: 'The question period follows the presentation',
    phLieu: 'Duhamel community hall',
    phUrl: 'https://',
    ouvrir: 'Open the broadcast',
    ferme: 'Close the broadcast',
    enligne: 'The broadcast is open',
    horsligne: 'The broadcast is closed',
    enregistrer: 'Save the changes',
    enregistre: 'Changes saved',
    envoi: 'Sending',
    titreManquant: 'The title is required.',
    urlInvalide: 'The address must start with http or https.',
    echec: 'Saving failed. Try again in a moment.',
    erreur: 'The broadcast will not load',
    erreurDesc: 'The connection dropped before the broadcast state arrived. Reload the page in a moment.',
    reserve: 'This section belongs to the administration.',
  },
};

const ETIQUETTE = 'text-[10px] font-bold uppercase tracking-widest';
const CHAMP =
  'w-full rounded-2xl border border-white/5 bg-black/40 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-emerald-500/40';

const CLE_FERME = 'lynx:directFerme';

const langue = (language: Language): 'fr' | 'en' => (language === 'fr' ? 'fr' : 'en');

/** Signature du direct courant : un nouveau direct rouvre le bandeau. */
const signature = (direct: Direct): string => `${direct.titre}|${direct.debuteA}`;

const lireFermeture = (): string => {
  try {
    return window.sessionStorage.getItem(CLE_FERME) ?? '';
  } catch {
    return '';
  }
};

const ecrireFermeture = (valeur: string): void => {
  try {
    window.sessionStorage.setItem(CLE_FERME, valeur);
  } catch {
    // Le navigateur refuse le stockage de session, le bandeau reviendra au rechargement.
  }
};

const heureLocale = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Millisecondes vers la valeur d'un champ datetime-local, dans l'heure du navigateur. */
const versChampDate = (ms: number): string => {
  if (!ms) return '';
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};

const depuisChampDate = (valeur: string): number => {
  if (!valeur) return 0;
  const ms = new Date(valeur).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

// --- Bandeau public ---------------------------------------------------------

interface DirectEnCoursProps {
  language: Language;
  onOuvrir?: () => void;
}

const DirectEnCours: React.FC<DirectEnCoursProps> = ({ language, onOuvrir }) => {
  const t = TEXTES[langue(language)];
  const [direct, setDirect] = useState<Direct | null>(null);
  const [ferme, setFerme] = useState<string>(() => lireFermeture());

  useEffect(() => suivreDirect(setDirect, () => setDirect(null)), []);

  if (!direct || !direct.actif || !direct.titre) return null;
  if (ferme === signature(direct)) return null;

  const action = direct.plateforme === 'zoom' ? t.rejoindre : t.regarder;
  const lien = adresseSure(direct.url);
  const detail = [
    direct.lieu,
    direct.debuteA ? `${t.debute} ${heureLocale(direct.debuteA)}` : '',
  ].filter(Boolean);

  return (
    <div className="sticky top-0 z-40 animate-fade-in px-4 pt-4 sm:px-6">
      <div className="glass-panel flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 transition-all hover:border-red-500/30 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <span className={`${ETIQUETTE} shrink-0 text-red-300`}>{t.enDirect}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-100">{direct.titre}</p>
            {detail.length > 0 && (
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400">
                {direct.lieu && <MapPin className="h-3 w-3 shrink-0 text-slate-500" />}
                <span className="truncate">{detail.join(' · ')}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {lien ? (
            <a
              href={lien}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOuvrir?.()}
              className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-200 transition-all hover:bg-red-500/25"
            >
              {action}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            onOuvrir && (
              <button
                type="button"
                onClick={onOuvrir}
                className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-200 transition-all hover:bg-red-500/25"
              >
                {action}
                <Radio className="h-3.5 w-3.5" />
              </button>
            )
          )}
          <button
            type="button"
            aria-label={t.fermer}
            title={t.fermer}
            onClick={() => {
              const sig = signature(direct);
              ecrireFermeture(sig);
              setFerme(sig);
            }}
            className="rounded-full p-2 text-slate-500 transition-all hover:bg-white/5 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Panneau d'administration -----------------------------------------------

interface PanneauDirectProps {
  language: Language;
}

export const PanneauDirect: React.FC<PanneauDirectProps> = ({ language }) => {
  const t = TEXTES[langue(language)];
  const { profile } = useAuth();
  const [direct, setDirect] = useState<Direct>(DIRECT_VIDE);
  const [charge, setCharge] = useState(false);
  const [erreurLecture, setErreurLecture] = useState(false);
  const [form, setForm] = useState<DonneesDirect>({
    titre: '', sousTitre: '', lieu: '', url: '', debuteA: 0,
  });
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState('');
  const [succes, setSucces] = useState(false);
  const premiereReception = useRef(true);

  useEffect(
    () =>
      suivreDirect(
        (recu) => {
          const valeur = recu ?? DIRECT_VIDE;
          setDirect(valeur);
          setErreurLecture(false);
          if (premiereReception.current) {
            premiereReception.current = false;
            setForm({
              titre: valeur.titre,
              sousTitre: valeur.sousTitre,
              lieu: valeur.lieu,
              url: valeur.url,
              debuteA: valeur.debuteA,
            });
          }
          setCharge(true);
        },
        () => {
          setErreurLecture(true);
          setCharge(true);
        }
      ),
    []
  );

  if (profile?.role !== 'admin') {
    return (
      <div className="glass-card rounded-3xl border border-white/5 p-8 text-sm text-slate-400">
        {t.reserve}
      </div>
    );
  }

  const majChamp = (champ: keyof DonneesDirect, valeur: string | number) => {
    setForm((precedent) => ({ ...precedent, [champ]: valeur }));
    setSucces(false);
    setMessage('');
  };

  const valider = (): boolean => {
    if (!String(form.titre ?? '').trim()) {
      setMessage(t.titreManquant);
      return false;
    }
    if (String(form.url ?? '').trim() && !adresseSure(form.url)) {
      setMessage(t.urlInvalide);
      return false;
    }
    return true;
  };

  const enregistrer = async () => {
    if (envoi || !valider()) return;
    setEnvoi(true);
    setMessage('');
    try {
      await majDirect(form);
      setSucces(true);
    } catch {
      setMessage(t.echec);
    } finally {
      setEnvoi(false);
    }
  };

  const basculer = async () => {
    if (envoi) return;
    if (direct.actif) {
      setEnvoi(true);
      setMessage('');
      try {
        await fermerDirect();
        setSucces(false);
      } catch {
        setMessage(t.echec);
      } finally {
        setEnvoi(false);
      }
      return;
    }
    if (!valider()) return;
    setEnvoi(true);
    setMessage('');
    try {
      await ouvrirDirect(
        { uid: profile.uid, nom: profile.displayName || '' },
        form
      );
      setSucces(true);
    } catch {
      setMessage(t.echec);
    } finally {
      setEnvoi(false);
    }
  };

  if (!charge) {
    return (
      <div className="glass-card flex items-center gap-3 rounded-3xl border border-white/5 p-8 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
        {t.titrePanneau}
      </div>
    );
  }

  if (erreurLecture) {
    return (
      <div className="glass-card rounded-3xl border border-red-500/20 p-8 animate-fade-in">
        <div className="flex items-center gap-3 text-red-300">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-serif text-lg text-slate-100">{t.erreur}</h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{t.erreurDesc}</p>
      </div>
    );
  }

  return (
    <section className="glass-card animate-fade-in rounded-3xl border border-white/5 p-6 transition-all hover:border-white/10 sm:p-8">
      <p className={`${ETIQUETTE} text-emerald-400`}>{t.surtitre}</p>
      <h3 className="mt-2 font-serif text-2xl text-slate-100">{t.titrePanneau}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{t.intro}</p>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/5 bg-black/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {direct.actif && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                direct.actif ? 'bg-red-500' : 'bg-slate-600'
              }`}
            />
          </span>
          <span className="text-sm font-semibold text-slate-200">
            {direct.actif ? t.enligne : t.horsligne}
          </span>
        </div>
        <button
          type="button"
          onClick={basculer}
          disabled={envoi}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 ${
            direct.actif
              ? 'bg-white/5 text-slate-300 hover:bg-white/10'
              : 'bg-red-500/15 text-red-200 hover:bg-red-500/25'
          }`}
        >
          {envoi ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : direct.actif ? (
            <Ban className="h-4 w-4" />
          ) : (
            <Radio className="h-4 w-4" />
          )}
          {direct.actif ? t.ferme : t.ouvrir}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className={`${ETIQUETTE} text-slate-500`}>{t.fTitre}</span>
          <input
            type="text"
            value={form.titre ?? ''}
            maxLength={140}
            placeholder={t.phTitre}
            onChange={(e) => majChamp('titre', e.target.value)}
            className={`${CHAMP} mt-2`}
          />
        </label>
        <label className="block md:col-span-2">
          <span className={`${ETIQUETTE} text-slate-500`}>{t.fSousTitre}</span>
          <input
            type="text"
            value={form.sousTitre ?? ''}
            maxLength={200}
            placeholder={t.phSousTitre}
            onChange={(e) => majChamp('sousTitre', e.target.value)}
            className={`${CHAMP} mt-2`}
          />
        </label>
        <label className="block">
          <span className={`${ETIQUETTE} text-slate-500`}>{t.fLieu}</span>
          <input
            type="text"
            value={form.lieu ?? ''}
            maxLength={160}
            placeholder={t.phLieu}
            onChange={(e) => majChamp('lieu', e.target.value)}
            className={`${CHAMP} mt-2`}
          />
        </label>
        <label className="block">
          <span className={`${ETIQUETTE} text-slate-500`}>{t.fDebut}</span>
          <input
            type="datetime-local"
            value={versChampDate(Number(form.debuteA ?? 0))}
            onChange={(e) => majChamp('debuteA', depuisChampDate(e.target.value))}
            className={`${CHAMP} mt-2`}
          />
        </label>
        <label className="block md:col-span-2">
          <span className={`${ETIQUETTE} text-slate-500`}>{t.fUrl}</span>
          <input
            type="url"
            inputMode="url"
            value={form.url ?? ''}
            maxLength={600}
            placeholder={t.phUrl}
            onChange={(e) => majChamp('url', e.target.value)}
            className={`${CHAMP} mt-2`}
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`text-xs ${
            message ? 'text-red-300' : succes ? 'text-emerald-300' : 'text-slate-600'
          }`}
        >
          {message || (succes ? t.enregistre : '')}
        </p>
        <button
          type="button"
          onClick={enregistrer}
          disabled={envoi}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500/15 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-emerald-300 transition-all hover:bg-emerald-500/25 disabled:opacity-50"
        >
          {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {envoi ? t.envoi : t.enregistrer}
        </button>
      </div>
    </section>
  );
};

export default DirectEnCours;
