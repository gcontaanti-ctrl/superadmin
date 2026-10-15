
import { useEffect, useState } from "react";
import { DollarSign, CalendarDays, TrendingUp, PieChart, Receipt, ArrowUpRight } from "lucide-react";

export function KpiCards({ selectedStore, startDate, endDate }: { selectedStore: string, startDate?: string, endDate?: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let url = `/api/dashboard-executivo?idEmpresa=${selectedStore}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    fetch(url)
      .then(res => res.json())
      .then(json => { if (!json.error) setData(json); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedStore, startDate, endDate]);

  const formatCurrency = (val: number) => val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || "R$ 0,00";

  const cards = data ? [
    { label: "Faturamento Ontem", value: formatCurrency(data.faturamento_hoje), icon: DollarSign, desc: "Total em vendas ontem", status: "DB2" },
    { label: "Faturamento Mês", value: formatCurrency(data.faturamento_mes), icon: CalendarDays, desc: "Acumulado do período", status: "DB2" },
    { label: "Lucro Líquido", value: formatCurrency(data.lucro_liquido), icon: TrendingUp, desc: "No período selecionado", status: "DB2" },
    { label: "Margem de Lucro", value: `${(data.margem_lucro || 0).toFixed(2)}%`, icon: PieChart, desc: "Rentabilidade média", status: "DB2" },
    { label: "Ticket Médio", value: formatCurrency(data.ticket_medio), icon: Receipt, desc: "Média por nota fiscal", status: "DB2" }
  ] : [
    { label: "Faturamento Ontem", value: "Carregando...", icon: DollarSign, desc: "Total em vendas ontem", status: "DB2" },
    { label: "Faturamento Mês", value: "Carregando...", icon: CalendarDays, desc: "Acumulado do período", status: "DB2" },
    { label: "Lucro Líquido", value: "Carregando...", icon: TrendingUp, desc: "No período selecionado", status: "DB2" },
    { label: "Margem de Lucro", value: "Carregando...", icon: PieChart, desc: "Rentabilidade média", status: "DB2" },
    { label: "Ticket Médio", value: "Carregando...", icon: Receipt, desc: "Média por nota fiscal", status: "DB2" }
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
      {cards.map((c) => (
        <div key={c.label} className="glass-strong rounded-2xl p-5 hover:bg-white/[0.03] transition relative overflow-hidden group">
          {loading && (
             <div className="absolute top-2 right-2 flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
             </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] tracking-executive text-muted-foreground uppercase font-bold">{c.label}</span>
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
              <ArrowUpRight className="w-2.5 h-2.5" /> {c.status}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-serif text-slate-100 tabular-nums">{c.value}</div>
              <div className="text-[10px] text-slate-400 leading-none mt-1">{c.desc}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

