import React, { useState, useEffect, useRef } from 'react';
import { getSituationSummary } from '../services/claudeService';
import { AuthState, Language, CalmPost } from '../types';
import { Users, AlertTriangle, Activity, Droplets, ChevronDown, CheckCircle, Target, Shield, Clock, AlertOctagon, ExternalLink, X, Phone, FileText, Feather, ArrowRight, Hand, PenTool, BookOpen, HelpCircle, Eye, Share2, Facebook, Instagram, Twitter, Check, Copy, RefreshCw, Loader, Download, Smartphone, Map, Lock, Unlock, Plus, Edit3 } from 'lucide-react';

interface DashboardProps {
    authState: AuthState;
    setViewState: (view: any) => void;
    onNavigateToAction: () => void;
    language: Language;
    isAdmin: boolean;
}

interface SummarySection {
    type: 'DANGER' | 'BOUCLIER' | 'PLUME' | 'AUTRE';
    title: string;
    detail: string;
}

interface ShareableContent {
    title: string;
    subtitle: string;
    type: string;
    date?: string;
    location?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ authState, setViewState, onNavigateToAction, language, isAdmin }) => {
  const [introText, setIntroText] = useState<string>("");
  const [sections, setSections] = useState<SummarySection[]>([]);
  const [expandedSectionIndex, setExpandedSectionIndex] = useState<number | null>(null);
  
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  
  // Share Modal State
  const [shareModalContent, setShareModalContent] = useState<ShareableContent | null>(null);
  const [shareHashtags, setShareHashtags] = useState('');
  const [shareUniqueText, setShareUniqueText] = useState('');
  const [copiedState, setCopiedState] = useState<'facebook' | 'instagram' | 'x' | 'text' | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [desktopFeedback, setDesktopFeedback] = useState<string | null>(null);

  // CALME State
  const [isCalmModalOpen, setIsCalmModalOpen] = useState(false);
  const [isCalmAdmin, setIsCalmAdmin] = useState(false);
  const [calmPassword, setCalmPassword] = useState('');
  const [calmLoginError, setCalmLoginError] = useState(false);
  const [newCalmPost, setNewCalmPost] = useState({ title: '', content: '' });
  const [isPostingCalm, setIsPostingCalm] = useState(false);
  const [calmTab, setCalmTab] = useState<'journal' | 'manifesto'>('journal');
  
  const [calmPosts, setCalmPosts] = useState<CalmPost[]>([
      {
          id: '1',
          title: 'Lancement du journal "Mine de rien"',
          date: '24 Octobre 2025',
          author: 'Le CALME',
          content: 'Alors que notre région a été désertée par ses journaux au fil des ans, il nous semblait nécessaire de créer un espace d\'écrits et de dessins pour opposer une force collective à Lomiko et son monde.'
      }
  ]);

  const cardRef = useRef<HTMLDivElement>(null);

  // Base "NO" votes from the 2025 Referendum (Simulated real data point)
  const REFERENDUM_NO_VOTES = 3842; 
  const PLATFORM_USERS = 1250;
  const engagementCount = REFERENDUM_NO_VOTES + PLATFORM_USERS;

  // Translations
  const translations = {
      fr: {
          whatIsTitle: "Qu'est-ce que Le Lynx ?",
          whatIsText: "Le Lynx est un observatoire numérique indépendant. Nous utilisons la surveillance de données et la mobilisation terrain pour bloquer les projets miniers invasifs, les pétrolières, contrer la désinformation et les cachoteries, et protéger le territoire.",
          contextTitle: "Mise en Contexte",
          contextText: "Depuis 2018, la région de la Petite-Nation est ciblée par Lomiko Metals pour un projet de mine de graphite à ciel ouvert. Ce qui a commencé comme de l'exploration silencieuse s'est transformé en un conflit majeur. Malgré les promesses économiques, les citoyens, les associations de lacs et la communauté de Kitigan Zibi Anishinabeg se sont unis pour protéger l'eau et le territoire. En 2025, un référendum citoyen a confirmé un \"NON\" massif. Aujourd'hui, nous surveillons chaque mouvement pour empêcher l'irréversible.",
          vigilanceTitle: "Résumé de Vigilance",
          analyzing: "Analyse des données stratégiques en cours...",
          takeAction: "Poser une action concrète",
          engagedCitizens: "Citoyens engagés",
          participationConfirmed: "Participation confirmée",
          joinMovement: "Joindre le mouvement",
          priority: "Prioritaire",
          viewInstructions: "Voir les instructions",
          resourcesAndActions: "Ressources et actions concrètes",
          officialPetition: "Pétition Officielle",
          petitionText: "Ajoutez votre voix à la demande de moratoire.",
          petitionNote: "La pétition ne règle pas tout. Les actions concrètes de terrain doivent continuer.",
          signPetition: "Signer la pétition",
          fieldAlert: "Alerte Terrain",
          alertText: "Vigilance accrue demandée dans le secteur Sud. Signalez toute machinerie.",
          gestimMap: "Carte GESTIM",
          whatIsClaim: "Qu'est-ce un claim ?",
          partners: "Partenaires et Alliés du Territoire",
          threatMapTitle: "Cartographie des Menaces",
          threatMapSubtitle: "Zones actives sous surveillance",
          criticalZone: "Zone Critique",
          surveillanceZone: "Surveillance",
          latestCalm: "Dernières nouvelles du CALME",
          readCalm: "Lire le journal Mine de rien"
      },
      en: {
          whatIsTitle: "What is Le Lynx?",
          whatIsText: "Le Lynx is an independent digital observatory. We use data surveillance and field mobilization to block invasive mining projects and oil companies, counter disinformation and secrecy, and protect the territory.",
          contextTitle: "Context",
          contextText: "Since 2018, the Petite-Nation region has been targeted by Lomiko Metals for an open-pit graphite mine project. What began as silent exploration has turned into a major conflict. Despite economic promises, citizens, lake associations, and the Kitigan Zibi Anishinabeg community have united to protect water and territory. In 2025, a citizen referendum confirmed a massive 'NO'. Today, we monitor every movement to prevent the irreversible.",
          vigilanceTitle: "Vigilance Summary",
          analyzing: "Analyzing strategic data...",
          takeAction: "Take Concrete Action",
          engagedCitizens: "Engaged Citizens",
          participationConfirmed: "Participation confirmed",
          joinMovement: "Join the movement",
          priority: "Priority",
          viewInstructions: "View Instructions",
          resourcesAndActions: "Resources & Concrete Actions",
          officialPetition: "Official Petition",
          petitionText: "Add your voice to the moratorium demand.",
          petitionNote: "Petitions are not enough. Concrete actions on the ground must continue.",
          signPetition: "Sign the Petition",
          fieldAlert: "Field Alert",
          alertText: "Increased vigilance requested in the Southern sector. Report any machinery.",
          gestimMap: "GESTIM Map",
          whatIsClaim: "What is a claim?",
          partners: "Partners and Allies of the Territory",
          threatMapTitle: "Threat Map",
          threatMapSubtitle: "Active zones under surveillance",
          criticalZone: "Critical Zone",
          surveillanceZone: "Surveillance",
          latestCalm: "Latest from Le CALME",
          readCalm: "Read Mine de rien journal"
      },
      ani: {
          whatIsTitle: "What is Le Lynx?",
          whatIsText: "Le Lynx is an independent digital observatory. We use data surveillance and field mobilization to block invasive mining projects and oil companies, counter disinformation and secrecy, and protect the territory.",
          contextTitle: "Context",
          contextText: "Since 2018, the Petite-Nation region has been targeted by Lomiko Metals for an open-pit graphite mine project. What began as silent exploration has turned into a major conflict. Despite economic promises, citizens, lake associations, and the Kitigan Zibi Anishinabeg community have united to protect water and territory. In 2025, a citizen referendum confirmed a massive 'NO'. Today, we monitor every movement to prevent the irreversible.",
          vigilanceTitle: "Vigilance Summary",
          analyzing: "Analyzing strategic data...",
          takeAction: "Take Concrete Action",
          engagedCitizens: "Engaged Citizens",
          participationConfirmed: "Participation confirmed",
          joinMovement: "Join the movement",
          priority: "Priority",
          viewInstructions: "View Instructions",
          resourcesAndActions: "Resources & Concrete Actions",
          officialPetition: "Official Petition",
          petitionText: "Add your voice to the moratorium demand.",
          petitionNote: "Petitions are not enough. Concrete actions on the ground must continue.",
          signPetition: "Sign the Petition",
          fieldAlert: "Field Alert",
          alertText: "Increased vigilance requested in the Southern sector. Report any machinery.",
          gestimMap: "GESTIM Map",
          whatIsClaim: "What is a claim?",
          partners: "Partners and Allies of the Territory",
          threatMapTitle: "Threat Map",
          threatMapSubtitle: "Active zones under surveillance",
          criticalZone: "Critical Zone",
          surveillanceZone: "Surveillance",
          latestCalm: "Latest from Le CALME",
          readCalm: "Read Mine de rien journal"
      }
  };

  const t = translations[language];

  useEffect(() => {
    getSituationSummary().then(text => {
        // Parsing Logic for Custom Format
        const parts = text.split('###').map(p => p.trim());
        const introPart = parts[0].replace('INTRO:', '').trim();
        setIntroText(introPart);

        const parsedSections: SummarySection[] = [];
        for (let i = 1; i < parts.length; i++) {
            const lines = parts[i].split('\n');
            let type: any = 'AUTRE';
            let title = '';
            let detail = '';

            lines.forEach(line => {
                if (line.startsWith('TYPE:')) type = line.replace('TYPE:', '').trim();
                if (line.startsWith('TITRE:')) title = line.replace('TITRE:', '').trim();
                if (line.startsWith('DETAIL:')) detail = line.replace('DETAIL:', '').trim();
            });

            if (title) parsedSections.push({ type, title, detail });
        }
        setSections(parsedSections);
    });
  }, []);

  // Hashtag & Unique Text Generator Effect
  useEffect(() => {
    if (shareModalContent) {
        const tags = ['#LeLynx', '#PetiteNation', '#NonALaMine', '#ProtectionTerritoire'];
        if (shareModalContent.type === 'URGENCE' || shareModalContent.type === 'DANGER') tags.push('#Alerte', '#Urgence', '#Mobilisation');
        if (shareModalContent.type === 'MOBILISATION' || shareModalContent.type === 'ACTION') tags.push('#Action', '#Solidarite', '#Democratie');
        
        setShareHashtags(tags.join(' '));
        setShareUniqueText(generateUniqueMessage(shareModalContent));
    }
  }, [shareModalContent]);

  const generateUniqueMessage = (content: ShareableContent) => {
      const templates = [
          `Information importante : ${content.title}. Restons vigilants.`,
          `Le Lynx signale : ${content.title}. Lisez le résumé.`,
          `Pour la protection de notre territoire : ${content.title}.`,
          `Alerte citoyenne Le Lynx : ${content.title}.`,
          `Nous surveillons la situation : ${content.title}.`
      ];
      return templates[Math.floor(Math.random() * templates.length)];
  };

  const refreshUniqueText = () => {
      if(shareModalContent) setShareUniqueText(generateUniqueMessage(shareModalContent));
  };

  const handleSmartShare = async (platform: 'native' | 'facebook' | 'twitter' | 'instagram') => {
      if (!cardRef.current || !window.html2canvas) return;
      setIsGeneratingImage(true);
      setDesktopFeedback(null);
      
      try {
          // 1. Generate Image (High Res)
          const canvas = await window.html2canvas(cardRef.current, {
              scale: 2, 
              backgroundColor: null,
              useCORS: true,
              allowTaint: true
          });
          
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
          if (!blob) throw new Error("Erreur de génération d'image");
          
          const file = new File([blob], 'le_lynx_vigilance.jpg', { type: 'image/jpeg' });
          const shareData = {
              title: shareModalContent?.title || 'Le Lynx',
              text: `${shareUniqueText} ${shareHashtags}`,
              files: [file]
          };

          // 2. Try Native Share (Mobile - Preloads Image)
          if (platform === 'native' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
              await navigator.share(shareData);
          } else {
              // 3. Fallback for Desktop or specific buttons (Download + Clipboard + Open)
              
              // Trigger Download
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `LeLynx_Vigilance_${Date.now()}.jpg`;
              link.click();

              // Copy Text
              await navigator.clipboard.writeText(`${shareUniqueText} ${shareHashtags}`);
              setCopiedState('text');

              // Platform Specific Redirects
              if (platform === 'facebook') {
                  window.open('https://www.facebook.com', '_blank');
                  setDesktopFeedback("Image téléchargée et texte copié ! Collez-les dans Facebook.");
              } else if (platform === 'twitter') {
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareUniqueText + ' ' + shareHashtags)}`, '_blank');
                  setDesktopFeedback("Image téléchargée ! Ajoutez-la à votre tweet.");
              } else if (platform === 'instagram') {
                  setDesktopFeedback("Image téléchargée ! Publiez-la via l'application mobile.");
              } else {
                  setDesktopFeedback("Image téléchargée et texte copié !");
              }
          }
      } catch (err) {
          console.error("Smart share failed", err);
          setDesktopFeedback("Erreur de partage. Réessayez.");
      } finally {
          setIsGeneratingImage(false);
          // Clear feedback after 5s
          setTimeout(() => setDesktopFeedback(null), 5000);
          setTimeout(() => setCopiedState(null), 3000);
      }
  };

  const copyText = () => {
    navigator.clipboard.writeText(`${shareUniqueText} ${shareHashtags}`);
    setCopiedState('text');
    setTimeout(() => setCopiedState(null), 2000);
  };

  // CALME LOGIC
  const handleCalmLogin = () => {
      if(calmPassword === (process.env.CALM_PASSWORD || 'calmadmin')) {
          setIsCalmAdmin(true);
          setCalmLoginError(false);
          setCalmPassword('');
      } else {
          setCalmLoginError(true);
      }
  };

  const handlePostCalm = () => {
      if(!newCalmPost.title || !newCalmPost.content) return;
      const post: CalmPost = {
          id: Date.now().toString(),
          title: newCalmPost.title,
          content: newCalmPost.content,
          date: new Date().toLocaleDateString('fr-CA', {day: 'numeric', month: 'long', year: 'numeric'}),
          author: 'Le CALME'
      };
      setCalmPosts([post, ...calmPosts]);
      setNewCalmPost({ title: '', content: '' });
      setIsPostingCalm(false);
  };

  const nextAction = {
      title: "Séance du Conseil des Maires",
      description: "Présence cruciale à la prochaine séance publique de la MRC Papineau. Exigeons le respect du moratoire.",
      deadline: "Mercredi 19 Nov, 18h30",
      impact: "Critique"
  };

  const getIconForType = (type: string) => {
      switch (type) {
          case 'DANGER': return <AlertOctagon size={18} className="text-red-400" strokeWidth={1.5} />;
          case 'BOUCLIER': return <Shield size={18} className="text-emerald-400" strokeWidth={1.5} />;
          case 'PLUME': return <Feather size={18} className="text-amber-400" strokeWidth={1.5} />;
          default: return <Activity size={18} className="text-slate-400" strokeWidth={1.5} />;
      }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-full overflow-hidden relative">
      
      {/* Share Modal */}
      {shareModalContent && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-xl animate-fade-in">
             <div className="flex min-h-full items-center justify-center p-4">
                <div className="glass-card w-full max-w-4xl rounded-[32px] overflow-hidden bg-[#0a0a0a] relative flex flex-col md:flex-row h-auto max-h-[90vh]">
                    <button onClick={() => setShareModalContent(null)} className="absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full text-slate-400 hover:text-white"><X size={20}/></button>

                    {/* VISUAL PREVIEW SIDE */}
                    <div className="md:w-1/2 p-6 md:p-10 flex flex-col items-center justify-center bg-black/50 border-r border-white/5 overflow-y-auto">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Aperçu Visuel</h3>
                        
                        <div 
                            ref={cardRef}
                            className="w-full max-w-[360px] aspect-[4/5] rounded-2xl overflow-hidden relative group shadow-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-emerald-950 flex flex-col p-6 text-center justify-between mx-auto"
                        >
                            <div className="flex justify-between items-center opacity-70 mb-4 shrink-0">
                                <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase">Le Lynx</span>
                                <div className="px-2 py-1 bg-red-600 text-white text-[8px] font-bold uppercase tracking-wider rounded">{shareModalContent.type}</div>
                            </div>

                            <div className="space-y-3 relative z-10 flex flex-col items-center flex-1 justify-center">
                                <img src="https://i.imgur.com/nGSeeID.png" className="w-16 h-16 object-contain mb-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] shrink-0" alt="Le Lynx Logo" />
                                <div className="w-16 h-1 bg-emerald-500 mx-auto mb-2 rounded-full shadow-[0_0_10px_#10b981] shrink-0"></div>
                                <h2 className="text-xl md:text-2xl font-serif text-white leading-tight drop-shadow-lg line-clamp-4 break-words">{shareModalContent.title}</h2>
                                <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mt-1 shrink-0">Observatoire Citoyen</p>
                            </div>

                            <div className="bg-black/40 backdrop-blur-sm p-3 rounded-xl border border-white/5 space-y-1 shrink-0 mt-4">
                                <p className="text-slate-200 text-xs font-light line-clamp-3 leading-relaxed">
                                    {shareModalContent.subtitle}
                                </p>
                                {shareModalContent.date && (
                                    <div className="flex items-center justify-center gap-2 text-slate-400 text-[10px] font-medium pt-2 border-t border-white/5 mt-2">
                                        <Clock size={10} className="text-emerald-500" />
                                        {shareModalContent.date}
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none"></div>
                        </div>

                        {/* FEEDBACK MSG */}
                        {desktopFeedback && (
                            <div className="mt-4 px-4 py-2 bg-emerald-900/30 text-emerald-400 text-xs font-bold rounded-xl animate-fade-in text-center border border-emerald-500/20">
                                {desktopFeedback}
                            </div>
                        )}

                        <div className="mt-4 flex gap-3">
                            <button 
                                onClick={() => handleSmartShare('native')}
                                disabled={isGeneratingImage}
                                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors px-4 py-2"
                            >
                                {isGeneratingImage ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
                                Télécharger seulement
                            </button>
                        </div>
                    </div>

                    {/* CONTROLS SIDE */}
                    <div className="md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
                        <div className="mb-6">
                            <h2 className="text-2xl font-serif text-white mb-1">Partager</h2>
                            <p className="text-slate-400 text-xs font-light">Amplifiez le message.</p>
                        </div>

                        {/* Unique Text Section */}
                        <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold uppercase text-emerald-400">Message Suggéré (Unique)</label>
                                <button onClick={refreshUniqueText} className="text-slate-500 hover:text-white"><RefreshCw size={12}/></button>
                            </div>
                            <div className="text-sm text-slate-300 font-light mb-3 bg-black/20 p-3 rounded-lg border border-white/5 italic">
                                "{shareUniqueText}"
                            </div>
                            <button 
                                onClick={copyText}
                                className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-all flex items-center justify-center gap-2"
                            >
                                {copiedState === 'text' ? <Check size={12} /> : <Copy size={12} />} 
                                {copiedState === 'text' ? 'Copié !' : 'Copier le texte et les hashtags'}
                            </button>
                        </div>

                        <div className="flex-1 space-y-4">
                            {/* Native Share (Mobile) */}
                            <button 
                                onClick={() => handleSmartShare('native')}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5"
                            >
                                <Smartphone size={18} />
                                Partager (Mobile / Natif)
                            </button>
                            <p className="text-[10px] text-slate-500 text-center -mt-2 mb-2">
                                Génère l'image et ouvre l'app de votre choix (FB, Insta, X...)
                            </p>

                            <div className="grid grid-cols-3 gap-3">
                                <button 
                                    onClick={() => handleSmartShare('facebook')}
                                    className="py-3 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 rounded-xl text-[#1877F2] text-xs font-bold uppercase tracking-wide transition-all flex flex-col items-center justify-center gap-2"
                                >
                                    <Facebook size={16} /> Facebook
                                </button>

                                <button 
                                    onClick={() => handleSmartShare('instagram')}
                                    className="py-3 bg-[#E1306C]/10 hover:bg-[#E1306C]/20 border border-[#E1306C]/30 rounded-xl text-[#E4405F] text-xs font-bold uppercase tracking-wide transition-all flex flex-col items-center justify-center gap-2"
                                >
                                    <Instagram size={16} /> Instagram
                                </button>

                                <button 
                                    onClick={() => handleSmartShare('twitter')}
                                    className="py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl text-white text-xs font-bold uppercase tracking-wide transition-all flex flex-col items-center justify-center gap-2"
                                >
                                    <Twitter size={16} /> X (Twitter)
                                </button>
                            </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/5">
                                <p className="text-[10px] text-slate-500 font-mono mb-2">HASHTAGS</p>
                                <div className="p-3 bg-black/40 rounded-lg border border-white/5 text-[10px] text-slate-400 font-mono leading-relaxed break-words">
                                    {shareHashtags}
                                </div>
                            </div>
                    </div>
                </div>
             </div>
        </div>
      )}

      {/* Action Modal Overlay */}
      {isActionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in">
              <div className="glass-card w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border border-white/10 relative bg-[#0a0a0a]">
                  <button 
                    onClick={() => setIsActionModalOpen(false)}
                    className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors z-10"
                  >
                      <X size={16} className="text-slate-400" />
                  </button>
                  
                  <div className="p-8 pb-4">
                      <div className="flex items-center gap-3 mb-2">
                          <div className="p-3 bg-emerald-900/20 rounded-2xl text-emerald-400">
                             <Phone size={20} strokeWidth={1.5} />
                          </div>
                          <div>
                            <h3 className="text-xl font-medium text-white">Instructions Blitz</h3>
                            <p className="text-slate-400 text-sm font-light">Guide d'appel citoyen</p>
                          </div>
                      </div>
                  </div>

                  <div className="px-8 pb-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Contacts Prioritaires</h4>
                          <div className="space-y-3">
                              <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                  <div>
                                      <p className="font-medium text-slate-200">MRC Papineau</p>
                                      <p className="text-xs text-slate-500 font-light">Bureau administratif</p>
                                  </div>
                                  <a href="tel:8194276243" className="px-4 py-2 bg-emerald-600/10 text-emerald-400 rounded-lg font-mono text-sm group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                      819-427-6243
                                  </a>
                              </div>
                              <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                  <div>
                                      <p className="font-medium text-slate-200">Mathieu Lacombe</p>
                                      <p className="text-xs text-slate-500 font-light">Député Papineau</p>
                                  </div>
                                  <a href="tel:8199869300" className="px-4 py-2 bg-slate-700/30 text-slate-300 rounded-lg font-mono text-sm group-hover:bg-slate-700 group-hover:text-white transition-all">
                                      819-986-9300
                                  </a>
                              </div>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Script Suggéré</h4>
                          <div className="bg-[#111] rounded-2xl p-6 border border-white/5 relative">
                              <FileText className="absolute top-6 right-6 text-slate-800" size={32} />
                              <p className="text-slate-300 text-sm leading-relaxed pr-6 font-serif italic opacity-80">
                                  "Bonjour, je suis citoyen(ne) de la Petite-Nation. J'appelle pour exprimer mon opposition formelle à tout renouvellement de claim minier sur le territoire, en respect du référendum citoyen de 2025. Je demande que la MRC appuie officiellement la demande de moratoire de Kitigan Zibi."
                              </p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* CALME MODAL */}
      {isCalmModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-xl animate-fade-in">
              <div className="flex min-h-full items-center justify-center p-4">
                <div className="glass-card w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl border border-white/10 relative bg-[#0a0a0a] min-h-[80vh] flex flex-col">
                    <button 
                        onClick={() => { setIsCalmModalOpen(false); setIsCalmAdmin(false); setCalmTab('journal'); }}
                        className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors z-20"
                    >
                        <X size={16} className="text-slate-400" />
                    </button>

                    <div className="flex flex-col md:flex-row flex-1">
                        {/* Sidebar / Info */}
                        <div className="md:w-1/3 bg-white/[0.02] border-r border-white/5 p-8 flex flex-col">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-black border-4 border-slate-300 shadow-xl">
                                    <Feather size={32} />
                                </div>
                                <h2 className="text-3xl font-serif text-white mb-2 leading-none">Le CALME</h2>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6">Comité autonome contre La Loutre</p>
                                
                                <div className="text-slate-400 text-sm font-light leading-relaxed space-y-4 mb-8 overflow-y-auto custom-scrollbar flex-1 pr-2">
                                    <p>Le CALME est un comité citoyen ouvert à toute personne opposée au projet minier La Loutre et à l'extractivisme en général.</p>
                                    <p>Nous publions le journal <em className="text-white font-serif">Mine de rien</em> pour opposer une force collective à Lomiko. Partout au Québec, les claims explosent. Notre lutte est solidaire de la Nation Anishinaabe.</p>
                                    <p>Ce projet n'est que la pointe de l'iceberg. Il faut que la lutte vive pour qu'on l'écrive.</p>
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    {!isCalmAdmin ? (
                                        <div className="space-y-3">
                                            <button 
                                                onClick={() => {}}
                                                className="text-xs text-slate-500 hover:text-white flex items-center gap-2 transition-colors cursor-default"
                                            >
                                                <Lock size={12}/> Accès Membres Comité
                                            </button>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="password" 
                                                    placeholder="Mot de passe" 
                                                    value={calmPassword}
                                                    onChange={(e) => setCalmPassword(e.target.value)}
                                                    className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-white w-full focus:outline-none focus:border-white/30"
                                                />
                                                <button 
                                                    onClick={handleCalmLogin}
                                                    className="bg-white text-black px-3 rounded text-xs font-bold hover:bg-slate-200"
                                                >
                                                    OK
                                                </button>
                                            </div>
                                            {calmLoginError && <p className="text-red-500 text-[10px]">Mot de passe incorrect.</p>}
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-900/20 border border-emerald-500/20 p-4 rounded-xl">
                                            <p className="text-emerald-400 text-xs font-bold uppercase mb-2 flex items-center gap-2"><Unlock size={12}/> Mode Admin Actif</p>
                                            <button onClick={() => setIsPostingCalm(true)} className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 flex items-center justify-center gap-2">
                                                <Plus size={12} /> Nouvel Article
                                            </button>
                                        </div>
                                    )}
                                </div>
                        </div>

                        {/* Main Content / Journal */}
                        <div className="md:w-2/3 p-8 md:p-12 overflow-y-auto custom-scrollbar bg-[#e8e6e1] text-slate-900">
                            {/* Tab Switcher */}
                            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-300">
                                <button 
                                    onClick={() => setCalmTab('journal')}
                                    className={`text-sm font-bold uppercase tracking-widest transition-colors ${calmTab === 'journal' ? 'text-black border-b-2 border-black pb-1' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    Journal Mine de Rien
                                </button>
                                <button 
                                    onClick={() => setCalmTab('manifesto')}
                                    className={`text-sm font-bold uppercase tracking-widest transition-colors ${calmTab === 'manifesto' ? 'text-black border-b-2 border-black pb-1' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    Manifeste
                                </button>
                            </div>

                            {calmTab === 'journal' ? (
                                <>
                                    <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-4xl font-serif text-black tracking-tight">Derniers Articles</h3>
                                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 border border-slate-400 px-3 py-1 rounded-full">Journal de lutte</span>
                                    </div>

                                    {isPostingCalm && (
                                        <div className="mb-8 p-6 bg-white rounded-xl shadow-xl border border-slate-200">
                                            <h4 className="text-sm font-bold uppercase mb-4 text-emerald-700">Nouvelle Publication</h4>
                                            <input 
                                                    type="text" 
                                                    placeholder="Titre de l'article"
                                                    className="w-full p-3 border border-slate-300 rounded-lg mb-3 font-serif text-lg bg-slate-50 focus:outline-none focus:border-slate-500"
                                                    value={newCalmPost.title}
                                                    onChange={(e) => setNewCalmPost({...newCalmPost, title: e.target.value})}
                                            />
                                            <textarea 
                                                    placeholder="Contenu de l'article..."
                                                    className="w-full p-3 border border-slate-300 rounded-lg mb-4 h-40 bg-slate-50 focus:outline-none focus:border-slate-500"
                                                    value={newCalmPost.content}
                                                    onChange={(e) => setNewCalmPost({...newCalmPost, content: e.target.value})}
                                            />
                                            <div className="flex justify-end gap-3">
                                                <button onClick={() => setIsPostingCalm(false)} className="px-4 py-2 text-slate-500 hover:text-black text-xs font-bold uppercase">Annuler</button>
                                                <button onClick={handlePostCalm} className="px-6 py-2 bg-black text-white rounded-lg text-xs font-bold uppercase hover:bg-slate-800">Publier</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-12">
                                            {calmPosts.map(post => (
                                                <article key={post.id} className="prose prose-slate max-w-none">
                                                    <div className="mb-4">
                                                        <h4 className="text-2xl font-bold text-black mb-1">{post.title}</h4>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{post.date} • Par {post.author}</p>
                                                    </div>
                                                    <div className="text-justify font-serif leading-relaxed text-slate-800 whitespace-pre-wrap">
                                                        {post.content}
                                                    </div>
                                                    <div className="w-12 h-1 bg-black mt-8 mb-8 opacity-10"></div>
                                                </article>
                                            ))}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6 animate-fade-in">
                                    <h3 className="text-3xl font-serif text-black tracking-tight mb-4">Manifeste du CALME</h3>
                                    
                                    <div className="prose prose-slate max-w-none text-justify font-serif text-slate-800 leading-relaxed whitespace-pre-wrap">
                                        <p>Le CALME est un comité citoyen ouvert à toute personne opposée au projet minier La Loutre et à l'extractivisme en général. Le CALME publie un journal, Mine de rien, et réalise différentes actions.</p>

                                        <p>Partout à travers le soi-disant Québec, l'exploration minière a explosé dans les dernières années : les claims recouvrent maintenant plus de 10 % de toute la province, soit l'équivalent de 400 fois l'ile de Montréal. Des régions historiquement épargnées par l'activité minière deviennent des terrains de renouvellement de l'extractivisme au soi-disant Canada. À Saint-Michel-des-Saints, la minière au nom éloquent de Nouveau Monde Graphite développe la «plus grande mine de graphite de l'Occident», au carrefour d'un parc national, d'un parc régional et d'une réserve faunique À une centaine de kilomètres au sud-ouest, près de la Réserve faunique Papineau-Labelle, dans la Petite-Nation, c'est la minière Lomiko Metals qui projette de creuser une mine à ciel ouvert de graphite d'une étendue similaire au Mont-Royal. Plusieurs autres projets de mines de graphite sont en développement entre le nord de la Mauricie et le sud de l'Outaouais.</p>

                                        <p>Des quatre coins de la Petite-Nation, nous nous opposons au projet minier La Loutre et à l'extractivisme. Ce projet n'est que la pointe de la ceinture de graphite que Lomiko et ses semblables souhaitent exploiter.<br/>
                                        Le fait que ce territoire nous habite et que nous l'habitons en retour n'est qu'une anecdote pour ces minières. C'est ce que démontre la longue histoire coloniale de l'extractivisme au Canada et ailleurs. Notre lutte est solidaire des peuples qui luttent depuis longtemps contre de tels projets, notamment la Nation Anishinaabe, dont le territoire ancestral traverse la Petite-Nation.</p>

                                        <p>Alors que certaines forces vives de la lutte chuchotent «victoire» sur la base des dires d'un ministre, nous souhaitons rappeler que rien n'est gagné. La CAQ n'a pas refusé le projet, mais son financement public. Lomiko prend le gouvernement à la lettre, en se permettant même de lui faire des leçons. La minière ira de l'avant avec son projet, coûte que coûte.<br/>
                                        Et comme il est grassement financé par le fédéral et nulle autre que la Défense américaine, le projet reste une aubaine pour Lomiko. Avec la loi C-5 et les tensions avec les États-Unis, on peut se demander quels intérêts primeront au moment de concrétiser le projet. Le référendum sur l'acceptabilité sociale de La Loutre du 31 août 2025 traduira probablement une opposition générale au projet, mais sera-t-elle seulement entendue?</p>

                                        <p>C'est dans ce contexte que le CALME surgit. Pour que la lutte ne sombre pas dans la complaisance ou l'inertie, il faut multiplier les espaces et les moments d'opposition à ce projet et formuler ensemble des alternatives. Alors que notre région a été désertée par ses journaux au fil des ans, il nous semblait nécessaire de créer un espace d'écrits et de dessins pour opposer une force collective à Lomiko et son monde. Mine de rien n'est Pas autosuffisant : il faudra sans cesse relancer ce journal et le nourrir de discussions, de moments et de réflexions. En d'autres mots, il faut que la lutte vive pour qu'on l'écrive. C'est vers ces moments dans le réel que nous nous tournons, à défaut d'être sur les réseaux sociaux.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              </div>
          </div>
      )}

      {/* CLAIM DEFINITION MODAL */}
      {isClaimModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
              <div className="glass-card w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl border border-white/10 relative bg-[#0a0a0a]">
                   <button 
                    onClick={() => setIsClaimModalOpen(false)}
                    className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors z-10"
                  >
                      <X size={16} className="text-slate-400" />
                  </button>

                  <div className="p-10">
                      <div className="flex items-center gap-4 mb-8">
                          <div className="p-4 bg-indigo-900/30 rounded-2xl border border-indigo-500/20 text-indigo-400">
                              <BookOpen size={24} />
                          </div>
                          <h2 className="text-2xl font-serif text-white">{t.whatIsClaim}</h2>
                      </div>

                      <div className="space-y-6 text-slate-300 font-light leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                          <p>
                              Un <strong className="text-white font-medium">claim</strong> est un droit qui donne à une personne le droit exclusif, sur le territoire du claim, d’explorer le sol pour y trouver des ressources minières.
                          </p>
                          <p>
                              Il est possible pour quiconque d’acquérir des claims sur un terrain en passant par le site Web « GESTIM » du ministère des Ressources naturelles et en y payant les frais. Il est toutefois impossible d’inscrire un claim sur certains terrains, notamment s’ils font déjà l’objet de claims ou encore s’ils ont été « soustraits » à l’activité minière par le ministère.
                          </p>
                          <div className="p-6 bg-red-900/10 border border-red-500/20 rounded-xl">
                              <h4 className="text-red-400 font-bold text-sm uppercase mb-2 flex items-center gap-2">
                                  <AlertTriangle size={14}/> Impact sur la propriété privée
                              </h4>
                              <p className="text-sm">
                                  En règle générale, il est possible d’acquérir un claim sur un terrain privé <strong className="text-white">sans que le ou la propriétaire en soit automatiquement informé·e</strong>.
                              </p>
                          </div>
                          <p>
                              Au Québec, le claim permet automatiquement de réaliser certaines activités d’exploration minière et d’accéder au terrain dans certaines circonstances. Certaines autres activités d’exploration, par exemple un forage extractant plus de 500 tonnes métrique de minéraux, requièrent toutefois l’autorisation du ministère de l’Environnement.
                          </p>
                          
                          <a 
                            href="https://cqde.org/nouvelles/claims-miniers-droits-proprietaire" 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 hover:text-white transition-colors mt-4"
                          >
                              Source : Centre québécois du droit de l'environnement (CQDE) <ExternalLink size={12} />
                          </a>
                      </div>
                  </div>
              </div>
          </div>
      )}

        {/* WHAT IS LE LYNX CARD */}
        <section className="glass-card rounded-2xl p-6 border border-emerald-500/20 bg-emerald-950/10 flex flex-col md:flex-row items-start gap-4 shadow-lg shadow-emerald-900/5">
           <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400 shrink-0 border border-emerald-500/20">
              <Eye size={24} strokeWidth={1.5} />
           </div>
           <div>
              <h3 className="text-lg font-serif text-white mb-1 leading-tight">{t.whatIsTitle}</h3>
              <p className="text-sm text-emerald-100/70 font-light leading-relaxed">
                 {t.whatIsText}
              </p>
           </div>
        </section>

        {/* Narrative Context Card (New) */}
        <section className="glass-card rounded-[32px] p-8 md:p-10 relative overflow-hidden bg-gradient-to-r from-slate-950/40 to-transparent border-l-4 border-l-slate-600">
            <div className="flex items-start gap-5">
                <div className="p-3 bg-slate-900/50 rounded-2xl text-slate-400 hidden md:block border border-white/5">
                    <BookOpen size={24} strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-serif text-white mb-4">{t.contextTitle}</h2>
                    <p className="text-slate-300 font-light leading-relaxed max-w-4xl text-sm md:text-base">
                        {t.contextText}
                    </p>
                </div>
            </div>
        </section>

      {/* Header Summary Section - Refined Glass */}
      <section className="glass-card rounded-[32px] p-8 md:p-10 relative overflow-hidden transition-all duration-500 hover:bg-white/[0.02]">
         <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-900/30 to-slate-900 flex items-center justify-center border border-white/5 shadow-inner shrink-0">
                        <Shield className="text-emerald-400 opacity-90" size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-serif text-white leading-tight font-medium">{t.vigilanceTitle}</h2>
                    </div>
                     <button 
                        onClick={() => setShareModalContent({
                            title: "Résumé de Vigilance",
                            subtitle: introText || "Analyse en cours...",
                            type: "URGENCE",
                            date: new Date().toLocaleDateString()
                        })}
                        className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors ml-2"
                        title="Créer une fiche de partage"
                    >
                        <Share2 size={18} />
                    </button>
                </div>
                <div className="flex gap-2 shrink-0">
                     <a href="https://alliancepetitenation.org" target="_blank" rel="noreferrer" className="text-[10px] px-3 py-1.5 rounded-full border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 uppercase tracking-wider font-medium">
                        Alliance <ExternalLink size={10}/>
                     </a>
                     <a href="https://lomiko.com/fr/projets/projet-la-loutre/" target="_blank" rel="noreferrer" className="text-[10px] px-3 py-1.5 rounded-full border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 uppercase tracking-wider font-medium">
                        Lomiko <ExternalLink size={10}/>
                     </a>
                </div>
            </div>
            
            {/* Intro Paragraph */}
            <div className="mb-8 text-slate-300 text-lg font-light leading-relaxed max-w-3xl">
                {introText || t.analyzing}
            </div>

            {/* Collapsible Sections - Cleaner UI */}
            <div className="grid gap-3">
                {sections.length > 0 ? sections.map((section, idx) => {
                    const isOpen = expandedSectionIndex === idx;
                    return (
                        <div key={idx} className={`rounded-2xl overflow-hidden transition-all duration-500 border ${isOpen ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5 hover:bg-white/[0.02]'}`}>
                            <button 
                                onClick={() => setExpandedSectionIndex(isOpen ? null : idx)}
                                className="w-full flex items-center justify-between p-5 text-left group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-white/10' : 'bg-slate-900/50'}`}>
                                        {getIconForType(section.type)}
                                    </div>
                                    <span className={`font-medium text-base transition-colors ${isOpen ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{section.title}</span>
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-white text-black rotate-180' : 'bg-transparent text-slate-500'}`}>
                                    <ChevronDown size={16} />
                                </div>
                            </button>
                            
                            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="p-6 pt-0 pl-[72px] text-slate-400 text-sm leading-7 font-light max-w-2xl">
                                    {section.detail}
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                     <div className="flex flex-col gap-3">
                        <div className="h-16 bg-white/5 rounded-2xl animate-pulse"></div>
                        <div className="h-16 bg-white/5 rounded-2xl animate-pulse delay-75"></div>
                    </div>
                )}
            </div>

            {/* NEW LINK UNDER SUMMARY */}
            <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                <button 
                    onClick={onNavigateToAction}
                    className="flex items-center gap-3 px-6 py-3 bg-white text-black hover:bg-slate-200 transition-all rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.1)] group"
                >
                    <Hand size={16} strokeWidth={2} />
                    {t.takeAction}
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
         </div>
      </section>

      {/* THREAT MAP SECTION - HIDDEN UNLESS ADMIN */}
      {isAdmin && (
        <section className="glass-card rounded-[32px] overflow-hidden relative min-h-[450px] border border-red-500/20 group hover:border-red-500/40 transition-colors animate-fade-in">
                {/* Map Background */}
                <div className="absolute inset-0 bg-slate-900">
                    <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Quebec_location_map.svg/1016px-Quebec_location_map.svg.png" 
                        className="w-full h-full object-cover opacity-20 invert hue-rotate-180 scale-110" 
                        alt="Carte Quebec" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 via-transparent to-transparent"></div>
                </div>

                <div className="absolute top-8 left-8 z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-900/20 rounded-lg border border-red-500/30 text-red-500">
                            <Map size={24} />
                        </div>
                        <h3 className="text-2xl font-serif text-white">
                            {t.threatMapTitle}
                        </h3>
                    </div>
                    <p className="text-sm text-slate-400 font-light max-w-xs">{t.threatMapSubtitle}</p>
                </div>

                {/* Pulsating Dots */}
                {/* Petite-Nation / La Loutre - Approx coordinates relative to map */}
                <div className="absolute top-[75%] left-[28%] group/point cursor-pointer">
                    {/* Large semi-transparent red zones */}
                    <div className="w-32 h-32 bg-red-600/10 rounded-full absolute -top-[3.5rem] -left-[3.5rem] animate-pulse-slow border border-red-500/10"></div>
                    <div className="w-16 h-16 bg-red-600/30 rounded-full absolute -top-5 -left-5 animate-pulse"></div>
                    <div className="w-6 h-6 bg-red-500 rounded-full shadow-[0_0_30px_#ef4444] border-2 border-white relative z-10"></div>

                    {/* Hover Tooltip */}
                    <div className="absolute left-10 top-0 bg-black/90 backdrop-blur-md border border-red-500/30 p-4 rounded-xl opacity-0 group-hover/point:opacity-100 transition-opacity w-56 pointer-events-none z-20 translate-x-2">
                        <h4 className="text-red-500 font-bold uppercase text-xs mb-1 tracking-wider">{t.criticalZone}</h4>
                        <p className="text-white font-medium text-base">Projet La Loutre</p>
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                            Lomiko Metals. Forages actifs signalés. Nappes phréatiques à risque.
                        </p>
                    </div>
                </div>

                {/* Abitibi - Approx */}
                <div className="absolute top-[55%] left-[18%] group/point cursor-pointer">
                    <div className="w-24 h-24 bg-amber-600/10 rounded-full absolute -top-[2.5rem] -left-[2.5rem] animate-pulse-slow delay-700"></div>
                    <div className="w-4 h-4 bg-amber-500/50 rounded-full shadow-[0_0_15px_#f59e0b] border border-amber-500 relative z-10"></div>

                    <div className="absolute left-8 top-0 bg-black/90 backdrop-blur-md border border-amber-500/20 p-4 rounded-xl opacity-0 group-hover/point:opacity-100 transition-opacity w-48 pointer-events-none z-20 translate-x-2">
                        <h4 className="text-amber-500 font-bold uppercase text-xs mb-1 tracking-wider">{t.surveillanceZone}</h4>
                        <p className="text-white font-medium text-sm">Abitibi-Témiscamingue</p>
                        <p className="text-slate-400 text-xs mt-2">Augmentation massive des claims miniers.</p>
                    </div>
                </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Engagement Widget */}
        <div className="glass-card rounded-[32px] p-8 relative group overflow-hidden transition-all duration-500 bg-[#0a0a0a]/40 hover:bg-[#0a0a0a]/60">
            <div className="flex flex-col h-full justify-between">
                <div>
                    <div className="flex justify-between items-start mb-8">
                        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/10">
                            <Users size={24} strokeWidth={1.5} />
                        </div>
                    </div>
                    <div className="text-6xl font-serif text-white mb-3 tracking-tighter">
                        {engagementCount.toLocaleString()}
                    </div>
                    <p className="text-sm text-slate-500 font-medium tracking-wide uppercase">
                        {t.engagedCitizens}
                    </p>
                </div>
                {authState.isAuthenticated ? (
                    <div className="mt-8 py-3 px-4 bg-emerald-500/10 border border-emerald-500/10 rounded-xl flex items-center gap-3 w-fit">
                        <CheckCircle size={16} className="text-emerald-500" />
                        <span className="text-xs text-emerald-200 font-medium tracking-wide uppercase">{t.participationConfirmed}</span>
                    </div>
                ) : (
                    <button 
                        onClick={() => setViewState('COMMUNITY')}
                        className="mt-8 w-full py-4 rounded-xl font-medium text-sm transition-all bg-white text-black hover:bg-slate-200"
                    >
                        {t.joinMovement}
                    </button>
                )}
            </div>
        </div>

        {/* Action Concrète Widget */}
        <div className="glass-card rounded-[32px] p-8 relative group overflow-hidden transition-all duration-500 bg-[#0a0a0a]/40 hover:bg-[#0a0a0a]/60">
             <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-8">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/10">
                        <Target size={24} strokeWidth={1.5} />
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShareModalContent({
                                title: nextAction.title,
                                subtitle: nextAction.description,
                                type: "ACTION",
                                date: nextAction.deadline
                            })}
                            className="p-1.5 bg-white/5 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                        >
                            <Share2 size={14} />
                        </button>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80 bg-emerald-900/20 px-3 py-1 rounded-full">
                            {t.priority}
                        </span>
                    </div>
                </div>
                
                <h3 className="text-xl font-medium text-white mb-2">{nextAction.title}</h3>
                <p className="text-slate-400 text-sm mb-6 flex-grow font-light leading-relaxed">{nextAction.description}</p>
                
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-6">
                    <span className="flex items-center gap-1.5"><Clock size={12}/> {nextAction.deadline}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                    <span className="text-emerald-500">Impact {nextAction.impact}</span>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={() => setIsActionModalOpen(true)}
                        className="w-full py-3.5 rounded-xl border border-white/10 text-white hover:bg-white hover:text-black transition-all text-xs font-bold uppercase tracking-widest"
                    >
                        {t.viewInstructions}
                    </button>
                    <button
                         onClick={onNavigateToAction}
                         className="w-full py-3.5 rounded-xl text-emerald-500 hover:text-white hover:bg-emerald-900/20 transition-all text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 group/btn"
                    >
                        {t.resourcesAndActions} <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
             </div>
        </div>

        {/* Column 3: Stats + Petition */}
        <div className="space-y-6">
            
             {/* Petition Card */}
             <div className="glass-card rounded-[32px] p-8 relative overflow-hidden transition-all duration-500 bg-[#0a0a0a]/40 hover:bg-[#0a0a0a]/60 flex flex-col justify-center min-h-[180px]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <PenTool className="text-slate-300" size={20} strokeWidth={1.5} />
                        <h3 className="font-medium text-slate-200">{t.officialPetition}</h3>
                    </div>
                </div>
                <p className="text-sm text-slate-400 mb-4 font-light leading-relaxed">
                    {t.petitionText}
                </p>
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mb-4">
                    <p className="text-[10px] text-amber-500 leading-tight">
                        <strong className="block mb-1 uppercase tracking-wider">Note Stratégique :</strong>
                        {t.petitionNote}
                    </p>
                </div>
                <a 
                    href="https://alliancepetitenation.org/agir/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-center transition-all uppercase tracking-widest w-full block"
                >
                    {t.signPetition}
                </a>
            </div>

            {/* Alert Card */}
            <div className="glass-card rounded-[32px] p-8 relative overflow-hidden transition-all duration-500 bg-[#0a0a0a]/40 hover:bg-[#0a0a0a]/60 flex flex-col justify-center min-h-[180px]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-amber-500 opacity-80" size={20} strokeWidth={1.5} />
                        <h3 className="font-medium text-slate-200">{t.fieldAlert}</h3>
                    </div>
                     <button 
                        onClick={() => setShareModalContent({
                            title: "Alerte Terrain",
                            subtitle: t.alertText,
                            type: "DANGER",
                            location: "Secteur Sud"
                        })}
                        className="p-1.5 bg-white/5 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                    >
                        <Share2 size={14} />
                    </button>
                </div>
                <p className="text-sm text-slate-400 mb-6 font-light leading-relaxed">{t.alertText}</p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setViewState('CLAIMS')}
                        className="text-xs font-bold text-amber-500 flex items-center gap-2 hover:gap-3 transition-all uppercase tracking-widest w-fit"
                    >
                        {t.gestimMap} <ExternalLink size={12}/>
                    </button>
                    <button 
                        onClick={() => setIsClaimModalOpen(true)}
                        className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-white transition-all w-fit border-l border-white/10 pl-3"
                    >
                        <HelpCircle size={12}/> {t.whatIsClaim}
                    </button>
                </div>
            </div>
        </div>

      </div>
      
      {/* Latest from Le CALME Widget (Shows if posts exist) */}
      {calmPosts.length > 0 && (
          <div className="glass-card p-6 rounded-3xl bg-[#e8e6e1]/10 border border-white/5 flex items-center justify-between hover:bg-[#e8e6e1]/20 transition-all cursor-pointer group" onClick={() => setIsCalmModalOpen(true)}>
               <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-[#e8e6e1] rounded-full flex items-center justify-center text-slate-900 border-2 border-slate-300">
                       <Feather size={20} />
                   </div>
                   <div>
                       <h3 className="text-white font-serif text-lg">{t.latestCalm}</h3>
                       <p className="text-slate-400 text-sm font-light italic truncate max-w-md">"{calmPosts[0].title}"</p>
                   </div>
               </div>
               <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-300 group-hover:text-white transition-colors">
                   {t.readCalm} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
               </div>
          </div>
      )}

      {/* Partners Section (New) */}
      <section className="mt-12 pt-10 border-t border-white/5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 text-center">{t.partners}</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 opacity-70 hover:opacity-100 transition-opacity">
              <a href="https://alliancepetitenation.org" target="_blank" rel="noreferrer" className="p-4 bg-white/5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:bg-white/10 transition-colors">
                  <Shield size={20} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-300">Alliance Petite-Nation</span>
              </a>
              <a href="https://kitiganzibi.ca/" target="_blank" rel="noreferrer" className="p-4 bg-white/5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:bg-white/10 transition-colors">
                  <Feather size={20} className="text-amber-600" />
                  <span className="text-xs font-medium text-slate-300">Kitigan Zibi Anishinabeg</span>
              </a>
              {/* Le CALME Button */}
              <button onClick={() => setIsCalmModalOpen(true)} className="p-4 bg-white/5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:bg-white/10 transition-colors cursor-pointer group">
                  <BookOpen size={20} className="text-slate-200 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-slate-300">Le CALME</span>
              </button>
              <div className="p-4 bg-white/5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:bg-white/10 transition-colors cursor-pointer">
                  <Droplets size={20} className="text-cyan-600" />
                  <span className="text-xs font-medium text-slate-300">Association Lac Simon</span>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:bg-white/10 transition-colors cursor-pointer">
                  <Droplets size={20} className="text-blue-600" />
                  <span className="text-xs font-medium text-slate-300">Association Lac des Plages</span>
              </div>
          </div>
      </section>
    </div>
  );
};

export default Dashboard;