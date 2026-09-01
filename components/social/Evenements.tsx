import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CalendarDays, CalendarPlus, Check, ChevronDown, Download,
  Loader2, MapPin, Plus, Trash2, Users, X,
} from 'lucide-react';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Evenement, ListeEvenements, Rsvp, TYPES_EVENEMENT, TypeEvenement,
  creerEvenement, lienCalendrier, repondrePresence, suivreEvenements,
  suivreRsvps, supprimerEvenement,
} from '../../services/evenementsService';

interface EvenementsProps {
  language: Language;
  isAdmin?: boolean;
}

const TEXTES = {
  fr: {
    surtitre: 'Mobilisation', titre: 'Les rendez-vous de la lutte',
    intro: "Voici où la mobilisation se donne rendez-vous. Confirmez votre présence pour que le comité sache sur combien de personnes il peut compter.",
    inscrire: 'Inscrire un événement',
    aucun: 'Aucun rendez-vous inscrit',
    aucunDesc: "Le prochain événement apparaîtra ici dès qu'une personne l'aura inscrit. Vous pouvez ouvrir le formulaire et annoncer le vôtre.",
    passes: 'Événements passés',
    presences: 'présences confirmées', unePresence: 'présence confirmée',
    seraiLa: 'Je serai là', confirme: 'Présence confirmée',
    connectez: 'Connectez-vous pour confirmer votre présence.',
    calendrier: 'Ajouter au calendrier', telecharger: 'Télécharger le fichier .ics',
    supprimer: "Supprimer l'événement", confirmerSuppr: 'Supprimer cet événement définitivement ?',
    erreur: 'La liste des événements ne se charge pas',
    erreurDesc: "Votre accès à cette collection a été refusé ou la connexion a été coupée. Rechargez la page dans un instant.",
    encours: 'En cours', dans: 'dans', jour: 'j', heure: 'h', minute: 'min',
    formTitre: 'Inscrire un événement', fTitle: 'Titre', fType: 'Type',
    fDate: 'Date et heure', fLieu: 'Lieu', fAdresse: 'Adresse (facultatif)',
    fDescription: 'Description', publier: 'Publier', envoi: 'Envoi', annuler: 'Annuler',
    champsManquants: 'Le titre, la date et le lieu sont obligatoires.',
    echec: "L'enregistrement a échoué. Réessayez dans un moment.",
    types: {
      assemblee: 'Assemblée', conseil: 'Conseil municipal', manifestation: 'Manifestation',
      atelier: 'Atelier', juridique: 'Juridique', autre: 'Autre',
    } as Record<TypeEvenement, string>,
  },
  en: {
    surtitre: 'Mobilization', titre: 'Where the fight gathers',
    intro: 'These are the upcoming gatherings. Confirm your attendance so the committee knows how many people it can count on.',
    inscrire: 'Add an event',
    aucun: 'No gathering listed yet',
    aucunDesc: 'The next event will show up here as soon as someone adds it. You can open the form and announce yours.',
    passes: 'Past events',
    presences: 'people confirmed', unePresence: 'person confirmed',
    seraiLa: "I'll be there", confirme: 'Attendance confirmed',
    connectez: 'Sign in to confirm your attendance.',
    calendrier: 'Add to calendar', telecharger: 'Download the .ics file',
    supprimer: 'Delete this event', confirmerSuppr: 'Delete this event for good?',
    erreur: 'The event list will not load',
    erreurDesc: 'Access to this collection was denied or the connection dropped. Reload the page in a moment.',
    encours: 'Under way', dans: 'in', jour: 'd', heure: 'h', minute: 'min',
    formTitre: 'Add an event', fTitle: 'Title', fType: 'Type',
    fDate: 'Date and time', fLieu: 'Place', fAdresse: 'Address (optional)',
    fDescription: 'Description', publier: 'Publish', envoi: 'Sending', annuler: 'Cancel',
    champsManquants: 'Title, date and place are required.',
    echec: 'Saving failed. Try again in a moment.',
    types: {
      assemblee: 'Assembly', conseil: 'Town council', manifestation: 'Demonstration',
      atelier: 'Workshop', juridique: 'Legal', autre: 'Other',
    } as Record<TypeEvenement, string>,
  },
};

type Textes = typeof TEXTES.fr;

const STYLES_TYPE: Record<TypeEvenement, string> = {
  assemblee: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  conseil: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  manifestation: 'bg-red-500/10 text-red-300 border-red-500/20',
  atelier: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  juridique: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  autre: 'bg-white/5 text-slate-300 border-white/10',
};

const ETIQUETTE = 'text-[10px] font-bold uppercase tracking-widest';
const CHAMP =
  'w-full rounded-2xl border border-white/5 bg-black/40 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-emerald-500/40';

const deuxLignes: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const initiales = (nom: string): string =>
  nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]?.toUpperCase() ?? '').join('') || '?';

const compteARebours = (startsAt: number, maintenant: number, t: Textes): string => {
  const reste = startsAt - maintenant;
  if (reste <= 0) return t.encours;
  const minutes = Math.floor(reste / 60000);
  if (minutes < 60) return `${t.dans} ${Math.max(1, minutes)} ${t.minute}`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `${t.dans} ${heures} ${t.heure} ${minutes % 60} ${t.minute}`;
  const jours = Math.floor(heures / 24);
  return `${t.dans} ${jours} ${t.jour} ${heures % 24} ${t.heure}`;
};

const Champ: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className={`${ETIQUETTE} text-slate-500`}>{label}</span>
    <div className="mt-2">{children}</div>
  </label>
);

// --- Vue principale ---------------------------------------------------------

const Evenements: React.FC<EvenementsProps> = ({ language, isAdmin }) => {
  const t = TEXTES[language === 'fr' ? 'fr' : 'en'];
  const locale = language === 'fr' ? 'fr-CA' : 'en-CA';
  const { profile } = useAuth();
  const admin = isAdmin === true || profile?.role === 'admin';

  const [liste, setListe] = useState<ListeEvenements>({ aVenir: [], passes: [] });
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [passesOuverts, setPassesOuverts] = useState(false);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [maintenant, setMaintenant] = useState(() => Date.now());

  useEffect(() => {
    const desabonner = suivreEvenements(
      (l) => { setListe(l); setChargement(false); setErreur(false); },
      () => { setChargement(false); setErreur(true); }
    );
    return () => desabonner();
  }, []);

  useEffect(() => {
    const minuterie = window.setInterval(() => setMaintenant(Date.now()), 60000);
    return () => window.clearInterval(minuterie);
  }, []);

  const supprimer = async (id: string) => {
    if (!window.confirm(t.confirmerSuppr)) return;
    try {
      await supprimerEvenement(id);
    } catch {
      setErreur(true);
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className={`${ETIQUETTE} text-emerald-400`}>{t.surtitre}</p>
          <h2 className="mt-2 font-serif text-3xl text-white md:text-4xl">{t.titre}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{t.intro}</p>
        </div>
        <button
          type="button"
          onClick={() => setModaleOuverte(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition-all hover:border-emerald-500/60 hover:bg-emerald-500/20"
        >
          <Plus className="h-4 w-4" />
          {t.inscrire}
        </button>
      </header>
      {erreur && (
        <div className="glass-card rounded-3xl border border-red-500/20 p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <h3 className="mt-4 text-lg font-semibold text-white">{t.erreur}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{t.erreurDesc}</p>
        </div>
      )}
      {chargement && !erreur && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        </div>
      )}
      {!chargement && !erreur && liste.aVenir.length === 0 && (
        <div className="glass-card rounded-3xl border border-white/5 p-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-600" />
          <h3 className="mt-5 text-lg font-semibold text-white">{t.aucun}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">{t.aucunDesc}</p>
        </div>
      )}
      {liste.aVenir.length > 0 && (
        <ol className="relative space-y-5 border-l border-white/5 pl-4 md:pl-8">
          {liste.aVenir.map((ev) => (
            <li key={ev.id} className="relative">
              <span className="absolute -left-[21px] top-8 h-2 w-2 rounded-full bg-emerald-500 md:-left-[37px]" />
              <CarteEvenement
                evenement={ev}
                t={t}
                locale={locale}
                maintenant={maintenant}
                peutSupprimer={admin || profile?.uid === ev.auteurUid}
                onSupprimer={() => supprimer(ev.id)}
              />
            </li>
          ))}
        </ol>
      )}
      {liste.passes.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setPassesOuverts((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 text-left transition-all hover:border-white/10"
          >
            <span className={`${ETIQUETTE} text-slate-500`}>{t.passes} · {liste.passes.length}</span>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition-all ${passesOuverts ? 'rotate-180' : ''}`} />
          </button>
          {passesOuverts && (
            <ul className="mt-3 space-y-2">
              {liste.passes.map((ev) => (
                <li
                  key={ev.id}
                  className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <span className="text-sm font-medium text-slate-400" style={deuxLignes}>{ev.title}</span>
                  <span className="text-xs text-slate-500">
                    {ev.dateDisplay || new Date(ev.startsAt).toLocaleDateString(locale)} · {ev.lieu}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {modaleOuverte && <ModaleEvenement t={t} locale={locale} onFermer={() => setModaleOuverte(false)} />}
    </div>
  );
};

// --- Carte d'un evenement a venir -------------------------------------------

interface CarteProps {
  evenement: Evenement;
  t: Textes;
  locale: string;
  maintenant: number;
  peutSupprimer: boolean;
  onSupprimer: () => void;
}

const CarteEvenement: React.FC<CarteProps> = ({
  evenement, t, locale, maintenant, peutSupprimer, onSupprimer,
}) => {
  const { profile } = useAuth();
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const desabonner = suivreRsvps(evenement.id, setRsvps, () => setRsvps([]));
    return () => desabonner();
  }, [evenement.id]);

  const presents = useMemo(() => rsvps.filter((r) => r.going), [rsvps]);
  const jePresent = presents.some((r) => r.uid === profile?.uid);
  const total = Math.max(evenement.rsvpCount, presents.length);
  const debut = new Date(evenement.startsAt);
  const liens = lienCalendrier(evenement);

  const basculer = async () => {
    if (!profile || envoi) return;
    setEnvoi(true);
    try {
      await repondrePresence(
        evenement.id,
        { uid: profile.uid, nom: profile.displayName },
        !jePresent,
        0,
        evenement.rsvpCount
      );
    } catch {
      // L'abonnement garde l'etat reel, la personne peut reessayer.
    } finally {
      setEnvoi(false);
    }
  };

  const telechargerIcs = () => {
    const url = URL.createObjectURL(new Blob([liens.ics], { type: 'text/calendar;charset=utf-8' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = liens.nomFichier;
    lien.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className="glass-card rounded-3xl border border-white/5 p-5 transition-all hover:border-white/10 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row">
        <div className="flex shrink-0 flex-row items-center gap-3 md:w-20 md:flex-col md:gap-0 md:border-r md:border-white/5 md:pr-5">
          <span className={`${ETIQUETTE} text-emerald-400`}>
            {debut.toLocaleDateString(locale, { month: 'short' }).replace('.', '')}
          </span>
          <span className="font-serif text-3xl leading-none text-white">{debut.getDate()}</span>
          <span className="text-[11px] text-slate-500 md:mt-1">
            {debut.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 ${ETIQUETTE} ${STYLES_TYPE[evenement.type]}`}>
              {t.types[evenement.type]}
            </span>
            <span className="rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400">
              {compteARebours(evenement.startsAt, maintenant, t)}
            </span>
            {peutSupprimer && (
              <button
                type="button"
                onClick={onSupprimer}
                title={t.supprimer}
                aria-label={t.supprimer}
                className="ml-auto rounded-full border border-white/5 p-2 text-slate-500 transition-all hover:border-red-500/30 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <h3 className="mt-3 font-serif text-xl leading-snug text-white md:text-2xl" style={deuxLignes}>
            {evenement.title}
          </h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="h-4 w-4 shrink-0 text-slate-600" />
            <span className="truncate">
              {evenement.lieu}{evenement.adresse ? `, ${evenement.adresse}` : ''}
            </span>
          </p>
          {evenement.description && (
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{evenement.description}</p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {presents.slice(0, 5).map((r) => (
                  <span
                    key={r.id}
                    title={r.nom}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-emerald-500/15 text-[10px] font-bold text-emerald-300"
                  >
                    {initiales(r.nom)}
                  </span>
                ))}
                {presents.length === 0 && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/5 bg-white/[0.03]">
                    <Users className="h-3.5 w-3.5 text-slate-600" />
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">
                {total} {total > 1 ? t.presences : t.unePresence}
              </span>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <a
                href={liens.google}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition-all hover:border-white/10 hover:text-white"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                {t.calendrier}
              </a>
              <button
                type="button"
                onClick={telechargerIcs}
                title={t.telecharger}
                aria-label={t.telecharger}
                className="rounded-full border border-white/5 p-2 text-slate-500 transition-all hover:border-white/10 hover:text-white"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              {profile ? (
                <button
                  type="button"
                  onClick={basculer}
                  disabled={envoi}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all disabled:opacity-50 ${
                    jePresent
                      ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'bg-emerald-500 text-black hover:bg-emerald-400'
                  }`}
                >
                  {jePresent && <Check className="h-3.5 w-3.5" />}
                  {jePresent ? t.confirme : t.seraiLa}
                </button>
              ) : (
                <span className="text-xs text-slate-500">{t.connectez}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

// --- Formulaire en modale ---------------------------------------------------

const ModaleEvenement: React.FC<{ t: Textes; locale: string; onFermer: () => void }> = ({
  t, locale, onFermer,
}) => {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TypeEvenement>('assemblee');
  const [quand, setQuand] = useState('');
  const [lieu, setLieu] = useState('');
  const [adresse, setAdresse] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || envoi) return;
    const debut = quand ? new Date(quand).getTime() : NaN;
    if (!title.trim() || !lieu.trim() || !Number.isFinite(debut)) {
      setMessage(t.champsManquants);
      return;
    }
    setEnvoi(true);
    setMessage('');
    try {
      await creerEvenement(
        { uid: profile.uid, nom: profile.displayName },
        {
          title, description, lieu, adresse, startsAt: debut, type,
          dateDisplay: new Date(debut).toLocaleDateString(locale, {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          }),
        }
      );
      onFermer();
    } catch {
      setMessage(t.echec);
      setEnvoi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center" role="dialog" aria-modal="true">
      <form
        onSubmit={soumettre}
        className="glass-panel max-h-[90vh] w-full max-w-xl animate-fade-in overflow-y-auto rounded-3xl border border-white/10 p-6 md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-serif text-2xl text-white">{t.formTitre}</h3>
          <button
            type="button"
            onClick={onFermer}
            aria-label={t.annuler}
            className="rounded-full border border-white/5 p-2 text-slate-400 transition-all hover:border-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <Champ label={t.fTitle}>
            <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={CHAMP} />
          </Champ>
          <div className="grid gap-4 md:grid-cols-2">
            <Champ label={t.fType}>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TypeEvenement)}
                className={CHAMP}
              >
                {TYPES_EVENEMENT.map((v) => (
                  <option key={v} value={v} className="bg-[#02040a]">{t.types[v]}</option>
                ))}
              </select>
            </Champ>
            <Champ label={t.fDate}>
              <input type="datetime-local" value={quand} onChange={(e) => setQuand(e.target.value)} className={CHAMP} />
            </Champ>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Champ label={t.fLieu}>
              <input value={lieu} maxLength={120} onChange={(e) => setLieu(e.target.value)} className={CHAMP} />
            </Champ>
            <Champ label={t.fAdresse}>
              <input value={adresse} maxLength={200} onChange={(e) => setAdresse(e.target.value)} className={CHAMP} />
            </Champ>
          </div>
          <Champ label={t.fDescription}>
            <textarea
              value={description}
              maxLength={4000}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              className={`${CHAMP} resize-none`}
            />
          </Champ>
        </div>
        {message && <p className="mt-4 text-sm text-amber-400">{message}</p>}
        {!profile && <p className="mt-4 text-sm text-slate-400">{t.connectez}</p>}
        <button
          type="submit"
          disabled={envoi || !profile}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-emerald-400 disabled:opacity-50"
        >
          {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {envoi ? t.envoi : t.publier}
        </button>
      </form>
    </div>
  );
};

export default Evenements;
