
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, AuthState, User as UserType, ProjectSubmission, Language } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import { NewsFeed } from './components/NewsFeed';
import ChatInterface from './components/ChatInterface';
import ArchiveTimeline from './components/ArchiveTimeline';
import Community from './components/Community';
import AdminPanel from './components/AdminPanel';
import SubmitProject from './components/SubmitProject';
import Reseau from './components/Reseau';
import PoserQuestion from './components/social/PoserQuestion';
import Cloche from './components/social/Cloche';
import { Map as MapIcon, Scale, Menu, ExternalLink, FileText, Lock, ShieldCheck, BookOpen, Download, Globe, X, HelpCircle, Monitor, Layers, RefreshCw, ZoomIn, Eye } from 'lucide-react';

// Add global types for external libraries
declare global {
    interface Window {
        google: any;
        geoXML3: any;
    }
}

// Google Maps Component
const ClaimsMap: React.FC = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any>(null);
    const [parser, setParser] = useState<any>(null);
    const [isLayerVisible, setIsLayerVisible] = useState(true);

    useEffect(() => {
        const loadGeoXML = (mapInstance: any) => {
             const initParser = () => {
                 if (!window.geoXML3) {
                     console.error("GeoXML3 library failed to load.");
                     return;
                 }

                 const kmlUrl = 'https://storage.googleapis.com/lynxsurveillance/titres.kml';
                 // Force refresh query param (though geoxml3 fetches client side, cache busting is good)
                 // Note: geoxml3 fetches via XHR. Ensure server supports CORS or use a proxy if needed.
                 // Assuming the GCS bucket allows CORS.
                 const stampedUrl = kmlUrl + '?nocache=' + new Date().getTime();

                 const myParser = new window.geoXML3.parser({
                    map: mapInstance,
                    singleInfoWindow: true,
                    zoom: true, // Auto-zoom to data
                    afterParse: (doc: any) => {
                        console.log("KML Parsed successfully", doc);
                    },
                    failedParse: (doc: any) => {
                        alert("Erreur de chargement du KML (Limite ou Réseau). Code: " + (doc ? JSON.stringify(doc) : "Unknown"));
                    }
                 });

                 myParser.parse(stampedUrl);
                 setParser(myParser);
             };

             if (window.geoXML3) {
                 initParser();
             } else {
                 const script = document.createElement('script');
                 script.src = "https://unpkg.com/geoxml3@0.1.0/geoxml3.js";
                 script.async = true;
                 script.defer = true;
                 script.onload = initParser;
                 script.onerror = () => alert("Impossible de charger la librairie GeoXML3.");
                 document.head.appendChild(script);
             }
        };

        const loadMap = () => {
            if (!mapRef.current) return;
            if (!window.google) return;

            const mapInstance = new window.google.maps.Map(mapRef.current, {
                center: { lat: 45.9, lng: -75.1 }, // Petite-Nation approx default
                zoom: 9,
                mapTypeId: 'hybrid',
                streetViewControl: false,
                mapTypeControl: true,
                fullscreenControl: true,
                mapTypeControlOptions: {
                    style: 1, // HORIZONTAL_BAR
                    position: 3, // TOP_RIGHT
                    mapTypeIds: ['hybrid', 'roadmap', 'satellite', 'terrain']
                }
            });

            setMap(mapInstance);
            loadGeoXML(mapInstance);
        };

        if (!window.google) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}`;
            script.async = true;
            script.defer = true;
            script.onload = loadMap;
            document.head.appendChild(script);
        } else {
            loadMap();
        }
    }, []);

    const toggleLayer = () => {
        if (!parser) return;

        if (isLayerVisible) {
            parser.hideDocument();
        } else {
            parser.showDocument();
        }
        setIsLayerVisible(!isLayerVisible);
    };

    return (
        <div className="relative w-full h-[80vh] rounded-3xl border border-white/10 shadow-2xl bg-slate-900 overflow-hidden group">
            <div ref={mapRef} className="w-full h-full" />
            
            {/* Custom Layer Toggle Control */}
            <div className="absolute top-4 left-4 z-[1] bg-slate-900/90 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl transition-transform transform group-hover:scale-100 scale-95 origin-top-left">
                <div className="flex items-center gap-4 justify-between">
                    <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-lg ${isLayerVisible ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Layers size={18} />
                        </div>
                        <div>
                             <p className="text-xs font-bold text-white uppercase tracking-wider">Claims</p>
                             <p className="text-[10px] text-slate-400">{isLayerVisible ? 'Affiché' : 'Masqué'}</p>
                        </div>
                    </div>
                   
                    <button 
                        onClick={toggleLayer}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${isLayerVisible ? 'bg-blue-600' : 'bg-slate-700'}`}
                        title="Basculer la couche KML"
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${isLayerVisible ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const AppContent: React.FC = () => {
  const { profile, signInWithGoogle, signOut } = useAuth();
  const [currentView, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('fr');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ecrireA, setEcrireA] = useState<string | null>(null);

  // Admin: password-based toggle OR Firestore role === 'admin'
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (profile?.role === 'admin') setIsAdmin(true);
  }, [profile]);

  // Lifted state for Community Tab to enable deep linking from Dashboard
  const [communityTab, setCommunityTab] = useState<'roundtable' | 'resources' | 'chat' | 'actions'>('actions');

  // Derive AuthState from Firebase profile for downstream components
  const authState: AuthState = profile
    ? {
        isAuthenticated: true,
        user: {
          id: profile.uid,
          name: profile.displayName,
          email: profile.email,
          hasVotedNoInReferendum: profile.hasVotedNoInReferendum,
          avatar: profile.photoURL,
        } as UserType,
      }
    : { isAuthenticated: false, user: null };

  // Submitted Projects State
  const [projectSubmissions, setProjectSubmissions] = useState<ProjectSubmission[]>([]);

  // Loading Screen Effect
  useEffect(() => {
      const timer = setTimeout(() => {
          setIsLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
  }, []);

  const handleNavigateToCommunityAction = () => {
      setCommunityTab('actions');
      setView(ViewState.COMMUNITY);
  };

  const allerDepuisCloche = (item: { type: string; cible?: string }) => {
      if (item.type === 'message') {
          setEcrireA(item.cible || null);
          setView(ViewState.RESEAU);
          return;
      }
      if (item.type === 'alliance') {
          setEcrireA(null);
          setView(ViewState.RESEAU);
          return;
      }
      if (item.type === 'veille') {
          setView(ViewState.NEWS);
          return;
      }
      setView(ViewState.RESEAU);
  };

  const handleProjectSubmit = (submission: ProjectSubmission) => {
      setProjectSubmissions(prev => [submission, ...prev]);
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return (
          <Dashboard 
            authState={authState} 
            setViewState={setView} 
            onNavigateToAction={handleNavigateToCommunityAction} 
            language={language}
            isAdmin={isAdmin}
          />
        );
      case ViewState.NEWS:
        return <NewsFeed language={language} isAdmin={isAdmin} />;
      case ViewState.CHAT:
        return <ChatInterface language={language} />;
      case ViewState.ARCHIVES:
        return <ArchiveTimeline language={language} />;
      case ViewState.COMMUNITY:
        return (
          <Community
            authState={authState}
            onSignIn={signInWithGoogle}
            onSignOut={signOut}
            activeTab={communityTab}
            setActiveTab={setCommunityTab}
            language={language}
            isAdmin={isAdmin}
          />
        );
      case ViewState.ADMIN:
        // Double check isAdmin protection, though Navigation hides it
        if (!isAdmin) return <div className="text-center p-20 text-slate-500">Accès Refusé</div>;
        return <AdminPanel submissions={projectSubmissions} language={language} />;
      case ViewState.SUBMIT_PROJECT:
        return <SubmitProject onSubmit={handleProjectSubmit} language={language} />;
      case ViewState.RESEAU:
        return (
          <Reseau
            language={language}
            isAdmin={isAdmin}
            onSignIn={signInWithGoogle}
            ouvrirAvec={ecrireA}
          />
        );
      case ViewState.QUESTIONS:
        return (
          <div className="py-6">
            <PoserQuestion language={language} origin="direct" />
          </div>
        );
      case ViewState.CLAIMS:
        return (
            <div className="flex flex-col items-center justify-start min-h-[60vh] text-center space-y-8 animate-fade-in p-4 pb-20">
                <div className="glass-card p-1 rounded-full mb-4">
                    <div className="bg-slate-900/50 p-6 rounded-full shadow-[0_0_50px_rgba(16,185,129,0.1)] backdrop-blur-md">
                        <MapIcon size={32} className="text-emerald-500 opacity-80" />
                    </div>
                </div>
                
                <div className="w-full max-w-6xl mx-auto space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                           {language === 'fr' ? 'Cartographie Officielle' : language === 'en' ? 'Official Mapping' : 'Aki Mazina\'igan'}
                        </h2>
                        <p className="text-slate-400 max-w-lg mx-auto font-light mb-6">
                            {language === 'fr' ? 'Visualisation du secteur minier proposé et des titres actifs.' : 
                             language === 'en' ? 'Visualization of the proposed mining sector and active claims.' :
                             'Waabanda\'iwewin odayiing.'}
                        </p>
                    </div>

                    {/* Map Header Controls */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl mx-auto w-full px-4">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400">
                                <Layers size={18} />
                            </div>
                            <div className="text-left hidden md:block">
                                <p className="text-xs font-bold uppercase text-slate-400">Données Actives</p>
                                <p className="text-sm font-medium text-white">Claims Miniers (Gestim)</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center md:items-end gap-2">
                            <a 
                                href="https://storage.googleapis.com/lynxsurveillance/titres.kml" 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                <Download size={14} /> {language === 'fr' ? 'Télécharger KML' : 'Download KML'}
                            </a>
                            <p className="text-[10px] text-slate-500 text-center md:text-right max-w-xs font-light">
                                {language === 'fr' 
                                    ? "Format KML : Données géospatiales pour Google Earth." 
                                    : "KML Format: Geospatial data for Google Earth."}
                            </p>
                        </div>
                    </div>

                    {/* Google Maps Integration */}
                    <ClaimsMap />
                    
                    {/* Instructions for KML (Collapsed/Secondary) */}
                    <div className="glass-card p-6 rounded-2xl bg-[#0a0a0a]/80 border border-white/5 text-left max-w-6xl mx-auto w-full">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <HelpCircle size={16} className="text-slate-600" />
                            {language === 'fr' ? "Analyse Avancée (Google Earth Pro)" : 'Advanced Analysis (Google Earth Pro)'}
                        </h3>
                        <p className="text-sm text-slate-400 font-light mb-4">
                            {language === 'fr' 
                                ? "La carte interactive ci-dessus affiche les claims. Pour une analyse 3D plus poussée, vous pouvez télécharger le fichier KML et l'ouvrir dans Google Earth Pro." 
                                : "The interactive map above shows claims. For advanced 3D analysis, download the KML file and open it in Google Earth Pro."}
                        </p>
                    </div>

                    {/* Images Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
                        {/* Image 1 */}
                        <div 
                            className="relative group rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black cursor-zoom-in aspect-square"
                            onClick={() => setSelectedImage("https://storage.googleapis.com/lynxsurveillance/588859830_858643570145963_7868467580072425644_n%20(1).jpg")}
                        >
                             <img 
                                src="https://storage.googleapis.com/lynxsurveillance/588859830_858643570145963_7868467580072425644_n%20(1).jpg" 
                                alt="Carte du site approximatif de la mine proposée" 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105 transition-transform"
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                             <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-white/20">
                                <ZoomIn size={16} className="text-white"/>
                             </div>
                             <div className="absolute bottom-6 left-6 z-20 text-left pointer-events-none">
                                 <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">
                                    {language === 'fr' ? 'Zone Ciblée' : 'Target Zone'}
                                 </p>
                                 <p className="text-white text-sm font-bold">
                                    {language === 'fr' ? 'Site de la mine' : 'Mine Site'}
                                 </p>
                             </div>
                        </div>

                        {/* Image 2 */}
                        <div 
                            className="relative group rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black cursor-zoom-in aspect-square"
                            onClick={() => setSelectedImage("https://storage.googleapis.com/lynxsurveillance/Screenshot%202025-12-02%20at%2011.55.31%E2%80%AFPM.png")}
                        >
                             <img 
                                src="https://storage.googleapis.com/lynxsurveillance/Screenshot%202025-12-02%20at%2011.55.31%E2%80%AFPM.png" 
                                alt="Données Claims" 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105 transition-transform"
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                             <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-white/20">
                                <ZoomIn size={16} className="text-white"/>
                             </div>
                             <div className="absolute bottom-6 left-6 z-20 text-left pointer-events-none">
                                 <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">
                                    {language === 'fr' ? 'Données Claims' : 'Claims Data'}
                                 </p>
                                 <p className="text-white text-sm font-bold">
                                    {language === 'fr' ? 'État des lieux 2025' : '2025 Status'}
                                 </p>
                             </div>
                        </div>

                         {/* Image 3 */}
                         <div 
                            className="relative group rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black cursor-zoom-in aspect-square"
                            onClick={() => setSelectedImage("https://storage.googleapis.com/lynxsurveillance/Screenshot%202025-12-03%20at%2012.24.02%E2%80%AFAM.png")}
                        >
                             <img 
                                src="https://storage.googleapis.com/lynxsurveillance/Screenshot%202025-12-03%20at%2012.24.02%E2%80%AFAM.png" 
                                alt="Vue Aérienne" 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105 transition-transform"
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                             <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-white/20">
                                <ZoomIn size={16} className="text-white"/>
                             </div>
                             <div className="absolute bottom-6 left-6 z-20 text-left pointer-events-none">
                                 <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">
                                    {language === 'fr' ? 'Vue Satellitaire' : 'Satellite View'}
                                 </p>
                                 <p className="text-white text-sm font-bold">
                                    {language === 'fr' ? 'Analyse Territoriale' : 'Territorial Analysis'}
                                 </p>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        );
      case ViewState.LAWS:
        return (
            <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-4 bg-indigo-900/30 rounded-2xl border border-indigo-500/20 text-indigo-400">
                        <Scale size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white">
                            {language === 'fr' ? 'Cadre Juridique' : language === 'en' ? 'Legal Framework' : 'Dibaakonigewin'}
                        </h2>
                        <p className="text-slate-400 font-light">
                            {language === 'fr' ? 'Lois, règlements et documents officiels.' : 
                             'Laws, regulations and official documents.'}
                        </p>
                    </div>
                </div>

                {/* SECTION 1: LOIS */}
                <div className="space-y-6">
                    <h3 className="text-xl font-serif text-white pl-3 border-l-2 border-indigo-500">
                        {language === 'fr' ? 'Lois et Règlements (Québec)' : 'Laws and Regulations'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <a href="https://www.legisquebec.gouv.qc.ca/fr/document/lc/M-13.1" target="_blank" rel="noreferrer" className="glass-card p-6 rounded-2xl hover:bg-white/5 group transition-all border border-white/5">
                            <div className="flex justify-between items-start mb-4">
                                <FileText className="text-indigo-400" />
                                <ExternalLink size={14} className="text-slate-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-200 mb-2">
                                 {language === 'fr' ? 'Loi sur les mines' : 'Mining Act'}
                            </h3>
                            <p className="text-sm text-slate-400 font-mono">Chapitre M-13.1</p>
                            <p className="text-xs text-slate-500 mt-2">
                                {language === 'fr' ? "Le cadre légal principal favorisant l'extraction (free mining)." : "Main legal framework favoring extraction (free mining)."}
                            </p>
                        </a>

                        <a href="https://www.legisquebec.gouv.qc.ca/fr/document/lc/Q-2" target="_blank" rel="noreferrer" className="glass-card p-6 rounded-2xl hover:bg-white/5 group transition-all border border-white/5">
                            <div className="flex justify-between items-start mb-4">
                                <ShieldCheck className="text-emerald-400" />
                                <ExternalLink size={14} className="text-slate-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-200 mb-2">
                                {language === 'fr' ? "Loi sur la qualité de l'environnement" : "Environment Quality Act"}
                            </h3>
                            <p className="text-sm text-slate-400 font-mono">Chapitre Q-2</p>
                            <p className="text-xs text-slate-500 mt-2">
                                 {language === 'fr' ? "La base légale pour exiger des BAPE et des certificats d'autorisation." : "Legal basis to demand BAPE hearings and authorization certificates."}
                            </p>
                        </a>

                        <a href="https://www.legisquebec.gouv.qc.ca/fr/document/lc/A-19.1" target="_blank" rel="noreferrer" className="glass-card p-6 rounded-2xl hover:bg-white/5 group transition-all border border-white/5">
                             <div className="flex justify-between items-start mb-4">
                                <MapIcon className="text-cyan-400" />
                                <ExternalLink size={14} className="text-slate-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-200 mb-2">
                                 {language === 'fr' ? "Aménagement et urbanisme" : "Land Use Planning and Development"}
                            </h3>
                            <p className="text-sm text-slate-400 font-mono">Art. 246 (TIAM)</p>
                            <p className="text-xs text-slate-500 mt-2">
                                 {language === 'fr' ? "Concernant les Territoires Incompatibles avec l'Activité Minière." : "Regarding Territories Incompatible with Mining Activity."}
                            </p>
                        </a>

                         <div className="glass-card p-6 rounded-2xl bg-slate-900/80 border-dashed border-2 border-white/5 flex flex-col items-center justify-center text-center opacity-70">
                            <Lock className="text-slate-600 mb-2" />
                            <h3 className="text-sm font-bold text-slate-400">
                                 {language === 'fr' ? "Documents Stratégiques" : "Strategic Documents"}
                            </h3>
                            <p className="text-xs text-slate-600 mt-1">
                                 {language === 'fr' ? "Accessibles uniquement aux membres vérifiés (Table Ronde)." : "Accessible only to verified members."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
      case ViewState.LIBRARY:
        return (
            <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-4 bg-emerald-900/30 rounded-2xl border border-emerald-500/20 text-emerald-400">
                        <BookOpen size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white">
                            {language === 'fr' ? 'Bibliothèque' : language === 'en' ? 'Library' : 'Agindaasowigamig'}
                        </h2>
                        <p className="text-slate-400 font-light">
                            {language === 'fr' ? 'Guides pratiques, recherches et documentation citoyenne.' : 
                             'Practical guides, research and citizen documentation.'}
                        </p>
                    </div>
                </div>

                {/* SECTION 2: BIBLIOTHEQUE MOVED */}
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                         {/* EAU SECOURS */}
                         <a href="https://eausecours.org/sites/eausecours.org/wp-content/uploads/2023/11/Guide-citoyen-industrie-miniere_FR.pdf" target="_blank" rel="noreferrer" className="glass-card p-6 rounded-2xl hover:bg-emerald-900/10 group transition-all border border-white/5 hover:border-emerald-500/30 flex items-start gap-4">
                            <div className="p-3 bg-white/5 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <BookOpen size={24} />
                            </div>
                            <div className="flex-1">
                                 <h3 className="text-lg font-bold text-slate-200 mb-1 group-hover:text-white flex items-center gap-2">
                                     {language === 'fr' ? "Guide citoyen sur l'industrie minière" : "Citizen Guide to Mining Industry"}
                                     <ExternalLink size={12} className="opacity-50" />
                                 </h3>
                                 <p className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-2">Eau Secours (2023)</p>
                                 <p className="text-sm text-slate-400 font-light leading-relaxed">
                                     {language === 'fr' ? "Un manuel complet pour comprendre les étapes d'un projet minier, du claim à l'exploitation, et les moyens de s'y opposer." : "A complete manual to understand mining project stages and opposition methods."}
                                 </p>
                            </div>
                            <div className="hidden md:block">
                                 <div className="p-2 bg-slate-900 rounded-lg text-slate-500 group-hover:text-white transition-colors">
                                     <Download size={20} />
                                 </div>
                            </div>
                         </a>

                         {/* CQDE */}
                         <a href="https://cqde.org" target="_blank" rel="noreferrer" className="glass-card p-6 rounded-2xl hover:bg-indigo-900/10 group transition-all border border-white/5 hover:border-indigo-500/30 flex items-start gap-4">
                            <div className="p-3 bg-white/5 rounded-xl text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                <Scale size={24} />
                            </div>
                            <div className="flex-1">
                                 <h3 className="text-lg font-bold text-slate-200 mb-1 group-hover:text-white flex items-center gap-2">
                                     {language === 'fr' ? "Centre Québécois du Droit de l'Environnement" : "QC Environmental Law Center"}
                                     <ExternalLink size={12} className="opacity-50" />
                                 </h3>
                                 <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-2">Ressources Juridiques</p>
                                 <p className="text-sm text-slate-400 font-light leading-relaxed">
                                     {language === 'fr' ? "Accès à des guides sur les droits citoyens, les injonctions et la protection des milieux humides." : "Access to guides on citizen rights, injunctions and wetland protection."}
                                 </p>
                            </div>
                         </a>
                    </div>
                </div>
            </div>
        );
      default:
        return (
          <Dashboard 
            authState={authState} 
            setViewState={setView} 
            onNavigateToAction={handleNavigateToCommunityAction} 
            language={language}
            isAdmin={isAdmin}
          />
        );
    }
  };

  if (isLoading) {
      return (
          <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
               <div className="absolute inset-0 bg-gradient-radial from-emerald-900/20 via-black to-black opacity-50"></div>
               <div className="relative z-10 flex flex-col items-center animate-pulse-slow">
                    {/* Cinematic Intro Logo - Matches Dashboard */}
                    <div className="w-32 h-32 mb-8 relative">
                         <img 
                            src="https://i.imgur.com/nGSeeID.png" 
                            className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-pulse" 
                            alt="Logo Loading"
                         />
                    </div>
                    <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-full animate-[width_3s_ease-out]"></div>
                    </div>
                    <p className="text-xs text-emerald-500/50 mt-4 tracking-[0.5em] uppercase font-bold">Initialisation Le Lynx</p>
               </div>
          </div>
      )
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans relative overflow-hidden bg-[#02040a] text-slate-200">
      
      {/* FULL SCREEN IMAGE MODAL */}
      {selectedImage && (
          <div 
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
            onClick={() => setSelectedImage(null)}
          >
              <button 
                className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors"
                onClick={() => setSelectedImage(null)}
              >
                  <X size={32} />
              </button>
              <img 
                src={selectedImage} 
                className="max-w-full max-h-screen object-contain shadow-2xl rounded-lg" 
                alt="Fullscreen view"
                onClick={(e) => e.stopPropagation()} // Prevent close when clicking image itself
              />
          </div>
      )}

      {/* Nature/Glass Background Elements - Clamped Size to prevent overflow */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* GLOBAL BACKGROUND IMAGE - QUEBEC LAKE */}
        <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1571752726703-4242d45d5a2d?q=80&w=2626&auto=format&fit=crop")' }}
        ></div>
        
        {/* Deepest ambient layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#02040a]/90 via-[#051014]/80 to-[#02040a]/90"></div>
        
        {/* The Lynx Eye - Subtle background glowing vertical slit */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-20 mix-blend-screen">
             <div className="w-full h-full bg-gradient-radial from-amber-900/40 via-transparent to-transparent blur-[100px]"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[300px] bg-amber-500/20 blur-[20px] rounded-full"></div>
        </div>

        {/* Organic floating blobs - Nature Spirit */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-950/30 rounded-full blur-[100px] animate-float duration-[30s]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-950/20 rounded-full blur-[80px] animate-float duration-[35s] delay-1000"></div>
        
        {/* Subtle leaf/scratch textures */}
        <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}></div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-6 z-30 relative bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
         <div className="flex items-center gap-3 cursor-pointer" onClick={handleNavigateToCommunityAction}>
             <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-500/30 flex items-center justify-center overflow-hidden">
                  <img src="https://i.imgur.com/nGSeeID.png" className="w-5 h-5 object-contain" alt="Icon" />
             </div>
             <h1 className="text-xl font-bold text-white font-serif tracking-tight">Le Lynx</h1>
         </div>
         <div className="flex items-center gap-2">
            {profile && <Cloche language={language} onAller={allerDepuisCloche} />}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white hover:text-emerald-400 transition-colors">
               <Menu />
            </button>
         </div>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-xl pt-24 md:hidden transition-all duration-300">
            <div className="px-6 h-full overflow-y-auto pb-10">
                <Navigation 
                    currentView={currentView} 
                    setView={(v) => { setView(v); setMobileMenuOpen(false); }} 
                    isMobile={true} 
                    onLogoClick={() => { handleNavigateToCommunityAction(); setMobileMenuOpen(false); }}
                    language={language}
                    setLanguage={setLanguage}
                    isAdmin={isAdmin}
                    setIsAdmin={setIsAdmin}
                    canAdmin={profile?.role === 'admin'}
                />
            </div>
        </div>
      )}

      {/* Desktop Nav */}
      <div className="hidden md:block h-screen sticky top-0 z-30 shrink-0">
        <Navigation 
            currentView={currentView} 
            setView={setView} 
            onLogoClick={handleNavigateToCommunityAction}
            language={language}
            setLanguage={setLanguage}
            isAdmin={isAdmin}
            setIsAdmin={setIsAdmin}
            canAdmin={profile?.role === 'admin'}
        />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto h-screen relative z-10 scroll-smooth custom-scrollbar w-full">
        {profile && (
          <div className="hidden md:flex justify-end mb-2 sticky top-0 z-30">
            <Cloche language={language} onAller={allerDepuisCloche} />
          </div>
        )}
        <div className="max-w-7xl mx-auto pb-10">
          {renderContent()}
        </div>

        <footer className="mt-12 py-10 border-t border-white/5 text-center relative">
            <div className="absolute left-1/2 -top-px -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
            <a href="https://www.lesalondesinconnus.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 group">
                <p className="text-[10px] text-slate-600 font-bold tracking-[0.3em] uppercase group-hover:text-emerald-500/80 transition-colors">
                    interface conceptualisée par le salon des inconnus
                </p>
                <img 
                    src="https://i.imgur.com/vxVavBR.png" 
                    alt="Logo Salon des Inconnus" 
                    className="w-12 h-auto opacity-50 group-hover:opacity-100 transition-all duration-300"
                />
            </a>
        </footer>
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
