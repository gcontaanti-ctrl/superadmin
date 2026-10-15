import { useState, useEffect } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  ShieldCheck, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  FileCheck,
  BrainCircuit,
  Eye,
  CheckCircle,
  HelpCircle,
  X,
  FileText,
  Building,
  TrendingDown,
  Percent,
  PlusCircle,
  AlertOctagon,
  Info,
  DollarSign,
  ArrowRight
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

export function AiInsights() {
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<"divergencia" | "ruptura" | "desconto" | null>(null);
  const [selectedDiv, setSelectedDiv] = useState<any>(null);
  const [insightsData, setInsightsData] = useState<{ rupturas: any[]; divergencias: any[]; descontos: any[] } | null>(null);
  
  // Forecast Data
  const forecastData = [
    { label: "Mar/26", realizado: 489000, projetado: 489000 },
    { label: "Abr/26", realizado: 502000, projetado: 502000 },
    { label: "Mai/26", realizado: 508328, projetado: 508328 },
    { label: "Jun/26 (Pred)", realizado: null, projetado: 524000 },
    { label: "Jul/26 (Pred)", realizado: null, projetado: 539000 },
    { label: "Ago/26 (Pred)", realizado: null, projetado: 552000 }
  ];

  const handleApplyAction = (actionTitle: string) => {
    toast.success(`Plano de ação iniciado: "${actionTitle}"`);
    setActiveModal(null);
  };

  const fetchInsights = async () => {
    setLoading(true);
    toast.info("Varrendo tabelas de Vendas, Estoque e Notas Fiscais no DB2...");
    try {
      const res = await fetch('/api/ia-insights');
      const data = await res.json();
      setInsightsData(data);
      toast.success("Varredura de IA concluída! Insights atualizados com sucesso.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao conectar no motor de IA.");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchInsights();
  }, []);

  const triggerScan = () => {
    fetchInsights();
  };

  const fmtCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="flex flex-col gap-6 w-full relative">
      {/* Top Section / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-[image:var(--gradient-primary)] grid place-items-center glow text-primary-foreground shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-100 flex items-center gap-1.5">
              Insights de IA Executiva
              <span className="text-[9px] uppercase font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                IA Prescritiva
              </span>
            </h3>
            <p className="text-xs text-slate-400">Varredura contínua de anomalias, estoque e margens do DB2</p>
          </div>
        </div>

        <button
          onClick={triggerScan}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Forçar Varredura
        </button>
      </div>

      {loading ? (
        <div className="glass-strong rounded-2xl p-24 flex flex-col justify-center items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Processando modelos estatísticos e redes neurais...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Saúde Operacional</span>
                <h5 className="text-lg font-bold text-slate-200 mt-0.5">94.2%</h5>
                <span className="text-[9px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> +1.4% este mês
                </span>
              </div>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Ações Recomendadas</span>
                <h5 className="text-lg font-bold text-slate-200 mt-0.5">4 Pendentes</h5>
                <span className="text-[9px] text-slate-500">2 aplicadas na última semana</span>
              </div>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Target className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Anomalias de Preços</span>
                <h5 className="text-lg font-bold text-amber-400 mt-0.5">1 Alerta</h5>
                <span className="text-[9px] text-amber-500">Ação imediata requerida</span>
              </div>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

