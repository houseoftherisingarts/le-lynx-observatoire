import React, { useEffect, useMemo, useState } from 'react';
import { Award, Loader, ScrollText, Trophy, UserPlus, WifiOff } from 'lucide-react';
import { Language } from '../../types';
import { avatarTone, timeAgo } from '../../services/socialService';
import { MembreFiche, suivreAnnuaire } from '../../services/membresService';
import {
  BAREME,
  CATEGORIES,
  EntreeJournal,
  FicheEngagement,
  POINTS_MAX,
  POINTS_MIN,
  accorderPoints,
  libelleMotif,
  rangDe,
  suivreClassement,
  suivreJournal,
  suivreMonEngagement,
} from '../../services/pointsService';

const T = {
  fr: {
    etiquette: 'Points d’engagement',
    titre: 'Qui porte le travail',
    intro:
      'Ces points ne s’échangent contre rien et n’ouvrent aucune récompense. Ils mesurent la contribution à la lutte contre le projet La Loutre, pour que le réseau voie qui tient la ligne et vers qui se tourner quand il faut du monde.',
    monTotal: 'Mon total',
    point: 'point',
    points: 'points',
    monRang: 'Mon rang',
    horsClassement: 'Pas encore classé',
    repartition: 'Répartition par catégorie',
    ongletClassement: 'Classement',
    ongletJournal: 'Mon journal',
    ongletAccorder: 'Accorder des points',
    classementTitre: 'Les vingt premières personnes',
    moi: 'Vous',
    chargement: 'Chargement des points',
    videTitre: 'Le compteur commence à zéro',
    videTexte:
      'Aucun point n’a encore été accordé. Le classement se remplira dès que les premiers gestes seront inscrits par l’administration.',
    journalVideTitre: 'Votre journal est vide',
    journalVideTexte:
      'Aucun geste n’a encore été porté à votre compte. Publiez sur le mur, confirmez une présence ou fondez une cellule, et les lignes apparaîtront ici.',
    erreurTitre: 'Points indisponibles',
    erreurTexte:
      'La lecture des points a échoué. Reconnectez-vous à votre compte et le classement reviendra.',
    fermeTitre: 'Réservé aux membres',
    fermeTexte:
      'Les points d’engagement s’ouvrent une fois que vous êtes connecté à votre compte. Connectez-vous et votre total apparaît.',
    formTitre: 'Accorder des points',
    formTexte:
      'Choisissez la personne, le geste qu’elle a posé et la valeur au barème. La ligne s’inscrit à son journal et son total monte aussitôt.',
    champPersonne: 'Personne',
    champPersonneVide: 'Choisissez une personne',
    champMotif: 'Geste posé',
    champPoints: 'Points',
    champDetail: 'Précision (facultatif)',
    detailExemple: 'Assemblée du 14 mars, prise de parole sur le forage',
    accorder: 'Accorder',
    envoiEnCours: 'Inscription en cours',
    succes: 'Points accordés à',
    erreurEcriture: 'L’inscription a échoué.',
    errCible: 'Choisissez la personne qui reçoit les points.',
    errMotif: 'Ce geste ne figure pas au barème.',
    errZero: 'Un geste vaut plus que zéro point.',
    errBornes: `Les points restent entre ${POINTS_MIN} et ${POINTS_MAX}.`,
    bareme: 'Barème :',
    annuaireVide:
      'Aucune fiche de membre n’est encore ouverte. Le formulaire s’activera dès qu’une personne aura rempli la sienne.',
  },
  en: {
    etiquette: 'Engagement points',
    titre: 'Who carries the work',
    intro:
      'These points buy nothing and unlock no reward. They measure the contribution to the fight against the La Loutre project, so the network can see who holds the line and who to call when people are needed.',
    monTotal: 'My total',
    point: 'point',
    points: 'points',
    monRang: 'My rank',
    horsClassement: 'Not ranked yet',
    repartition: 'Breakdown by category',
    ongletClassement: 'Standings',
    ongletJournal: 'My log',
    ongletAccorder: 'Award points',
    classementTitre: 'The first twenty people',
    moi: 'You',
    chargement: 'Loading the points',
    videTitre: 'The count starts at zero',
    videTexte:
      'No point has been awarded yet. The standings will fill up as soon as the first gestures are recorded by the administration.',
    journalVideTitre: 'Your log is empty',
    journalVideTexte:
      'No gesture has been credited to you yet. Post on the wall, confirm an attendance or found a cell, and the lines will appear here.',
    erreurTitre: 'Points unavailable',
    erreurTexte: 'Reading the points failed. Sign in again and the standings will come back.',
    fermeTitre: 'Members only',
    fermeTexte:
      'Engagement points open once you are signed in to your account. Sign in and your total appears.',
    formTitre: 'Award points',
    formTexte:
      'Pick the person, the gesture they made and the value on the scale. The line goes into their log and their total rises right away.',
    champPersonne: 'Person',
    champPersonneVide: 'Choose a person',
    champMotif: 'Gesture',
    champPoints: 'Points',
    champDetail: 'Detail (optional)',
    detailExemple: 'March 14 assembly, spoke about the drilling',
    accorder: 'Award',
    envoiEnCours: 'Recording',
    succes: 'Points awarded to',
    erreurEcriture: 'Recording failed.',
    errCible: 'Choose the person who receives the points.',
    errMotif: 'This gesture is not on the scale.',
    errZero: 'A gesture is worth more than zero points.',
    errBornes: `Points stay between ${POINTS_MIN} and ${POINTS_MAX}.`,
    bareme: 'Scale:',
    annuaireVide:
      'No member profile has been opened yet. The form will activate as soon as someone fills theirs in.',
  },
};

const textes = (language: Language) => (language === 'fr' ? T.fr : T.en);
const langueCourte = (language: Language): 'fr' | 'en' => (language === 'fr' ? 'fr' : 'en');

const TEINTES = ['bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600', 'bg-emerald-700'];

const initiales = (nom: string): string =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot.charAt(0).toUpperCase())
    .join('') || '?';

const TOP = 20;
const LISTE = 100;

/** Les refus du service, traduits dans la langue de la personne qui regarde. */
const CODES: Record<string, 'errCible' | 'errMotif' | 'errZero' | 'errBornes'> = {
  'points/cible': 'errCible',
  'points/motif': 'errMotif',
  'points/zero': 'errZero',
  'points/bornes': 'errBornes',
};

export interface EngagementProps {
  language: Language;
  uid?: string;
  isAdmin?: boolean;
}

const Engagement: React.FC<EngagementProps> = ({ language, uid, isAdmin = false }) => {
  const t = textes(language);
  const lang = langueCourte(language);

  const [classement, setClassement] = useState<FicheEngagement[]>([]);
  const [maFiche, setMaFiche] = useState<FicheEngagement | null>(null);
  // `null` tant que la premiere capture n'est pas arrivee : sans cela l'ecran
  // « votre journal est vide » clignote avant les lignes.
  const [journal, setJournal] = useState<EntreeJournal[] | null>(null);
  const [membres, setMembres] = useState<MembreFiche[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<'classement' | 'journal' | 'accorder'>('classement');

  const [cible, setCible] = useState('');
  const [motif, setMotif] = useState(BAREME[0].cle);
  const [valeur, setValeur] = useState(String(BAREME[0].points));
  const [detail, setDetail] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [messageForm, setMessageForm] = useState<string | null>(null);
  const [erreurForm, setErreurForm] = useState<string | null>(null);

  // Le classement est refuse aux visiteurs par la regle : sans compte, aucun ecouteur.
  useEffect(() => {
    if (!uid) {
      setClassement([]);
      setMaFiche(null);
      setJournal(null);
      setErreur(null);
      setChargement(false);
      return;
    }
    setChargement(true);
    const stopClassement = suivreClassement(
      (recues) => {
        setClassement(recues);
        setErreur(null);
        setChargement(false);
      },
      LISTE,
      (message) => {
        setErreur(message);
        setChargement(false);
      },
    );
    const stopFiche = suivreMonEngagement(uid, setMaFiche, (message) => setErreur(message));
    return () => {
      stopClassement();
      stopFiche();
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || onglet !== 'journal') return;
    const stop = suivreJournal(uid, setJournal, (message) => setErreur(message));
    return stop;
  }, [uid, onglet]);

  useEffect(() => {
    if (!uid || !isAdmin || onglet !== 'accorder') return;
    const stop = suivreAnnuaire(setMembres);
    return stop;
  }, [uid, isAdmin, onglet]);

  const monTotal = maFiche?.total ?? 0;
  const monRang = uid ? rangDe(uid, classement) : 0;
  // Au-dela du plafond de la requete, `classement.length` n'est plus le nombre
  // de personnes classees : on montre le rang seul plutot qu'un faux total.
  const rangAffiche =
    monRang > 0
      ? classement.length < LISTE
        ? `${monRang} / ${classement.length}`
        : String(monRang)
      : t.horsClassement;
  const vingt = useMemo(() => classement.slice(0, TOP), [classement]);
  const moiHorsTop = useMemo(
    () => (uid && monRang > TOP ? classement[monRang - 1] : null),
    [uid, monRang, classement],
  );

  const maxCategorie = useMemo(() => {
    const valeurs = CATEGORIES.map((info) => maFiche?.parCategorie[info.cle] ?? 0);
    return Math.max(1, ...valeurs);
  }, [maFiche]);

  const geste = useMemo(() => BAREME.find((item) => item.cle === motif) ?? BAREME[0], [motif]);

  const soumettre = async (event: React.FormEvent) => {
    event.preventDefault();
    if (envoi) return;
    const fiche = membres.find((membre) => membre.uid === cible);
    if (!fiche) {
      setErreurForm(t.champPersonneVide);
      return;
    }
    setEnvoi(true);
    setErreurForm(null);
    setMessageForm(null);
    try {
      await accorderPoints(fiche.uid, fiche.nom, motif, Number(valeur), detail);
      setMessageForm(`${t.succes} ${fiche.nom}.`);
      setDetail('');
    } catch (souci) {
      const cle = souci instanceof Error ? CODES[souci.message] : undefined;
      if (!cle) console.error('accorderPoints', souci);
      setErreurForm(cle ? t[cle] : t.erreurEcriture);
    } finally {
      setEnvoi(false);
    }
  };

  const carteChargement = (
    <div className="glass-panel rounded-3xl border border-white/5 p-8 sm:p-12 flex items-center justify-center gap-3 text-slate-500">
      <Loader size={18} className="animate-spin" />
      <span className="text-sm">{t.chargement}</span>
    </div>
  );

  const carteVide = (Icone: typeof Trophy, titre: string, texte: string) => (
    <div className="glass-panel rounded-3xl border border-white/5 p-8 sm:p-12 text-center">
      <Icone size={32} className="mx-auto text-slate-600" />
      <h3 className="mt-4 font-serif text-xl text-white">{titre}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{texte}</p>
    </div>
  );

  const ligne = (fiche: FicheEngagement, rang: number) => {
    const cestMoi = fiche.uid === uid;
    return (
      <li
        key={fiche.uid}
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
          cestMoi
            ? 'border-emerald-500/40 bg-emerald-500/10'
            : 'border-white/5 bg-black/20 hover:border-white/10'
        }`}
      >
        <span
          className={`w-8 shrink-0 text-center text-sm font-bold tabular-nums ${
            cestMoi ? 'text-emerald-400' : 'text-slate-500'
          }`}
        >
          {rang}
        </span>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarTone(
            fiche.uid,
          )}`}
          aria-hidden="true"
        >
          {initiales(fiche.nom)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
          {fiche.nom}
          {cestMoi && (
            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
              {t.moi}
            </span>
          )}
        </span>
        <span className="shrink-0 text-sm font-bold tabular-nums text-white">{fiche.total}</span>
      </li>
    );
  };

  if (!uid) {
    return (
      <section className="animate-fade-in">
        {carteVide(Award, t.fermeTitre, t.fermeTexte)}
      </section>
    );
  }

  return (
    <section className="animate-fade-in">
      <header className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
          {t.etiquette}
        </p>
        <h2 className="mt-2 font-serif text-3xl md:text-4xl text-white leading-tight">{t.titre}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{t.intro}</p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="glass-card rounded-3xl border border-white/5 p-6 transition-all hover:border-white/10 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {t.monTotal}
          </p>
          <p className="mt-2 flex items-baseline gap-2 text-white">
            <span className="font-serif text-5xl leading-none tabular-nums">{monTotal}</span>
            <span className="text-sm text-slate-400">
              {Math.abs(monTotal) === 1 ? t.point : t.points}
            </span>
          </p>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {t.monRang}
          </p>
          <p className="mt-1 text-lg text-emerald-400 tabular-nums">
            {rangAffiche}
          </p>
        </div>

        <div className="glass-card rounded-3xl border border-white/5 p-6 transition-all hover:border-white/10 lg:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {t.repartition}
          </p>
          <ul className="mt-4 space-y-3">
            {CATEGORIES.map((info, index) => {
              const compte = maFiche?.parCategorie[info.cle] ?? 0;
              const largeur = Math.round((Math.max(0, compte) / maxCategorie) * 100);
              return (
                <li key={info.cle}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm text-slate-300">
                      {language === 'fr' ? info.fr : info.en}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">{compte}</span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5"
                    aria-hidden="true"
                  >
                    <div
                      className={`h-full rounded-full ${TEINTES[index % TEINTES.length]} transition-all duration-700`}
                      style={{ width: `${largeur}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <nav className="mt-8 flex flex-wrap gap-2">
        {(
          [
            ['classement', t.ongletClassement, Trophy],
            ['journal', t.ongletJournal, ScrollText],
            ...(isAdmin ? [['accorder', t.ongletAccorder, UserPlus] as const] : []),
          ] as ReadonlyArray<readonly ['classement' | 'journal' | 'accorder', string, typeof Trophy]>
        ).map(([cle, libelle, Icone]) => (
          <button
            key={cle}
            type="button"
            aria-pressed={onglet === cle}
            onClick={() => setOnglet(cle)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
              onglet === cle
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
            }`}
          >
            <Icone size={14} />
            {libelle}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {chargement && carteChargement}

        {!chargement && erreur && carteVide(WifiOff, t.erreurTitre, t.erreurTexte)}

        {!chargement && !erreur && onglet === 'classement' && (
          <>
            {vingt.length === 0 ? (
              carteVide(Trophy, t.videTitre, t.videTexte)
            ) : (
              <div className="glass-panel rounded-3xl border border-white/5 p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {t.classementTitre}
                </p>
                <ul className="mt-4 space-y-2">
                  {vingt.map((fiche, index) => ligne(fiche, index + 1))}
                  {moiHorsTop && (
                    <>
                      <li className="py-1 text-center text-xs text-slate-600" aria-hidden="true">
                        •••
                      </li>
                      {ligne(moiHorsTop, monRang)}
                    </>
                  )}
                </ul>
              </div>
            )}
          </>
        )}

        {!chargement && !erreur && onglet === 'journal' && (
          <>
            {journal === null ? (
              carteChargement
            ) : journal.length === 0 ? (
              carteVide(ScrollText, t.journalVideTitre, t.journalVideTexte)
            ) : (
              <ul className="space-y-2">
                {journal.map((entree) => (
                  <li
                    key={entree.id}
                    className="glass-card flex items-center gap-4 rounded-2xl border border-white/5 px-4 py-3 transition-all hover:border-white/10"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-200">
                        {libelleMotif(entree.motif, lang)}
                      </p>
                      {entree.detail && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">{entree.detail}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {timeAgo(entree.creeLe, lang)}
                    </span>
                    <span
                      className={`w-12 shrink-0 text-right text-sm font-bold tabular-nums ${
                        entree.points < 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {entree.points > 0 ? `+${entree.points}` : entree.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {!chargement && !erreur && onglet === 'accorder' && isAdmin && (
          <form
            onSubmit={soumettre}
            className="glass-panel rounded-3xl border border-white/5 p-6 sm:p-8"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
              {t.formTitre}
            </p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">{t.formTexte}</p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {t.champPersonne}
                </span>
                <select
                  value={cible}
                  onChange={(event) => {
                    setCible(event.target.value);
                    setMessageForm(null);
                    setErreurForm(null);
                  }}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-slate-200 transition-all focus:border-emerald-500/60 focus:outline-none"
                >
                  <option value="">{t.champPersonneVide}</option>
                  {membres.map((membre) => (
                    <option key={membre.uid} value={membre.uid}>
                      {membre.nom}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {t.champMotif}
                </span>
                <select
                  value={motif}
                  onChange={(event) => {
                    const choisi = event.target.value;
                    setMotif(choisi);
                    const trouve = BAREME.find((item) => item.cle === choisi);
                    if (trouve) setValeur(String(trouve.points));
                  }}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-slate-200 transition-all focus:border-emerald-500/60 focus:outline-none"
                >
                  {BAREME.map((item) => (
                    <option key={item.cle} value={item.cle}>
                      {language === 'fr' ? item.fr : item.en}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {t.champPoints}
                </span>
                <input
                  type="number"
                  value={valeur}
                  min={POINTS_MIN}
                  max={POINTS_MAX}
                  onChange={(event) => setValeur(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-slate-200 transition-all focus:border-emerald-500/60 focus:outline-none"
                />
                <span className="mt-1 block text-xs text-slate-600">
                  {t.bareme} {geste.points}
                </span>
              </label>

              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {t.champDetail}
                </span>
                <input
                  type="text"
                  value={detail}
                  maxLength={300}
                  placeholder={t.detailExemple}
                  onChange={(event) => setDetail(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition-all focus:border-emerald-500/60 focus:outline-none"
                />
              </label>
            </div>

            {membres.length === 0 && (
              <p className="mt-4 text-xs text-slate-500">{t.annuaireVide}</p>
            )}
            {erreurForm && <p className="mt-4 text-xs text-red-400">{erreurForm}</p>}
            {messageForm && <p className="mt-4 text-xs text-emerald-400">{messageForm}</p>}

            <button
              type="submit"
              disabled={envoi || !cible}
              className="mt-6 flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {envoi ? <Loader size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {envoi ? t.envoiEnCours : t.accorder}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

export default Engagement;
