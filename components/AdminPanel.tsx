import React, { useState, useEffect } from 'react';
import { Lock, Unlock, DollarSign, CheckCircle, PieChart, Shield, Activity, Users, ArrowRight, ExternalLink, CreditCard, Bitcoin, Wallet, Smartphone, Terminal, LayoutList, AlertTriangle, Sliders } from 'lucide-react';
import { ProjectSubmission, Language } from '../types';

interface AdminPanelProps {
    submissions?: ProjectSubmission[];
    language: Language;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ submissions = [], language }) => {
    const [activeTab, setActiveTab] = useState<'strategy' | 'requests'>('strategy');
    const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
    const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());

    // Support Logic
    const [donationAmount, setDonationAmount] = useState<number>(100);
    const [paymentMethod, setPaymentMethod] = useState<'visa' | 'interac' | 'paypal' | 'bitcoin'>('visa');
    
    // Distribution Weights
    const [weights, setWeights] = useState({
        alliance: 50,
        anishnabeg: 50,
        lynx: 50
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

    const translations = {
        fr: {
            strategicCommand: "Finances & Stratégie",
            adminDesc: "Administration des ressources et surveillance étendue.",
            tabStrategy: "Stratégie & Fonds",
            tabRequests: "Demandes",
            ecoReports: "Signalements de projets écocides",
            noReports: "Aucun signalement reçu pour le moment.",
            supportAlliance: "Soutenir l'Alliance",
            directDonationAlliance: "Don direct à Alliance Petite-Nation.",
            donateOfficial: "Faire un don officiel",
            supportKZ: "Soutenir Kitigan Zibi",
            directDonationKZ: "Don direct à la délégation Anishinabeg.",
            communitySite: "Site de la communauté",
            supportLynx: "Soutenir Le Lynx",
            lynxMaint: "Maintenance de la plateforme.",
            techContrib: "Contribution Technique",
            centralSupport: "Soutenir le Mouvement (Zhooniya)",
            amount: "Montant du soutien ($ CAD)",
            paymentMethod: "Mode de paiement",
            distribution: "Répartition du Don (Glisser pour ajuster)",
            equilibrate: "Équilibrer",
            visualBreakdown: "Répartition Visuelle",
            confirmSupport: "Confirmer le soutien",
            processing: "Traitement sécurisé...",
            transferInitiated: "Transfert Initié !",
            fairAlgo: "Algorithme Équitable",
            fairAlgoDesc: "Ajustez les curseurs pour définir la priorité de chaque cause. Le système calcule automatiquement le montant exact basé sur le poids relatif de chaque curseur.",
            comingSoon: "À venir"
        },
        en: {
            strategicCommand: "Finances & Strategy",
            adminDesc: "Resource administration and extended surveillance.",
            tabStrategy: "Strategy & Funds",
            tabRequests: "Requests",
            ecoReports: "Ecocide Project Reports",
            noReports: "No reports received yet.",
            supportAlliance: "Support the Alliance",
            directDonationAlliance: "Direct donation to Alliance Petite-Nation.",
            donateOfficial: "Make official donation",
            supportKZ: "Support Kitigan Zibi",
            directDonationKZ: "Direct donation to Anishinabeg delegation.",
            communitySite: "Community Website",
            supportLynx: "Support Le Lynx",
            lynxMaint: "Platform maintenance.",
            techContrib: "Technical Contribution",
            centralSupport: "Support the Movement (Zhooniya)",
            amount: "Support Amount ($ CAD)",
            paymentMethod: "Payment Method",
            distribution: "Donation Distribution (Slide to adjust)",
            equilibrate: "Balance",
            visualBreakdown: "Visual Breakdown",
            confirmSupport: "Confirm Support",
            processing: "Processing securely...",
            transferInitiated: "Transfer Initiated!",
            fairAlgo: "Fair Algorithm",
            fairAlgoDesc: "Adjust sliders to define priority for each cause. The system automatically calculates the exact amount based on relative weight.",
            comingSoon: "Coming Soon"
        },
        ani: {
            strategicCommand: "Zhooniya & Strategy",
            adminDesc: "Resource administration and extended surveillance.",
            tabStrategy: "Strategy & Zhooniya",
            tabRequests: "Requests",
            ecoReports: "Ecocide Project Reports",
            noReports: "No reports received yet.",
            supportAlliance: "Support the Alliance",
            directDonationAlliance: "Direct donation to Alliance Petite-Nation.",
            donateOfficial: "Make official donation",
            supportKZ: "Support Kitigan Zibi",
            directDonationKZ: "Direct donation to Anishinabeg delegation.",
            communitySite: "Community Website",
            supportLynx: "Support Le Lynx",
            lynxMaint: "Platform maintenance.",
            techContrib: "Technical Contribution",
            centralSupport: "Support the Movement (Zhooniya)",
            amount: "Support Amount ($ CAD)",
            paymentMethod: "Payment Method",
            distribution: "Donation Distribution",
            equilibrate: "Balance",
            visualBreakdown: "Visual Breakdown",
            confirmSupport: "Confirm Support",
            processing: "Processing securely...",
            transferInitiated: "Transfer Initiated!",
            fairAlgo: "Fair Algorithm",
            fairAlgoDesc: "Adjust sliders to define priority for each cause.",
            comingSoon: "Coming Soon"
        }
    };

    const t = translations[language];

    const handleWeightChange = (cause: keyof typeof weights, value: number) => {
        setWeights(prev => ({
            ...prev,
            [cause]: value
        }));
    };

    const resetDistribution = () => {
        setWeights({
            alliance: 50,
            anishnabeg: 50,
            lynx: 50
        });
    };

    // Calculation Logic
    const totalWeight = weights.alliance + weights.anishnabeg + weights.lynx;
    
    const getPercent = (weight: number) => {
        if (totalWeight === 0) return 0;
        return (weight / totalWeight) * 100;
    };

    const getAmount = (weight: number) => {
        if (totalWeight === 0) return 0;
        return (donationAmount * (weight / totalWeight)).toFixed(2);
    };

    const handleDonate = () => {
        if (totalWeight === 0) return;
        const urls: Record<string, string> = {
            alliance: 'https://alliancepetitenation.org/agir/',
            anishnabeg: 'https://www.kitigan.com',
            lynx: 'mailto:info@alliancepetitenation.org?subject=Don%20plateforme%20Le%20Lynx',
        };
        const sorted = Object.entries(weights as Record<string, number>).sort((a, b) => b[1] - a[1]);
        const [topCause] = sorted;
        window.open(urls[topCause[0]], '_blank');
        setSuccessMessage(true);
        setTimeout(() => setSuccessMessage(false), 5000);
    };

    return (
        <div className="max-w-6xl mx-auto pb-20 animate-fade-in">
            <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-slate-800 rounded-2xl border border-white/10 text-emerald-400">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white font-serif">{t.strategicCommand}</h2>
                        <p className="text-slate-400 font-light">{t.adminDesc}</p>
                    </div>
                </div>

                <div className="flex bg-slate-900/80 rounded-full p-1 border border-white/5 shadow-sm backdrop-blur-md">
                    <button 
                        onClick={() => setActiveTab('strategy')} 
                        className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${activeTab === 'strategy' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                         <Shield size={14} /> {t.tabStrategy}
                    </button>
                    <button 
                        onClick={() => setActiveTab('requests')} 
                        className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${activeTab === 'requests' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                         <LayoutList size={14} /> {t.tabRequests} ({submissions.length})
                    </button>
                </div>
            </div>

            {activeTab === 'requests' ? (
                /* REQUESTS TAB */
                <div className="space-y-6">
                    <div className="glass-card p-6 rounded-3xl bg-[#0a0a0a]/40 border border-white/5">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-red-500" size={20} />
                            {t.ecoReports}
                        </h3>
                        {submissions.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-10">{t.noReports}</p>
                        ) : (
                            <div className="grid gap-4">
                                {submissions.map((sub) => (
                                    <div key={sub.id} className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.07] transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-xl font-bold text-slate-200">{sub.projectName}</h4>
                                            <span className="px-3 py-1 bg-red-900/30 text-red-400 text-[10px] font-bold uppercase rounded-full border border-red-500/20">
                                                {sub.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 font-mono">
                                            <span>{sub.date}</span>
                                            <span>•</span>
                                            <span>{sub.location}</span>
                                            <span>•</span>
                                            <span>Par: {sub.submittedBy}</span>
                                        </div>
                                        <p className="text-slate-300 text-sm leading-relaxed mb-4 bg-black/20 p-4 rounded-xl">
                                            {sub.description}
                                        </p>
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => setArchivedIds(prev => { const s = new Set(prev); s.has(sub.id) ? s.delete(sub.id) : s.add(sub.id); return s; })}
                                                className={`text-xs px-3 py-2 border rounded-lg transition-colors ${archivedIds.has(sub.id) ? 'text-amber-400 border-amber-500/30 bg-amber-900/20' : 'text-slate-400 hover:text-white border-white/10'}`}
                                            >
                                                {archivedIds.has(sub.id) ? 'Archivé ✓' : 'Archiver'}
                                            </button>
                                            <button
                                                onClick={() => setWatchedIds(prev => { const s = new Set(prev); s.has(sub.id) ? s.delete(sub.id) : s.add(sub.id); return s; })}
                                                className={`text-xs px-3 py-2 border rounded-lg transition-colors ${watchedIds.has(sub.id) ? 'bg-emerald-600/40 text-emerald-300 border-emerald-500/30' : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border-emerald-500/30'}`}
                                            >
                                                {watchedIds.has(sub.id) ? 'Surveillance active ✓' : 'Lancer une surveillance'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* STRATEGY TAB (Existing Content) */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Donation Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* DIRECT SUPPORT LINKS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <a href="https://alliancepetitenation.org/agir/" target="_blank" rel="noreferrer" className="glass-card p-6 rounded-2xl bg-emerald-900/20 border border-emerald-500/20 hover:bg-emerald-900/40 transition-all group cursor-pointer flex flex-col justify-between min-h-[140px]">
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <Shield size={24} className="text-emerald-400" />
                                        <ExternalLink size={16} className="text-emerald-500/50 group-hover:text-emerald-400" />
                                    </div>
                                    <h3 className="font-bold text-white text-lg">{t.supportAlliance}</h3>
                                    <p className="text-xs text-emerald-200/60 mt-1">{t.directDonationAlliance}</p>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 group-hover:underline">{t.donateOfficial} &rarr;</span>
                            </a>

                            <a href="https://kitiganzibi.ca/" target="_blank" rel="noreferrer" className="glass-card p-6 rounded-2xl bg-amber-900/20 border border-amber-500/20 hover:bg-amber-900/40 transition-all group cursor-pointer flex flex-col justify-between min-h-[140px]">
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <Activity size={24} className="text-amber-400" />
                                        <ExternalLink size={16} className="text-amber-500/50 group-hover:text-amber-400" />
                                    </div>
                                    <h3 className="font-bold text-white text-lg">{t.supportKZ}</h3>
                                    <p className="text-xs text-amber-200/60 mt-1">{t.directDonationKZ}</p>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest text-amber-500 group-hover:underline">{t.communitySite} &rarr;</span>
                            </a>

                            <div className="glass-card p-6 rounded-2xl bg-cyan-900/20 border border-cyan-500/20 hover:bg-cyan-900/40 transition-all group cursor-pointer flex flex-col justify-between min-h-[140px]">
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <Terminal size={24} className="text-cyan-400" />
                                        <ExternalLink size={16} className="text-cyan-500/50 group-hover:text-cyan-400" />
                                    </div>
                                    <h3 className="font-bold text-white text-lg">{t.supportLynx}</h3>
                                    <p className="text-xs text-cyan-200/60 mt-1">{t.lynxMaint}</p>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest text-cyan-500 group-hover:underline">{t.techContrib} &rarr;</span>
                            </div>
                        </div>


                        <div className="glass-card p-8 rounded-[32px] border border-white/5 bg-gradient-to-br from-[#0a0a0a] to-slate-900/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <DollarSign size={200} />
                            </div>

                            <h3 className="text-xl font-medium text-white mb-6 flex items-center gap-3">
                                <PieChart className="text-emerald-500" />
                                {t.centralSupport}
                            </h3>
                            
                            {/* Amount Input */}
                            <div className="mb-6">
                                <label className="text-xs font-bold uppercase text-slate-500 mb-3 block">{t.amount}</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input 
                                        type="number" 
                                        value={donationAmount} 
                                        onChange={(e) => setDonationAmount(Number(e.target.value))}
                                        className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-2xl font-mono text-white focus:border-emerald-500/50 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Payment Method Selector */}
                            <div className="mb-8">
                                <label className="text-xs font-bold uppercase text-slate-500 mb-3 block">{t.paymentMethod}</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <button onClick={() => setPaymentMethod('interac')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'interac' ? 'bg-white text-black border-white' : 'bg-slate-900 border-white/10 text-slate-400 hover:bg-slate-800'}`}>
                                        <Smartphone size={20} />
                                        <span className="text-[10px] font-bold uppercase">Interac</span>
                                    </button>
                                    <button onClick={() => setPaymentMethod('visa')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'visa' ? 'bg-white text-black border-white' : 'bg-slate-900 border-white/10 text-slate-400 hover:bg-slate-800'}`}>
                                        <CreditCard size={20} />
                                        <span className="text-[10px] font-bold uppercase">Visa/MC</span>
                                    </button>
                                    <button onClick={() => setPaymentMethod('paypal')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'paypal' ? 'bg-white text-black border-white' : 'bg-slate-900 border-white/10 text-slate-400 hover:bg-slate-800'}`}>
                                        <Wallet size={20} />
                                        <span className="text-[10px] font-bold uppercase">Paypal</span>
                                    </button>
                                    <button onClick={() => setPaymentMethod('bitcoin')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'bitcoin' ? 'bg-white text-black border-white' : 'bg-slate-900 border-white/10 text-slate-400 hover:bg-slate-800'}`}>
                                        <Bitcoin size={20} />
                                        <span className="text-[10px] font-bold uppercase">Bitcoin</span>
                                    </button>
                                </div>
                            </div>

                            {/* Slider Allocation System */}
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-xs font-bold uppercase text-slate-500">{t.distribution}</label>
                                    <button onClick={resetDistribution} className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
                                        <Sliders size={12} /> {t.equilibrate}
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Alliance Slider */}
                                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                <span className="text-sm font-bold text-slate-200">Alliance Petite-Nation</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-emerald-400 font-mono font-bold block">{getAmount(weights.alliance)}$</span>
                                                <span className="text-[10px] text-slate-500">{getPercent(weights.alliance).toFixed(0)}%</span>
                                            </div>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={weights.alliance}
                                            onChange={(e) => handleWeightChange('alliance', parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        />
                                    </div>

                                    {/* Anishnabeg Slider */}
                                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                                <span className="text-sm font-bold text-slate-200">Nation Anishinabeg</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-amber-400 font-mono font-bold block">{getAmount(weights.anishnabeg)}$</span>
                                                <span className="text-[10px] text-slate-500">{getPercent(weights.anishnabeg).toFixed(0)}%</span>
                                            </div>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={weights.anishnabeg}
                                            onChange={(e) => handleWeightChange('anishnabeg', parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                        />
                                    </div>

                                    {/* Lynx Slider */}
                                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                                                <span className="text-sm font-bold text-slate-200">Initiative Le Lynx</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-cyan-400 font-mono font-bold block">{getAmount(weights.lynx)}$</span>
                                                <span className="text-[10px] text-slate-500">{getPercent(weights.lynx).toFixed(0)}%</span>
                                            </div>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={weights.lynx}
                                            onChange={(e) => handleWeightChange('lynx', parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                        />
                                    </div>
                                </div>

                                {/* Visual Breakdown Bar */}
                                <div className="mt-6">
                                    <div className="flex h-3 rounded-full overflow-hidden bg-slate-800">
                                        <div style={{ width: `${getPercent(weights.alliance)}%` }} className="bg-emerald-500 transition-all duration-300"></div>
                                        <div style={{ width: `${getPercent(weights.anishnabeg)}%` }} className="bg-amber-500 transition-all duration-300"></div>
                                        <div style={{ width: `${getPercent(weights.lynx)}%` }} className="bg-cyan-500 transition-all duration-300"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button 
                                onClick={handleDonate}
                                disabled={totalWeight === 0 || isProcessing}
                                className={`w-full py-5 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg ${
                                    totalWeight > 0 
                                    ? 'bg-white text-black hover:bg-slate-200' 
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                            >
                                {isProcessing ? t.processing : successMessage ? t.transferInitiated : t.confirmSupport}
                                {!isProcessing && !successMessage && <ArrowRight size={16} />}
                            </button>
                            
                            {successMessage && (
                                <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-500/20 rounded-xl text-center">
                                    <p className="text-emerald-400 text-sm font-medium">Vous avez été redirigé(e) vers la page de don officielle. Merci pour votre soutien.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Side Stats */}
                    <div className="space-y-6">
                        <div className="glass-card p-8 rounded-[32px] border border-white/5 bg-[#0a0a0a]/40 text-center">
                            <PieChart className="mx-auto text-slate-600 mb-4" size={40} />
                            <h3 className="text-white font-bold mb-1">{t.fairAlgo}</h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                {t.fairAlgoDesc}
                            </p>
                        </div>

                        <div className="glass-card p-8 rounded-[32px] border border-white/5 bg-[#0a0a0a]/40">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{t.comingSoon}</h3>
                            <div className="space-y-3 opacity-50">
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <Users size={16} className="text-slate-500"/>
                                    <span className="text-sm text-slate-400">Fondation Rivières</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <Shield size={16} className="text-slate-500"/>
                                    <span className="text-sm text-slate-400">Fonds de Défense CQDE</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-4 text-center italic">De nouvelles causes seront ajoutées selon l'évolution du conflit.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;