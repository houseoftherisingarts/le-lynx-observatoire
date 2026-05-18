
import React from 'react';
import { FileText, Calendar, Scale, AlertTriangle, Video, ShieldCheck, Flame, ExternalLink } from 'lucide-react';
import { Language } from '../types';

interface ArchiveTimelineProps {
    language: Language;
}

const ArchiveTimeline: React.FC<ArchiveTimelineProps> = ({ language }) => {
    const translations = {
        fr: {
            title: "Archives & Preuves Historiques",
            memoryQuote: "La mémoire est une arme.",
            memoryDesc: "L'accès à l'historique complet des catastrophes évitées et subies permet de mieux préparer la stratégie juridique.",
            victory: "Victoire",
            alert: "Alerte",
            law: "Loi",
            disaster: "Désastre"
        },
        en: {
            title: "Archives & Historical Evidence",
            memoryQuote: "Memory is a weapon.",
            memoryDesc: "Access to the complete history of averted and suffered disasters allows for better legal strategy preparation.",
            victory: "Victory",
            alert: "Alert",
            law: "Law",
            disaster: "Disaster"
        },
        ani: {
            title: "Gaa-bi-izhiwebag", // Archives / What happened
            memoryQuote: "Memory is a weapon.",
            memoryDesc: "Access to the complete history of averted and suffered disasters allows for better legal strategy preparation.",
            victory: "Victory",
            alert: "Alert",
            law: "Law",
            disaster: "Disaster"
        }
    };

    const t = translations[language];

    const timelineData = [
        { 
            year: '2025', 
            month: 'Fév', 
            title: 'Référendum Citoyen', 
            desc: 'Vote massif NON au projet minier par les résidents de la Petite-Nation. Une victoire démocratique historique.', 
            type: 'victory',
            link: 'https://alliancepetitenation.org'
        },
        { 
            year: '2024', 
            month: 'Mai', 
            title: 'Financement et Activité continue', 
            desc: 'Lomiko Metals clôture un financement par actions accréditives de 1,17 M$. Malgré l\'opposition, la compagnie lève des fonds pour continuer l\'exploration.', 
            type: 'alert',
            link: 'https://lomiko.com/fr/nouvelles/'
        },
        { 
            year: '2017', 
            month: 'Sept', 
            title: 'Victoire : Junex quitte Gaspé', 
            desc: 'Face à la pression populaire, la pétrolière Junex abandonne finalement ses forages à Haldimand. Une preuve que la résistance fonctionne.', 
            type: 'victory',
            link: 'https://www.lesaffaires.com/secteurs/energie-et-ressources-naturelles/moins-dun-an-apres-avoir-achete-junex-cuda-quitte-le-quebec-2/'
        },
        { 
            year: '2017', 
            month: 'Mai', 
            title: 'Début de la résistance & JUNEXIT', 
            desc: 'La naissance du Camp de la Rivière. Regardez le documentaire "Junexit" qui relate cette lutte historique pour la protection de l\'eau.', 
            type: 'victory',
            link: 'https://www.youtube.com/watch?v=QvUDiaR3QS4'
        },
        { 
            year: '2015', 
            month: 'Août', 
            title: 'Victoire de Cacouna', 
            desc: 'Annulation du port pétrolier pour protéger la pouponnière de bélugas. La mobilisation citoyenne et scientifique a fait reculer TransCanada.', 
            type: 'victory',
            link: 'https://cqde.org/news/le-projet-de-port-petrolier-de-transcanada-stoppe-a-cacouna-une-grande-victoire-pour-le-mouvement-environnemental-et-les-citoyens/'
        },
        { 
            year: '2014', 
            month: 'Mars', 
            title: 'Désastre de Malartic', 
            desc: 'La mine à ciel ouvert la plus grande du Canada force le déménagement de 200 maisons. Un quartier entier rasé pour de l\'or.', 
            type: 'disaster',
            link: 'https://www.canadianminingjournal.com/news/malartic-expropriation/'
        },
         { 
            year: '2013', 
            month: 'Mars', 
            title: 'Moratoire Uranium', 
            desc: 'Sous la pression des médecins et des Cris à Sept-Îles, Québec impose un moratoire sur l\'uranium. La preuve que l\'opposition fonctionne.', 
            type: 'victory',
            link: 'https://www.bape.gouv.qc.ca/fr/dossiers/enjeux-filiere-uranifere-quebec/'
        },
        { 
            year: '2007', 
            month: 'Juin', 
            title: 'Conflits d\'intérêts Hydro/Gaz', 
            desc: 'André Caillé quitte Hydro-Québec pour diriger Junex. La filière pétrole/gaz publique est fermée au profit du privé.', 
            type: 'alert',
            link: 'https://fr.wikipedia.org/wiki/Andr%C3%A9_Caill%C3%A9'
        },
        { 
            year: '2003', 
            month: 'Avril', 
            title: 'La Grande Braderie', 
            desc: 'Le gouvernement Charest fixe le prix des claims à 0,10$/hectare. 90% du sous-sol québécois devient accessible aux minières pour une bouchée de pain.', 
            type: 'law',
            link: 'https://mern.gouv.qc.ca/mines/titres/titres-acquérir.jsp'
        },
         { 
            year: '1948', 
            month: '---', 
            title: 'Mine Giant (Yellowknife)', 
            desc: '237 000 tonnes de poussière d\'arsenic hautement toxique stockées sous terre pour l\'éternité. Le contribuable paie la facture d\'un milliard.', 
            type: 'disaster',
            link: 'https://fr.wikipedia.org/wiki/Mine_Giant'
        },
    ];

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <h2 className="text-2xl font-bold text-white mb-8 pl-4 border-l-4 border-emerald-500">{t.title}</h2>
            
            <div className="relative border-l border-white/10 ml-4 md:ml-6 space-y-12 pb-12">
                {timelineData.map((item, idx) => (
                    <div key={idx} className="relative pl-8 md:pl-12 group">
                        {/* Dot */}
                        <div className={`absolute -left-[7px] top-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 transition-all group-hover:scale-125 ${
                            item.type === 'alert' ? 'bg-amber-500 shadow-amber-500/50' :
                            item.type === 'law' ? 'bg-purple-500 shadow-purple-500/50' :
                            item.type === 'disaster' ? 'bg-red-600 shadow-red-600/50' :
                            item.type === 'victory' ? 'bg-emerald-400 shadow-emerald-400/60' :
                            'bg-slate-500'
                        }`}></div>

                        {/* Date Label */}
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block group-hover:text-emerald-400 transition-colors">
                            {item.month} {item.year}
                        </span>

                        {/* Card */}
                        <div className="glass-card p-6 rounded-2xl hover:bg-white/5 transition-all duration-300 border-l-2 border-l-transparent hover:border-l-white/20">
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-lg font-bold text-slate-200 group-hover:text-white">{item.title}</h3>
                                {item.type === 'law' && <Scale className="text-purple-400" size={18} />}
                                {item.type === 'alert' && <AlertTriangle className="text-amber-400" size={18} />}
                                {item.type === 'victory' && <ShieldCheck className="text-emerald-400" size={18} />}
                                {item.type === 'disaster' && <Flame className="text-red-500" size={18} />}
                            </div>
                            <p className="text-slate-400 font-light text-sm leading-relaxed mb-4">{item.desc}</p>
                            
                            {item.title.includes('JUNEXIT') ? (
                                 <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:text-white transition-colors border-b border-transparent hover:border-emerald-500 pb-0.5">
                                    <Video size={10} /> Voir le documentaire "Junexit" <ExternalLink size={10} />
                                </a>
                            ) : (
                                <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-white transition-colors border-b border-transparent hover:border-emerald-500 pb-0.5">
                                    Source Vérifiée <ExternalLink size={10} />
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-card p-8 rounded-3xl text-center border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-transparent">
                <p className="text-emerald-200 font-medium mb-4">{t.memoryQuote}</p>
                <p className="text-xs text-slate-400 max-w-lg mx-auto mb-6">{t.memoryDesc}</p>
            </div>
        </div>
    );
};

export default ArchiveTimeline;
