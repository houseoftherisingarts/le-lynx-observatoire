import React, { useState, useRef, useEffect } from 'react';
import { ViewState, Language } from '../types';
import { EtatModules, MODULES_PAR_DEFAUT, suivreModules } from '../services/modulesService';
import { 
  LayoutDashboard, 
  Newspaper, 
  Archive, 
  Map, 
  Scale, 
  MessageSquare, 
  Users,
  Network,
  MessageCircleQuestion,
  Lock,
  Unlock,
  AlertTriangle,
  BookOpen,
  X,
  Check
} from 'lucide-react';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isMobile?: boolean;
  onLogoClick?: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  canAdmin?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ 
  currentView, 
  setView, 
  isMobile = false, 
  onLogoClick, 
  language, 
  setLanguage,
  isAdmin,
  setIsAdmin,
  canAdmin = false
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!logoRef.current) return;
    const { left, top, width, height } = logoRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 10;
    const y = -(e.clientY - top - height / 2) / 10;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
      // If currently on admin page, redirect to dashboard
      if (currentView === ViewState.ADMIN) {
        setView(ViewState.DASHBOARD);
      }
    } else if (canAdmin) {
      setIsAdmin(true);
      setShowAdminLogin(false);
    } else {
      setShowAdminLogin(true);
    }
  };
  
  const translations = {
    fr: {
      dashboard: 'Tableau de bord',
      community: 'Le QG',
      reseau: 'Le réseau',
      questions: 'Poser une question',
      news: 'Veille & Signaux',
      claims: 'Cartographie Claims',
      archives: 'Historique',
      laws: 'Cadre Juridique',
      library: 'Bibliothèque',
      chat: 'Assistant Lynx',
      admin: 'Finances', // Renamed from Accès Admin
      report: 'Signaler une autre compagnie',
      role: 'Observatoire Citoyen',
      adminMode: 'Mode Admin'
    },
    en: {
      dashboard: 'Dashboard',
      community: 'The HQ',
      reseau: 'The network',
      questions: 'Ask a question',
      news: 'Monitoring & Signals',
      claims: 'Claims Mapping',
      archives: 'History',
      laws: 'Legal Framework',
      library: 'Library',
      chat: 'Lynx Assistant',
      admin: 'Finances', // Renamed
      report: 'Report another company',
      role: 'Citizen Observatory',
      adminMode: 'Admin Mode'
    },
    ani: {
      dashboard: 'Dashboard',
      community: 'The HQ',
      reseau: 'The network',
      questions: 'Ask a question',
      news: 'Monitoring & Signals',
      claims: 'Claims Mapping',
      archives: 'History',
      laws: 'Legal Framework',
      library: 'Agindaasowigamig',
      chat: 'Lynx Assistant',
      admin: 'Finances', // Renamed
      report: 'Report another company',
      role: 'Citizen Observatory',
      adminMode: 'Admin Mode'
    }
  };

  const t = translations[language];

  // Les interrupteurs de /admin commandent la navigation : Finances reste
  // éteint tant que l'administration ne l'allume pas.
  const [modules, setModules] = useState<EtatModules>(MODULES_PAR_DEFAUT);
  useEffect(() => suivreModules(setModules), []);

  const navItems = [
    { id: ViewState.DASHBOARD, label: t.dashboard, icon: LayoutDashboard },
    { id: ViewState.COMMUNITY, label: t.community, icon: Users },
    { id: ViewState.RESEAU, label: t.reseau, icon: Network },
    { id: ViewState.NEWS, label: t.news, icon: Newspaper },
    { id: ViewState.CLAIMS, label: t.claims, icon: Map },
    { id: ViewState.ARCHIVES, label: t.archives, icon: Archive },
    { id: ViewState.LAWS, label: t.laws, icon: Scale },
    { id: ViewState.LIBRARY, label: t.library, icon: BookOpen },
    { id: ViewState.CHAT, label: t.chat, icon: MessageSquare },
    { id: ViewState.QUESTIONS, label: t.questions, icon: MessageCircleQuestion },
    ...(modules.finances ? [{ id: ViewState.ADMIN, label: t.admin, icon: DollarSignIcon }] : []),
  ];

  // Helper icon for Finances (using simple dollar sign concept or just Lock as placeholder if Dollar not imported)
  function DollarSignIcon(props: any) {
     // Using Lucide Lock for admin/finances if preferred, or custom SVG. 
     // Reusing Lock from import but visually it represents the restricted Finance section
     return <Lock {...props} />;
  }

  const containerClasses = isMobile 
    ? "w-full flex flex-col relative z-20 transition-all bg-transparent"
    : "w-full md:w-72 glass-panel h-screen flex flex-col fixed md:relative z-20 transition-all bg-[#0a0a0a]/80 backdrop-blur-2xl border-r border-white/5 overflow-y-auto custom-scrollbar";

  const paddingClasses = isMobile ? "p-0 pb-10" : "p-8";

  return (
    <nav className={containerClasses}>
      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-6 rounded-2xl w-full max-w-xs border border-white/10 relative">
             <button onClick={() => setShowAdminLogin(false)} className="absolute top-3 right-3 text-slate-500 hover:text-white"><X size={16}/></button>
             <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Lock size={16}/> {t.adminMode}</h3>
             <p className="text-slate-400 text-sm leading-relaxed mb-4">
               Le mode administration est réservé aux comptes dont le rôle est défini dans le registre. Connectez-vous avec le compte autorisé, puis réessayez.
             </p>
             <button onClick={() => setShowAdminLogin(false)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-bold">
               Compris
             </button>
          </div>
        </div>
      )}

      <div className={paddingClasses}>
        
        {/* Top Controls: Language & Admin Toggle */}
        <div className={`flex items-start justify-between mb-4 ${isMobile ? 'pr-4' : ''}`}>
           {/* Admin Toggle Switch */}
           <button 
              onClick={handleAdminToggle}
              className={`p-1.5 rounded-full border transition-all ${isAdmin ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'bg-transparent border-transparent text-slate-600 hover:text-slate-400'}`}
              title={isAdmin ? "Désactiver Admin" : "Activer Admin"}
           >
              {isAdmin ? <Unlock size={14} /> : <Lock size={14} />}
           </button>

           {/* Language */}
           <div className="flex flex-col items-end">
             <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10">
                <button 
                  onClick={() => setLanguage('fr')}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${language === 'fr' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  FR
                </button>
                <button 
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${language === 'en' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLanguage('ani')}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${language === 'ani' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  ANI
                </button>
             </div>
             {language === 'ani' && (
                <div className="mt-2 text-right max-w-[150px] animate-fade-in">
                    <p className="text-[9px] text-emerald-500/80 italic leading-tight">
                        Translation is a work in progress.
                    </p>
                </div>
             )}
           </div>
        </div>

        {!isMobile && (
          <div 
            className="flex flex-col items-center mb-8 cursor-pointer perspective-1000 group"
            onClick={onLogoClick}
          >
              <div 
                  ref={logoRef}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="relative w-full h-auto mb-4 p-4 transition-transform duration-100 ease-out"
                  style={{
                      transform: `perspective(1000px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(1.05)`,
                      transformStyle: 'preserve-3d'
                  }}
              >
                  <img 
                      src="https://i.imgur.com/nGSeeID.png" 
                      alt="Le Lynx Logo" 
                      className="w-full h-auto object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] opacity-90 group-hover:opacity-100 transition-opacity"
                      style={{ transform: 'translateZ(20px)' }}
                  />
              </div>
              
              <p className="text-[11px] text-slate-400 font-medium text-center tracking-widest uppercase mt-2 group-hover:text-emerald-400 transition-colors">
                Le Lynx
              </p>
               <p className="text-[9px] text-emerald-600/70 font-bold text-center tracking-[0.2em] uppercase mt-1">
                {t.role}
              </p>
          </div>
        )}

        <div className="space-y-1">
          {navItems.map((item) => {
            // Hide Admin/Finance tab if not admin
            if (item.id === ViewState.ADMIN && !isAdmin) return null;

            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <React.Fragment key={item.id}>
                {item.id === ViewState.LIBRARY && (
                    <div className="my-3 mx-4 border-t border-white/5" />
                )}
                <button
                    onClick={() => setView(item.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                    isActive 
                        ? 'bg-white/10 text-white shadow-lg' 
                        : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                    }`}
                >
                    <Icon size={18} className={`transition-all duration-300 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    
                    <span className={`font-medium text-sm tracking-wide transition-all ${isActive ? 'translate-x-0.5' : ''}`}>{item.label}</span>
                    
                    {item.id === ViewState.ADMIN && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        
        {/* SUBMIT PROJECT SECTION */}
        <div className="mt-8 pt-6 border-t border-white/5 pb-8">
             <button
                onClick={() => setView(ViewState.SUBMIT_PROJECT)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden border ${
                  currentView === ViewState.SUBMIT_PROJECT
                    ? 'bg-red-900/20 text-white shadow-lg border-red-500' 
                    : 'border-red-500/30 text-slate-400 hover:bg-red-900/10 hover:text-red-300 hover:border-red-500/60'
                }`}
              >
                <AlertTriangle size={18} className={`transition-all duration-300 ${currentView === ViewState.SUBMIT_PROJECT ? 'text-red-400' : 'text-red-500/70 group-hover:text-red-400'}`} />
                
                <span className={`font-medium text-sm tracking-wide transition-all ${currentView === ViewState.SUBMIT_PROJECT ? 'translate-x-0.5' : ''}`}>{t.report}</span>
              </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;