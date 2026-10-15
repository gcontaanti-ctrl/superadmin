import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Database, BrainCircuit, Loader2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

export function AiChat() {
  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      content: "Olá! Sou o analista de IA. Estou conectado em tempo real a todos os módulos do ERP (Comercial, Compras, Financeiro, Estoque, Vendedores e Rastreamento). \n\nPosso responder perguntas específicas como:\n- *'Quanto a compradora Clara comprou?'*\n- *'Qual é o saldo projetado do financeiro?'*\n- *'Qual vendedor faturou mais?'*\n- *'Temos divergências de preços no rastreamento?'*\n- *'Quais itens estão com estoque baixo?'*\n\nComo posso ajudar você hoje?" 
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [vozAtiva, setVozAtiva] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  useEffect(() => {
    // So rola automaticamente quando chega uma mensagem NOVA (nao quando o usuario digita)
    if (messages.length > lastCount.current) {
      lastCount.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const falarResposta = (texto: string) => {
    if (!vozAtiva || !('speechSynthesis' in window)) return;
    
    // Cancela qualquer fala anterior
    window.speechSynthesis.cancel();
    
    // Limpa asteriscos e caracteres de formatação do markdown para leitura mais limpa
    const textoLimpo = texto.replace(/[*#_]/g, '');
    
    const ut = new SpeechSynthesisUtterance(textoLimpo);
    ut.lang = 'pt-BR';
    ut.rate = 1.1; // Fala um pouco mais rápido para não ficar entediante
    ut.pitch = 1.0;
    
    window.speechSynthesis.speak(ut);
  };

  const fmtCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      
      const respostaIA = data.reply || "Desculpe, não consegui processar sua solicitação.";
      setMessages(prev => [...prev, { role: "assistant", content: respostaIA }]);
      falarResposta(respostaIA);
    } catch (err) {
      console.error(err);
      const erroIA = "Ops! Houve uma falha de conexão com a IA.";
      setMessages(prev => [...prev, { role: "assistant", content: erroIA }]);
      falarResposta(erroIA);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-strong rounded-2xl p-5 h-[530px] flex flex-col justify-between border border-white/5 shadow-xl">
      <div className="flex flex-col gap-4 h-[440px]">
        {/* Header do Chat */}
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 shrink-0">
          <div className="size-9 rounded-lg bg-[image:var(--gradient-primary)] grid place-items-center glow shrink-0">
            <Sparkles className="size-4.5 text-primary-foreground" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-bold text-slate-100 flex items-center gap-1.5">
              Analista Executivo IA
            </h4>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Conectado ao DB2
            </div>
          </div>
          <button 
            onClick={() => {
              setVozAtiva(!vozAtiva);
              if (vozAtiva) window.speechSynthesis.cancel();
            }}
            className="ml-auto text-slate-400 hover:text-white bg-black/20 hover:bg-black/40 border border-white/5 rounded-lg p-1.5 transition-colors flex items-center gap-1"
            title={vozAtiva ? "Desativar Voz da IA" : "Ativar Voz da IA"}
          >
            {vozAtiva ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            <span className="text-[9px] font-bold uppercase">{vozAtiva ? 'Voz On' : 'Mudo'}</span>
          </button>
        </div>

        {/* Histórico de Mensagens */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-xs scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {messages.map((m, i) => (
            <div 
              key={i} 
              className={`p-3 rounded-2xl leading-relaxed whitespace-pre-line max-w-[88%] shadow-sm ${
                m.role === 'user' 
                  ? 'bg-primary/20 text-slate-100 border border-primary/30 ml-auto' 
                  : 'bg-slate-900/60 text-slate-200 border border-white/5'
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="bg-slate-900/60 border border-white/5 p-3 rounded-2xl text-slate-400 flex items-center gap-2 max-w-[50%]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Analisando DB2...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Caixa de Entrada */}
      <div className="flex gap-2 pt-3 border-t border-white/10 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte sobre compras, faturamento, vendedores..."
          className="flex-1 bg-black/45 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary placeholder:text-slate-500 shadow-inner"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button 
          onClick={handleSend} 
          disabled={loading}
          className="bg-primary/10 border border-primary/20 rounded-xl p-2.5 text-primary hover:bg-primary/25 transition cursor-pointer shadow-sm disabled:opacity-50 shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

