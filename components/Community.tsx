

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, ThumbsUp, Shield, Upload, Calendar, Send, User, ChevronRight, X, MapPin, FileText, Image, ExternalLink, Download, Hand, Users, Megaphone, BookOpen, Share2, MousePointerClick, Clock, Trash2, CheckCircle, CalendarPlus, Facebook, Twitter, Link, Star, Save, Loader, Phone, Mail, Zap, Lock, Instagram, Copy, Check, RefreshCw, Smartphone, List } from 'lucide-react';
import { AuthState, User as UserType, Language } from '../types';
import {
    FeedPost,
    FeedComment,
    MobAction,
    ChatMessage as LiveChatMessage,
    subscribeToPosts,
    subscribeToComments,
    subscribeToChat,
    subscribeToActions,
    subscribeToMyReactions,
    createPost,
    deletePost,
    addComment,
    toggleReaction,
    sendChatMessage,
    createAction,
    joinAction,
    deleteAction,
    timeAgo,
    clockTime,
    avatarTone,
} from '../services/socialService';

// Add type for html2canvas
declare global {
    interface Window {
        html2canvas: any;
    }
}

interface CommunityProps {
    authState: AuthState;
    onSignIn: () => Promise<void>;
    onSignOut: () => Promise<void>;
    activeTab: 'roundtable' | 'resources' | 'chat' | 'actions';
    setActiveTab: (tab: 'roundtable' | 'resources' | 'chat' | 'actions') => void;
    language: Language;
    isAdmin?: boolean;
}

type Post = FeedPost;
type Action = MobAction;

const Community: React.FC<CommunityProps> = ({ authState, onSignIn, onSignOut, activeTab, setActiveTab, language, isAdmin = false }) => {
    const [chatInput, setChatInput] = useState('');
    const [voteStatus, setVoteStatus] = useState<'yes' | 'no' | 'absent' | 'skip' | null>(null);
    
    // Auth Modal State
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);

    const handleGoogleSignIn = async () => {
        setIsSigningIn(true);
        try {
            await onSignIn();
            setIsAuthModalOpen(false);
        } catch (e) {
            console.error('Sign-in failed', e);
        } finally {
            setIsSigningIn(false);
        }
    };

    // Direct Pressure State
    const [pressureEmail, setPressureEmail] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailSuccess, setEmailSuccess] = useState(false);

    // Post Creation State
    const [newPostText, setNewPostText] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    // Action Wizard State
    const [isActionWizardOpen, setIsActionWizardOpen] = useState(false);
    const [actionStep, setActionStep] = useState(1);
    const [newAction, setNewAction] = useState({ 
        type: '', 
        title: '', 
        dateRaw: '', 
        location: '', 
        description: '' 
    });

    // Calendar / Share / Delete Modals
    const [calendarModalOpen, setCalendarModalOpen] = useState<Action | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState(false);
    const [isShareMode, setIsShareMode] = useState(false);

    // Share Modal Logic
    const [shareModalAction, setShareModalAction] = useState<Action | null>(null);
    const [shareHashtags, setShareHashtags] = useState('');
    const [shareUniqueText, setShareUniqueText] = useState('');
    const [copiedState, setCopiedState] = useState<'facebook' | 'instagram' | 'x' | 'text' | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [desktopFeedback, setDesktopFeedback] = useState<string | null>(null);
    
    // Refs for image generation
    const cardRef = useRef<HTMLDivElement>(null);

    // Translations
    const translations = {
        fr: {
            hq: "QG de la Résistance",
            connectedAs: "Connecté en tant que",
            guest: "Mode Visiteur",
            loginToAct: "Connectez-vous pour agir",
            tabs: {
                roundtable: "Table Ronde",
                chat: "Chat Direct",
                resources: "Ressources",
                actions: "Actions"
            },
            actions: {
                pressureTitle: "Pression Directe",
                call: "Appeler Ministre",
                callLomiko: "Appeler Lomiko",
                callDesc: "Ministère de l'Environnement",
                callAllies: "Appeler les Alliés",
                callAlliesDesc: "Coordination & Urgence",
                email: "Blitz Courriel",
                emailDesc: "Copie aux élus & Lomiko",
                send: "Envoyer Officiellement",
                organize: "Créer une action",
                organizeDesc: "Organiser une mobilisation, un tractage ou une réunion.",
                share: "Partager",
                participate: "Participer",
                listTitle: "Liste des actions"
            }
        },
        en: {
            hq: "Resistance HQ",
            connectedAs: "Connected as",
            guest: "Visitor Mode",
            loginToAct: "Login to act",
            tabs: {
                roundtable: "Round Table",
                chat: "Direct Chat",
                resources: "Resources",
                actions: "Actions"
            },
            actions: {
                pressureTitle: "Direct Pressure",
                call: "Call Minister",
                callLomiko: "Call Lomiko",
                callDesc: "Ministry of Environment",
                callAllies: "Call Allies",
                callAlliesDesc: "Coordination & Emergency",
                email: "Email Blitz",
                emailDesc: "Copy to officials & Lomiko",
                send: "Send Officially",
                organize: "Create Action",
                organizeDesc: "Organize a mobilization, canvassing or meeting.",
                share: "Share",
                participate: "Participate",
                listTitle: "Action List"
            }
        },
        ani: {
            hq: "Resistance HQ",
            connectedAs: "Connected as",
            guest: "Visitor Mode",
            loginToAct: "Login to act",
            tabs: {
                roundtable: "Round Table",
                chat: "Direct Chat",
                resources: "Resources",
                actions: "Actions"
            },
            actions: {
                pressureTitle: "Direct Pressure",
                call: "Call Minister",
                callLomiko: "Call Lomiko",
                callDesc: "Ministry of Environment",
                callAllies: "Call Allies",
                callAlliesDesc: "Coordination & Emergency",
                email: "Email Blitz",
                emailDesc: "Copy to officials & Lomiko",
                send: "Send Officially",
                organize: "Create Action",
                organizeDesc: "Organize a mobilization, canvassing or meeting.",
                share: "Share",
                participate: "Participate",
                listTitle: "Action List"
            }
        }
    };

    const t = translations[language];

    // Etat vivant : tout arrive de Firestore en direct.
    const [posts, setPosts] = useState<Post[]>([]);
    const [actions, setActions] = useState<Action[]>([]);
    const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
    const [mesReactions, setMesReactions] = useState<Set<string>>(new Set());
    const [chargementMur, setChargementMur] = useState(true);
    const [chargementActions, setChargementActions] = useState(true);
    const [erreurFlux, setErreurFlux] = useState(false);

    // Commentaires du billet ouvert
    const [filOuvert, setFilOuvert] = useState<string | null>(null);
    const [commentaires, setCommentaires] = useState<FeedComment[]>([]);
    const [nouveauCommentaire, setNouveauCommentaire] = useState('');

    const moi = authState.user
        ? { id: authState.user.id, name: authState.user.name, photo: authState.user.avatar }
        : null;

    useEffect(() => {
        const arreterMur = subscribeToPosts(
            (items) => { setPosts(items); setChargementMur(false); setErreurFlux(false); },
            () => { setChargementMur(false); setErreurFlux(true); }
        );
        const arreterActions = subscribeToActions(
            (items) => { setActions(items); setChargementActions(false); },
            () => setChargementActions(false)
        );
        return () => { arreterMur(); arreterActions(); };
    }, []);

    useEffect(() => {
        if (!authState.isAuthenticated) {
            setChatMessages([]);
            return;
        }
        const arreter = subscribeToChat(setChatMessages, () => setChatMessages([]));
        return arreter;
    }, [authState.isAuthenticated]);

    useEffect(() => {
        if (!moi) { setMesReactions(new Set()); return; }
        const arreter = subscribeToMyReactions(moi.id, setMesReactions);
        return arreter;
    }, [moi?.id]);

    useEffect(() => {
        if (!filOuvert) { setCommentaires([]); return; }
        const arreter = subscribeToComments(filOuvert, setCommentaires);
        return arreter;
    }, [filOuvert]);

    // --- COUNTDOWN HELPER ---
    const calculateTimeLeft = (targetDate: number) => {
        const difference = targetDate - new Date().getTime();
        if (difference <= 0) return "Terminé";
        
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        return `${days}j ${hours}h ${minutes}m`;
    };

    // Force refresh for countdowns every minute
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    // --- SHARE EFFECT ---
    const generateUniqueMessage = (action: Action) => {
        const templates = [
            `Je serai présent à ${action.title} le ${action.dateDisplay}. Il faut se mobiliser pour protéger la Petite-Nation.`,
            `Urgence Climatique : Rejoignez-moi à ${action.location} pour ${action.title}. On ne lâche rien.`,
            `Le projet de mine, c'est NON. Venez nous soutenir lors de : ${action.title}.`,
            `Action citoyenne en cours : ${action.title} ! Nous avons besoin de tout le monde.`,
            `Je participe à la protection de notre eau. ${action.title} @ ${action.location}.`
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    };

    useEffect(() => {
        if (shareModalAction) {
            const tags = ['#LeLynx', '#PetiteNation', '#NonALaMine', '#ProtectionTerritoire', '#Lomiko', '#LaLoutre'];
            
            // AI-Simulated logic for hashtags
            if (shareModalAction.type === 'Politique') tags.push('#PolQc', '#MRCpapineau', '#Democratie');
            if (shareModalAction.type === 'Visibilité') tags.push('#Manifestation', '#Visibilite', '#ActionDirecte');
            if (shareModalAction.description?.toLowerCase().includes('eau')) tags.push('#EauPotable', '#ProtectionEau');
            
            tags.push('#Anishinabeg', '#KitiganZibi');
            
            setShareHashtags(tags.join(' '));
            setShareUniqueText(generateUniqueMessage(shareModalAction));
        }
    }, [shareModalAction]);

    const refreshUniqueText = () => {
        if(shareModalAction) setShareUniqueText(generateUniqueMessage(shareModalAction));
    };

    // --- SMART SHARE LOGIC ---
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
            
            const file = new File([blob], 'le_lynx_action.jpg', { type: 'image/jpeg' });
            const shareData = {
                title: shareModalAction?.title || 'Le Lynx',
                text: `${shareUniqueText} ${shareHashtags}`,
                files: [file]
            };

            // 2. Try Native Share (Mobile - Preloads Image)
            // Note: navigator.share with files works on mobile (iOS/Android) but rarely on desktop.
            if (platform === 'native' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                // 3. Fallback for Desktop or specific buttons (Download + Clipboard + Open)
                
                // Trigger Download
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `LeLynx_Action_${Date.now()}.jpg`;
                link.click();

                // Copy Text
                await navigator.clipboard.writeText(`${shareUniqueText} ${shareHashtags}`);
                setCopiedState('text');

                // Platform Specific Redirects
                if (platform === 'facebook') {
                    // Open main FB page since we can't preload image in sharer.php
                    window.open('https://www.facebook.com', '_blank');
                    setDesktopFeedback("Image téléchargée et texte copié ! Collez-les dans Facebook.");
                } else if (platform === 'twitter') {
                    // X doesn't support image upload via intent, so standard text intent + user uploads image
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


    const handleJoinAction = async (actionId: string) => {
        if (!moi) {
            setIsAuthModalOpen(true);
            return;
        }
        const action = actions.find(a => a.id === actionId);
        if (!action) return;
        if (!(action.participantIds || []).includes(moi.id)) {
            try {
                await joinAction(actionId, moi.id, action.participantCount || 0);
            } catch (e) {
                console.error('Inscription refusee', e);
                return;
            }
        }
        setCalendarModalOpen(action);
    };

    const handleEmailPressure = () => {
        if (!pressureEmail) return;
        setIsSendingEmail(true);

        const to = [
            'info@alliancepetitenation.org',
            'info@mern.gouv.qc.ca',
        ].join(',');
        const subject = encodeURIComponent('[Projet La Loutre] Demande de moratoire immédiat');
        const body = encodeURIComponent(
            `Madame, Monsieur,\n\nJe vous écris en tant que citoyen(ne) préoccupé(e) par le projet minier de graphite "La Loutre" en Outaouais.\n\nJe demande un moratoire immédiat sur toutes les activités d'exploration et d'exploitation jusqu'à ce qu'une consultation réelle des communautés Anishinabeg de Kitigan Zibi ait eu lieu, et que les impacts sur les nappes phréatiques aient été évalués de manière indépendante.\n\nLe territoire concerné est non cédé. Les droits ancestraux des Premières Nations doivent primer.\n\nCordialement,\n${pressureEmail}`
        );
        window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_blank');

        setIsSendingEmail(false);
        setEmailSuccess(true);
        setPressureEmail('');
        setTimeout(() => setEmailSuccess(false), 4000);
    };

    const handleCreatePost = async () => {
        if (!newPostText.trim()) return;
        if (!moi) { setIsAuthModalOpen(true); return; }
        setIsPosting(true);
        try {
            await createPost(moi, newPostText);
            setNewPostText('');
        } catch (e) {
            console.error('Publication refusee', e);
        } finally {
            setIsPosting(false);
        }
    };

    const handleReaction = async (postId: string) => {
        if (!moi) { setIsAuthModalOpen(true); return; }
        try {
            await toggleReaction(postId, moi.id);
        } catch (e) {
            console.error('Reaction refusee', e);
        }
    };

    const handleComment = async (postId: string) => {
        if (!moi) { setIsAuthModalOpen(true); return; }
        const texte = nouveauCommentaire.trim();
        if (!texte) return;
        setNouveauCommentaire('');
        try {
            await addComment(postId, moi, texte);
        } catch (e) {
            console.error('Commentaire refuse', e);
        }
    };

    const handleDeletePost = async (postId: string) => {
        try {
            await deletePost(postId);
        } catch (e) {
            console.error('Suppression refusee', e);
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        if (!moi) { setIsAuthModalOpen(true); return; }
        const texte = chatInput;
        setChatInput('');
        try {
            await sendChatMessage(moi, texte);
        } catch (e) {
            console.error('Message refuse', e);
            setChatInput(texte);
        }
    };

    const handleDeleteAction = async () => {
        if (!deleteModalOpen) return;
        const action = actions.find(a => a.id === deleteModalOpen);
        const peutSupprimer = isAdmin || (moi && action && action.authorId === moi.id);
        if (!peutSupprimer) { setDeleteError(true); return; }
        try {
            await deleteAction(deleteModalOpen);
            setDeleteModalOpen(null);
            setDeleteError(false);
        } catch (e) {
            console.error('Suppression refusee', e);
            setDeleteError(true);
        }
    };

    // Render Logic Helpers
    const renderActionCard = (action: Action) => {
        const isJoined = moi ? (action.participantIds || []).includes(moi.id) : false;
        const timeLeft = calculateTimeLeft(action.timestamp);
        
        return (
            <div key={action.id} className="glass-card p-6 rounded-3xl border border-white/5 bg-[#0a0a0a]/40 hover:bg-[#0a0a0a]/60 transition-all group relative overflow-hidden">
                {/* Delete Button (Hidden usually) */}
                {(isAdmin || (moi && action.authorId === moi.id)) && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteModalOpen(action.id); }}
                        className="absolute top-4 right-4 p-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-20"
                        title="Retirer cette action"
                    >
                        <Trash2 size={16} />
                    </button>
                )}

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Date Box */}
                    <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl min-w-[100px] border border-white/5 shrink-0">
                        <Calendar className="text-amber-500 mb-2" size={24} />
                        <span className="text-xs font-bold uppercase text-slate-400 text-center">{(action.dateDisplay || '').split(',')[0] || 'À venir'}</span>
                        <span className="text-lg font-bold text-white mt-1">{(action.dateDisplay || '').split(' ')[2] || ''}</span>
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                action.type === 'Politique' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-500/20' :
                                action.type === 'Visibilité' ? 'bg-amber-900/30 text-amber-400 border-amber-500/20' :
                                'bg-slate-800 text-slate-400 border-slate-600/20'
                            }`}>
                                {action.type}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Clock size={10} /> {timeLeft}
                            </span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-white mb-2 leading-tight">{action.title}</h3>
                        
                        <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                            <MapPin size={14} className="text-slate-500" />
                            {action.location}
                        </div>

                        {action.description && (
                            <p className="text-sm text-slate-400 font-light leading-relaxed mb-6 bg-black/20 p-3 rounded-xl border border-white/5">
                                {action.description}
                            </p>
                        )}

                        <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] text-slate-500">
                                            <User size={12} />
                                        </div>
                                    ))}
                                </div>
                                <span className="text-xs font-bold text-amber-500">+{action.participantCount || 0} {t.actions.participate}s</span>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShareModalAction(action)}
                                    className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-lg shadow-blue-900/20"
                                >
                                    <Share2 size={18} />
                                </button>
                                <button 
                                    onClick={() => handleJoinAction(action.id)}
                                    disabled={isJoined}
                                    className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${
                                        isJoined 
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20 cursor-default' 
                                        : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-900/20'
                                    }`}
                                >
                                    {isJoined ? (
                                        <><CheckCircle size={14} /> Inscrit</>
                                    ) : (
                                        <><Hand size={14} /> {t.actions.participate}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full max-w-6xl mx-auto pb-20 animate-fade-in relative">
            
            {/* Share Modal */}
            {shareModalAction && (
                <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-xl animate-fade-in">
                     <div className="flex min-h-full items-center justify-center p-4">
                        <div className="glass-card w-full max-w-4xl rounded-[32px] overflow-hidden bg-[#0a0a0a] relative flex flex-col md:flex-row h-auto max-h-[90vh]">
                            <button onClick={() => setShareModalAction(null)} className="absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full text-slate-400 hover:text-white"><X size={20}/></button>

                            {/* VISUAL PREVIEW SIDE */}
                            <div className="md:w-1/2 p-6 md:p-10 flex flex-col items-center justify-center bg-black/50 border-r border-white/5 overflow-y-auto">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Aperçu Visuel</h3>
                                
                                <div 
                                    ref={cardRef}
                                    className="w-full max-w-[360px] aspect-[4/5] rounded-2xl overflow-hidden relative group shadow-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-emerald-950 flex flex-col p-6 text-center justify-between mx-auto"
                                >
                                    <div className="flex justify-between items-center opacity-70 mb-4 shrink-0">
                                        <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase">Le Lynx</span>
                                        <div className="px-2 py-1 bg-white/10 text-white text-[8px] font-bold uppercase tracking-wider rounded border border-white/20">{shareModalAction.type}</div>
                                    </div>

                                    <div className="space-y-3 relative z-10 flex flex-col items-center flex-1 justify-center">
                                         <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30 mb-2 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                            <Calendar size={32} className="text-amber-400" />
                                         </div>
                                        <h2 className="text-2xl font-serif text-white leading-tight drop-shadow-lg line-clamp-4">{shareModalAction.title}</h2>
                                        <p className="text-amber-400 font-bold uppercase tracking-widest text-[10px] mt-1 shrink-0">{shareModalAction.dateDisplay}</p>
                                    </div>

                                    <div className="bg-black/40 backdrop-blur-sm p-3 rounded-xl border border-white/5 space-y-1 shrink-0 mt-4">
                                         <div className="flex items-center justify-center gap-2 text-slate-300 text-[10px] font-medium mb-1">
                                            <MapPin size={10} className="text-red-400" />
                                            {shareModalAction.location}
                                        </div>
                                        <p className="text-slate-400 text-[9px] font-light line-clamp-2 leading-relaxed">
                                            Rejoignez le mouvement. Protégeons notre territoire.
                                        </p>
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
                                    <h2 className="text-2xl font-serif text-white mb-1">{t.actions.share}</h2>
                                    <p className="text-slate-400 text-xs font-light">Amplifiez l'action.</p>
                                </div>

                                {/* Unique Text Section */}
                                <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold uppercase text-emerald-400">Message Suggéré</label>
                                        <button onClick={refreshUniqueText} className="text-slate-500 hover:text-white"><RefreshCw size={12}/></button>
                                    </div>
                                    <div className="text-sm text-slate-300 font-light mb-3 bg-black/20 p-3 rounded-lg border border-white/5 italic">
                                        "{shareUniqueText}"
                                    </div>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${shareUniqueText} ${shareHashtags}`);
                                            setCopiedState('text');
                                            setTimeout(() => setCopiedState(null), 2000);
                                        }}
                                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-all flex items-center justify-center gap-2"
                                    >
                                        {copiedState === 'text' ? <Check size={12} /> : <Copy size={12} />} 
                                        {copiedState === 'text' ? 'Copié !' : 'Copier texte & hashtags'}
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
                                        Génère l'image et ouvre l'app de votre choix
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

            {/* Calendar Modal */}
            {calendarModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card p-8 rounded-[32px] max-w-md w-full border border-emerald-500/20 relative">
                        <button onClick={() => setCalendarModalOpen(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                        <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-400 mb-6 mx-auto border border-emerald-500/30">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white text-center mb-2">Participation Confirmée !</h3>
                        <p className="text-slate-400 text-center text-sm mb-6">
                            Vous êtes inscrit à : <strong className="text-white">{calendarModalOpen.title}</strong>
                        </p>
                        
                        <div className="space-y-3">
                             <a 
                                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarModalOpen.title)}&dates=${new Date(calendarModalOpen.timestamp).toISOString().replace(/-|:|\.\d\d\d/g, "")}/${new Date(calendarModalOpen.timestamp + 7200000).toISOString().replace(/-|:|\.\d\d\d/g, "")}&details=${encodeURIComponent(calendarModalOpen.description || '')}&location=${encodeURIComponent(calendarModalOpen.location)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-3 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                            >
                                <CalendarPlus size={16} /> Ajouter à Google Agenda
                            </a>
                            <button 
                                onClick={() => setCalendarModalOpen(null)}
                                className="w-full py-3 bg-transparent border border-white/10 text-slate-400 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Auth Modal — Google Sign-In */}
            {isAuthModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
                    <div className="glass-card w-full max-w-sm rounded-[32px] overflow-hidden relative border border-white/10 bg-[#0a0a0a]">
                        <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white p-2"><X size={20}/></button>
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto mb-6 border border-emerald-500/20">
                                <Shield size={32} />
                            </div>
                            <h2 className="text-2xl font-serif text-white mb-2">Rejoindre le Réseau</h2>
                            <p className="text-slate-400 text-sm mb-8">Authentification sécurisée via Google.<br />Aucun mot de passe à retenir.</p>
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={isSigningIn}
                                className="w-full py-3.5 bg-white text-black rounded-xl font-bold text-sm transition-all hover:bg-slate-100 flex items-center justify-center gap-3 shadow-lg mb-3"
                            >
                                {isSigningIn ? (
                                    <Loader className="animate-spin" size={16} />
                                ) : (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
                                        Continuer avec Google
                                    </>
                                )}
                            </button>
                            <button onClick={() => setIsAuthModalOpen(false)} className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-xs font-bold transition-all">
                                Continuer en visiteur
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card p-6 rounded-2xl max-w-sm w-full border border-red-500/20">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Trash2 size={18} className="text-red-500" /> Supprimer l'action ?
                        </h3>
                        <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                            L'action disparait de la liste pour tout le monde, et les inscriptions qui l'accompagnent partent avec elle. Le geste ne se reprend pas.
                        </p>
                        {deleteError && (
                            <p className="text-xs text-red-500 mb-4">
                                La suppression a ete refusee. Seuls l'auteur de l'action et l'administration peuvent la retirer.
                            </p>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => setDeleteModalOpen(null)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs font-bold">Annuler</button>
                            <button onClick={handleDeleteAction} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 px-1">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-emerald-900/20 rounded-2xl border border-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                        <Users size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white font-serif">{t.hq}</h2>
                        {authState.isAuthenticated ? (
                            <div className="flex items-center gap-3 mt-1">
                                {authState.user?.avatar ? (
                                    <img src={authState.user.avatar} alt="" className="w-6 h-6 rounded-full border border-emerald-500/30" />
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                )}
                                <p className="text-emerald-400 text-sm font-medium">{t.connectedAs} <span className="font-bold text-white">{authState.user?.name}</span></p>
                                <button onClick={onSignOut} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors uppercase tracking-wider font-bold">Déconnexion</button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mt-1 cursor-pointer" onClick={() => setIsAuthModalOpen(true)}>
                                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                                <p className="text-slate-500 text-sm font-medium hover:text-white transition-colors underline decoration-dotted underline-offset-4">{t.guest} — {t.loginToAct}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Tabs - Glass Pill */}
                <div className="flex p-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-md overflow-x-auto max-w-full no-scrollbar">
                    <button 
                        onClick={() => setActiveTab('actions')}
                        className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'actions' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Megaphone size={14} /> {t.tabs.actions}
                    </button>
                    <button 
                        onClick={() => setActiveTab('roundtable')}
                        className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'roundtable' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <MessageCircle size={14} /> {t.tabs.roundtable}
                    </button>
                     <button 
                        onClick={() => setActiveTab('resources')}
                        className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'resources' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <BookOpen size={14} /> {t.tabs.resources}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: Main Content based on Tab */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {activeTab === 'actions' && (
                        <div className="space-y-8 animate-fade-in">
                            
                            {/* ACTION WIZARD (Visible to all, auth check on click) */}
                             {!isActionWizardOpen ? (
                                <div className="mb-6">
                                    <button 
                                        onClick={() => {
                                            if (!authState.isAuthenticated) {
                                                setIsAuthModalOpen(true);
                                            } else {
                                                setIsActionWizardOpen(true);
                                            }
                                        }}
                                        className="w-full py-8 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-500/30 rounded-2xl text-blue-400 transition-all shadow-[0_0_20px_rgba(37,99,235,0.1)] group flex flex-col items-center justify-center gap-3"
                                    >
                                        <div className="p-3 bg-blue-500/20 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-colors mb-1">
                                            <Megaphone size={28} />
                                        </div>
                                        <span className="font-bold uppercase tracking-widest text-sm">{t.actions.organize}</span>
                                        <p className="text-xs text-blue-300/60 font-light normal-case max-w-sm text-center px-4 leading-relaxed">
                                            {t.actions.organizeDesc}
                                        </p>
                                    </button>
                                </div>
                            ) : (
                                <div className="glass-card p-6 rounded-[24px] border border-white/5 bg-gradient-to-r from-[#0a0a0a] to-slate-900/50 animate-fade-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-white flex items-center gap-2"><CalendarPlus size={18} className="text-emerald-500"/> Créer une action</h3>
                                        <button onClick={() => setIsActionWizardOpen(false)}><X size={18} className="text-slate-500 hover:text-white"/></button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Titre</label>
                                                <input 
                                                    type="text" 
                                                    value={newAction.title}
                                                    onChange={e => setNewAction({...newAction, title: e.target.value})}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-emerald-500 transition-colors"
                                                    placeholder="Ex: Distribution de tracts"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Type</label>
                                                <select 
                                                    value={newAction.type}
                                                    onChange={e => setNewAction({...newAction, type: e.target.value})}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-emerald-500 transition-colors"
                                                >
                                                    <option value="">Choisir...</option>
                                                    <option value="Politique">Politique</option>
                                                    <option value="Visibilité">Visibilité</option>
                                                    <option value="Terrain">Terrain</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Lieu & Date</label>
                                            <input 
                                                type="text" 
                                                value={newAction.location}
                                                onChange={e => setNewAction({...newAction, location: e.target.value})}
                                                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white text-sm mb-2"
                                                placeholder="Lieu exact"
                                            />
                                            <input 
                                                type="text" 
                                                value={newAction.dateRaw}
                                                onChange={e => setNewAction({...newAction, dateRaw: e.target.value})}
                                                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white text-sm"
                                                placeholder="Date (ex: Samedi 24 Oct, 14h)"
                                            />
                                        </div>
                                            <div>
                                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Description</label>
                                            <textarea 
                                                value={newAction.description}
                                                onChange={e => setNewAction({...newAction, description: e.target.value})}
                                                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white text-sm h-24"
                                                placeholder="Détails logistiques..."
                                            />
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                if (!newAction.title) return;
                                                if (!moi) { setIsAuthModalOpen(true); return; }
                                                // La date libre se lit quand elle ressemble a une date, sinon
                                                // l'action se pose a demain pour rester dans la liste a venir.
                                                const lue = Date.parse(newAction.dateRaw);
                                                try {
                                                    await createAction(moi, {
                                                        type: newAction.type || 'Mobilisation',
                                                        title: newAction.title,
                                                        dateDisplay: newAction.dateRaw,
                                                        timestamp: Number.isNaN(lue) ? Date.now() + 86400000 : lue,
                                                        location: newAction.location,
                                                        description: newAction.description,
                                                    });
                                                    setIsActionWizardOpen(false);
                                                    setNewAction({ type: '', title: '', dateRaw: '', location: '', description: '' });
                                                } catch (e) {
                                                    console.error('Creation refusee', e);
                                                }
                                            }}
                                            className="w-full py-3 bg-white text-black font-bold rounded-xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-colors"
                                        >
                                            Publier l'action
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Actions List Container with Amber Background */}
                            <div className="p-6 rounded-[24px] bg-amber-900/10 border border-amber-500/20">
                                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                   <List size={16}/> {t.actions.listTitle}
                                </h3>
                                <div className="space-y-4">
                                    {actions.map(action => renderActionCard(action))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'roundtable' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Post Input */}
                            <div className="glass-card p-4 rounded-2xl border border-white/5 bg-[#0a0a0a]/40">
                                <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${authState.isAuthenticated ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                                        <User size={18} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <textarea
                                            value={newPostText}
                                            onChange={(e) => setNewPostText(e.target.value)}
                                            placeholder={authState.isAuthenticated ? "Partagez une info stratégique..." : "Connectez-vous pour participer"}
                                            disabled={!authState.isAuthenticated}
                                            className="w-full bg-transparent text-white placeholder:text-slate-500 text-sm focus:outline-none resize-none h-20"
                                        />
                                        <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-3">
                                            <div className="flex gap-2">
                                                <button className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors" disabled={!authState.isAuthenticated}><Image size={18}/></button>
                                                <button className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors" disabled={!authState.isAuthenticated}><MapPin size={18}/></button>
                                            </div>
                                            <button 
                                                onClick={handleCreatePost}
                                                disabled={!authState.isAuthenticated || !newPostText.trim() || isPosting}
                                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all"
                                            >
                                                {isPosting ? '...' : 'Publier'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Le fil de la table ronde */}
                            {chargementMur && (
                                <div className="space-y-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="glass-card p-6 rounded-2xl animate-pulse">
                                            <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
                                            <div className="h-4 bg-white/5 rounded w-full mb-2" />
                                            <div className="h-4 bg-white/5 rounded w-4/5" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!chargementMur && erreurFlux && (
                                <div className="glass-card p-8 rounded-2xl border border-red-900/30 text-center">
                                    <p className="text-white font-bold mb-2">La table ronde est momentanement injoignable</p>
                                    <p className="text-slate-400 text-sm font-light">Le fil se rebranche des que la connexion revient.</p>
                                </div>
                            )}

                            {!chargementMur && !erreurFlux && posts.length === 0 && (
                                <div className="glass-card p-10 rounded-2xl border border-white/5 text-center">
                                    <MessageCircle className="mx-auto text-slate-600 mb-4" size={26} />
                                    <p className="text-white font-bold mb-2">La table ronde attend sa premiere parole</p>
                                    <p className="text-slate-400 text-sm font-light max-w-md mx-auto leading-relaxed">
                                        Ce que vous ecrivez ici reste visible pour tout le monde et se garde d'une visite a l'autre.
                                    </p>
                                </div>
                            )}

                            {posts.map(post => {
                                const aReagi = mesReactions.has(post.id);
                                const filEstOuvert = filOuvert === post.id;
                                const peutSupprimer = isAdmin || (moi && post.authorId === moi.id);
                                return (
                                <div key={post.id} className="glass-card p-6 rounded-2xl border border-white/5 bg-[#0a0a0a]/40 hover:bg-[#0a0a0a]/60 transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            {post.authorPhoto ? (
                                                <img src={post.authorPhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className={`w-8 h-8 rounded-full ${avatarTone(post.authorId)} flex items-center justify-center text-xs font-bold text-white`}>
                                                    {(post.authorName || '?').charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-bold text-white">{post.authorName}</p>
                                                <p className="text-[10px] text-slate-500">{timeAgo(post.createdAt, language)}</p>
                                            </div>
                                        </div>
                                        {peutSupprimer && (
                                            <button
                                                onClick={() => handleDeletePost(post.id)}
                                                className="text-slate-600 hover:text-red-500 transition-colors"
                                                title="Retirer cette publication"
                                            >
                                                <Trash2 size={15}/>
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{post.text}</p>
                                    <div className="flex items-center gap-4 border-t border-white/5 pt-3">
                                        <button
                                            onClick={() => handleReaction(post.id)}
                                            className={`flex items-center gap-2 text-xs transition-colors ${aReagi ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'}`}
                                        >
                                            <ThumbsUp size={14} /> {post.reactionCount || 0}
                                        </button>
                                        <button
                                            onClick={() => setFilOuvert(filEstOuvert ? null : post.id)}
                                            className={`flex items-center gap-2 text-xs transition-colors ${filEstOuvert ? 'text-white' : 'text-slate-500 hover:text-white'}`}
                                        >
                                            <MessageCircle size={14} /> {post.commentCount || 0}
                                        </button>
                                    </div>

                                    {filEstOuvert && (
                                        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                            {commentaires.map(c => (
                                                <div key={c.id} className="flex gap-3">
                                                    <div className={`w-6 h-6 shrink-0 rounded-full ${avatarTone(c.authorId)} flex items-center justify-center text-[10px] font-bold text-white`}>
                                                        {(c.authorName || '?').charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[11px] font-bold text-slate-300">
                                                            {c.authorName}
                                                            <span className="ml-2 font-normal text-slate-600">{timeAgo(c.createdAt, language)}</span>
                                                        </p>
                                                        <p className="text-xs text-slate-400 leading-relaxed">{c.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex gap-2 pt-1">
                                                <input
                                                    value={nouveauCommentaire}
                                                    onChange={e => setNouveauCommentaire(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleComment(post.id)}
                                                    placeholder="Repondre"
                                                    className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                                                />
                                                <button
                                                    onClick={() => handleComment(post.id)}
                                                    disabled={!nouveauCommentaire.trim()}
                                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 rounded-full text-xs font-bold transition-colors"
                                                >
                                                    <Send size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {activeTab === 'resources' && (
                        <div className="grid grid-cols-1 gap-4 animate-fade-in">
                            {[
                                {
                                    title: "Site officiel Alliance Petite-Nation",
                                    desc: "Position citoyenne, pétitions, communiqués",
                                    url: "https://alliancepetitenation.org",
                                    tag: "Site Web"
                                },
                                {
                                    title: "Projet La Loutre — Documents Lomiko",
                                    desc: "Rapports techniques et mises à jour officielles",
                                    url: "https://lomiko.com/fr/projets/projet-la-loutre/",
                                    tag: "Site Web"
                                },
                                {
                                    title: "Carte des claims GESTIM",
                                    desc: "Données officielles sur les claims miniers actifs",
                                    url: "https://gestim.mines.gouv.qc.ca",
                                    tag: "Outil"
                                },
                                {
                                    title: "Kitigan Zibi Anishinabeg",
                                    desc: "Position et communiqués de la nation Anishinabeg",
                                    url: "https://www.kitigan.com",
                                    tag: "Nation"
                                },
                                {
                                    title: "Groupe Facebook — Action Citoyenne Petite-Nation",
                                    desc: "Événements, mobilisation, pouls de la communauté",
                                    url: "https://www.facebook.com/groups/actioncitoyannepetitenation",
                                    tag: "Communauté"
                                },
                                {
                                    title: "Archives BAPE — Rapports eau et mines",
                                    desc: "Évaluations environnementales officielles du Québec",
                                    url: "https://www.bape.gouv.qc.ca",
                                    tag: "Gouvernement"
                                },
                            ].map((res, i) => (
                                <a
                                    key={i}
                                    href={res.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="glass-card p-4 rounded-xl flex items-center gap-4 border border-white/5 hover:bg-white/5 transition-all group"
                                >
                                    <div className="p-3 bg-indigo-900/30 text-indigo-400 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-white text-sm mb-1">{res.title}</h4>
                                        <p className="text-xs text-slate-500">{res.desc}</p>
                                    </div>
                                    <span className="text-[10px] px-2 py-1 bg-white/5 text-slate-500 rounded-full shrink-0">{res.tag}</span>
                                </a>
                            ))}
                        </div>
                    )}

                </div>

                {/* RIGHT COLUMN: Permanent Widgets */}
                <div className="space-y-6">
                    
                     {/* DIRECT PRESSURE WIDGET */}
                     <div className="glass-card p-6 rounded-[24px] bg-red-900/10 border border-red-500/20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-red-900/30 text-red-400 rounded-xl">
                                <Zap size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{t.actions.pressureTitle}</h3>
                                <p className="text-xs text-red-300/60">{t.actions.callDesc}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                <a href="tel:18005611616" className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border border-white/10">
                                    <Phone size={14} /> {t.actions.call}
                                </a>
                                <a href="tel:18774721612" className="py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border border-white/10">
                                    <Phone size={14} className="text-red-400" /> {t.actions.callLomiko}
                                </a>
                            </div>
                            
                            {/* Email Blitz */}
                             <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5">
                                <h4 className="text-xs font-bold text-white uppercase mb-2 flex items-center gap-2">
                                    <Mail size={12} className="text-emerald-500"/> {t.actions.email}
                                </h4>
                                <p className="text-[10px] text-slate-500 mb-3">{t.actions.emailDesc}</p>
                                {emailSuccess ? (
                                    <div className="py-2 text-center text-xs font-bold text-emerald-500 bg-emerald-900/10 rounded-lg animate-fade-in">
                                        Envoyé avec succès !
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input 
                                            type="email" 
                                            placeholder="Votre courriel" 
                                            value={pressureEmail}
                                            onChange={(e) => setPressureEmail(e.target.value)}
                                            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 text-xs text-white focus:border-red-500 transition-colors"
                                        />
                                        <button 
                                            onClick={handleEmailPressure}
                                            disabled={!pressureEmail || isSendingEmail}
                                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
                                        >
                                            {isSendingEmail ? <Loader className="animate-spin" size={12}/> : <Send size={12} />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CALL ALLIES WIDGET (SEPARATE) - Updated with Azure Turquoise Theme */}
                    <div className="glass-card p-6 rounded-[24px] border border-cyan-500/20 bg-cyan-900/10">
                         <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-cyan-900/30 text-cyan-400 rounded-lg border border-cyan-500/20">
                                <Shield size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t.actions.callAllies}</h3>
                                <p className="text-[10px] text-cyan-200/60">{t.actions.callAlliesDesc}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <a href="tel:8194495170" className="p-3 bg-amber-900/10 hover:bg-amber-900/20 border border-amber-500/20 rounded-xl flex flex-col items-center justify-center gap-2 text-amber-500 transition-colors group">
                                <Phone size={18} className="group-hover:scale-110 transition-transform" /> 
                                <span className="text-[10px] font-bold">Kitigan Zibi</span>
                            </a>
                            <a href="mailto:info@alliancepetitenation.org" className="p-3 bg-emerald-900/10 hover:bg-emerald-900/20 border border-emerald-500/20 rounded-xl flex flex-col items-center justify-center gap-2 text-emerald-500 transition-colors group">
                                <Mail size={18} className="group-hover:scale-110 transition-transform" /> 
                                <span className="text-[10px] font-bold">Alliance P.N.</span>
                            </a>
                        </div>
                    </div>

                    {/* Chat Widget */}
                    <div className="glass-card flex flex-col h-[400px] rounded-[24px] border border-white/5 overflow-hidden">
                        <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <MessageCircle size={16} className="text-emerald-500" /> {t.tabs.chat}
                            </h3>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full animate-pulse">Live</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0a0a0a]/30">
                            {!authState.isAuthenticated && (
                                <p className="text-slate-500 text-xs text-center py-10 leading-relaxed px-4">
                                    Le salon est reserve aux personnes connectees. Connectez-vous pour lire les echanges et y prendre part.
                                </p>
                            )}
                            {authState.isAuthenticated && chatMessages.length === 0 && (
                                <p className="text-slate-500 text-xs text-center py-10 leading-relaxed px-4">
                                    Le salon est calme. Le premier message ouvre la conversation.
                                </p>
                            )}
                            {chatMessages.map((msg) => {
                                const estMoi = moi ? msg.authorId === moi.id : false;
                                return (
                                <div key={msg.id} className={`flex flex-col ${estMoi ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${estMoi ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-300 rounded-tl-sm'}`}>
                                        <span className="block font-bold mb-1 text-[10px] opacity-70">{estMoi ? 'Moi' : msg.authorName}</span>
                                        {msg.text}
                                    </div>
                                    <span className="text-[9px] text-slate-600 mt-1 px-1">{clockTime(msg.createdAt)}</span>
                                </div>
                                );
                            })}
                        </div>

                        <div className="p-3 bg-white/5 border-t border-white/5">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder={authState.isAuthenticated ? "Message..." : "Connectez-vous..."}
                                    disabled={!authState.isAuthenticated}
                                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={!authState.isAuthenticated || !chatInput}
                                    className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all disabled:opacity-50"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Community;