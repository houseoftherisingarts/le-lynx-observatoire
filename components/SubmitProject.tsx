
import React, { useState } from 'react';
import { AlertTriangle, Send, MapPin, FileText, Type, User, Info } from 'lucide-react';
import { ProjectSubmission, Language } from '../types';

interface SubmitProjectProps {
    onSubmit: (submission: ProjectSubmission) => void;
    language: Language;
}

const SubmitProject: React.FC<SubmitProjectProps> = ({ onSubmit, language }) => {
    const [formData, setFormData] = useState({
        projectName: '',
        type: '',
        location: '',
        description: '',
        submittedBy: '',
        contactEmail: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const translations = {
        fr: {
            received: "Signalement Reçu",
            thankYou: "Merci pour votre vigilance. Les données concernant ce projet ont été transmises à l'unité d'observation du Lynx. Elles seront analysées et ajoutées à la base de données après vérification.",
            submitAnother: "Signaler un autre projet",
            newReport: "Nouveau Signalement",
            descHeader: "Aidez-nous à cartographier les menaces sur le territoire. Utilisez ce formulaire pour soumettre une entreprise extractive (mine, pétrolière, forestière) à la surveillance du réseau Le Lynx.",
            purpose: "But de cette section",
            purposeDesc: "Nous récoltons des informations sur les projets écocides émergents pour préparer la résistance.",
            examples: "Exemples :",
            examplesDesc: "Nouvelle exploration de graphite, projet de pipeline ou oléoduc, coupe forestière abusive (coupe à blanc), développement immobilier en zone humide...",
            nameLabel: "Nom du Projet / Compagnie",
            typeLabel: "Type d'industrie",
            locLabel: "Localisation",
            descLabel: "Description & Menaces",
            contactLabel: "Vos Coordonnées (Confidentiel)",
            sendBtn: "Transmettre le signalement",
            placeholderName: "Ex: Mine Miller, Projet Oléoduc...",
            placeholderLoc: "Ville, Région, Coordonnées...",
            placeholderDesc: "Décrivez la nature du projet, les cours d'eau menacés, et les acteurs impliqués...",
            placeholderUser: "Votre Nom",
            placeholderEmail: "Courriel pour suivi",
            types: {
                select: "Sélectionner...",
                mine: "Mine (Exploration/Exploitation)",
                oil: "Pétrole / Gaz",
                forest: "Coupe Forestière abusive",
                realestate: "Développement Immobilier Sauvage",
                waste: "Site d'enfouissement",
                other: "Autre"
            }
        },
        en: {
            received: "Report Received",
            thankYou: "Thank you for your vigilance. Data regarding this project has been transmitted to the Lynx observation unit. It will be analyzed and added to the database after verification.",
            submitAnother: "Report another project",
            newReport: "New Report",
            descHeader: "Help us map threats to the territory. Use this form to submit an extractive company (mining, oil, forestry) for Lynx network surveillance.",
            purpose: "Purpose of this section",
            purposeDesc: "We gather information on emerging ecocide projects to prepare resistance.",
            examples: "Examples:",
            examplesDesc: "New graphite exploration, pipeline project, abusive logging, wetland real estate development...",
            nameLabel: "Project / Company Name",
            typeLabel: "Industry Type",
            locLabel: "Location",
            descLabel: "Description & Threats",
            contactLabel: "Your Contact Info (Confidential)",
            sendBtn: "Transmit Report",
            placeholderName: "Ex: Miller Mine, Pipeline Project...",
            placeholderLoc: "City, Region, Coordinates...",
            placeholderDesc: "Describe the nature of the project, threatened waterways, and involved actors...",
            placeholderUser: "Your Name",
            placeholderEmail: "Email for follow-up",
            types: {
                select: "Select...",
                mine: "Mine (Exploration/Exploitation)",
                oil: "Oil / Gas",
                forest: "Abusive Forestry",
                realestate: "Wild Real Estate Dev",
                waste: "Landfill Site",
                other: "Other"
            }
        },
        ani: {
            received: "Report Received",
            thankYou: "Thank you for your vigilance. Data regarding this project has been transmitted to the Lynx observation unit. It will be analyzed and added to the database after verification.",
            submitAnother: "Report another project",
            newReport: "New Report",
            descHeader: "Help us map threats to the Aki (Land). Use this form to submit an extractive company for network surveillance.",
            purpose: "Purpose of this section",
            purposeDesc: "We gather information on emerging ecocide projects to prepare resistance.",
            examples: "Examples:",
            examplesDesc: "New graphite exploration, pipeline project, abusive logging, wetland real estate development...",
            nameLabel: "Project / Company Name",
            typeLabel: "Industry Type",
            locLabel: "Location (Aki)",
            descLabel: "Description & Threats",
            contactLabel: "Your Contact Info (Confidential)",
            sendBtn: "Transmit Report",
            placeholderName: "Ex: Miller Mine, Pipeline Project...",
            placeholderLoc: "City, Region, Coordinates...",
            placeholderDesc: "Describe the nature of the project, threatened waterways (Nibi), and involved actors...",
            placeholderUser: "Your Name",
            placeholderEmail: "Email for follow-up",
            types: {
                select: "Select...",
                mine: "Mine (Exploration/Exploitation)",
                oil: "Oil / Gas",
                forest: "Abusive Forestry",
                realestate: "Wild Real Estate Dev",
                waste: "Landfill Site",
                other: "Other"
            }
        }
    };

    const t = translations[language];

    const handleSubmit = () => {
        if (!formData.projectName || !formData.location || !formData.description) return;

        const newSubmission: ProjectSubmission = {
            id: Date.now().toString(),
            projectName: formData.projectName,
            type: formData.type || 'Non spécifié',
            location: formData.location,
            description: formData.description,
            submittedBy: formData.submittedBy || 'Anonyme',
            contactEmail: formData.contactEmail,
            date: new Date().toLocaleDateString()
        };

        onSubmit(newSubmission);
        setSubmitted(true);
        setFormData({
            projectName: '',
            type: '',
            location: '',
            description: '',
            submittedBy: '',
            contactEmail: ''
        });
    };

    if (submitted) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] animate-fade-in p-4 w-full">
                <div className="glass-card p-8 md:p-10 rounded-[32px] max-w-lg w-full text-center border border-emerald-500/20 bg-[#0a0a0a]/60 backdrop-blur-xl">
                    <div className="w-20 h-20 bg-emerald-900/30 rounded-full mx-auto flex items-center justify-center mb-6 text-emerald-400">
                        <Send size={32} />
                    </div>
                    <h2 className="text-2xl font-serif text-white mb-4">{t.received}</h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        {t.thankYou}
                    </p>
                    <button 
                        onClick={() => setSubmitted(false)}
                        className="w-full md:w-auto px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest"
                    >
                        {t.submitAnother}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto pb-20 animate-fade-in">
             <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6 md:mb-8 px-1">
                <div className="p-3 md:p-4 bg-red-900/20 rounded-2xl border border-red-500/20 text-red-400 shrink-0">
                    <AlertTriangle size={32} />
                </div>
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white font-serif leading-tight">{t.newReport}</h2>
                    <p className="text-slate-400 font-light text-sm md:text-base mt-1">
                        {t.descHeader}
                    </p>
                </div>
            </div>

            <div className="glass-card p-5 md:p-8 rounded-[24px] md:rounded-[32px] border border-white/5 bg-[#0a0a0a]/40 w-full overflow-hidden mb-8">
                 <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/5 mb-6">
                    <Info size={18} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-xs font-bold uppercase text-slate-300 mb-1">{t.purpose}</h4>
                        <p className="text-sm text-slate-500 font-light leading-relaxed">
                            {t.purposeDesc}
                            <br/>
                            <span className="text-slate-400 font-medium">{t.examples}</span> {t.examplesDesc}
                        </p>
                    </div>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    
                    {/* Left Column: Info */}
                    <div className="space-y-6 w-full">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                                <Type size={14}/> {t.nameLabel}
                            </label>
                            <input 
                                type="text"
                                value={formData.projectName}
                                onChange={e => setFormData({...formData, projectName: e.target.value})}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 md:p-4 text-white focus:border-red-500/50 transition-colors placeholder:text-slate-700"
                                placeholder={t.placeholderName}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                                <AlertTriangle size={14}/> {t.typeLabel}
                            </label>
                            <div className="relative">
                                <select 
                                    value={formData.type}
                                    onChange={e => setFormData({...formData, type: e.target.value})}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 md:p-4 text-white focus:border-red-500/50 transition-colors appearance-none"
                                >
                                    <option value="">{t.types.select}</option>
                                    <option value="Mine">{t.types.mine}</option>
                                    <option value="Pétrole/Gaz">{t.types.oil}</option>
                                    <option value="Forestier">{t.types.forest}</option>
                                    <option value="Immobilier">{t.types.realestate}</option>
                                    <option value="Déchet">{t.types.waste}</option>
                                    <option value="Autre">{t.types.other}</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            </div>
                        </div>

                         <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                                <MapPin size={14}/> {t.locLabel}
                            </label>
                            <input 
                                type="text"
                                value={formData.location}
                                onChange={e => setFormData({...formData, location: e.target.value})}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 md:p-4 text-white focus:border-red-500/50 transition-colors placeholder:text-slate-700"
                                placeholder={t.placeholderLoc}
                            />
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className="space-y-6 w-full">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                                <FileText size={14}/> {t.descLabel}
                            </label>
                            <textarea 
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="w-full h-40 bg-slate-950 border border-white/10 rounded-xl p-3 md:p-4 text-white focus:border-red-500/50 transition-colors resize-none placeholder:text-slate-700"
                                placeholder={t.placeholderDesc}
                            />
                        </div>

                        <div className="p-4 md:p-6 bg-white/5 rounded-2xl border border-white/5">
                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-4 flex items-center gap-2">
                                <User size={14}/> {t.contactLabel}
                            </h4>
                            <div className="grid gap-3">
                                <input 
                                    type="text"
                                    value={formData.submittedBy}
                                    onChange={e => setFormData({...formData, submittedBy: e.target.value})}
                                    className="w-full bg-slate-900 border border-white/5 rounded-lg p-3 text-sm text-white placeholder:text-slate-700"
                                    placeholder={t.placeholderUser}
                                />
                                <input 
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                                    className="w-full bg-slate-900 border border-white/5 rounded-lg p-3 text-sm text-white placeholder:text-slate-700"
                                    placeholder={t.placeholderEmail}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleSubmit}
                            disabled={!formData.projectName || !formData.location}
                            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/20 uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t.sendBtn}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmitProject;
