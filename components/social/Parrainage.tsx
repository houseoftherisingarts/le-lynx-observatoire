import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Link2,
  Loader2,
  Share2,
  UserCheck,
  Users,
} from 'lucide-react';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { avatarTone } from '../../services/socialService';
import {
  FicheParrainage,
  LONGUEUR_CODE,
  assurerCode,
  codeDepuisUrl,
  lienInvitation,
  normaliserCode,
  oublierCodeGarde,
  reclamerParrain,
  suivreMonParrainage,
} from '../../services/parrainageService';

/**
 * Le parrainage vu par le membre : son code, le lien a partager, le compte des
 * personnes qu'il a amenees, et le champ qui sert a inscrire la personne qui
 * l'a amene lui.
 */

interface ParrainageProps {
  language: Language;
}

const TEXTES = {
  fr: {
    etiquette: 'Parrainage',
    titre: 'Votre code ouvre la porte du réseau',
    intro:
      "Chaque personne de plus dans le réseau reçoit la veille du dossier de La Loutre le matin même où elle paraît. C'est aussi une voix de plus dans la salle le soir où le conseil met la mine à l'ordre du jour.",
    connectez: 'Connectez-vous pour recevoir votre code',
    connectezDesc:
      "Le code se crée au moment où vous ouvrez votre compte. Il vous suit ensuite partout dans l'Observatoire.",
    chargement: 'Préparation de votre code',
    erreur: 'Le parrainage ne se charge pas',
    erreurDesc:
      'La connexion au registre a été coupée. Rechargez la page dans un instant et le code reviendra tel quel.',
    monCode: 'Mon code',
    lienTitre: "Lien d'invitation",
    copier: 'Copier le lien',
    copie: 'Lien copié',
    copierCode: 'Copier le code',
    partager: 'Partager',
    amenees: 'Personnes amenées',
    amenee: 'Personne amenée',
    aucunFilleul: 'Personne pour le moment',
    aucunFilleulDesc:
      "Votre lien n'a encore été utilisé par personne. Envoyez-le à un voisin qui suit le dossier de loin.",
    listeTitre: 'Celles et ceux que vous avez amenés',
    monParrainTitre: 'La personne qui vous a amené',
    monParrainVide: 'Vous êtes arrivé par vos propres moyens',
    monParrainVideDesc:
      'Si quelqu’un vous a transmis un code, inscrivez-le ici. Cela ne se fait qu’une fois.',
    champLabel: 'Code reçu',
    champAide: `Six caractères, sans les lettres I et O ni les chiffres 0 et 1.`,
    valider: 'Inscrire ce code',
    validation: 'Vérification',
    inscrit: 'Le code est inscrit.',
    depuisLe: 'depuis le',
  },
  en: {
    etiquette: 'Sponsorship',
    titre: 'Your code opens the door to the network',
    intro:
      'Every additional person in the network receives the La Loutre watch on the very morning it is published. That is also one more voice in the room the night the council puts the mine on its agenda.',
    connectez: 'Sign in to receive your code',
    connectezDesc:
      'The code is created the moment you open your account. It then follows you everywhere in the Observatory.',
    chargement: 'Preparing your code',
    erreur: 'Sponsorship is not loading',
    erreurDesc:
      'The connection to the register was cut. Reload the page in a moment and the code will come back unchanged.',
    monCode: 'My code',
    lienTitre: 'Invitation link',
    copier: 'Copy the link',
    copie: 'Link copied',
    copierCode: 'Copy the code',
    partager: 'Share',
    amenees: 'People brought in',
    amenee: 'Person brought in',
    aucunFilleul: 'Nobody yet',
    aucunFilleulDesc:
      'Your link has not been used by anyone yet. Send it to a neighbour who follows the file from a distance.',
    listeTitre: 'The people you brought in',
    monParrainTitre: 'The person who brought you in',
    monParrainVide: 'You arrived on your own',
    monParrainVideDesc:
      'If someone passed you a code, enter it here. This happens only once.',
    champLabel: 'Code received',
    champAide: 'Six characters, without the letters I and O or the digits 0 and 1.',
    valider: 'Register this code',
    validation: 'Checking',
    inscrit: 'The code is registered.',
    depuisLe: 'since',
  },
};

type Textes = Record<keyof typeof TEXTES.fr, string>;

const ETIQUETTE = 'text-[10px] font-bold uppercase tracking-widest';

const CARTE = 'glass-card rounded-3xl border border-white/5 p-6 transition-colors hover:border-white/10 md:p-8';

const dateCourte = (millis: number | null, language: Language): string => {
  if (millis === null) return '';
  return new Date(millis).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const Initiale: React.FC<{ nom: string; uid: string }> = ({ nom, uid }) => (
  <span
    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarTone(uid)}`}
    aria-hidden="true"
  >
    {nom.trim().charAt(0).toUpperCase() || '?'}
  </span>
);

const Parrainage: React.FC<ParrainageProps> = ({ language }) => {
  const { profile } = useAuth();
  const t: Textes = language === 'fr' ? TEXTES.fr : TEXTES.en;

  const [fiche, setFiche] = useState<FicheParrainage | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [saisie, setSaisie] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [messageCode, setMessageCode] = useState('');
  const [succesCode, setSuccesCode] = useState(false);

  const [copie, setCopie] = useState<'lien' | 'code' | null>(null);
  const minuterie = useRef<number | null>(null);

  const uid = profile?.uid ?? '';

  useEffect(() => {
    setSaisie(codeDepuisUrl());
  }, []);

  useEffect(() => {
    if (!profile) {
      setFiche(null);
      setChargement(false);
      return;
    }

    let vivant = true;
    setChargement(true);
    setErreur('');

    const desabonner = suivreMonParrainage(
      profile.uid,
      (recue) => {
        if (!vivant) return;
        setFiche(recue);
        if (recue) setChargement(false);
      },
      (message) => {
        if (!vivant) return;
        setErreur(message);
        setChargement(false);
      },
    );

    assurerCode(profile)
      .then((creee) => {
        if (!vivant) return;
        setFiche((precedente) => precedente ?? creee);
        setChargement(false);
      })
      .catch((e: unknown) => {
        if (!vivant) return;
        setErreur(e instanceof Error ? e.message : t.erreurDesc);
        setChargement(false);
      });

    return () => {
      vivant = false;
      desabonner();
    };
  }, [profile, t.erreurDesc]);

  useEffect(
    () => () => {
      if (minuterie.current !== null) window.clearTimeout(minuterie.current);
    },
    [],
  );

  const lien = useMemo(() => (fiche?.code ? lienInvitation(fiche.code) : ''), [fiche?.code]);

  const marquerCopie = useCallback((quoi: 'lien' | 'code') => {
    setCopie(quoi);
    if (minuterie.current !== null) window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(() => setCopie(null), 2400);
  }, []);

  const copier = useCallback(
    async (texte: string, quoi: 'lien' | 'code') => {
      if (!texte) return;
      try {
        await navigator.clipboard.writeText(texte);
        marquerCopie(quoi);
      } catch {
        // Le presse-papiers est refuse par le navigateur. Le lien reste
        // visible et selectionnable juste au-dessus du bouton.
        setMessageCode('');
      }
    },
    [marquerCopie],
  );

  const partager = useCallback(async () => {
    if (!lien) return;
    const partage = (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share;
    if (!partage) {
      await copier(lien, 'lien');
      return;
    }
    try {
      await partage.call(navigator, { title: 'Le Lynx', url: lien });
    } catch {
      // Partage annule par la personne : il n'y a rien a signaler.
    }
  }, [copier, lien]);

  const soumettreCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!profile || envoi) return;

      const propre = normaliserCode(saisie);
      if (!propre) {
        setSuccesCode(false);
        setMessageCode(t.champAide);
        return;
      }

      setEnvoi(true);
      setMessageCode('');
      try {
        await reclamerParrain(propre, profile);
        oublierCodeGarde();
        setSaisie('');
        setSuccesCode(true);
        setMessageCode(t.inscrit);
      } catch (erreurCode: unknown) {
        setSuccesCode(false);
        setMessageCode(erreurCode instanceof Error ? erreurCode.message : t.erreurDesc);
      } finally {
        setEnvoi(false);
      }
    },
    [envoi, profile, saisie, t.champAide, t.erreurDesc, t.inscrit],
  );

  const entete = (
    <header className="max-w-2xl">
      <p className={`${ETIQUETTE} text-emerald-400`}>{t.etiquette.toUpperCase()}</p>
      <h2 className="mt-2 font-serif text-3xl text-white md:text-4xl">{t.titre}</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{t.intro}</p>
    </header>
  );

  if (!profile) {
    return (
      <div className="animate-fade-in space-y-8">
        {entete}
        <div className={`${CARTE} text-center`}>
          <Users className="mx-auto h-8 w-8 text-slate-600" aria-hidden="true" />
          <p className="mt-4 text-base font-semibold text-white">{t.connectez}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
            {t.connectezDesc}
          </p>
        </div>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="animate-fade-in space-y-8">
        {entete}
        <div className={`${CARTE} border-red-500/20 text-center`}>
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" aria-hidden="true" />
          <p className="mt-4 text-base font-semibold text-white">{t.erreur}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
            {t.erreurDesc}
          </p>
        </div>
      </div>
    );
  }

  if (chargement && !fiche) {
    return (
      <div className="animate-fade-in space-y-8">
        {entete}
        <div className={`${CARTE} flex items-center justify-center gap-3 text-slate-400`}>
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span className="text-sm">{t.chargement}</span>
        </div>
      </div>
    );
  }

  const filleuls = fiche?.filleuls ?? [];
  const nb = fiche?.nbFilleuls ?? 0;

  return (
    <div className="animate-fade-in space-y-8">
      {entete}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className={`${CARTE} border-emerald-500/20`}>
          <p className={`${ETIQUETTE} text-emerald-400`}>{t.monCode.toUpperCase()}</p>
          <p className="mt-4 break-all font-mono text-4xl font-bold tracking-[0.28em] text-emerald-300 md:text-6xl">
            {fiche?.code || '······'}
          </p>

          <div className="mt-8">
            <p className={`${ETIQUETTE} text-slate-500`}>{t.lienTitre.toUpperCase()}</p>
            <p className="mt-2 break-all rounded-2xl border border-white/5 bg-black/40 px-4 py-3 font-mono text-xs text-slate-300 md:text-sm">
              {lien}
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void copier(lien, 'lien')}
              disabled={!lien}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition-all hover:border-emerald-500/60 hover:bg-emerald-500/20 disabled:opacity-40"
            >
              {copie === 'lien' ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copie === 'lien' ? t.copie : t.copier}
            </button>

            <button
              type="button"
              onClick={() => void copier(fiche?.code ?? '', 'code')}
              disabled={!fiche?.code}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition-all hover:border-white/25 hover:bg-white/10 disabled:opacity-40"
            >
              {copie === 'code' ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Link2 className="h-4 w-4" aria-hidden="true" />
              )}
              {copie === 'code' ? t.copie : t.copierCode}
            </button>

            <button
              type="button"
              onClick={() => void partager()}
              disabled={!lien}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition-all hover:border-white/25 hover:bg-white/10 disabled:opacity-40"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {t.partager}
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className={CARTE}>
            <p className={`${ETIQUETTE} text-slate-500`}>
              {(nb === 1 ? t.amenee : t.amenees).toUpperCase()}
            </p>
            <p className="mt-3 font-serif text-5xl text-white md:text-6xl">{nb}</p>
          </div>

          <div className={CARTE}>
            <p className={`${ETIQUETTE} text-violet-300`}>{t.monParrainTitre.toUpperCase()}</p>

            {fiche?.parrainUid ? (
              <div className="mt-4 flex items-center gap-3">
                <Initiale nom={fiche.parrainNom ?? 'Membre'} uid={fiche.parrainUid} />
                <span className="text-sm font-semibold text-white">{fiche.parrainNom}</span>
                <UserCheck className="ml-auto h-4 w-4 text-emerald-400" aria-hidden="true" />
              </div>
            ) : (
              <form className="mt-4" onSubmit={soumettreCode}>
                <p className="text-sm font-semibold text-white">{t.monParrainVide}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.monParrainVideDesc}</p>

                <label
                  className={`${ETIQUETTE} mt-5 block text-slate-500`}
                  htmlFor="champ-code-parrain"
                >
                  {t.champLabel.toUpperCase()}
                </label>
                <input
                  id="champ-code-parrain"
                  value={saisie}
                  onChange={(e) => setSaisie(e.target.value.toUpperCase().slice(0, LONGUEUR_CODE))}
                  maxLength={LONGUEUR_CODE}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="ABC234"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-lg tracking-[0.2em] text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                />
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{t.champAide}</p>

                <button
                  type="submit"
                  disabled={envoi}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition-all hover:border-emerald-500/60 hover:bg-emerald-500/20 disabled:opacity-40"
                >
                  {envoi && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {envoi ? t.validation : t.valider}
                </button>

                {messageCode && (
                  <p
                    role="status"
                    className={`mt-3 text-sm leading-relaxed ${succesCode ? 'text-emerald-300' : 'text-red-300'}`}
                  >
                    {messageCode}
                  </p>
                )}
              </form>
            )}
          </div>
        </section>
      </div>

      <section className={CARTE}>
        <p className={`${ETIQUETTE} text-slate-500`}>{t.listeTitre.toUpperCase()}</p>

        {filleuls.length === 0 ? (
          <div className="py-10 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-600" aria-hidden="true" />
            <p className="mt-4 text-base font-semibold text-white">{t.aucunFilleul}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              {t.aucunFilleulDesc}
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {filleuls.map((filleul) => (
              <li
                key={filleul.uid}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 px-4 py-3 transition-colors hover:border-white/10"
              >
                <Initiale nom={filleul.nom} uid={filleul.uid} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                  {filleul.nom}
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {filleul.depuis
                    ? `${t.depuisLe} ${dateCourte(filleul.depuis.toMillis(), language)}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Parrainage;
