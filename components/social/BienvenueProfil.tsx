import React, { useEffect, useState } from 'react';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  MembreFiche,
  MUNICIPALITES,
  assurerFicheMembre,
  majFicheMembre,
  suivreMembre,
  televerserAvatar,
} from '../../services/membresService';
import { Camera, Check, Loader, X } from 'lucide-react';

/**
 * Première entrée dans le réseau. La fiche publique existe déjà, créée au
 * moment de la connexion; ce panneau sert à lui donner un visage et un
 * territoire. Il se montre une seule fois, tant que la municipalité manque,
 * et il se referme sans rien exiger.
 */

const CLE_IGNORE = 'lynx:bienvenueIgnoree';

const TEXTES = {
  fr: {
    surtitre: 'Bienvenue dans le réseau',
    titre: 'Dites au réseau qui vous êtes',
    intro:
      "Les autres membres verront ce que vous inscrivez ici. Rien n'est obligatoire, et tout se change plus tard depuis votre fiche.",
    nom: 'Votre nom',
    municipalite: 'Votre municipalité',
    choisir: 'Choisir',
    competences: 'Ce que vous pouvez apporter',
    competencesAide:
      "Séparez par des virgules. Par exemple : droit, cartographie, photographie, traduction, transport, hébergement.",
    devise: 'Une phrase qui vous ressemble',
    engagement: 'Le temps que vous pouvez donner',
    niveaux: [
      'Je veux surtout être informé',
      'Je signe et je partage',
      'Je viens aux assemblées',
      'Je donne du temps chaque mois',
      'Je porte du travail au quotidien',
    ],
    photo: 'Ajouter une photo',
    enregistrer: 'Entrer dans le réseau',
    plusTard: 'Plus tard',
    enCours: 'Un instant',
    erreur: "L'enregistrement n'a pas abouti. Réessayez dans un moment.",
    erreurPhoto: "La photo n'a pas pu être envoyée. Vérifiez qu'il s'agit d'une image de moins de 5 Mo.",
  },
  en: {
    surtitre: 'Welcome to the network',
    titre: 'Tell the network who you are',
    intro:
      'Other members will see what you write here. None of it is required, and all of it can be changed later from your card.',
    nom: 'Your name',
    municipalite: 'Your municipality',
    choisir: 'Choose',
    competences: 'What you can bring',
    competencesAide:
      'Separate with commas. For example: law, mapping, photography, translation, transport, lodging.',
    devise: 'A sentence that sounds like you',
    engagement: 'The time you can give',
    niveaux: [
      'I mostly want to be informed',
      'I sign and I share',
      'I come to the assemblies',
      'I give time every month',
      'I carry work day to day',
    ],
    photo: 'Add a photo',
    enregistrer: 'Enter the network',
    plusTard: 'Later',
    enCours: 'One moment',
    erreur: 'Saving did not go through. Try again shortly.',
    erreurPhoto: 'The photo could not be sent. Check that it is an image under 5 MB.',
  },
};

interface BienvenueProfilProps {
  language: Language;
}

const BienvenueProfil: React.FC<BienvenueProfilProps> = ({ language }) => {
  const { profile } = useAuth();
  const t = language === 'en' ? TEXTES.en : TEXTES.fr;

  const [fiche, setFiche] = useState<MembreFiche | null>(null);
  const [visible, setVisible] = useState(false);
  const [nom, setNom] = useState('');
  const [municipalite, setMunicipalite] = useState('');
  const [competences, setCompetences] = useState('');
  const [devise, setDevise] = useState('');
  const [engagement, setEngagement] = useState(2);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    assurerFicheMembre(profile).catch((e) => console.error('Fiche membre', e));
    const arreter = suivreMembre(profile.uid, (f) => {
      setFiche(f);
      if (!f) return;
      setNom((n) => n || f.nom || profile.displayName || '');
      setEngagement((e) => (f.engagement && f.engagement !== 1 ? f.engagement : e));
      let ignoree = false;
      try {
        ignoree = window.localStorage.getItem(CLE_IGNORE) === profile.uid;
      } catch {
        ignoree = false;
      }
      setVisible(!f.municipalite && !ignoree);
    });
    return arreter;
  }, [profile?.uid]);

  if (!profile || !visible) return null;

  const ignorer = () => {
    try {
      window.localStorage.setItem(CLE_IGNORE, profile.uid);
    } catch {
      // Un navigateur qui refuse le stockage ne doit pas bloquer la fermeture.
    }
    setVisible(false);
  };

  const choisirPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErreur(null);
    setEnCours(true);
    try {
      const url = await televerserAvatar(profile.uid, file);
      setApercu(url);
    } catch {
      setErreur(t.erreurPhoto);
    } finally {
      setEnCours(false);
    }
  };

  const enregistrer = async () => {
    setErreur(null);
    setEnCours(true);
    try {
      await majFicheMembre(profile.uid, {
        nom: nom.trim().slice(0, 120) || profile.displayName || 'Membre',
        municipalite: municipalite || undefined,
        competences: competences
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
          .slice(0, 12),
        devise: devise.trim().slice(0, 160) || undefined,
        engagement,
      });
      ignorer();
    } catch {
      setErreur(t.erreur);
    } finally {
      setEnCours(false);
    }
  };

  const avatar = apercu || fiche?.avatarUrl || profile.photoURL;

  return (
    <div className="fixed inset-0 z-[96] bg-black/85 backdrop-blur-xl overflow-y-auto animate-fade-in">
      <div className="min-h-full flex items-start md:items-center justify-center p-4 py-10">
        <div className="glass-card rounded-3xl border border-white/10 p-6 md:p-8 max-w-xl w-full relative">
          <button
            onClick={ignorer}
            className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
            aria-label={t.plusTard}
          >
            <X size={17} />
          </button>

          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3">
            {t.surtitre}
          </p>
          <h3 className="text-2xl font-serif font-bold text-white mb-3 leading-tight">{t.titre}</h3>
          <p className="text-slate-400 text-sm font-light leading-relaxed mb-7">{t.intro}</p>

          {erreur && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-500/20 rounded-2xl px-4 py-3 mb-5 leading-relaxed">
              {erreur}
            </p>
          )}

          <div className="flex items-center gap-4 mb-6">
            {avatar ? (
              <img src={avatar} alt="" className="w-16 h-16 rounded-full object-cover border border-white/10" />
            ) : (
              <span className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-xl font-bold text-white">
                {(nom || profile.displayName || '?').charAt(0)}
              </span>
            )}
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[11px] font-bold uppercase tracking-widest text-slate-300 transition-colors">
              <Camera size={13} />
              {t.photo}
              <input type="file" accept="image/*" className="hidden" onChange={choisirPhoto} />
            </label>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                {t.nom}
              </span>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/60 transition-colors"
              />
            </label>

            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                {t.municipalite}
              </span>
              <select
                value={municipalite}
                onChange={(e) => setMunicipalite(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/60 transition-colors"
              >
                <option value="">{t.choisir}</option>
                {MUNICIPALITES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                {t.competences}
              </span>
              <input
                value={competences}
                onChange={(e) => setCompetences(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/60 transition-colors"
              />
              <span className="block text-[11px] text-slate-600 mt-1.5">{t.competencesAide}</span>
            </label>

            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                {t.devise}
              </span>
              <input
                value={devise}
                onChange={(e) => setDevise(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/60 transition-colors"
              />
            </label>

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                {t.engagement}
              </span>
              <div className="space-y-2">
                {t.niveaux.map((etiquette, i) => (
                  <button
                    key={etiquette}
                    onClick={() => setEngagement(i + 1)}
                    className={`w-full text-left px-4 py-2.5 rounded-2xl border text-xs transition-all ${
                      engagement === i + 1
                        ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-200'
                        : 'bg-transparent border-white/5 text-slate-400 hover:border-white/10'
                    }`}
                  >
                    {etiquette}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              onClick={enregistrer}
              disabled={enCours}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors"
            >
              {enCours ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
              {enCours ? t.enCours : t.enregistrer}
            </button>
            <button
              onClick={ignorer}
              className="sm:w-40 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors"
            >
              {t.plusTard}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BienvenueProfil;
