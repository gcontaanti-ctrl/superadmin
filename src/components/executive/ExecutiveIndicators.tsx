import { useEffect, useState } from "react";
import { 
  DollarSign, 
  CalendarDays, 
  TrendingUp, 
  PieChart, 
  Receipt, 
  Target, 
  Package, 
  PackageX, 
  AlertTriangle, 
  Users, 
  Trophy, 
  Megaphone,
  Loader2,
  ChevronRight,
  X
} from "lucide-react";

export function ExecutiveIndicators({ selectedStore, startDate, endDate }: { selectedStore: string, startDate?: string, endDate?: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    let url = `/api/dashboard-executivo?idEmpresa=${selectedStore}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    fetch(url)
      .then(res => res.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedStore, startDate, endDate]);

  if (loading) {
    return (
      <div className="glass-strong rounded-2xl p-8 flex flex-col items-center justify-center gap-3 min-h-[300px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-slate-400 text-sm">Carregando indicadores executivos...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-strong rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-rose-400 min-h-[300px]">
        <AlertTriangle className="w-8 h-8" />
        <p className="text-sm">Erro ao carregar indicadores: {error}</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatNumber = (val: number) => val.toLocaleString('pt-BR');

  const indicators = [
    { label: "Faturamento Hoje", value: formatCurrency(data.faturamento_hoje), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Faturamento Mês", value: formatCurrency(data.faturamento_mes), icon: CalendarDays, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Lucro Líquido", value: formatCurrency(data.lucro_liquido), icon: TrendingUp, color: data.lucro_liquido >= 0 ? "text-emerald-400" : "text-rose-400", bg: data.lucro_liquido >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10" },
    { label: "Margem de Lucro", value: `${data.margem_lucro.toFixed(2)}%`, icon: PieChart, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Ticket Médio", value: formatCurrency(data.ticket_medio), icon: Receipt, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Meta x Realizado", value: `${data.meta_realizado.toFixed(1)}%`, icon: Target, color: data.meta_realizado >= 100 ? "text-emerald-400" : "text-rose-400", bg: data.meta_realizado >= 100 ? "bg-emerald-500/10" : "bg-rose-500/10" },
    { label: "Estoque Atual", value: formatNumber(data.estoque_atual), icon: Package, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Produtos sem Estoque", value: formatNumber(data.produtos_sem_estoque), icon: PackageX, color: "text-rose-400", bg: "bg-rose-500/10" },
    { label: "Próx. ao Vencimento", value: formatNumber(data.produtos_proximo_vencimento), icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Clientes Ativos", value: formatNumber(data.clientes_ativos), icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Result. Campanhas", value: data.campanhas, icon: Megaphone, color: "text-pink-400", bg: "bg-pink-500/10" }
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {indicators.map((c, i) => (
          <div key={i} className="glass-strong rounded-2xl p-4 hover:bg-white/[0.03] transition relative overflow-hidden group flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{c.label}</span>
              <div className={`p-1.5 rounded-lg ${c.bg} group-hover:scale-110 transition-transform`}>
                <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
              </div>
            </div>
            <div className="flex items-end justify-between mt-2">
              <div className="text-xl font-bold font-serif text-slate-100 tabular-nums">
                {c.value}
              </div>
              <button 
                onClick={() => setSelectedMetric(c.label)}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-emerald-300 bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-full"
              >
                Ver mais <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Genérico de Detalhamento */}
      {selectedMetric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button 
              onClick={() => setSelectedMetric(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold font-serif text-slate-100 mb-2">Detalhamento: {selectedMetric}</h3>
            <p className="text-sm text-slate-400 mb-6">
              Esta área exibirá o relatório analítico e as quebras (por loja, produto ou dia) referentes ao indicador de <strong>{selectedMetric}</strong>.
            </p>
            
            <div className="glass-strong rounded-xl p-8 flex flex-col items-center justify-center border border-white/5 border-dashed">
              <PieChart className="w-8 h-8 text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm font-medium">Gráficos detalhados em construção...</p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-strong rounded-2xl p-5 border border-white/5 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h4 className="font-serif font-semibold text-sm text-slate-200">Top 10 Produtos Vendidos no Mês</h4>
          </div>
          {data.top_produtos && data.top_produtos.length > 0 && (
            <div className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20 tabular-nums">
              Total: {formatCurrency(data.top_produtos.reduce((acc: number, p: any) => acc + (Number(p.total) || 0), 0))}
            </div>
          )}
        </div>
        {data.top_produtos && data.top_produtos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {data.top_produtos.map((p: any, i: number) => (
              <div key={i} className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/20 transition-colors">
                <div className="text-[10px] font-bold text-amber-500 mb-1">#{i + 1}</div>
                <div className="text-xs text-slate-300 font-medium mb-2 line-clamp-2" title={p.nome}>{p.nome || "Produto Desconhecido"}</div>
                <div className="text-sm font-bold text-emerald-400 tabular-nums">{formatCurrency(p.total)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500 py-4">Nenhum produto vendido no mês atual.</div>
        )}
      </div>
    </div>
  );
}
