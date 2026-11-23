
import { useEffect, useState } from "react";
import { DollarSign, CalendarDays, TrendingUp, PieChart, Receipt, ArrowUpRight } from "lucide-react";

export function KpiCards({ selectedStore, startDate, endDate, datePreset }: { selectedStore: string, startDate?: string, endDate?: string, datePreset?: string }) {
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
  const fmtBrDate = (iso?: string) => {
    if (!iso || iso.length < 10) return "";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  };
  const fmtShortDate = (iso?: string) => {
    if (!iso || iso.length < 10) return "";
    const [, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}`;
  };
  const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const fmtDiaMesExtenso = (iso?: string) => {
    if (!iso || iso.length < 10) return "";
    const [, m, d] = iso.slice(0, 10).split("-");
    const mesNome = MESES_CURTO[Math.max(0, parseInt(m, 10) - 1)] || m;
    return `dia ${d} de ${mesNome}`;
  };
  const periodoDesc = startDate && endDate
    ? (startDate === endDate ? `Dia ${fmtBrDate(startDate)}` : `${fmtDiaMesExtenso(startDate)} até ${fmtDiaMesExtenso(endDate)}`)
    : "Acumulado do período";

  const getPeriodoCardTitle = () => {
    switch (datePreset) {
      case "dia":
        return "Faturamento de Hoje";
      case "ontem":
        return "Faturamento de Ontem";
      case "semana":
        return "Faturamento da Semana";
      case "mes":
        return "Faturamento do Mês";
      case "mes-anterior":
        return "Faturamento Mês Ant.";
      case "30dias":
        return "Faturamento (30 dias)";
      case "personalizado":
        if (startDate && endDate) {
          return startDate === endDate
            ? `Faturamento ${fmtShortDate(startDate)}`
            : `Faturamento ${fmtShortDate(startDate)} a ${fmtShortDate(endDate)}`;
        }
        return "Faturamento Personalizado";
      default:
        return "Faturamento Período";
    }
  };

  const getDiaCardTitle = () => {
    if (datePreset === "dia") return "Faturamento Hoje";
    if (datePreset === "ontem") return "Faturamento Ontem";
    if (datePreset === "mes") return "Faturamento Hoje";
    return "Faturamento do Dia";
  };

  const isMesPadrao = datePreset === "mes";
  const periodoLabel = getPeriodoCardTitle();
  const diaLabel = getDiaCardTitle();

  const cards = data ? [
    {
      label: diaLabel,
      value: formatCurrency(data.faturamento_hoje),
      icon: DollarSign,
      desc: data.data_ref_dia ? `Ref: ${fmtBrDate(data.data_ref_dia)}` : "Último dia com venda",
      subInfo: data.data_ontem ? `Ontem (${fmtShortDate(data.data_ontem)}): ${formatCurrency(data.faturamento_ontem || 0)}` : undefined,
      status: "DB2",
      cardCls: "bg-[#101e36]/90 border-white/10 border-t-2 border-t-blue-400/70",
      iconCls: "bg-blue-500/15 text-blue-300 border border-blue-400/20",
      barCls: "bg-blue-400/80"
    },
    { label: periodoLabel, value: formatCurrency(data.faturamento_mes), icon: CalendarDays, desc: periodoDesc, status: "DB2", cardCls: "bg-[#101e36]/90 border-white/10 border-t-2 border-t-emerald-400/70", iconCls: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20", barCls: "bg-emerald-400/80" },
    { label: isMesPadrao ? "Lucro do Mês" : "Lucro Líquido", value: formatCurrency(data.lucro_liquido), icon: TrendingUp, desc: `Lucro • ${periodoDesc}`, status: "DB2", cardCls: "bg-[#101e36]/90 border-white/10 border-t-2 border-t-violet-400/70", iconCls: "bg-violet-500/15 text-violet-300 border border-violet-400/20", barCls: "bg-violet-400/80" },
    { label: isMesPadrao ? "Margem do Mês" : "Margem de Lucro", value: `${(data.margem_lucro || 0).toFixed(2)}%`, icon: PieChart, desc: isMesPadrao ? "Rentabilidade do mês" : `Margem • ${periodoDesc}`, status: "DB2", cardCls: "bg-[#101e36]/90 border-white/10 border-t-2 border-t-cyan-400/70", iconCls: "bg-cyan-500/15 text-cyan-300 border border-cyan-400/20", barCls: "bg-cyan-400/80" },
    { label: isMesPadrao ? "Ticket do Mês" : "Ticket Médio", value: formatCurrency(data.ticket_medio), icon: Receipt, desc: `${(data.qtd_tickets ?? data.clientes_ativos ?? 0).toLocaleString('pt-BR')} tickets no período`, status: "DB2", cardCls: "bg-[#101e36]/90 border-white/10 border-t-2 border-t-amber-400/70", iconCls: "bg-amber-500/15 text-amber-300 border border-amber-400/20", barCls: "bg-amber-400/80" }
  ] : [
    { label: diaLabel, value: "Carregando...", icon: DollarSign, desc: "Carregando dia...", status: "DB2", cardCls: "bg-[#101e36]/90 border-white/10 border-t-2 border-t-blue-400/70", iconCls: "bg-blue-500/15 text-blue-300 border border-blue-400/20", barCls: "bg-blue-400/80" },
    { label: periodoLabel, value: "Carregando...", icon: CalendarDays, desc: periodoDesc, status: "DB2", cardCls: "bg-[#101e36]/90 border-white/10 border-t-2 border-t-emerald-400/70", iconCls: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20", barCls: "bg-emerald-400/80" },
    { label: isMesPadrao ? "Lucro do Mês" : "Lucro Líquido", value: "Carregando...", icon: TrendingUp, desc: `Lucro • ${periodoDesc}`, status: "DB2", cardCls: "bg-[#101e36]/90 border-white/10 border-t-2 border-t-violet-400/70", iconCls: "bg-violet-500/15 text-violet-300 border border-violet-400/20", barCls: "bg-violet-400/80" },
    { label: isMesPadrao ? "Margem do Mês" : "Margem de Lucro", value: "Carregando...", icon: PieChart, desc: isMesPadrao ? "Rentabilidade do mês" : `Margem • ${periodoDesc}`, status: "DB2", cardCls: "bg-[#101e36]/90 border-white/10 border-t-2 border-t-cyan-400/70", iconCls: "bg-cyan-500/15 text-cyan-300 border border-cyan-400/20", barCls: "bg-cyan-400/80" },
    { label: isMesPadrao ? "Ticket do Mês" : "Ticket Médio", value: "Carregando...", icon: Receipt, desc: "Calculando tickets...", status: "DB2", cardCls: "bg-[#101e36]/90 border-white/10 border-t-2 border-t-amber-400/70", iconCls: "bg-amber-500/15 text-amber-300 border border-amber-400/20", barCls: "bg-amber-400/80" }
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-4 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
      {cards.map((c) => (
        <div key={c.label} className={`rounded-2xl border p-3 md:p-5 transition-all relative overflow-hidden group kpi-metric-card shadow-lg ${c.cardCls}`}>
          {loading && (
             <div className="absolute top-2 right-2 flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
             </div>
          )}
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <span className="text-[9px] md:text-[10px] tracking-executive text-slate-300 uppercase font-bold truncate max-w-[85px] md:max-w-none kpi-label-text">{c.label}</span>
            <span className="text-[8px] md:text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 md:px-2 py-0.5 rounded flex items-center gap-0.5 md:gap-1 shrink-0">
              <ArrowUpRight className="w-2.5 h-2.5" /> {c.status}
            </span>
          </div>
          
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className={`w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 kpi-icon-container ${c.iconCls}`}>
              <c.icon className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm md:text-xl font-bold font-serif text-white tabular-nums truncate kpi-value-text">{c.value}</div>
              <div className="text-[9px] md:text-[10px] text-slate-300/80 leading-none mt-0.5 md:mt-1 truncate">{c.desc}</div>
              {(c as any).subInfo && (
                <div className="text-[9px] md:text-[10px] text-blue-200/85 font-semibold leading-none mt-1 truncate tabular-nums">
                  {(c as any).subInfo}
                </div>
              )}
            </div>
            <div className="hidden sm:flex items-end gap-0.5 h-5 opacity-75 shrink-0" aria-hidden="true">
              <span className={`w-1 h-2 rounded-sm ${c.barCls}`} />
              <span className={`w-1 h-3 rounded-sm ${c.barCls}`} />
              <span className={`w-1 h-4 rounded-sm ${c.barCls}`} />
              <span className={`w-1 h-5 rounded-sm ${c.barCls}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

