import React, { useState } from 'react';
import { CheckCircle2, Loader2, MessageCircleQuestion, Send } from 'lucide-react';
import { Language } from '../../types';
import { poserQuestion, QuestionOrigin } from '../../services/questionsService';

interface PoserQuestionProps {
  language: Language;
  /** 'inscription' avant l'assemblée, 'direct' pendant la soirée. */
  origin?: QuestionOrigin;
}

const T = {
  fr: {
    etiquette: 'Questions du public',
    titre: 'Posez votre question',
    intro:
      'Les questions déposées ici sont lues pendant les assemblées citoyennes. Vous n’avez pas besoin de compte pour en poser une.',
    nom: 'Votre nom',
    nomPlaceholder: 'Prénom et nom',
    ville: 'Votre municipalité',
    villePlaceholder: 'Duhamel, Lac-Simon, Chénéville...',
    courriel: 'Courriel (facultatif)',
    courrielPlaceholder: 'Pour recevoir la réponse écrite',
    question: 'Votre question',
    questionPlaceholder:
      'Écrivez la question que vous aimeriez voir posée devant l’assemblée.',
    envoyer: 'Envoyer ma question',
    envoi: 'Envoi en cours',
    erreurNom: 'Écrivez votre nom avant d’envoyer.',
    erreurQuestion: 'Votre question doit faire au moins dix caractères.',
    erreurEnvoi: 'La question n’a pas pu être enregistrée. Réessayez dans un moment.',
    merciTitre: 'Votre question est entre nos mains',
    merci:
      'Nous l’avons reçue et elle rejoint le paquet lu à voix haute lors de la prochaine assemblée. Les gens du secteur reconnaissent souvent leurs propres inquiétudes dans les mots des autres.',
    autre: 'Poser une autre question',
    compteur: 'caractères',
  },
  en: {
    etiquette: 'Questions from the public',
    titre: 'Ask your question',
    intro:
      'Questions left here are read out during citizen assemblies. You do not need an account to send one.',
    nom: 'Your name',
    nomPlaceholder: 'First and last name',
    ville: 'Your municipality',
    villePlaceholder: 'Duhamel, Lac-Simon, Chénéville...',
    courriel: 'Email (optional)',
    courrielPlaceholder: 'To receive the written answer',
    question: 'Your question',
    questionPlaceholder: 'Write the question you would like asked before the assembly.',
    envoyer: 'Send my question',
    envoi: 'Sending',
    erreurNom: 'Please write your name before sending.',
    erreurQuestion: 'Your question needs at least ten characters.',
    erreurEnvoi: 'The question could not be saved. Please try again in a moment.',
    merciTitre: 'Your question is in our hands',
    merci:
      'We received it and it joins the deck read out loud at the next assembly. People from the area often recognize their own worries in someone else’s words.',
    autre: 'Ask another question',
    compteur: 'characters',
  },
};

const champ =
  'w-full rounded-2xl bg-black/40 border border-white/5 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-emerald-500/50 focus:bg-black/60';
const etiquette = 'block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2';

const PoserQuestion: React.FC<PoserQuestionProps> = ({ language, origin = 'inscription' as QuestionOrigin }) => {
  const t = language === 'fr' ? T.fr : T.en;
  const [name, setName] = useState('');
  const [town, setTown] = useState('');
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [envoyee, setEnvoyee] = useState(false);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErreur(t.erreurNom);
      return;
    }
    if (question.trim().length < 10) {
      setErreur(t.erreurQuestion);
      return;
    }
    setErreur('');
    setEnvoi(true);
    try {
      await poserQuestion({ name, town, email, question, origin });
      setEnvoyee(true);
      setName('');
      setTown('');
      setEmail('');
      setQuestion('');
    } catch {
      setErreur(t.erreurEnvoi);
    } finally {
      setEnvoi(false);
    }
  };

  if (envoyee) {
    return (
      <div className="w-full flex justify-center px-4 py-10 animate-fade-in">
        <div className="glass-card w-full max-w-[32rem] rounded-3xl border border-white/5 p-6 text-center md:p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <h3 className="font-serif text-2xl text-white mb-3">{t.merciTitre}</h3>
          <p className="text-sm leading-relaxed text-slate-400">{t.merci}</p>
          <button
            type="button"
            onClick={() => setEnvoyee(false)}
            className="mt-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-6 py-3 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50"
          >
            {t.autre}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center px-4 py-10 animate-fade-in">
      <form onSubmit={soumettre} noValidate className="glass-card w-full max-w-[32rem] rounded-3xl border border-white/5 p-6 md:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircleQuestion className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              {t.etiquette}
            </span>
          </div>
          <h2 className="font-serif text-3xl text-white leading-tight">{t.titre}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{t.intro}</p>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="q-nom" className={etiquette}>{t.nom}</label>
            <input
              id="q-nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={120}
              placeholder={t.nomPlaceholder}
              className={champ}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="q-ville" className={etiquette}>{t.ville}</label>
              <input
                id="q-ville"
                value={town}
                onChange={(e) => setTown(e.target.value)}
                maxLength={120}
                placeholder={t.villePlaceholder}
                className={champ}
              />
            </div>
            <div>
              <label htmlFor="q-courriel" className={etiquette}>{t.courriel}</label>
              <input
                id="q-courriel"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                maxLength={120}
                placeholder={t.courrielPlaceholder}
                className={champ}
              />
            </div>
          </div>

          <div>
            <label htmlFor="q-question" className={etiquette}>{t.question}</label>
            <textarea
              id="q-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={1000}
              rows={5}
              placeholder={t.questionPlaceholder}
              className={`${champ} resize-none leading-relaxed`}
            />
            <div className="mt-2 text-right text-[10px] uppercase tracking-widest text-slate-600">
              {question.length} / 1000 {t.compteur}
            </div>
          </div>
        </div>

        {erreur && (
          <p role="alert" className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={envoi}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-bold text-black transition-all hover:bg-emerald-400 disabled:opacity-50"
        >
          {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {envoi ? t.envoi : t.envoyer}
        </button>
      </form>
    </div>
  );
};

export default PoserQuestion;
