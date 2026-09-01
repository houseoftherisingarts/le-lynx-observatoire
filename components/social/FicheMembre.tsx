import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  Camera,
  Handshake,
  Loader,
  MapPin,
  Mail,
  Pencil,
  Save,
  UserX,
  X,
} from 'lucide-react';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  MembreFiche,
  MUNICIPALITES,
  hueDepuisUid,
  majFicheMembre,
  suivreMembre,
  televerserAvatar,
} from '../../services/membresService';

const T = {
  fr: {
    verifie: 'Vérifié',
    engagement: 'Engagement',
    competences: 'Compétences',
    ecrire: 'Écrire',
    allier: 'Proposer une alliance',
    editer: 'Modifier ma fiche',
    enregistrer: 'Enregistrer',
    annuler: 'Annuler',
    nom: 'Nom',
    municipalite: 'Municipalité',
    devise: 'Devise',
    competencesAide: 'Séparez chaque compétence par une virgule.',
    photo: 'Changer la photo',
    aucune: 'Fiche introuvable',
    aucuneTexte:
      "Cette personne n'a pas encore ouvert sa fiche. Elle apparaîtra dans l'annuaire dès sa première connexion au réseau.",
    erreur: 'Lecture impossible',
    erreurTexte:
      'Votre compte ne peut pas lire cette fiche pour le moment. Reconnectez-vous et la fiche reviendra.',
    chargement: 'Chargement de la fiche',
    choisir: 'Choisir une municipalité',
    sansMunicipalite: 'Municipalité non précisée',
    sauvegardeKo: 'L’enregistrement n’a pas abouti. Reprenez dans un moment.',
    photoType: 'Choisissez un fichier image.',
    photoTaille: 'L’image dépasse 5 Mo. Choisissez une version plus légère.',
    photoKo: 'Le téléversement n’a pas abouti. Reprenez dans un moment.',
  },
  en: {
    verifie: 'Verified',
    engagement: 'Commitment',
    competences: 'Skills',
    ecrire: 'Write',
    allier: 'Propose an alliance',
    editer: 'Edit my profile',
    enregistrer: 'Save',
    annuler: 'Cancel',
    nom: 'Name',
    municipalite: 'Municipality',
    devise: 'Motto',
    competencesAide: 'Separate each skill with a comma.',
    photo: 'Change photo',
    aucune: 'Profile not found',
    aucuneTexte:
      'This person has not opened a profile yet. It will appear in the directory on their first connection.',
    erreur: 'Unable to read',
    erreurTexte: 'Your account cannot read this profile right now. Sign in again and it will come back.',
    chargement: 'Loading profile',
    choisir: 'Choose a municipality',
    sansMunicipalite: 'Municipality not given',
    sauvegardeKo: 'The save did not go through. Try again in a moment.',
    photoType: 'Pick an image file.',
    photoTaille: 'The image is over 5 MB. Pick a lighter version.',
    photoKo: 'The upload did not go through. Try again in a moment.',
  },
};

const textes = (language: Language) => (language === 'fr' ? T.fr : T.en);

const AVATAR_MAX_OCTETS = 5 * 1024 * 1024;

export interface FicheMembreProps {
  uid: string;
  language: Language;
  mode?: 'compact' | 'plein';
  /** Fiche déjà chargée par le parent. Sans elle, la carte s'abonne elle-même. */
  fiche?: MembreFiche | null;
  onOuvrir?: (uid: string) => void;
  onEcrire?: (uid: string) => void;
  onAllier?: (uid: string) => void;
}

const initiales = (nom: string): string =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? '')
    .join('') || '?';

const Avatar: React.FC<{ fiche: MembreFiche; taille: number }> = ({ fiche, taille }) => {
  const fond = `hsl(${fiche.avatarHue}, 45%, 22%)`;
  if (fiche.avatarUrl) {
    return (
      <img
        src={fiche.avatarUrl}
        alt={fiche.nom}
        style={{ width: taille, height: taille }}
        className="rounded-full object-cover border border-white/10 bg-slate-900"
      />
    );
  }
  return (
    <div
      style={{ width: taille, height: taille, background: fond, fontSize: Math.max(11, taille / 2.6) }}
      className="rounded-full border border-white/10 flex items-center justify-center font-bold text-white"
    >
      {initiales(fiche.nom)}
    </div>
  );
};

const Jauge: React.FC<{ valeur: number }> = ({ valeur }) => (
  <div className="flex gap-1" aria-label={`${valeur} / 5`}>
    {[1, 2, 3, 4, 5].map((cran) => (
      <span
        key={cran}
        className={`h-1.5 w-6 rounded-full transition-all ${
          cran <= valeur ? 'bg-emerald-500' : 'bg-white/10'
        }`}
      />
    ))}
  </div>
);

const Etiquette: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{children}</p>
);

const champClasse =
  'w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 transition-all';

const FicheMembre: React.FC<FicheMembreProps> = ({
  uid,
  language,
  mode = 'plein',
  fiche: ficheParent,
  onOuvrir,
  onEcrire,
  onAllier,
}) => {
  const t = textes(language);
  const { profile, loading: authEnCours } = useAuth();
  const [ficheLue, setFicheLue] = useState<MembreFiche | null>(null);
  const [chargement, setChargement] = useState(ficheParent === undefined);
  const [erreur, setErreur] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);
  const [edition, setEdition] = useState(false);
  const [travail, setTravail] = useState(false);
  const fichierRef = useRef<HTMLInputElement | null>(null);

  const [nom, setNom] = useState('');
  const [municipalite, setMunicipalite] = useState('');
  const [devise, setDevise] = useState('');
  const [competences, setCompetences] = useState('');
  const [engagement, setEngagement] = useState(1);

  useEffect(() => {
    if (ficheParent !== undefined) return;
    if (authEnCours) return;
    // Lecture réservée aux comptes connectés : sans compte, l'écouteur serait
    // refusé, alors on affiche directement l'état de lecture impossible.
    if (!profile) {
      setFicheLue(null);
      setErreur(true);
      setChargement(false);
      return;
    }
    setChargement(true);
    const stop = suivreMembre(
      uid,
      (recue) => {
        setFicheLue(recue);
        setErreur(false);
        setChargement(false);
      },
      () => {
        setErreur(true);
        setChargement(false);
      },
    );
    return stop;
  }, [uid, ficheParent, authEnCours, profile?.uid]);

  const fiche = ficheParent !== undefined ? ficheParent : ficheLue;
  const estMoi = profile?.uid === uid;

  const ouvrirEdition = useCallback(() => {
    if (!fiche) return;
    setNom(fiche.nom);
    setMunicipalite(fiche.municipalite ?? '');
    setDevise(fiche.devise ?? '');
    setCompetences((fiche.competences ?? []).join(', '));
    setEngagement(fiche.engagement);
    setEdition(true);
  }, [fiche]);

  const enregistrer = async () => {
    if (!fiche || travail) return;
    setTravail(true);
    try {
      await majFicheMembre(uid, {
        nom,
        municipalite,
        devise,
        engagement,
        competences: competences.split(',').map((morceau) => morceau.trim()).filter(Boolean),
      });
      setEdition(false);
      setAvis(null);
    } catch {
      setAvis(t.sauvegardeKo);
    } finally {
      setTravail(false);
    }
  };

  const changerPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = event.target.files?.[0];
    event.target.value = '';
    if (!fichier || travail) return;
    if (!fichier.type.startsWith('image/')) {
      setAvis(t.photoType);
      return;
    }
    if (fichier.size > AVATAR_MAX_OCTETS) {
      setAvis(t.photoTaille);
      return;
    }
    setTravail(true);
    try {
      await televerserAvatar(uid, fichier);
      setAvis(null);
    } catch {
      setAvis(t.photoKo);
    } finally {
      setTravail(false);
    }
  };

  const banniere = useMemo(() => {
    const hue = fiche?.avatarHue ?? hueDepuisUid(uid);
    return {
      background: `linear-gradient(120deg, hsla(${hue}, 55%, 40%, 0.35), hsla(${
        (hue + 45) % 360
      }, 45%, 20%, 0.15) 60%, transparent)`,
    };
  }, [fiche?.avatarHue, uid]);

  if (mode === 'compact') {
    if (!fiche) {
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-500">
          {chargement ? t.chargement : t.aucune}
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onOuvrir?.(uid)}
        className="glass-card inline-flex items-center gap-2 rounded-full border border-white/5 hover:border-white/10 pl-1 pr-3 py-1 transition-all"
      >
        <Avatar fiche={fiche} taille={28} />
        <span className="text-sm text-slate-200 max-w-[10rem] truncate">{fiche.nom}</span>
        {fiche.verifie && <BadgeCheck size={14} className="text-emerald-500 shrink-0" />}
      </button>
    );
  }

  if (chargement) {
    return (
      <div className="glass-card rounded-3xl border border-white/5 p-8 flex items-center justify-center gap-3 text-slate-500">
        <Loader size={18} className="animate-spin" />
        <span className="text-sm">{t.chargement}</span>
      </div>
    );
  }

  if (erreur && !fiche) {
    return (
      <div className="glass-card rounded-3xl border border-white/5 p-8 text-center animate-fade-in">
        <UserX size={32} className="mx-auto text-slate-600" />
        <h3 className="mt-4 text-white font-serif text-xl">{t.erreur}</h3>
        <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">{t.erreurTexte}</p>
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="glass-card rounded-3xl border border-white/5 p-8 text-center animate-fade-in">
        <UserX size={32} className="mx-auto text-slate-600" />
        <h3 className="mt-4 text-white font-serif text-xl">{t.aucune}</h3>
        <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">{t.aucuneTexte}</p>
      </div>
    );
  }

  return (
    <article className="glass-card rounded-3xl border border-white/5 hover:border-white/10 transition-all overflow-hidden animate-fade-in">
      <div className="h-20 w-full" style={banniere} />

      <div className="px-5 pb-5 -mt-10">
        <div className="flex items-end justify-between gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => onOuvrir?.(uid)}
              disabled={!onOuvrir}
              className="block rounded-full transition-all hover:opacity-90 disabled:cursor-default"
            >
              <Avatar fiche={fiche} taille={72} />
            </button>
            {estMoi && (
              <>
                <button
                  type="button"
                  onClick={() => fichierRef.current?.click()}
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-emerald-500 text-black flex items-center justify-center hover:bg-emerald-400 transition-all"
                  title={t.photo}
                  aria-label={t.photo}
                >
                  {travail ? <Loader size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
                <input
                  ref={fichierRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={changerPhoto}
                />
              </>
            )}
          </div>

          {estMoi && !edition && (
            <button
              type="button"
              onClick={ouvrirEdition}
              className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
            >
              <Pencil size={13} />
              {t.editer}
            </button>
          )}
        </div>

        {edition ? (
          <div className="mt-4 space-y-3">
            <div>
              <Etiquette>{t.nom}</Etiquette>
              <input
                className={`${champClasse} mt-1`}
                value={nom}
                maxLength={120}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>
            <div>
              <Etiquette>{t.municipalite}</Etiquette>
              <select
                className={`${champClasse} mt-1`}
                value={municipalite}
                onChange={(e) => setMunicipalite(e.target.value)}
              >
                <option value="">{t.choisir}</option>
                {MUNICIPALITES.map((ville) => (
                  <option key={ville} value={ville}>
                    {ville}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Etiquette>{t.devise}</Etiquette>
              <input
                className={`${champClasse} mt-1`}
                value={devise}
                maxLength={160}
                onChange={(e) => setDevise(e.target.value)}
              />
            </div>
            <div>
              <Etiquette>{t.competences}</Etiquette>
              <input
                className={`${champClasse} mt-1`}
                value={competences}
                onChange={(e) => setCompetences(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-500">{t.competencesAide}</p>
            </div>
            <div>
              <Etiquette>{t.engagement}</Etiquette>
              <div className="mt-2 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((cran) => (
                  <button
                    key={cran}
                    type="button"
                    onClick={() => setEngagement(cran)}
                    className={`h-8 w-8 rounded-full text-xs font-bold transition-all ${
                      cran <= engagement
                        ? 'bg-emerald-500 text-black'
                        : 'bg-white/5 text-slate-500 hover:bg-white/10'
                    }`}
                  >
                    {cran}
                  </button>
                ))}
              </div>
            </div>

            {avis && <p className="text-xs text-red-400">{avis}</p>}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={enregistrer}
                disabled={travail || !nom.trim()}
                className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400 disabled:opacity-40 transition-all"
              >
                {travail ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                {t.enregistrer}
              </button>
              <button
                type="button"
                onClick={() => setEdition(false)}
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white hover:border-white/20 transition-all"
              >
                <X size={14} />
                {t.annuler}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="min-w-0 truncate text-white font-serif text-xl leading-tight">{fiche.nom}</h3>
              {fiche.verifie && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 shrink-0">
                  <BadgeCheck size={12} />
                  {t.verifie}
                </span>
              )}
            </div>

            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin size={12} />
              {fiche.municipalite || t.sansMunicipalite}
            </p>

            {fiche.devise && (
              <p className="mt-3 break-words text-sm text-slate-300 leading-relaxed">{fiche.devise}</p>
            )}

            <div className="mt-4">
              <Etiquette>{t.engagement}</Etiquette>
              <div className="mt-2">
                <Jauge valeur={fiche.engagement} />
              </div>
            </div>

            {fiche.competences && fiche.competences.length > 0 && (
              <div className="mt-4">
                <Etiquette>{t.competences}</Etiquette>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {fiche.competences.map((competence) => (
                    <span
                      key={competence}
                      className="max-w-full break-words rounded-full bg-white/5 border border-white/5 px-2.5 py-1 text-[11px] text-slate-300"
                    >
                      {competence}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!estMoi && (onEcrire || onAllier) && (
              <div className="mt-5 flex flex-wrap gap-2">
                {onEcrire && (
                  <button
                    type="button"
                    onClick={() => onEcrire(uid)}
                    className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400 transition-all"
                  >
                    <Mail size={14} />
                    {t.ecrire}
                  </button>
                )}
                {onAllier && (
                  <button
                    type="button"
                    onClick={() => onAllier(uid)}
                    className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
                  >
                    <Handshake size={14} />
                    {t.allier}
                  </button>
                )}
              </div>
            )}

            {avis && <p className="mt-3 text-xs text-red-400">{avis}</p>}
          </div>
        )}
      </div>
    </article>
  );
};

export default FicheMembre;
