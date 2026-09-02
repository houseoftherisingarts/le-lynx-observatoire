import React, { useEffect, useRef, useState } from 'react';
import { Language } from '../types';
import { Layers, AlertTriangle, MapPin, Loader } from 'lucide-react';

/**
 * Carte des titres miniers de la Petite-Nation.
 *
 * Les données viennent de l'export GESTIM du ministère des Ressources
 * naturelles et des Forêts, découpé sur la MRC de Papineau et converti en
 * GeoJSON. L'export d'origine couvre tout le Québec et pèse 28 Mo, ce qui
 * n'a rien à faire dans un navigateur. Le rendu passe par la couche Data de
 * Google Maps, sans aucune librairie tierce.
 */

declare global {
  interface Window {
    google: any;
    __lynxMapsPromise?: Promise<void>;
  }
}

const SOURCE_GEOJSON = '/claims-petite-nation.geojson';
const KML_COMPLET = 'https://storage.googleapis.com/lynxsurveillance/titres.kml';

const TEXTES = {
  fr: {
    surtitre: 'Cartographie officielle',
    titre: 'Les titres miniers de la Petite-Nation',
    intro:
      "Chaque polygone est un titre inscrit au registre GESTIM du ministère des Ressources naturelles et des Forêts. Les claims de Lomiko Metals ressortent en rouge, les autres titres actifs en ambre, et les demandes en cours en bleu.",
    chargement: 'Nous chargeons le registre des titres.',
    erreurCarte: "La carte n'a pas pu se charger",
    erreurCarteDetail:
      "Le service de cartographie de Google ne répond pas. Rechargez la page dans un moment, les données du registre restent accessibles au téléchargement.",
    erreurDonnees: 'Le registre des titres est momentanément injoignable',
    erreurDonneesDetail:
      'Le fichier des titres ne se charge pas. Le fond de carte reste utilisable et le registre complet demeure téléchargeable.',
    couche: 'Titres miniers',
    affichee: 'Affichée',
    masquee: 'Masquée',
    legende: 'Légende',
    lomiko: 'Claims de Lomiko Metals',
    actif: 'Autres titres actifs',
    demande: 'Titres en demande',
    telecharger: 'Télécharger le registre complet',
    formatKml: 'Format KML du ministère, 28 Mo, ouvrable dans Google Earth',
    polygones: 'polygones dans le secteur',
    titulaire: 'Titulaire',
    designation: 'Désignation',
    statutLabel: 'Statut',
    source: 'Source : registre GESTIM, ministère des Ressources naturelles et des Forêts.',
  },
  en: {
    surtitre: 'Official mapping',
    titre: 'Mining titles of the Petite-Nation',
    intro:
      'Each polygon is a title recorded in the GESTIM registry of the ministry of Natural Resources and Forests. Lomiko Metals claims show in red, other active titles in amber, and pending applications in blue.',
    chargement: 'Loading the registry of titles.',
    erreurCarte: 'The map could not load',
    erreurCarteDetail:
      "Google's mapping service is not responding. Reload the page in a moment; the registry data stays available for download.",
    erreurDonnees: 'The registry of titles is unreachable',
    erreurDonneesDetail:
      'The title file is not loading. The base map still works and the full registry remains downloadable.',
    couche: 'Mining titles',
    affichee: 'Shown',
    masquee: 'Hidden',
    legende: 'Legend',
    lomiko: 'Lomiko Metals claims',
    actif: 'Other active titles',
    demande: 'Pending applications',
    telecharger: 'Download the full registry',
    formatKml: "Ministry KML format, 28 MB, opens in Google Earth",
    polygones: 'polygons in the area',
    titulaire: 'Holder',
    designation: 'Designation',
    statutLabel: 'Status',
    source: 'Source: GESTIM registry, ministry of Natural Resources and Forests.',
  },
};

/** Charge l'API Google Maps une seule fois, même si le composant remonte. */
function chargerMaps(cle: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (window.__lynxMapsPromise) return window.__lynxMapsPromise;

  window.__lynxMapsPromise = new Promise<void>((resoudre, rejeter) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${cle}&language=fr&region=CA`;
    script.async = true;
    script.defer = true;
    script.onload = () => resoudre();
    script.onerror = () => {
      window.__lynxMapsPromise = undefined;
      rejeter(new Error('maps'));
    };
    document.head.appendChild(script);
  });

  return window.__lynxMapsPromise;
}

interface CarteClaimsProps {
  language: Language;
}

const CarteClaims: React.FC<CarteClaimsProps> = ({ language }) => {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<any>(null);
  const infoBulle = useRef<any>(null);

  const [etat, setEtat] = useState<'chargement' | 'prete' | 'erreurCarte' | 'erreurDonnees'>(
    'chargement'
  );
  const [coucheVisible, setCoucheVisible] = useState(true);
  const [nbPolygones, setNbPolygones] = useState(0);

  const t = language === 'en' ? TEXTES.en : TEXTES.fr;

  useEffect(() => {
    let annule = false;

    const teinte = (feature: any) => {
      const lomiko = feature.getProperty('lomiko') === true;
      const demande = feature.getProperty('statut') === 'demande';
      if (lomiko) {
        return {
          fillColor: '#ef4444',
          fillOpacity: 0.42,
          strokeColor: '#fca5a5',
          strokeWeight: 1.6,
          zIndex: 3,
        };
      }
      if (demande) {
        return {
          fillColor: '#38bdf8',
          fillOpacity: 0.22,
          strokeColor: '#7dd3fc',
          strokeWeight: 1,
          zIndex: 2,
        };
      }
      return {
        fillColor: '#f59e0b',
        fillOpacity: 0.22,
        strokeColor: '#fbbf24',
        strokeWeight: 1,
        zIndex: 1,
      };
    };

    const demarrer = async () => {
      try {
        await chargerMaps(process.env.GOOGLE_MAPS_API_KEY || '');
      } catch {
        if (!annule) setEtat('erreurCarte');
        return;
      }
      if (annule || !conteneur.current) return;

      const g = window.google.maps;
      carte.current = new g.Map(conteneur.current, {
        center: { lat: 45.98, lng: -75.15 },
        zoom: 10,
        mapTypeId: 'hybrid',
        streetViewControl: false,
        fullscreenControl: true,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: g.MapTypeControlStyle.HORIZONTAL_BAR,
          position: g.ControlPosition.TOP_RIGHT,
          mapTypeIds: ['hybrid', 'roadmap', 'satellite', 'terrain'],
        },
      });

      infoBulle.current = new g.InfoWindow();
      carte.current.data.setStyle(teinte);

      let donnees: { features?: unknown[] };
      try {
        const res = await fetch(SOURCE_GEOJSON, { cache: 'force-cache' });
        if (!res.ok) throw new Error(String(res.status));
        donnees = await res.json();
      } catch {
        if (!annule) setEtat('erreurDonnees');
        return;
      }
      if (annule) return;

      carte.current.data.addGeoJson(donnees);
      setNbPolygones(Array.isArray(donnees.features) ? donnees.features.length : 0);

      carte.current.data.addListener('click', (evt: any) => {
        const f = evt.feature;
        const lomiko = f.getProperty('lomiko') === true;
        const statut = f.getProperty('statut') === 'demande' ? t.demande : t.actif;
        const contenu = `
          <div style="font-family:Inter,sans-serif;max-width:19rem;padding:2px 4px;color:#0f172a">
            <div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${
              lomiko ? '#b91c1c' : '#b45309'
            };margin-bottom:6px">
              ${lomiko ? 'Lomiko Metals' : statut}
            </div>
            <div style="font-size:14px;font-weight:700;line-height:1.3;margin-bottom:8px">
              ${f.getProperty('nom') || ''}
            </div>
            <div style="font-size:11px;color:#475569;line-height:1.5">
              <div><strong>${t.designation} :</strong> ${f.getProperty('designation') || ''}</div>
              <div><strong>${t.statutLabel} :</strong> ${statut}</div>
            </div>
          </div>`;
        infoBulle.current.setContent(contenu);
        infoBulle.current.setPosition(evt.latLng);
        infoBulle.current.open(carte.current);
      });

      carte.current.data.addListener('mouseover', (evt: any) => {
        carte.current.data.overrideStyle(evt.feature, { strokeWeight: 3 });
      });
      carte.current.data.addListener('mouseout', () => {
        carte.current.data.revertStyle();
      });

      setEtat('prete');
    };

    demarrer();
    return () => {
      annule = true;
    };
  }, [t.actif, t.demande, t.designation, t.statutLabel]);

  const basculerCouche = () => {
    if (!carte.current) return;
    const suivant = !coucheVisible;
    carte.current.data.setStyle((feature: any) =>
      suivant
        ? {
            fillColor:
              feature.getProperty('lomiko') === true
                ? '#ef4444'
                : feature.getProperty('statut') === 'demande'
                ? '#38bdf8'
                : '#f59e0b',
            fillOpacity: feature.getProperty('lomiko') === true ? 0.42 : 0.22,
            strokeColor:
              feature.getProperty('lomiko') === true
                ? '#fca5a5'
                : feature.getProperty('statut') === 'demande'
                ? '#7dd3fc'
                : '#fbbf24',
            strokeWeight: feature.getProperty('lomiko') === true ? 1.6 : 1,
            visible: true,
          }
        : { visible: false }
    );
    setCoucheVisible(suivant);
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-fade-in space-y-8">
      <header className="max-w-3xl">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3">
          {t.surtitre}
        </p>
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4 leading-tight">
          {t.titre}
        </h2>
        <p className="text-slate-400 font-light leading-relaxed">{t.intro}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Pastille couleur="#ef4444" texte={t.lomiko} />
          <Pastille couleur="#f59e0b" texte={t.actif} />
          <Pastille couleur="#38bdf8" texte={t.demande} />
        </div>
        {nbPolygones > 0 && (
          <span className="text-[11px] text-slate-500 font-mono">
            {nbPolygones} {t.polygones}
          </span>
        )}
      </div>

      {etat === 'erreurCarte' && (
        <div className="glass-card p-8 rounded-3xl border border-red-900/30 text-center">
          <AlertTriangle className="mx-auto text-red-400 mb-3" size={24} />
          <h3 className="text-white font-bold mb-2">{t.erreurCarte}</h3>
          <p className="text-slate-400 text-sm font-light max-w-lg mx-auto leading-relaxed">
            {t.erreurCarteDetail}
          </p>
        </div>
      )}

      {etat !== 'erreurCarte' && (
        <div className="relative w-full h-[70vh] min-h-[26rem] rounded-3xl border border-white/10 shadow-2xl bg-slate-900 overflow-hidden">
          <div ref={conteneur} className="w-full h-full" />

          {etat === 'chargement' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm">
              <Loader className="text-emerald-500 animate-spin mb-3" size={22} />
              <p className="text-slate-400 text-sm font-light">{t.chargement}</p>
            </div>
          )}

          {etat === 'erreurDonnees' && (
            <div className="absolute top-4 left-4 right-4 md:right-auto md:max-w-sm glass-card rounded-2xl border border-amber-500/30 p-4">
              <p className="text-amber-300 text-xs font-bold mb-1">{t.erreurDonnees}</p>
              <p className="text-slate-400 text-[11px] leading-relaxed">{t.erreurDonneesDetail}</p>
            </div>
          )}

          {etat === 'prete' && (
            <div className="absolute top-4 left-4 z-[1] glass-card border border-white/10 p-4 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      coucheVisible ? 'bg-emerald-600/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Layers size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">{t.couche}</p>
                    <p className="text-[10px] text-slate-400">
                      {coucheVisible ? t.affichee : t.masquee}
                    </p>
                  </div>
                </div>
                <button
                  onClick={basculerCouche}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${
                    coucheVisible ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                  aria-label={t.couche}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                      coucheVisible ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="glass-card rounded-3xl border border-white/5 p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3 max-w-xl">
          <MapPin size={16} className="text-emerald-500 mt-1 shrink-0" />
          <div>
            <p className="text-slate-300 text-sm leading-relaxed">{t.source}</p>
            <p className="text-slate-500 text-[11px] mt-1">{t.formatKml}</p>
          </div>
        </div>
        <a
          href={KML_COMPLET}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[11px] font-bold uppercase tracking-widest text-slate-300 transition-all"
        >
          {t.telecharger}
        </a>
      </div>
    </div>
  );
};

const Pastille: React.FC<{ couleur: string; texte: string }> = ({ couleur, texte }) => (
  <span className="flex items-center gap-2 text-[11px] text-slate-400">
    <span
      className="w-3 h-3 rounded-sm border"
      style={{ backgroundColor: `${couleur}55`, borderColor: couleur }}
    />
    {texte}
  </span>
);

export default CarteClaims;
