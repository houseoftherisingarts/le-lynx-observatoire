import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Flag,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Undo2,
  WifiOff,
  X,
} from 'lucide-react';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { timeAgo } from '../../services/socialService';
import { MembreFiche, suivreMembre } from '../../services/membresService';
import {
  CibleSignalement,
  LONGUEUR_MAX_MOTIF,
  Signalement,
  StatutSignalement,
  debloquer,
  signaler,
  suivreMesBlocages,
  suivreSignalements,
  traiterSignalement,
} from '../../services/moderationService';

const T = {
  fr: {
    signaler: 'Signaler',
    modaleTitre: 'Signaler ce contenu',
    modaleTexte: 'Votre signalement part vers l’équipe de modération, qui le lit et décide de la suite. La personne visée n’est pas avertie de votre geste.',
    motifTitre: 'Motif du signalement',
    precisionTitre: 'Ce que vous avez vu',
    precisionAide: 'Quelques mots suffisent pour situer le problème.',
    extraitTitre: 'Contenu visé',
    envoyer: 'Envoyer le signalement',
    envoi: 'Envoi en cours',
    fermer: 'Fermer',
    annuler: 'Annuler',
    merciTitre: 'Signalement reçu',
    merciTexte: 'La modération le regarde et tranche. Vous n’avez rien d’autre à faire de votre côté.',
    erreurEnvoi: 'Le signalement n’est pas parti. Réessayez dans un instant.',
    motifRequis: 'Choisissez un motif avant d’envoyer.',
    precisionRequise: 'Écrivez ce que vous avez vu.',
    motifs: { haine: 'Propos haineux', harcelement: 'Harcèlement', desinformation: 'Désinformation', horsSujet: 'Hors sujet', autre: 'Autre' },
    filesTitre: 'Modération',
    filesSousTitre: 'Signalements ouverts',
    cibles: { billet: 'Billet', commentaire: 'Commentaire', membre: 'Membre', photo: 'Photo', message: 'Message' },
    parQui: 'Signalé par',
    traite: 'Traité',
    rejete: 'Rejeté',
    marquerTraite: 'Marquer traité',
    marquerRejete: 'Rejeter',
    chargement: 'Lecture de la file de modération',
    videTitre: 'La file est vide',
    videTexte: 'Aucun signalement n’attend une décision. Les nouveaux arrivent ici en direct, sans rechargement de la page.',
    erreurTitre: 'File hors de portée',
    erreurTexte: 'La lecture des signalements a été refusée. Reconnectez-vous avec un compte de l’administration et la file revient.',
    bloquesTitre: 'Personnes bloquées',
    bloquesSousTitre: 'Votre liste privée',
    bloquesVideTitre: 'Vous n’avez bloqué personne',
    bloquesVideTexte: 'Cette liste reste privée. Les personnes que vous bloquez disparaissent de votre mur, de vos messages et de l’annuaire.',
    bloquesErreur: 'Votre liste de blocages ne se charge pas pour le moment.',
    lever: 'Lever le blocage',
    membreInconnu: 'Membre retiré',
  },
  en: {
    signaler: 'Report',
    modaleTitre: 'Report this content',
    modaleTexte: 'Your report goes to the moderation team, who read it and decide what follows. The person involved is not told about your report.',
    motifTitre: 'Reason for the report',
    precisionTitre: 'What you saw',
    precisionAide: 'A few words are enough to place the problem.',
    extraitTitre: 'Reported content',
    envoyer: 'Send the report',
    envoi: 'Sending',
    fermer: 'Close',
    annuler: 'Cancel',
    merciTitre: 'Report received',
    merciTexte: 'Moderation will look at it and decide. Nothing else is needed on your side.',
    erreurEnvoi: 'The report did not go through. Try again in a moment.',
    motifRequis: 'Pick a reason before sending.',
    precisionRequise: 'Write what you saw.',
    motifs: { haine: 'Hateful speech', harcelement: 'Harassment', desinformation: 'Disinformation', horsSujet: 'Off topic', autre: 'Other' },
    filesTitre: 'Moderation',
    filesSousTitre: 'Open reports',
    cibles: { billet: 'Post', commentaire: 'Comment', membre: 'Member', photo: 'Photo', message: 'Message' },
    parQui: 'Reported by',
    traite: 'Handled',
    rejete: 'Dismissed',
    marquerTraite: 'Mark handled',
    marquerRejete: 'Dismiss',
    chargement: 'Reading the moderation queue',
    videTitre: 'The queue is empty',
    videTexte: 'No report is waiting for a decision. New ones land here live, with no page reload.',
    erreurTitre: 'Queue out of reach',
    erreurTexte: 'Reading the reports was denied. Sign in again with an administration account and the queue comes back.',
    bloquesTitre: 'Blocked people',
    bloquesSousTitre: 'Your private list',
    bloquesVideTitre: 'You have blocked nobody',
    bloquesVideTexte: 'This list stays private. People you block disappear from your wall, your messages and the directory.',
    bloquesErreur: 'Your block list is not loading right now.',
    lever: 'Unblock',
    membreInconnu: 'Member removed',
  },
};

const textes = (language: Language) => (language === 'fr' ? T.fr : T.en);
const langueCourte = (language: Language): 'fr' | 'en' => (language === 'fr' ? 'fr' : 'en');

type CleMotif = 'haine' | 'harcelement' | 'desinformation' | 'horsSujet' | 'autre';
const CLES_MOTIF: CleMotif[] = ['haine', 'harcelement', 'desinformation', 'horsSujet', 'autre'];

const etiquette = 'text-[10px] font-bold uppercase tracking-widest';
const bouton =
  'flex items-center justify-center gap-2 rounded-full bg-emerald-500/90 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-all';

const Etat: React.FC<{ icone: React.ReactNode; titre?: string; texte: string }> = ({ icone, titre, texte }) => (
  <div className="glass-panel rounded-3xl border border-white/5 p-10 md:p-12 text-center">
    <div className="flex justify-center text-slate-600">{icone}</div>
    {titre && <h3 className="mt-4 font-serif text-xl text-white">{titre}</h3>}
    <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{texte}</p>
  </div>
);

// --- Bouton et modale de signalement ----------------------------------------

export interface BoutonSignalerProps {
  cible: CibleSignalement;
  extrait?: string;
  language: Language;
}
export const BoutonSignaler: React.FC<BoutonSignalerProps> = ({ cible, extrait, language }) => {
  const t = textes(language);
  const { profile } = useAuth();
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState<CleMotif | null>(null);
  const [precision, setPrecision] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [ouvert]);

  if (!profile) return null;

  const fermer = () => {
    setOuvert(false);
    setMotif(null);
    setPrecision('');
    setErreur(null);
    setEnvoye(false);
  };

  const envoyer = async () => {
    if (!motif) return setErreur(t.motifRequis);
    const detail = precision.trim();
    if (motif === 'autre' && !detail) return setErreur(t.precisionRequise);
    const libelle = t.motifs[motif];
    setEnvoi(true);
    setErreur(null);
    try {
      const auteur = { uid: profile.uid, nom: profile.displayName };
      await signaler(auteur, cible, detail ? `${libelle} : ${detail}` : libelle, extrait);
      setEnvoye(true);
    } catch {
      setErreur(t.erreurEnvoi);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="flex items-center gap-1.5 rounded-full border border-white/5 px-3 py-1.5 text-xs text-slate-500 hover:text-amber-400 hover:border-white/10 transition-all"
      >
        <Flag size={13} />
        {t.signaler}
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 p-4 animate-fade-in"
          onClick={fermer}
        >
          <div
            className="glass-card w-full max-w-md rounded-3xl border border-white/5 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            {envoye ? (
              <div className="text-center">
                <ShieldCheck size={32} className="mx-auto text-emerald-500" />
                <h3 className="mt-4 font-serif text-xl text-white">{t.merciTitre}</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">{t.merciTexte}</p>
                <button type="button" onClick={fermer} className={`${bouton} mt-6 w-full`}>
                  {t.fermer}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`${etiquette} text-amber-500`}>{t.cibles[cible.type]}</p>
                    <h3 className="mt-2 font-serif text-xl text-white leading-tight">{t.modaleTitre}</h3>
                  </div>
                  <button type="button" onClick={fermer} aria-label={t.annuler} className="rounded-full border border-white/5 p-1.5 text-slate-500 hover:text-white hover:border-white/10 transition-all">
                    <X size={15} />
                  </button>
                </div>

                <p className="mt-3 text-sm text-slate-400">{t.modaleTexte}</p>

                {extrait && (
                  <div className="mt-4">
                    <p className={`${etiquette} text-slate-500`}>{t.extraitTitre}</p>
                    <p className="mt-2 rounded-2xl border border-white/5 bg-black/40 p-3 text-xs text-slate-400 line-clamp-4">
                      {extrait}
                    </p>
                  </div>
                )}

                <div className="mt-5">
                  <p className={`${etiquette} text-slate-500`}>{t.motifTitre}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CLES_MOTIF.map((cle) => (
                      <button
                        key={cle}
                        type="button"
                        aria-pressed={motif === cle}
                        onClick={() => { setMotif(cle); setErreur(null); }}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                          motif === cle
                            ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 font-semibold'
                            : 'border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        {t.motifs[cle]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <label className={`${etiquette} text-slate-500`} htmlFor="moderation-precision">
                    {t.precisionTitre}
                  </label>
                  <textarea
                    id="moderation-precision"
                    value={precision}
                    onChange={(e) => setPrecision(e.target.value.slice(0, LONGUEUR_MAX_MOTIF))}
                    rows={3}
                    placeholder={t.precisionAide}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 transition-all"
                  />
                </div>

                {erreur && <p className="mt-3 text-xs text-red-400">{erreur}</p>}

                <button type="button" onClick={envoyer} disabled={envoi} className={`${bouton} mt-5 w-full`}>
                  {envoi ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />}
                  {envoi ? t.envoi : t.envoyer}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// --- Une personne bloquée ---------------------------------------------------

const LigneBlocage: React.FC<{ uid: string; moiUid: string; language: Language }> = ({ uid, moiUid, language }) => {
  const t = textes(language);
  const [fiche, setFiche] = useState<MembreFiche | null>(null);
  const [travail, setTravail] = useState(false);

  useEffect(() => suivreMembre(uid, setFiche, () => setFiche(null)), [uid]);

  const lever = async () => {
    setTravail(true);
    try { await debloquer(moiUid, uid); } finally { setTravail(false); }
  };

  const nom = fiche ? fiche.nom : t.membreInconnu;

  return (
    <li className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-black/30 p-3 hover:border-white/10 transition-all">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black"
          style={{ backgroundColor: `hsl(${fiche ? fiche.avatarHue : 200} 40% 55%)` }}
        >
          {nom.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-200">{nom}</p>
          {fiche?.municipalite && (
            <p className="truncate text-xs text-slate-500">{fiche.municipalite}</p>
          )}
        </div>
      </div>
      <button type="button" onClick={lever} disabled={travail} className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-emerald-300 hover:border-emerald-500/40 disabled:opacity-50 transition-all">
        {travail ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />}
        {t.lever}
      </button>
    </li>
  );
};

// --- Une ligne de la file ---------------------------------------------------

const LigneSignalement: React.FC<{ signalement: Signalement; language: Language }> = ({ signalement, language }) => {
  const t = textes(language);
  const [travail, setTravail] = useState<StatutSignalement | null>(null);

  const trancher = async (statut: StatutSignalement) => {
    setTravail(statut);
    try { await traiterSignalement(signalement.id, statut); } finally { setTravail(null); }
  };

  return (
    <li className="glass-card rounded-2xl border border-white/5 p-4 hover:border-white/10 transition-all">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`${etiquette} rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-400`}>
          {t.cibles[signalement.cible.type]}
        </span>
        <span className="text-xs text-slate-500">
          {t.parQui} {signalement.parNom}
        </span>
        <span className="text-xs text-slate-600">
          {timeAgo(signalement.creeLe, langueCourte(language))}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-200">{signalement.motif}</p>

      {signalement.extrait && (
        <p className="mt-3 rounded-2xl border border-white/5 bg-black/40 p-3 text-xs text-slate-400 line-clamp-3">
          {signalement.extrait}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => trancher('traite')}
          disabled={travail !== null}
          className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-all"
        >
          {travail === 'traite' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {t.marquerTraite}
        </button>
        <button
          type="button"
          onClick={() => trancher('rejete')}
          disabled={travail !== null}
          className="flex items-center justify-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-50 transition-all"
        >
          {travail === 'rejete' ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
          {t.marquerRejete}
        </button>
      </div>
    </li>
  );
};

// --- Vue principale ---------------------------------------------------------

export interface ModerationProps {
  language: Language;
  isAdmin?: boolean;
}

const Moderation: React.FC<ModerationProps> = ({ language, isAdmin }) => {
  const t = textes(language);
  const { profile } = useAuth();
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreurFile, setErreurFile] = useState<string | null>(null);
  const [blocages, setBlocages] = useState<string[]>([]);
  const [erreurBlocages, setErreurBlocages] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setChargement(false);
      return;
    }
    setChargement(true);
    return suivreSignalements(
      (recus) => {
        setSignalements(recus);
        setErreurFile(null);
        setChargement(false);
      },
      () => {
        setErreurFile(t.erreurTexte);
        setChargement(false);
      },
    );
  }, [isAdmin, t.erreurTexte]);

  useEffect(() => {
    if (!profile) return;
    return suivreMesBlocages(
      profile.uid,
      (uids) => {
        setBlocages(uids);
        setErreurBlocages(null);
      },
      () => setErreurBlocages(t.bloquesErreur),
    );
  }, [profile, t.bloquesErreur]);

  const ouverts = useMemo(() => signalements.filter((s) => s.statut === 'ouvert'), [signalements]);

  return (
    <section className="animate-fade-in space-y-12">
      {isAdmin && (
        <div>
          <header>
            <p className={`${etiquette} text-emerald-500`}>{t.filesTitre}</p>
            <h2 className="mt-2 font-serif text-3xl md:text-4xl text-white leading-tight">
              {ouverts.length} {t.filesSousTitre}
            </h2>
          </header>

          <div className="mt-6">
            {chargement && (
              <Etat icone={<Loader2 size={28} className="animate-spin" />} texte={t.chargement} />
            )}

            {!chargement && erreurFile && (
              <Etat icone={<WifiOff size={32} />} titre={t.erreurTitre} texte={erreurFile} />
            )}

            {!chargement && !erreurFile && ouverts.length === 0 && (
              <Etat icone={<ShieldCheck size={32} />} titre={t.videTitre} texte={t.videTexte} />
            )}

            {!chargement && !erreurFile && ouverts.length > 0 && (
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {ouverts.map((signalement) => (
                  <LigneSignalement key={signalement.id} signalement={signalement} language={language} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div>
        <header>
          <p className={`${etiquette} text-emerald-500`}>{t.bloquesSousTitre}</p>
          <h2 className="mt-2 font-serif text-2xl md:text-3xl text-white leading-tight">
            {t.bloquesTitre}
          </h2>
        </header>

        <div className="mt-6">
          {erreurBlocages && <Etat icone={<WifiOff size={28} />} texte={erreurBlocages} />}

          {!erreurBlocages && blocages.length === 0 && (
            <Etat icone={<ShieldOff size={28} />} titre={t.bloquesVideTitre} texte={t.bloquesVideTexte} />
          )}

          {!erreurBlocages && blocages.length > 0 && profile && (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {blocages.map((uid) => (
                <LigneBlocage key={uid} uid={uid} moiUid={profile.uid} language={language} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default Moderation;
