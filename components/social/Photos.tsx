import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Images,
  Loader2,
  MapPin,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  LONGUEUR_MAX_LEGENDE,
  LONGUEUR_MAX_LIEU,
  Photo,
  changerStatutPhoto,
  suivreFileModeration,
  suivrePhotosApprouvees,
  supprimerPhoto,
  televerserPhoto,
} from '../../services/photosService';

interface PhotosProps {
  language: Language;
  isAdmin?: boolean;
}

const TEXTES = {
  fr: {
    etiquette: 'Galerie des membres',
    titre: 'Le territoire, photographié par ceux qui y vivent',
    intro:
      "Voici les images déposées par les membres de l'Observatoire : le territoire, les rassemblements, les traces du chantier. Chaque photo passe par une relecture avant de paraître ici.",
    ajouter: 'Ajouter une photo',
    ongletGalerie: 'La galerie',
    ongletFile: 'À relire',
    aucune: 'Aucune photo dans la galerie',
    aucuneDesc:
      "Les premières images arriveront dès qu'un membre en déposera. Vous pouvez ouvrir le formulaire et déposer la vôtre.",
    fileVide: 'Rien à relire',
    fileVideDesc:
      "La file est vide. Toute nouvelle photo déposée par un membre apparaîtra ici en attente de votre décision.",
    erreur: 'La galerie ne se charge pas',
    erreurDesc:
      "Votre accès a été refusé ou la connexion a été coupée. Rechargez la page dans un instant.",
    connectez: 'Connectez-vous pour déposer une photo.',
    formTitre: 'Déposer une photo',
    fFichier: 'Choisir une image',
    fFichierAide: 'Format image, 10 Mo au maximum.',
    fLegende: 'Légende',
    fLegendePlaceholder: 'Ce que montre cette image',
    fLieu: 'Lieu (facultatif)',
    fLieuPlaceholder: 'Lac Simon, Duhamel, chemin de la Rivière',
    envoyer: 'Envoyer la photo',
    envoi: 'Envoi',
    annuler: 'Annuler',
    fermer: 'Fermer',
    precedente: 'Photo précédente',
    suivante: 'Photo suivante',
    manqueFichier: 'Choisissez une image avant d’envoyer.',
    manqueLegende: 'La légende est obligatoire.',
    echec: "L'envoi a échoué. Réessayez dans un moment.",
    deposee: 'Votre photo est déposée',
    deposeeDesc:
      "Elle attend une relecture du comité avant de paraître dans la galerie. Vous n'avez rien d'autre à faire.",
    approuver: 'Approuver',
    refuser: 'Refuser',
    supprimer: 'Supprimer',
    confirmerSuppr: 'Supprimer cette photo définitivement ?',
    parDe: 'Photo de',
    enAttente: 'En attente',
  },
  en: {
    etiquette: 'Members gallery',
    titre: 'The land, photographed by the people who live on it',
    intro:
      'These are the images posted by members of the Observatory: the land, the gatherings, the marks left by the worksite. Every photo goes through a review before it appears here.',
    ajouter: 'Add a photo',
    ongletGalerie: 'Gallery',
    ongletFile: 'To review',
    aucune: 'No photo in the gallery yet',
    aucuneDesc:
      'The first images will arrive as soon as a member posts one. You can open the form and add yours.',
    fileVide: 'Nothing to review',
    fileVideDesc:
      'The queue is empty. Any new photo posted by a member will appear here awaiting your decision.',
    erreur: 'The gallery will not load',
    erreurDesc: 'Access was denied or the connection dropped. Reload the page in a moment.',
    connectez: 'Sign in to post a photo.',
    formTitre: 'Post a photo',
    fFichier: 'Choose an image',
    fFichierAide: 'Image file, 10 MB at most.',
    fLegende: 'Caption',
    fLegendePlaceholder: 'What this image shows',
    fLieu: 'Place (optional)',
    fLieuPlaceholder: 'Lac Simon, Duhamel, chemin de la Rivière',
    envoyer: 'Send the photo',
    envoi: 'Sending',
    annuler: 'Cancel',
    fermer: 'Close',
    precedente: 'Previous photo',
    suivante: 'Next photo',
    manqueFichier: 'Choose an image before sending.',
    manqueLegende: 'The caption is required.',
    echec: 'The upload failed. Try again in a moment.',
    deposee: 'Your photo is in',
    deposeeDesc:
      'It is waiting for a review by the committee before it appears in the gallery. There is nothing else for you to do.',
    approuver: 'Approve',
    refuser: 'Reject',
    supprimer: 'Delete',
    confirmerSuppr: 'Delete this photo for good?',
    parDe: 'Photo by',
    enAttente: 'Awaiting review',
  },
};

type Textes = typeof TEXTES.fr;

const ETIQUETTE = 'text-[10px] font-bold uppercase tracking-widest';

const BOUTON_ROND =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/60 text-slate-200 transition-all hover:border-white/30 hover:bg-black/80';

// --- Visionneuse ------------------------------------------------------------

const Visionneuse: React.FC<{
  photos: Photo[];
  index: number;
  t: Textes;
  onFermer: () => void;
  onDeplacer: (delta: number) => void;
}> = ({ photos, index, t, onFermer, onDeplacer }) => {
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer();
      if (e.key === 'ArrowLeft') onDeplacer(-1);
      if (e.key === 'ArrowRight') onDeplacer(1);
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onFermer, onDeplacer]);

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex flex-col bg-[#02040a]/95 p-4 backdrop-blur-xl md:p-8"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex justify-end">
        <button type="button" onClick={onFermer} className={BOUTON_ROND} aria-label={t.fermer}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center gap-3 md:gap-6">
        <button
          type="button"
          onClick={() => onDeplacer(-1)}
          className={`${BOUTON_ROND} shrink-0`}
          aria-label={t.precedente}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <img
          src={photo.url}
          alt={photo.legende}
          className="mx-auto max-h-full min-h-0 w-auto max-w-full rounded-2xl object-contain"
        />
        <button
          type="button"
          onClick={() => onDeplacer(1)}
          className={`${BOUTON_ROND} shrink-0`}
          aria-label={t.suivante}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto mt-5 w-full max-w-2xl text-center">
        <p className="text-sm leading-relaxed text-slate-200">{photo.legende}</p>
        <p className={`${ETIQUETTE} mt-2 text-slate-500`}>
          {t.parDe} {photo.nomMembre}
          {photo.lieu ? ` · ${photo.lieu}` : ''} · {index + 1}/{photos.length}
        </p>
      </div>
    </div>
  );
};

// --- Formulaire de dépôt ----------------------------------------------------

const ModaleDepot: React.FC<{
  t: Textes;
  uid: string;
  nomMembre: string;
  onFermer: () => void;
  onDepose: () => void;
}> = ({ t, uid, nomMembre, onFermer, onDepose }) => {
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string>('');
  const [legende, setLegende] = useState('');
  const [lieu, setLieu] = useState('');
  const [progression, setProgression] = useState(0);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState('');
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fichier) {
      setApercu('');
      return;
    }
    const url = URL.createObjectURL(fichier);
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [fichier]);

  const envoyer = async () => {
    if (!fichier) {
      setMessage(t.manqueFichier);
      return;
    }
    if (!legende.trim()) {
      setMessage(t.manqueLegende);
      return;
    }
    setEnvoi(true);
    setMessage('');
    try {
      await televerserPhoto(uid, nomMembre, fichier, legende, lieu, setProgression);
      onDepose();
    } catch (e) {
      setMessage((e as Error).message || t.echec);
      setEnvoi(false);
    }
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center">
      <div className="glass-panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-serif text-2xl text-white">{t.formTitre}</h3>
          <button
            type="button"
            onClick={onFermer}
            className="rounded-full p-2 text-slate-500 transition-all hover:text-slate-200"
            aria-label={t.fermer}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => champ.current?.click()}
          className="mt-6 flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 transition-all hover:border-emerald-500/40"
        >
          {apercu ? (
            <img src={apercu} alt="" className="max-h-64 w-auto rounded-2xl object-contain" />
          ) : (
            <>
              <ImagePlus className="h-8 w-8 text-slate-600" />
              <span className="text-sm font-semibold text-slate-300">{t.fFichier}</span>
              <span className="text-xs text-slate-500">{t.fFichierAide}</span>
            </>
          )}
        </button>
        <input
          ref={champ}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
        />

        <label className={`${ETIQUETTE} mt-6 block text-slate-500`} htmlFor="photo-legende">
          {t.fLegende}
        </label>
        <textarea
          id="photo-legende"
          value={legende}
          maxLength={LONGUEUR_MAX_LEGENDE}
          onChange={(e) => setLegende(e.target.value)}
          placeholder={t.fLegendePlaceholder}
          rows={3}
          className="mt-2 w-full resize-none rounded-2xl border border-white/5 bg-black/40 px-4 py-3 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-emerald-500/40"
        />

        <label className={`${ETIQUETTE} mt-4 block text-slate-500`} htmlFor="photo-lieu">
          {t.fLieu}
        </label>
        <input
          id="photo-lieu"
          value={lieu}
          maxLength={LONGUEUR_MAX_LIEU}
          onChange={(e) => setLieu(e.target.value)}
          placeholder={t.fLieuPlaceholder}
          className="mt-2 w-full rounded-2xl border border-white/5 bg-black/40 px-4 py-3 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-emerald-500/40"
        />

        {envoi && (
          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.max(progression, 4)}%` }}
            />
          </div>
        )}

        {message && <p className="mt-4 text-sm text-red-400">{message}</p>}

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={onFermer}
            className="rounded-full border border-white/5 px-5 py-3 text-sm font-semibold text-slate-400 transition-all hover:border-white/10 hover:text-slate-200"
          >
            {t.annuler}
          </button>
          <button
            type="button"
            onClick={envoyer}
            disabled={envoi}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-sm font-semibold text-emerald-300 transition-all hover:border-emerald-500/60 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {envoi ? `${t.envoi} ${progression}%` : t.envoyer}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Etats vides et erreurs -------------------------------------------------

const Panneau: React.FC<{
  icone: React.ReactNode;
  titre: string;
  texte: string;
  danger?: boolean;
}> = ({ icone, titre, texte, danger }) => (
  <div
    className={`glass-card rounded-3xl border p-12 text-center ${
      danger ? 'border-red-500/20' : 'border-white/5'
    }`}
  >
    <div className="mx-auto w-fit">{icone}</div>
    <h3 className="mt-5 text-lg font-semibold text-white">{titre}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">{texte}</p>
  </div>
);

// --- Composant principal ----------------------------------------------------

const Photos: React.FC<PhotosProps> = ({ language, isAdmin }) => {
  const t = TEXTES[language === 'fr' ? 'fr' : 'en'];
  const { profile } = useAuth();
  const admin = isAdmin === true || profile?.role === 'admin';

  const [galerie, setGalerie] = useState<Photo[]>([]);
  const [file, setFile] = useState<Photo[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [onglet, setOnglet] = useState<'galerie' | 'file'>('galerie');
  const [ouverte, setOuverte] = useState<number | null>(null);
  const [depotOuvert, setDepotOuvert] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

  useEffect(() => {
    const desabonner = suivrePhotosApprouvees(
      (photos) => {
        setGalerie(photos);
        setChargement(false);
        setErreur(false);
      },
      () => {
        setChargement(false);
        setErreur(true);
      }
    );
    return () => desabonner();
  }, []);

  useEffect(() => {
    if (!admin) {
      setFile([]);
      return;
    }
    const desabonner = suivreFileModeration(setFile, () => setErreur(true));
    return () => desabonner();
  }, [admin]);

  const deplacer = useCallback(
    (delta: number) =>
      setOuverte((i) =>
        i === null || galerie.length === 0 ? i : (i + delta + galerie.length) % galerie.length
      ),
    [galerie.length]
  );

  const decider = async (photo: Photo, statut: 'approuvee' | 'refusee') => {
    try {
      await changerStatutPhoto(photo.id, statut);
    } catch {
      setErreur(true);
    }
  };

  const effacer = async (photo: Photo) => {
    if (!window.confirm(t.confirmerSuppr)) return;
    try {
      await supprimerPhoto(photo.id, photo.chemin);
    } catch {
      setErreur(true);
    }
  };

  const onglets: Array<{ cle: 'galerie' | 'file'; libelle: string; compte: number }> = [
    { cle: 'galerie', libelle: t.ongletGalerie, compte: galerie.length },
    ...(admin ? [{ cle: 'file' as const, libelle: t.ongletFile, compte: file.length }] : []),
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className={`${ETIQUETTE} text-emerald-400`}>{t.etiquette.toUpperCase()}</p>
          <h2 className="mt-2 font-serif text-3xl text-white md:text-4xl">{t.titre}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{t.intro}</p>
        </div>
        {profile && (
          <button
            type="button"
            onClick={() => {
              setConfirmation(false);
              setDepotOuvert(true);
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition-all hover:border-emerald-500/60 hover:bg-emerald-500/20"
          >
            <ImagePlus className="h-4 w-4" />
            {t.ajouter}
          </button>
        )}
      </header>

      {!profile && <p className="text-sm text-slate-500">{t.connectez}</p>}

      {onglets.length > 1 && (
        <div className="flex gap-2">
          {onglets.map((o) => (
            <button
              key={o.cle}
              type="button"
              onClick={() => setOnglet(o.cle)}
              className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-all ${
                onglet === o.cle
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200'
              }`}
            >
              {o.libelle} · {o.compte}
            </button>
          ))}
        </div>
      )}

      {confirmation && (
        <div className="glass-card rounded-3xl border border-emerald-500/20 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">{t.deposee}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{t.deposeeDesc}</p>
            </div>
          </div>
        </div>
      )}

      {erreur && (
        <Panneau
          danger
          icone={<AlertTriangle className="h-8 w-8 text-red-400" />}
          titre={t.erreur}
          texte={t.erreurDesc}
        />
      )}

      {chargement && !erreur && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        </div>
      )}

      {onglet === 'galerie' && !chargement && !erreur && galerie.length === 0 && (
        <Panneau
          icone={<Images className="h-10 w-10 text-slate-600" />}
          titre={t.aucune}
          texte={t.aucuneDesc}
        />
      )}

      {onglet === 'galerie' && galerie.length > 0 && (
        <div className="columns-2 gap-4 md:columns-3 [&>*]:mb-4">
          {galerie.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setOuverte(i)}
              className="group relative block w-full break-inside-avoid overflow-hidden rounded-2xl border border-white/5 transition-all hover:border-white/10"
            >
              <img
                src={photo.url}
                alt={photo.legende}
                loading="lazy"
                width={photo.largeur || undefined}
                height={photo.hauteur || undefined}
                className="w-full object-cover transition-all group-hover:scale-[1.02]"
              />
              <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/20 to-transparent p-4 text-left opacity-0 transition-all group-hover:opacity-100">
                <span className="text-sm leading-snug text-white">{photo.legende}</span>
                <span className={`${ETIQUETTE} mt-1.5 text-slate-400`}>
                  {photo.nomMembre}
                  {photo.lieu ? ` · ${photo.lieu}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {onglet === 'file' && admin && file.length === 0 && !erreur && (
        <Panneau
          icone={<ShieldCheck className="h-10 w-10 text-slate-600" />}
          titre={t.fileVide}
          texte={t.fileVideDesc}
        />
      )}

      {onglet === 'file' && admin && file.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {file.map((photo) => (
            <li
              key={photo.id}
              className="glass-card overflow-hidden rounded-3xl border border-amber-500/20"
            >
              <img src={photo.url} alt={photo.legende} className="max-h-72 w-full object-cover" />
              <div className="p-5">
                <p className={`${ETIQUETTE} text-amber-400`}>{t.enAttente.toUpperCase()}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">{photo.legende}</p>
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {photo.nomMembre}
                  {photo.lieu ? ` · ${photo.lieu}` : ''}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => decider(photo, 'approuvee')}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition-all hover:border-emerald-500/60"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {t.approuver}
                  </button>
                  <button
                    type="button"
                    onClick={() => decider(photo, 'refusee')}
                    className="inline-flex items-center gap-2 rounded-full border border-white/5 px-4 py-2 text-xs font-semibold text-slate-400 transition-all hover:border-white/10 hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t.refuser}
                  </button>
                  <button
                    type="button"
                    onClick={() => effacer(photo)}
                    className="inline-flex items-center gap-2 rounded-full border border-red-500/20 px-4 py-2 text-xs font-semibold text-red-400 transition-all hover:border-red-500/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t.supprimer}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {ouverte !== null && (
        <Visionneuse
          photos={galerie}
          index={ouverte}
          t={t}
          onFermer={() => setOuverte(null)}
          onDeplacer={deplacer}
        />
      )}

      {depotOuvert && profile && (
        <ModaleDepot
          t={t}
          uid={profile.uid}
          nomMembre={profile.displayName || 'Membre'}
          onFermer={() => setDepotOuvert(false)}
          onDepose={() => {
            setDepotOuvert(false);
            setConfirmation(true);
          }}
        />
      )}
    </div>
  );
};

export default Photos;
