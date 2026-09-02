
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
import CarteClaims from './components/CarteClaims';
import DirectEnCours from './components/social/DirectEnCours';
import CadreJuridique from './components/CadreJuridique';
import Bibliotheque from './components/Bibliotheque';
import PoserQuestion from './components/social/PoserQuestion';
import Cloche from './components/social/Cloche';
import { Map as MapIcon, Scale, Menu, ExternalLink, FileText, Lock, ShieldCheck, BookOpen, Download, Globe, X, HelpCircle, Monitor, Layers, RefreshCw, ZoomIn, Eye } from 'lucide-react';

// Add global types for external libraries
declare global {
    interface Window {
        google: any;
    }
}

// Google Maps Component
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
        return <CarteClaims language={language} />;
      case ViewState.LAWS:
        return <CadreJuridique language={language} isAdmin={isAdmin} />;
      case ViewState.LIBRARY:
        return <Bibliotheque language={language} isAdmin={isAdmin} />;
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
          <DirectEnCours language={language} />
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
