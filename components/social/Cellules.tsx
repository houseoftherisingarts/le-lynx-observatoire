import React, { useEffect, useMemo, useState } from 'react';
import { Users, Plus, Lock, Unlock, X, Send, MapPin, Tag, Check, LogOut, Loader, ShieldAlert, MessageCircle } from 'lucide-react';
import { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
    Cellule,
    DemandeCellule,
    MessageCellule,
    FicheMembre,
    suivreCellules,
    suivreCellule,
    creerCellule,
    rejoindreCellule,
    demanderAcces,
    quitterCellule,
    suivreDemandes,
    repondreDemande,
    effacerDemande,
    suivreMessagesCellule,
    envoyerDansCellule,
    chargerMembres,
    tonAvatar,
    initiales,
    MAX_DESCRIPTION,
    MAX_MOT,
    MAX_NOM,
    MAX_TEXTE,
} from '../../services/cellulesService';

interface CellulesProps {
    language: Language;
    isAdmin?: boolean;
}

const T = {
    fr: {
        etiquette: 'Cellules locales', titre: 'Les comités de la lutte',
        intro: "Chaque cellule regroupe des gens d'une même municipalité ou d'un même métier. Vous entrez dans celle qui vous ressemble et vous y trouvez le travail en cours.",
        fonder: 'Fonder une cellule', rejoindre: 'Rejoindre', demander: 'Demander à entrer', ouvrir: 'Ouvrir',
        enAttente: 'Demande envoyée', ouverte: 'Ouverte', fermee: 'Sur demande', membres: 'membres',
        videTitre: 'Aucune cellule pour le moment',
        videTexte: "La première cellule reste à fonder. Vous lui donnez un nom, une municipalité ou un thème, et les gens du secteur la verront apparaître ici.",
        connexionTitre: 'Connexion requise',
        connexionTexte: 'Les cellules se rejoignent avec un compte. Connectez-vous pour entrer dans un comité.',
        erreurTitre: 'Lecture impossible',
        erreurTexte: 'Les cellules ne se chargent pas en ce moment. Rechargez la page dans un instant.',
        absenteTitre: 'Cellule introuvable',
        absenteTexte: "Cette cellule a été fermée ou son accès vous est refusé. Revenez à la liste pour en choisir une autre.",
        retour: 'Revenir à la liste',
        actionRatee: "Le geste n'a pas passé. Réessayez dans un instant.",
        formTitre: 'Fonder une cellule', nom: 'Nom de la cellule', municipalite: 'Municipalité', theme: 'Thème',
        description: 'Ce que la cellule fait', acces: 'Accès', accesOuvert: 'Ouverte à tous', accesDemande: 'Sur demande',
        creer: 'Créer la cellule', annuler: 'Annuler', motTitre: 'Votre mot au fondateur',
        motTexte: 'Dites en quelques lignes ce que vous venez faire dans cette cellule.',
        envoyerDemande: 'Envoyer la demande', listeMembres: 'Membres', fondateur: 'Fondateur', fil: 'Fil de la cellule',
        filVide: "Le fil est vide. Le premier message donne le ton et dit ce qui s'en vient.",
        ecrire: 'Écrire dans la cellule', demandes: 'Demandes en attente', aucuneDemande: 'Aucune demande en attente.',
        accepter: 'Accepter', refuser: 'Refuser', quitter: 'Quitter la cellule',
    },
    en: {
        etiquette: 'Local cells', titre: 'The committees of the fight',
        intro: 'Each cell gathers people from one municipality or one trade. You join the one that fits you and you find the work under way.',
        fonder: 'Found a cell', rejoindre: 'Join', demander: 'Ask to join', ouvrir: 'Open',
        enAttente: 'Request sent', ouverte: 'Open', fermee: 'By request', membres: 'members',
        videTitre: 'No cell yet',
        videTexte: 'The first cell is still to be founded. You give it a name, a municipality or a theme, and people nearby will see it appear here.',
        connexionTitre: 'Account required',
        connexionTexte: 'Cells are joined with an account. Sign in to enter a committee.',
        erreurTitre: 'Cannot load',
        erreurTexte: 'The cells are not loading right now. Reload the page in a moment.',
        absenteTitre: 'Cell not found',
        absenteTexte: 'This cell was closed or its access is denied to you. Go back to the list to pick another one.',
        retour: 'Back to the list',
        actionRatee: 'That did not go through. Try again in a moment.',
        formTitre: 'Found a cell', nom: 'Name of the cell', municipalite: 'Municipality', theme: 'Theme',
        description: 'What the cell does', acces: 'Access', accesOuvert: 'Open to all', accesDemande: 'By request',
        creer: 'Create the cell', annuler: 'Cancel', motTitre: 'Your word to the founder',
        motTexte: 'Say in a few lines what you come to do in this cell.',
        envoyerDemande: 'Send the request', listeMembres: 'Members', fondateur: 'Founder', fil: 'Cell thread',
        filVide: 'The thread is empty. The first message sets the tone and says what is coming.',
        ecrire: 'Write in the cell', demandes: 'Pending requests', aucuneDemande: 'No pending request.',
        accepter: 'Accept', refuser: 'Decline', quitter: 'Leave the cell',
    },
};

const champ =
    'w-full bg-black/40 border border-white/10 focus:border-emerald-500/40 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all';
const etiquetteClasse = 'text-[10px] font-bold uppercase tracking-widest';
const clamp = (lignes: number): React.CSSProperties => ({
    display: '-webkit-box',
    WebkitLineClamp: lignes,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    overflowWrap: 'anywhere',
});
const deuxLignes = clamp(2);
const troisLignes = clamp(3);

const Avatar: React.FC<{ uid: string; nom: string; taille?: string }> = ({ uid, nom, taille = 'w-8 h-8 text-[11px]' }) => (
    <div className={`${taille} ${tonAvatar(uid)} rounded-full flex items-center justify-center font-bold text-white border border-black/40`}>
        {initiales(nom)}
    </div>
);

const Cellules: React.FC<CellulesProps> = ({ language, isAdmin = false }) => {
    const { profile, signInWithGoogle } = useAuth();
    const t = language === 'fr' ? T.fr : T.en;

    const [cellules, setCellules] = useState<Cellule[]>([]);
    const [erreur, setErreur] = useState(false);
    const [chargement, setChargement] = useState(true);

    const [formOuvert, setFormOuvert] = useState(false);
    const [form, setForm] = useState({ nom: '', municipalite: '', theme: '', description: '', ouverte: true });
    const [enCours, setEnCours] = useState(false);

    const [ouvertId, setOuvertId] = useState<string | null>(null);
    const [detail, setDetail] = useState<Cellule | null>(null);
    const [messages, setMessages] = useState<MessageCellule[]>([]);
    const [demandes, setDemandes] = useState<DemandeCellule[]>([]);
    const [fiches, setFiches] = useState<FicheMembre[]>([]);
    const [texte, setTexte] = useState('');

    const [demandeCible, setDemandeCible] = useState<Cellule | null>(null);
    const [mot, setMot] = useState('');
    const [demandesEnvoyees, setDemandesEnvoyees] = useState<string[]>([]);
    const [erreurAction, setErreurAction] = useState(false);

    useEffect(() => {
        const stop = suivreCellules(
            (liste) => {
                setCellules(liste);
                setErreur(false);
                setChargement(false);
            },
            () => {
                setErreur(true);
                setChargement(false);
            }
        );
        return stop;
    }, []);

    // La cellule est lisible de tous ; le fil et les demandes exigent un compte
    // (regles Firestore `allow read: if signedIn()`), donc on ne s'y abonne pas
    // sans profil, sinon la requete entiere est refusee.
    useEffect(() => {
        if (!ouvertId) {
            setDetail(null);
            setMessages([]);
            setFiches([]);
            return;
        }
        const stopCellule = suivreCellule(ouvertId, setDetail, () => setDetail(null));
        if (!profile) {
            setMessages([]);
            return stopCellule;
        }
        const stopMessages = suivreMessagesCellule(ouvertId, setMessages, () => setMessages([]));
        return () => {
            stopCellule();
            stopMessages();
        };
    }, [ouvertId, profile?.uid]);

    useEffect(() => {
        if (!detail) return;
        let vivant = true;
        chargerMembres(detail.membreUids || []).then((liste) => {
            if (vivant) setFiches(liste);
        });
        return () => {
            vivant = false;
        };
    }, [detail?.id, detail?.membreUids?.length]);

    const moi = profile?.uid || '';
    const estMembre = (c: Cellule) => !!moi && (c.membreUids || []).includes(moi);
    const peutGerer = useMemo(
        () => !!detail && (isAdmin || detail.fondateurUid === moi),
        [detail, isAdmin, moi]
    );

    // La file des demandes ne regarde que le fondateur et l'administration.
    useEffect(() => {
        if (!ouvertId || !peutGerer) {
            setDemandes([]);
            return;
        }
        return suivreDemandes(ouvertId, setDemandes, () => setDemandes([]));
    }, [ouvertId, peutGerer]);

    const enAttente = useMemo(() => demandes.filter((d) => d.statut === 'attente'), [demandes]);

    const handleCreer = async () => {
        if (!profile || form.nom.trim().length < 2) return;
        setEnCours(true);
        setErreurAction(false);
        try {
            const id = await creerCellule(
                { uid: profile.uid, nom: profile.displayName },
                form
            );
            setFormOuvert(false);
            setForm({ nom: '', municipalite: '', theme: '', description: '', ouverte: true });
            setOuvertId(id);
        } catch (e) {
            console.error('Création de cellule refusée', e);
            setErreurAction(true);
        } finally {
            setEnCours(false);
        }
    };

    const handleRejoindre = async (c: Cellule) => {
        if (!profile) {
            await signInWithGoogle().catch(() => undefined);
            return;
        }
        setErreurAction(false);
        try {
            await rejoindreCellule(c.id, profile.uid, c.membreUids || []);
            setOuvertId(c.id);
        } catch (e) {
            console.error('Entrée refusée', e);
            setErreurAction(true);
        }
    };

    const handleDemande = async () => {
        if (!profile || !demandeCible) return;
        setEnCours(true);
        setErreurAction(false);
        try {
            await demanderAcces(demandeCible.id, { uid: profile.uid, nom: profile.displayName }, mot);
            setDemandesEnvoyees((d) => [...d, demandeCible.id]);
            setDemandeCible(null);
            setMot('');
        } catch (e) {
            console.error('Demande refusée', e);
            setErreurAction(true);
        } finally {
            setEnCours(false);
        }
    };

    const handleEnvoyer = async () => {
        if (!profile || !detail || !texte.trim()) return;
        const contenu = texte;
        setTexte('');
        setErreurAction(false);
        await envoyerDansCellule(detail.id, { uid: profile.uid, nom: profile.displayName }, contenu).catch((e) => {
            console.error('Message refusé', e);
            setTexte(contenu);
            setErreurAction(true);
        });
    };

    // La demande garde sa trace : la personne voit le verdict au retour. Le
    // fondateur efface la ligne quand il a fini avec elle.
    const handleReponse = async (d: DemandeCellule, accepte: boolean) => {
        if (!detail) return;
        setErreurAction(false);
        await repondreDemande(detail.id, d.uid, accepte, detail.membreUids || []).catch((e) => {
            console.error('Réponse refusée', e);
            setErreurAction(true);
        });
    };

    const handleQuitter = async () => {
        if (!profile || !detail) return;
        setErreurAction(false);
        try {
            await quitterCellule(detail.id, profile.uid, detail.membreUids || []);
            setOuvertId(null);
        } catch (e) {
            console.error('Sortie refusée', e);
            setErreurAction(true);
        }
    };

    const boutonCarte = (c: Cellule) => {
        if (estMembre(c)) {
            return (
                <button onClick={() => setOuvertId(c.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-bold transition-all">
                    {t.ouvrir}
                </button>
            );
        }
        if (c.ouverte) {
            return (
                <button onClick={() => handleRejoindre(c)} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-full text-xs font-bold transition-all">
                    {t.rejoindre}
                </button>
            );
        }
        if (demandesEnvoyees.includes(c.id)) {
            return <span className={`${etiquetteClasse} text-emerald-500`}>{t.enAttente}</span>;
        }
        return (
            <button
                onClick={() => (profile ? setDemandeCible(c) : signInWithGoogle().catch(() => undefined))}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-full text-xs font-bold transition-all"
            >
                {t.demander}
            </button>
        );
    };

    return (
        <div className="w-full max-w-6xl mx-auto pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="max-w-2xl">
                    <span className={`${etiquetteClasse} text-emerald-500`}>{t.etiquette}</span>
                    <h2 className="text-3xl md:text-4xl font-serif text-white mt-3 mb-4">{t.titre}</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">{t.intro}</p>
                </div>
                <button
                    onClick={() => (profile ? setFormOuvert(true) : signInWithGoogle().catch(() => undefined))}
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-bold transition-all shrink-0"
                >
                    <Plus size={16} /> {t.fonder}
                </button>
            </div>

            {!profile && !chargement && (
                <div className="glass-card rounded-2xl border border-white/5 p-5 mb-8 flex items-start gap-4">
                    <ShieldAlert size={20} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-white mb-1">{t.connexionTitre}</p>
                        <p className="text-xs text-slate-400">{t.connexionTexte}</p>
                    </div>
                </div>
            )}

            {erreurAction && (
                <div className="glass-card rounded-2xl border border-red-500/20 p-4 mb-8 flex items-start gap-3">
                    <ShieldAlert size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300">{t.actionRatee}</p>
                </div>
            )}

            {erreur && (
                <div className="glass-card rounded-2xl border border-red-500/20 p-8 text-center">
                    <ShieldAlert size={28} className="text-red-500 mx-auto mb-4" />
                    <p className="text-sm font-bold text-white mb-2">{t.erreurTitre}</p>
                    <p className="text-xs text-slate-400">{t.erreurTexte}</p>
                </div>
            )}

            {chargement && !erreur && (
                <div className="flex justify-center py-16 text-slate-600"><Loader size={22} className="animate-spin" /></div>
            )}

            {!chargement && !erreur && cellules.length === 0 && (
                <div className="glass-card rounded-3xl border border-white/5 p-12 text-center">
                    <Users size={36} className="text-slate-600 mx-auto mb-5" />
                    <h3 className="text-lg font-bold text-white mb-3">{t.videTitre}</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">{t.videTexte}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {cellules.map((c) => (
                    <div key={c.id} className="glass-card p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all flex flex-col">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            {c.municipalite ? (
                                <span className={`${etiquetteClasse} text-emerald-500 flex items-center gap-1.5 min-w-0`}><MapPin size={11} className="shrink-0" /> <span className="truncate">{c.municipalite}</span></span>
                            ) : c.theme ? (
                                <span className={`${etiquetteClasse} text-sky-400 flex items-center gap-1.5 min-w-0`}><Tag size={11} className="shrink-0" /> <span className="truncate">{c.theme}</span></span>
                            ) : (
                                <span className={`${etiquetteClasse} text-slate-500 truncate`}>{t.etiquette}</span>
                            )}
                            <span className={`${etiquetteClasse} flex items-center gap-1.5 shrink-0 ${c.ouverte ? 'text-slate-500' : 'text-amber-500'}`}>
                                {c.ouverte ? <Unlock size={11} /> : <Lock size={11} />} {c.ouverte ? t.ouverte : t.fermee}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white leading-snug mb-2" style={deuxLignes}>{c.nom}</h3>
                        <p className="text-sm text-slate-400 leading-relaxed mb-6" style={troisLignes}>{c.description}</p>
                        <div className="flex flex-wrap items-center justify-between gap-3 mt-auto pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex -space-x-2">
                                    {(c.membreUids || []).slice(0, 4).map((u) => (
                                        <Avatar key={u} uid={u} nom={u === c.fondateurUid ? c.fondateurNom : 'M'} taille="w-7 h-7 text-[10px]" />
                                    ))}
                                </div>
                                <span className="text-xs text-slate-500 font-bold">{c.nbMembres || 0} {t.membres}</span>
                            </div>
                            {boutonCarte(c)}
                        </div>
                    </div>
                ))}
            </div>

            {formOuvert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
                    <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/10 bg-[#02040a] p-8 relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setFormOuvert(false)} className="absolute top-5 right-5 text-slate-500 hover:text-white p-2"><X size={18} /></button>
                        <h3 className="text-2xl font-serif text-white mb-6">{t.formTitre}</h3>
                        <div className="space-y-4">
                            <input value={form.nom} maxLength={MAX_NOM} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder={t.nom} className={champ} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input value={form.municipalite} maxLength={60} onChange={(e) => setForm({ ...form, municipalite: e.target.value })} placeholder={t.municipalite} className={champ} />
                                <input value={form.theme} maxLength={60} onChange={(e) => setForm({ ...form, theme: e.target.value })} placeholder={t.theme} className={champ} />
                            </div>
                            <textarea value={form.description} maxLength={MAX_DESCRIPTION} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t.description} rows={4} className={`${champ} resize-none`} />
                            <div>
                                <span className={`${etiquetteClasse} text-slate-500 block mb-3`}>{t.acces}</span>
                                <div className="flex gap-3">
                                    {[true, false].map((v) => (
                                        <button
                                            key={String(v)}
                                            onClick={() => setForm({ ...form, ouverte: v })}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${form.ouverte === v ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                                        >
                                            {v ? <Unlock size={13} /> : <Lock size={13} />} {v ? t.accesOuvert : t.accesDemande}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setFormOuvert(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition-all">{t.annuler}</button>
                            <button onClick={handleCreer} disabled={enCours || form.nom.trim().length < 2} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                                {enCours ? <Loader size={14} className="animate-spin" /> : <Check size={14} />} {t.creer}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {demandeCible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
                    <div className="glass-panel w-full max-w-md rounded-3xl border border-white/10 bg-[#02040a] p-8 relative">
                        <button onClick={() => setDemandeCible(null)} className="absolute top-5 right-5 text-slate-500 hover:text-white p-2"><X size={18} /></button>
                        <h3 className="text-xl font-serif text-white mb-2">{t.motTitre}</h3>
                        <p className="text-xs text-slate-400 mb-5 leading-relaxed">{t.motTexte}</p>
                        <textarea value={mot} maxLength={MAX_MOT} onChange={(e) => setMot(e.target.value)} rows={4} className={`${champ} resize-none`} />
                        <button onClick={handleDemande} disabled={enCours} className="w-full mt-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                            {enCours ? <Loader size={14} className="animate-spin" /> : <Send size={14} />} {t.envoyerDemande}
                        </button>
                    </div>
                </div>
            )}

            {ouvertId && !detail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
                    <div className="glass-panel w-full max-w-md rounded-3xl border border-white/10 bg-[#02040a] p-8 text-center">
                        <ShieldAlert size={26} className="text-amber-500 mx-auto mb-4" />
                        <p className="text-sm font-bold text-white mb-2">{t.absenteTitre}</p>
                        <p className="text-xs text-slate-400 leading-relaxed mb-6">{t.absenteTexte}</p>
                        <button onClick={() => setOuvertId(null)} className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-full text-xs font-bold transition-all">
                            {t.retour}
                        </button>
                    </div>
                </div>
            )}

            {ouvertId && detail && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl animate-fade-in overflow-y-auto p-4 md:p-8">
                    <div className="glass-panel w-full max-w-5xl mx-auto rounded-3xl border border-white/10 bg-[#02040a] overflow-hidden">
                        <div className="p-6 md:p-8 border-b border-white/5 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <span className={`${etiquetteClasse} text-emerald-500 block truncate`}>{detail.municipalite || detail.theme || t.etiquette}</span>
                                <h3 className="text-2xl md:text-3xl font-serif text-white mt-2" style={deuxLignes}>{detail.nom}</h3>
                                <p className="text-sm text-slate-400 mt-3 max-w-2xl leading-relaxed break-words">{detail.description}</p>
                            </div>
                            <button onClick={() => setOuvertId(null)} className="text-slate-500 hover:text-white p-2 shrink-0"><X size={20} /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 md:p-8">
                            <div className="space-y-6">
                                <div>
                                    <span className={`${etiquetteClasse} text-slate-500 block mb-4`}>{t.listeMembres} · {detail.nbMembres || 0}</span>
                                    <div className="space-y-3">
                                        {fiches.map((f) => (
                                            <div key={f.uid} className="flex items-center gap-3">
                                                <Avatar uid={f.uid} nom={f.uid === detail.fondateurUid ? detail.fondateurNom : f.nom} />
                                                <div className="min-w-0">
                                                    <p className="text-sm text-slate-200 truncate">{f.uid === detail.fondateurUid ? detail.fondateurNom : f.nom}</p>
                                                    {f.uid === detail.fondateurUid && <p className={`${etiquetteClasse} text-emerald-500`}>{t.fondateur}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {peutGerer && (
                                    <div className="pt-6 border-t border-white/5">
                                        <span className={`${etiquetteClasse} text-amber-500 block mb-4`}>{t.demandes} · {demandes.length}</span>
                                        {demandes.length === 0 && <p className="text-xs text-slate-500">{t.aucuneDemande}</p>}
                                        <div className="space-y-4">
                                            {demandes.map((d) => (
                                                <div key={d.id} className="glass-card rounded-2xl border border-white/5 p-4">
                                                    <p className="text-sm text-slate-200 font-bold mb-1">{d.nom}</p>
                                                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{d.mot}</p>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleReponse(d, true)} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-all">{t.accepter}</button>
                                                        <button onClick={() => handleReponse(d, false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-[11px] font-bold transition-all">{t.refuser}</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {estMembre(detail) && detail.fondateurUid !== moi && (
                                    <button onClick={handleQuitter} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-400 transition-all pt-4 border-t border-white/5 w-full">
                                        <LogOut size={13} /> {t.quitter}
                                    </button>
                                )}
                            </div>

                            <div className="md:col-span-2 flex flex-col">
                                <span className={`${etiquetteClasse} text-slate-500 block mb-4`}>{t.fil}</span>
                                <div className="flex-1 space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                                    {messages.length === 0 && (
                                        <div className="glass-card rounded-2xl border border-white/5 p-8 text-center">
                                            <MessageCircle size={26} className="text-slate-600 mx-auto mb-4" />
                                            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">{t.filVide}</p>
                                        </div>
                                    )}
                                    {messages.map((m) => (
                                        <div key={m.id} className="flex items-start gap-3">
                                            <Avatar uid={m.uid} nom={m.nom} />
                                            <div className="glass-card rounded-2xl border border-white/5 px-4 py-3 flex-1">
                                                <p className="text-xs font-bold text-slate-300 mb-1">{m.nom}</p>
                                                <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap break-words">{m.texte}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {estMembre(detail) && (
                                    <div className="flex items-center gap-3 mt-5 pt-5 border-t border-white/5">
                                        <input
                                            value={texte}
                                            maxLength={MAX_TEXTE}
                                            onChange={(e) => setTexte(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnvoyer(); } }}
                                            placeholder={t.ecrire}
                                            className={champ}
                                        />
                                        <button onClick={handleEnvoyer} disabled={!texte.trim()} className="w-11 h-11 shrink-0 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-all">
                                            <Send size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cellules;
