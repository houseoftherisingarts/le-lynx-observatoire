import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Image as ImageIcon, Link2, Loader2, Plus, Send, Trash2, Library } from 'lucide-react';
import type { Language } from '../../types';
import {
  DocumentMembre,
  TAILLE_MAX_MO,
  declarerALAdministration,
  deposerLien,
  supprimerDocumentMembre,
  suivreDocumentsMembre,
  televerserDocument,
  verserALaBibliotheque,
} from '../../services/documentsService';
import { Cellule, groupesReconnusDe, suivreCellules } from '../../services/cellulesService';

/**
 * Le fonds documentaire d'une personne, tel qu'il apparait sur sa fiche.
 * Tout membre connecte le consulte; seul le proprietaire y depose. Une piece
 * part vers la bibliotheque commune directement quand la personne appartient a
 * un groupe reconnu, et par declaration a l'administration dans tous les autres cas.
 */

interface FondsMembreProps {
  uid: string;
  nomMembre: string;
  estMoi: boolean;
  language: Language;
}

const MOTS = {
  fr: {
    titre: 'Documents déposés',
    vide: 'Aucun document déposé pour l’instant.',
    videMoi: 'Votre fonds est vide. Déposez une pièce que les autres devraient voir.',
    deposer: 'Déposer un document',
    fichier: 'Un fichier',
    lien: 'Un lien',
    champTitre: 'Titre du document',
    champNote: 'À quoi sert cette pièce ?',
    champUrl: 'https://…',
    envoyer: 'Déposer',
    annuler: 'Annuler',
    retirer: 'Retirer',
    declarer: 'Déclarer à l’administration',
    declaree: 'Déclarée à l’administration',
    verser: 'Verser à la bibliothèque',
    versee: 'Dans la bibliothèque',
    auNom: 'au nom de',
    limite: `PDF, image ou texte, ${TAILLE_MAX_MO} Mo au plus.`,
  },
  en: {
    titre: 'Documents on file',
    vide: 'No document on file yet.',
    videMoi: 'Your file is empty. Add a piece others should see.',
    deposer: 'Add a document',
    fichier: 'A file',
    lien: 'A link',
    champTitre: 'Document title',
    champNote: 'What is this piece for?',
    champUrl: 'https://…',
    envoyer: 'Add',
    annuler: 'Cancel',
    retirer: 'Remove',
    declarer: 'Send to the administration',
    declaree: 'Sent to the administration',
    verser: 'Add to the library',
    versee: 'In the library',
    auNom: 'on behalf of',
    limite: `PDF, image or text, ${TAILLE_MAX_MO} MB maximum.`,
  },
};

const iconeDe = (format: string) => {
  if (format === 'image') return ImageIcon;
  if (format === 'lien') return Link2;
  return FileText;
};

const FondsMembre: React.FC<FondsMembreProps> = ({ uid, nomMembre, estMoi, language }) => {
  const t = MOTS[language === 'en' ? 'en' : 'fr'];
  const [pieces, setPieces] = useState<DocumentMembre[]>([]);
  const [cellules, setCellules] = useState<Cellule[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [mode, setMode] = useState<'fichier' | 'lien'>('fichier');
  const [titre, setTitre] = useState('');
  const [note, setNote] = useState('');
  const [url, setUrl] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [progression, setProgression] = useState(0);
  const [travail, setTravail] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);

  useEffect(() => suivreDocumentsMembre(uid, setPieces), [uid]);
  useEffect(() => suivreCellules(setCellules), []);

  const groupes = useMemo(() => groupesReconnusDe(cellules, uid), [cellules, uid]);

  const reinitialiser = () => {
    setTitre('');
    setNote('');
    setUrl('');
    setFichier(null);
    setProgression(0);
    setOuvert(false);
  };

  const deposer = async () => {
    setAvis(null);
    setTravail(true);
    try {
      if (mode === 'fichier') {
        if (!fichier) throw new Error('Choisissez un fichier.');
        await televerserDocument(uid, nomMembre, fichier, titre, note, setProgression);
      } else {
        await deposerLien(uid, nomMembre, titre, url, note);
      }
      reinitialiser();
    } catch (e) {
      setAvis(e instanceof Error ? e.message : 'Le dépôt a échoué.');
    } finally {
      setTravail(false);
    }
  };

  const agir = async (faire: () => Promise<unknown>) => {
    setAvis(null);
    try {
      await faire();
    } catch (e) {
      setAvis(e instanceof Error ? e.message : 'Geste refusé.');
    }
  };

  return (
    <section className="mt-6 border-t border-white/5 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Library size={14} /> {t.titre}
          {pieces.length > 0 && <span className="text-emerald-400">{pieces.length}</span>}
        </h4>
        {estMoi && !ouvert && (
          <button
            type="button"
            onClick={() => setOuvert(true)}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-slate-300 transition-all hover:border-emerald-500/50 hover:text-emerald-400"
          >
            <Plus size={12} /> {t.deposer}
          </button>
        )}
      </div>

      {ouvert && estMoi && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="mb-3 flex gap-2">
            {(['fichier', 'lien'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 text-[11px] transition-all ${
                  mode === m ? 'bg-emerald-500 font-bold text-black' : 'border border-white/10 text-slate-400'
                }`}
              >
                {m === 'fichier' ? t.fichier : t.lien}
              </button>
            ))}
          </div>

          <input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder={t.champTitre}
            className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/40"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.champNote}
            rows={2}
            className="mb-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/40"
          />
          {mode === 'fichier' ? (
            <>
              <input
                type="file"
                accept="application/pdf,image/*,text/plain,text/markdown,text/csv"
                onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-slate-400 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-slate-200"
              />
              <p className="mt-1 text-[11px] text-slate-500">{t.limite}</p>
            </>
          ) : (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t.champUrl}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/40"
            />
          )}

          {travail && progression > 0 && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progression}%` }} />
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={deposer}
              disabled={travail}
              className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-bold text-black transition-all hover:bg-emerald-400 disabled:opacity-50"
            >
              {travail ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {t.envoyer}
            </button>
            <button
              type="button"
              onClick={reinitialiser}
              className="rounded-full border border-white/10 px-4 py-1.5 text-[11px] text-slate-400"
            >
              {t.annuler}
            </button>
          </div>
        </div>
      )}

      {pieces.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">{estMoi ? t.videMoi : t.vide}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pieces.map((piece) => {
            const Icone = iconeDe(piece.format);
            return (
              <li key={piece.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-start gap-3">
                  <Icone size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={piece.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-semibold text-slate-200 hover:text-emerald-400"
                    >
                      {piece.titre}
                    </a>
                    {piece.note && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{piece.note}</p>}
                    {piece.celluleNom && (
                      <p className="mt-1 text-[11px] text-emerald-400/80">
                        {t.versee} {t.auNom} {piece.celluleNom}
                      </p>
                    )}
                    {piece.propose && !piece.publieId && (
                      <p className="mt-1 text-[11px] text-slate-500">{t.declaree}</p>
                    )}
                  </div>
                </div>

                {estMoi && (
                  <div className="mt-2 flex flex-wrap gap-2 pl-7">
                    {!piece.publieId &&
                      (groupes.length > 0 ? (
                        groupes.map((groupe) => (
                          <button
                            key={groupe.id}
                            type="button"
                            onClick={() => agir(() => verserALaBibliotheque(piece, { id: groupe.id, nom: groupe.nom }))}
                            className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 px-3 py-1 text-[11px] text-emerald-400 transition-all hover:bg-emerald-500/10"
                          >
                            <Library size={11} /> {t.verser} ({groupe.nom})
                          </button>
                        ))
                      ) : (
                        !piece.propose && (
                          <button
                            type="button"
                            onClick={() => agir(() => declarerALAdministration(piece))}
                            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-300 transition-all hover:border-emerald-500/50 hover:text-emerald-400"
                          >
                            <Send size={11} /> {t.declarer}
                          </button>
                        )
                      ))}
                    <button
                      type="button"
                      onClick={() => agir(() => supprimerDocumentMembre(uid, piece.id, piece.chemin))}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-500 transition-all hover:border-red-500/40 hover:text-red-400"
                    >
                      <Trash2 size={11} /> {t.retirer}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {avis && <p className="mt-3 text-xs text-red-400">{avis}</p>}
    </section>
  );
};

export default FondsMembre;
