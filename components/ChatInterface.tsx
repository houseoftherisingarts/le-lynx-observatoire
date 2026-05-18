
import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, RateLimitError, ClaudeMessage } from '../services/claudeService';
import { useAuth } from '../context/AuthContext';
import { ChatMessage, Language } from '../types';
import { Send, Bot, User, Terminal } from 'lucide-react';

interface ChatInterfaceProps {
    language: Language;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ language }) => {
  const { firebaseUser } = useAuth();
  const translations = {
      fr: {
          title: "Assistant Lynx",
          status: "Système actif v2.4 (Beta)",
          connected: "Connecté",
          placeholder: "Entrez votre commande ou question...",
          disclaimer: "LE SYSTÈME PEUT GÉNÉRER DES ERREURS D'INTERPRÉTATION. VÉRIFICATION REQUISE.",
          welcome: "Connexion établie. Je suis le système Lynx. J'ai accès à toutes les données juridiques et environnementales du projet. Quelle est votre requête ? \n\n(Note: Le système est encore en construction et des erreurs d'interprétation sont possibles. Veuillez vérifier les informations critiques.)"
      },
      en: {
          title: "Lynx Assistant",
          status: "System Active v2.4 (Beta)",
          connected: "Connected",
          placeholder: "Enter your command or question...",
          disclaimer: "THE SYSTEM MAY GENERATE INTERPRETATION ERRORS. VERIFICATION REQUIRED.",
          welcome: "Connection established. I am the Lynx system. I have access to all legal and environmental data regarding the project. What is your request? \n\n(Note: The system is still under construction and interpretation errors are possible. Please verify critical information.)"
      },
      ani: {
          title: "Lynx Assistant", // Placeholder
          status: "System Active v2.4 (Beta)",
          connected: "Connected",
          placeholder: "Enter your command or question...",
          disclaimer: "THE SYSTEM MAY GENERATE INTERPRETATION ERRORS. VERIFICATION REQUIRED.",
          welcome: "Connection established. I am the Lynx system. I have access to all legal and environmental data regarding the project. What is your request? \n\n(Note: The system is still under construction and interpretation errors are possible. Please verify critical information.)"
      }
  };

  const t = translations[language];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<ClaudeMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialize welcome message when language changes or on mount
  useEffect(() => {
      setMessages([{ 
          id: 'init', 
          role: 'model', 
          text: t.welcome 
      }]);
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(history, userMsg.text, firebaseUser?.uid);
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
      };
      setMessages(prev => [...prev, modelMsg]);
      setHistory(prev => [
        ...prev,
        { role: 'user', content: userMsg.text },
        { role: 'assistant', content: response.text },
      ]);
      setRemaining(response.remaining);
    } catch (error) {
      const errorText = error instanceof RateLimitError
        ? error.message
        : "Erreur de connexion au serveur de données.";
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: errorText,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col glass-card rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 opacity-50"></div>
        
        {/* Chat Header */}
        <div className="p-5 border-b border-white/5 bg-slate-900/50 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 border border-white/10 shadow-lg">
                    <Terminal size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-200">{t.title}</h3>
                    <p className="text-[10px] text-emerald-500/80 font-mono tracking-wider uppercase">{t.status}</p>
                </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-900/30 text-emerald-400 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
                {t.connected}
            </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/30">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                        msg.role === 'user' ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-emerald-900/50 border-emerald-500/30 text-emerald-400'
                    }`}>
                        {msg.role === 'user' ? <User size={14} /> : <Terminal size={14} />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed shadow-lg backdrop-blur-sm whitespace-pre-wrap ${
                        msg.role === 'user' 
                        ? 'bg-slate-700 text-slate-100 rounded-tr-none' 
                        : 'bg-slate-900/80 border border-white/5 text-slate-300 rounded-tl-none'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isLoading && (
                 <div className="flex gap-4 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-400">
                        <Terminal size={14} />
                    </div>
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl rounded-tl-none p-4">
                        <div className="flex gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-75"></span>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-900/80 border-t border-white/5 backdrop-blur-xl">
            <div className="flex gap-3 relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={t.placeholder}
                    className="w-full bg-slate-950/50 border border-white/10 text-slate-200 rounded-xl px-4 py-3.5 pr-14 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all placeholder:text-slate-600 font-light"
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 top-2 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                    <Send size={18} />
                </button>
            </div>
            <div className="flex items-center justify-between mt-3">
                <p className="text-[9px] text-slate-600 font-mono">{t.disclaimer}</p>
                {remaining !== null && (
                    <p className="text-[9px] text-slate-500 font-mono">
                        {remaining} question{remaining !== 1 ? 's' : ''} restante{remaining !== 1 ? 's' : ''} aujourd'hui
                    </p>
                )}
            </div>
        </div>
    </div>
  );
};

export default ChatInterface;
