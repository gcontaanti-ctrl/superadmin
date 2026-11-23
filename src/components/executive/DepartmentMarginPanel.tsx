import { useEffect, useState, useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  ComposedChart,
  Bar,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LabelList,
  Cell
} from "recharts";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  Layers,
  Building2,
  Table as TableIcon,
  BarChart3,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Calendar,
  History,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

interface LojaDeptoItem {
  idEmpresa: number;
  nomeLoja: string;
  faturamento: number;
  lucro: number;
  custo: number;
  margemPct: number;
  notas: number;
}

interface DepartamentoData {
  departamento: string;
  faturamento: number;
  lucro: number;
  custo: number;
  margemPct: number;
  notas: number;
  lojas: LojaDeptoItem[];
}

interface ApiResponse {
  summary: {
    totalFaturamento: number;
    totalLucro: number;
    totalNotas: number;
    margemMediaGeral: number;
    totalDepartamentos: number;
    topDepartamento: string;
    maiorMargemDept: string;
  };
  departamentos: DepartamentoData[];
  lojas: { idEmpresa: number; nome: string }[];
  rawData: any[];
}

interface MesInfo {
  ano: number;
  mes: number;
  label: string;
  key: string;
}

interface ComparativoDepto {
  departamento: string;
  totalGeral: number;
  meses: Record<string, { faturamento: number; lucro: number; margemPct: number; notas: number }>;
  variacaoPct: number;
  lojas: {
    idEmpresa: number;
    nomeLoja: string;
    totalGeral: number;
    meses: Record<string, { faturamento: number; lucro: number; margemPct: number; notas: number }>;
  }[];
}

interface ComparativoResponse {
  meses: MesInfo[];
  departamentos: ComparativoDepto[];
  lojas: { idEmpresa: number; nome: string }[];
}

const DEMO_RESPONSE: ApiResponse = {
  summary: {
    totalFaturamento: 0,
    totalLucro: 0,
    totalNotas: 0,
    margemMediaGeral: 0,
    totalDepartamentos: 0,
    topDepartamento: "-",
    maiorMargemDept: "-"
  },
  departamentos: [],
  lojas: [],
  rawData: []
};

export function DepartmentMarginPanel({
  mode,
  selectedStore,
  startDate,
  endDate
}: {
  mode: "demo" | "real";
  selectedStore: string;
  startDate?: string;
  endDate?: string;
}) {
  const { isDark } = useTheme();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [comparativoData, setComparativoData] = useState<ComparativoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState<"chart" | "table" | "comparativo">("chart");
  const [sortBy, setSortBy] = useState<"faturamento" | "margemPct" | "lucro">("faturamento");
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [localStoreFilter, setLocalStoreFilter] = useState<string>("todas");

  const [localStartDate, setLocalStartDate] = useState<string>(startDate || "2026-05-01");
  const [localEndDate, setLocalEndDate] = useState<string>(endDate || "2026-05-31");
  const [selectedPeriodPreset, setSelectedPeriodPreset] = useState<string>("maio-2026");

  // Sincroniza filtro da barra global com o estado local se fornecido
  useEffect(() => {
    if (selectedStore) {
      setLocalStoreFilter(selectedStore);
    }
  }, [selectedStore]);

  useEffect(() => {
    if (startDate) setLocalStartDate(startDate);
    if (endDate) setLocalEndDate(endDate);
  }, [startDate, endDate]);

  const applyPreset = (preset: string) => {
    setSelectedPeriodPreset(preset);
    if (preset === "maio-2026") {
      setLocalStartDate("2026-05-01");
      setLocalEndDate("2026-05-31");
      if (viewType === "comparativo") setViewType("chart");
    } else if (preset === "abril-2026") {
      setLocalStartDate("2026-04-01");
      setLocalEndDate("2026-04-30");
      if (viewType === "comparativo") setViewType("chart");
    } else if (preset === "ultimos-7-dias") {
      setLocalStartDate("2026-05-13");
      setLocalEndDate("2026-05-19");
      if (viewType === "comparativo") setViewType("chart");
    } else if (preset === "ultimos-15-dias") {
      setLocalStartDate("2026-05-05");
      setLocalEndDate("2026-05-19");
      if (viewType === "comparativo") setViewType("chart");
    } else if (preset === "ultimos-3-meses") {
      setViewType("comparativo");
    }
  };

  // Busca dados padrão por período
  useEffect(() => {
    if (mode === "demo") {
      setData(DEMO_RESPONSE);
      return;
    }

    setLoading(true);
    let url = `/api/vendas-margem-departamento?idEmpresa=${localStoreFilter}`;
    if (localStartDate) url += `&startDate=${localStartDate}`;
    if (localEndDate) url += `&endDate=${localEndDate}`;

    fetch(url)
      .then((res) => res.json())
      .then((resp) => {
        if (!resp.error && resp.departamentos) {
          setData(resp);
        } else {
          setData(DEMO_RESPONSE);
        }
      })
      .catch((err) => {
        console.error("Erro ao buscar vendas e margem:", err);
        setData(DEMO_RESPONSE);
      })
      .finally(() => setLoading(false));
  }, [mode, localStoreFilter, localStartDate, localEndDate]);

  // Busca dados de comparativo de 3 meses quando essa aba está ativa
  useEffect(() => {
    if (viewType !== "comparativo") return;

    setLoading(true);
    fetch(`/api/vendas-margem-comparativo-3meses?idEmpresa=${localStoreFilter}`)
      .then((res) => res.json())
      .then((resp) => {
        if (!resp.error && resp.departamentos) {
          setComparativoData(resp);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [viewType, localStoreFilter]);

  const activeData = data || DEMO_RESPONSE;

  // Departamentos ordenados conforme seleção do usuário
  const sortedDepartamentos = useMemo(() => {
    if (!activeData?.departamentos) return [];
    return [...activeData.departamentos].sort((a, b) => {
      if (sortBy === "faturamento") return b.faturamento - a.faturamento;
      if (sortBy === "margemPct") return b.margemPct - a.margemPct;
      if (sortBy === "lucro") return b.lucro - a.lucro;
      return 0;
    });
  }, [activeData, sortBy]);

  // Formatações
  const fmtCurrency = (val: number) =>
    (val || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    });

  const fmtCompactBRL = (val: number) => {
    if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(0)}k`;
    return `R$ ${val}`;
  };

  const getMargemBadgeColor = (pct: number) => {
    if (pct >= 30) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (pct >= 20) return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    if (pct >= 15) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  // Dados formatados para o gráfico de 3 meses
  const comparativoChartData = useMemo(() => {
    if (!comparativoData?.departamentos || !comparativoData?.meses) return [];
    const m = comparativoData.meses;
    return comparativoData.departamentos.slice(0, 8).map((d) => {
      const item: any = { departamento: d.departamento };
      m.forEach((mes) => {
        item[mes.label] = d.meses[mes.key]?.faturamento || 0;
      });
      // Margem média do último mês fechado
      item["margem"] = d.meses[m[m.length - 1]?.key]?.margemPct || 0;
      return item;
    });
  }, [comparativoData]);

  const mesesHeaders = comparativoData?.meses || [];

  return (
    <div
      className={`glass-strong rounded-2xl p-5 md:p-6 flex flex-col relative transition-all duration-300 border border-white/10 shadow-2xl ${
        loading ? "opacity-75" : "opacity-100"
      }`}
    >
      {/* Header Superior com Título e Indicadores Executivos */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Layers className="w-4 h-4" />
            </span>
            <div className="text-[10px] tracking-executive text-primary font-semibold uppercase">
              Desempenho Comercial & Lucratividade
            </div>
          </div>
          <h3 className="font-serif text-2xl mt-1.5 text-white flex flex-wrap items-center gap-2">
            Vendas & Margem por Departamento
            <span className="text-xs font-sans font-normal px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
              {localStoreFilter === "todas" ? "Rede Completa" : `Loja ${localStoreFilter}`}
            </span>
            {viewType === "comparativo" ? (
              <span className="text-xs font-sans font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-emerald-400" />
                Comparativo Trimestral (3 Últimos Meses)
              </span>
            ) : (
              <span className="text-xs font-sans font-normal px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center gap-1.5 font-mono">
                <Calendar className="w-3 h-3 text-cyan-400" />
                {localStartDate.split("-").reverse().join("/")} até {localEndDate.split("-").reverse().join("/")}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cruzamento de faturamento líquido, rentabilidade bruta e margem comercial por loja
          </p>
        </div>

        {/* Mini KPIs Executivos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
          <div className="bg-black/30 border border-white/10 rounded-xl px-3 py-2">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-cyan-400" /> Faturamento Total
            </div>
            <div className="text-sm font-bold font-serif text-cyan-400 tabular-nums">
              {fmtCompactBRL(activeData.summary.totalFaturamento)}
            </div>
          </div>

          <div className="bg-black/30 border border-white/10 rounded-xl px-3 py-2">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" /> Lucro Bruto
            </div>
            <div className="text-sm font-bold font-serif text-emerald-400 tabular-nums">
              {fmtCompactBRL(activeData.summary.totalLucro)}
            </div>
          </div>

          <div className="bg-black/30 border border-white/10 rounded-xl px-3 py-2">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Percent className="w-3 h-3 text-purple-400" /> Margem Média
            </div>
            <div className="text-sm font-bold font-serif text-purple-300 tabular-nums">
              {activeData.summary.margemMediaGeral.toFixed(2)}%
            </div>
          </div>

          <div className="bg-black/30 border border-white/10 rounded-xl px-3 py-2">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Maior Margem
            </div>
            <div
              className="text-xs font-bold text-amber-300 truncate max-w-[130px]"
              title={activeData.summary.maiorMargemDept}
            >
              {activeData.summary.maiorMargemDept}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Controles de Visualização e Ordenação */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        {/* Alternar Gráfico vs Tabela vs Comparativo 3 Meses */}
        <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-0.5 overflow-x-auto">
          <button
            onClick={() => setViewType("chart")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewType === "chart"
                ? "bg-primary text-slate-950 shadow-md font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Gráfico</span>
          </button>
          <button
            onClick={() => setViewType("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewType === "table"
                ? "bg-primary text-slate-950 shadow-md font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tabela Analítica</span>
          </button>
          <button
            onClick={() => setViewType("comparativo")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              viewType === "comparativo"
                ? "bg-emerald-400 text-slate-950 shadow-md font-bold"
                : "text-emerald-400 hover:text-emerald-300"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Comparativo 3 Meses</span>
          </button>
        </div>

        {/* Ordenação */}
        {viewType !== "comparativo" && (
          <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px]">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="faturamento" className="bg-slate-900 text-slate-200">
                Maior Faturamento
              </option>
              <option value="margemPct" className="bg-slate-900 text-slate-200">
                Maior Margem %
              </option>
              <option value="lucro" className="bg-slate-900 text-slate-200">
                Maior Lucro R$
              </option>
            </select>
          </div>
        )}
      </div>

      {/* Conteúdo Principal */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-xs text-slate-400">Processando dados analíticos...</span>
        </div>
      ) : viewType === "comparativo" ? (
        /* ========================================================================= */
        /* VISUALIZAÇÃO DO COMPARATIVO DOS ÚLTIMOS 3 MESES                            */
        /* ========================================================================= */
        <div className="flex flex-col gap-6">
          {/* Gráfico Comparativo dos 3 Meses */}
          <div className="bg-black/25 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-serif font-semibold text-sm text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Evolução de Vendas Trimestral por Departamento
                </h4>
                <p className="text-[11px] text-slate-400">
                  Comparação direta de faturamento nos meses de{" "}
                  {mesesHeaders.map((m) => m.label).join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {mesesHeaders.map((m, idx) => {
                  const colors = ["#38bdf8", "#06b6d4", "#10b981"];
                  return (
                    <div key={m.key} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: colors[idx % colors.length] }}
                      ></span>
                      <span className="text-slate-300 font-semibold">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-64 w-full -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={comparativoChartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                >
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis
                    dataKey="departamento"
                    tick={{ fill: "#94a3b8", fontSize: 9.5 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={45}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={fmtCompactBRL}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: "#10b981", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 45]}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      if (name === "Margem Média") return [`${Number(value).toFixed(1)}%`, name];
                      return [fmtCurrency(Number(value)), name];
                    }}
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.12)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#f8fafc"
                    }}
                  />
                  {mesesHeaders.map((m, idx) => {
                    const colors = ["#38bdf8", "#06b6d4", "#10b981"];
                    return (
                      <Bar
                        key={m.key}
                        yAxisId="left"
                        dataKey={m.label}
                        name={m.label}
                        fill={colors[idx % colors.length]}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                    );
                  })}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="margem"
                    name="Margem Média"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#fbbf24" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela Comparativa de 3 Meses */}
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Departamento</th>
                  {mesesHeaders.map((m) => (
                    <th key={m.key} className="py-2.5 px-3 text-right">
                      {m.label} (Venda / Margem)
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">Total Trimestre</th>
                  <th className="py-2.5 px-3 text-center">Tendência</th>
                  <th className="py-2.5 px-3 text-center">Detalhamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {comparativoData?.departamentos?.map((dept) => {
                  const isExpanded = expandedDept === dept.departamento;
                  const isPositive = dept.variacaoPct >= 0;

                  return (
                    <tr key={dept.departamento} className="contents">
                      <tr
                        onClick={() => setExpandedDept(isExpanded ? null : dept.departamento)}
                        className="hover:bg-white/[0.04] cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-3 font-semibold text-slate-100 flex items-center gap-2">
                          <span className="text-slate-500 group-hover:text-primary transition-colors">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <span className="capitalize text-xs">{dept.departamento.toLowerCase()}</span>
                        </td>

                        {/* Colunas de cada mês */}
                        {mesesHeaders.map((m) => {
                          const mData = dept.meses[m.key] || { faturamento: 0, margemPct: 0 };
                          return (
                            <td key={m.key} className="py-3 px-3 text-right font-mono">
                              <div className="text-slate-200 font-medium">
                                {fmtCurrency(mData.faturamento)}
                              </div>
                              <div className="text-[10px] text-cyan-400">
                                {mData.margemPct ? `${mData.margemPct.toFixed(1)}% margem` : "-"}
                              </div>
                            </td>
                          );
                        })}

                        {/* Total Trimestre */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                          {fmtCurrency(dept.totalGeral)}
                        </td>

                        {/* Tendência / Variação */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                              isPositive
                                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {Math.abs(dept.variacaoPct).toFixed(1)}%
                          </span>
                        </td>

                        {/* Detalhamento de Lojas */}
                        <td className="py-3 px-3 text-center text-slate-400 text-[10px]">
                          {dept.lojas?.length > 0 ? (
                            <span className="text-primary group-hover:underline">
                              {dept.lojas.length} lojas
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Sub-painel expansível com desdobramento das lojas nos 3 meses */}
                      {isExpanded && dept.lojas?.length > 0 && (
                        <tr className="bg-black/40">
                          <td colSpan={mesesHeaders.length + 4} className="p-3 pl-8">
                            <div className="bg-slate-950/80 border border-white/5 rounded-xl p-3 flex flex-col gap-2.5 shadow-inner">
                              <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between border-b border-white/5 pb-2">
                                <span className="flex items-center gap-1.5 text-primary">
                                  <Building2 className="w-3.5 h-3.5" />
                                  Desempenho Trimestral de {dept.departamento} por Filial:
                                </span>
                                <span className="text-slate-500 text-[10px]">
                                  Comparativo mensal de cada loja
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                                {dept.lojas.map((l) => (
                                  <div
                                    key={l.idEmpresa}
                                    className="bg-black/40 border border-white/[0.06] hover:border-primary/30 rounded-xl p-3 flex flex-col gap-2 transition-all"
                                  >
                                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                                      <span className="text-xs font-bold text-slate-200 truncate">
                                        {l.nomeLoja}
                                      </span>
                                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                        Total: {fmtCompactBRL(l.totalGeral)}
                                      </span>
                                    </div>

                                    {/* 3 Meses lado a lado para esta loja */}
                                    <div className="grid grid-cols-3 gap-1.5 text-center pt-1 font-mono">
                                      {mesesHeaders.map((m) => {
                                        const ml = l.meses[m.key] || {
                                          faturamento: 0,
                                          lucro: 0,
                                          margemPct: 0
                                        };
                                        return (
                                          <div
                                            key={m.key}
                                            className="bg-white/[0.02] border border-white/5 rounded-lg p-1.5 flex flex-col"
                                          >
                                            <span className="text-[9px] text-slate-400 uppercase">
                                              {m.label}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-100 mt-0.5">
                                              {fmtCompactBRL(ml.faturamento)}
                                            </span>
                                            <span
                                              className={`text-[9.5px] font-semibold mt-0.5 ${
                                                ml.margemPct >= 20
                                                  ? "text-emerald-400"
                                                  : "text-amber-400"
                                              }`}
                                            >
                                              {ml.margemPct ? `${ml.margemPct.toFixed(1)}%` : "-"}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : sortedDepartamentos.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm italic">
          Nenhum dado encontrado para o período ou filtro selecionado.
        </div>
      ) : viewType === "chart" ? (
        /* ========================================================================= */
        /* VISUALIZAÇÃO GRÁFICA NORMAL                                               */
        /* ========================================================================= */
        <div className="flex flex-col gap-4">
          <div className="w-full overflow-x-auto pb-1">
            <div className="h-80 min-w-[680px] w-full -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={sortedDepartamentos.slice(0, 12)}
                  margin={{ top: 24, right: 20, left: 10, bottom: 28 }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.09)"} vertical={false} />
                  <XAxis
                    dataKey="departamento"
                    tick={{ fill: isDark ? "#cbd5e1" : "#1e293b", fontSize: 10, fontWeight: 600 }}
                    interval={0}
                    angle={-22}
                    textAnchor="end"
                    height={54}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => String(v || "").length > 16 ? String(v).slice(0, 15) + "…" : v}
                  />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={fmtCompactBRL}
                    tick={{ fill: isDark ? "#94a3b8" : "#334155", fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.35)]}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: isDark ? "#34d399" : "#047857", fontSize: 10, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 28]}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      if (name === "Faturamento") return [fmtCurrency(Number(value)), name];
                      if (name === "Margem %") return [`${Number(value).toFixed(2)}%`, name];
                      if (name === "Lucro Bruto") return [fmtCurrency(Number(value)), name];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Departamento: ${label}`}
                    contentStyle={{
                      backgroundColor: "rgba(9, 17, 36, 0.96)",
                      borderColor: "rgba(34, 211, 238, 0.25)",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.6)",
                      fontSize: "12px",
                      color: "#f8fafc"
                    }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="margemPct"
                    name="Margem %"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#10b981", stroke: "#061229", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#6ee7b7" }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="faturamento"
                    name="Faturamento"
                    fill="#06b6d4"
                    radius={[7, 7, 0, 0]}
                    maxBarSize={42}
                  >
                    {sortedDepartamentos.slice(0, 12).map((_, idx) => {
                      const barColors = [
                        "#06b6d4", // Cyan
                        "#3b82f6", // Blue
                        "#8b5cf6", // Violet
                        "#10b981", // Emerald
                        "#f59e0b", // Amber
                        "#ec4899", // Pink
                        "#14b8a6", // Teal
                        "#6366f1", // Indigo
                        "#84cc16", // Lime
                        "#f97316", // Orange
                        "#a855f7", // Purple
                        "#0ea5e9", // Sky
                      ];
                      return (
                        <Cell
                          key={`dept-bar-${idx}`}
                          fill={barColors[idx % barColors.length]}
                          fillOpacity={0.9}
                        />
                      );
                    })}
                    <LabelList
                      dataKey="faturamento"
                      position="top"
                      content={(props: any) => {
                        const { x, y, width, value } = props;
                        if (x == null || y == null || width == null) return null;
                        const label = fmtCompactBRL(Number(value));
                        const cx = x + width / 2;
                        const boxW = Math.max(40, label.length * 6.5 + 8);
                        return (
                          <g>
                            <rect
                              x={cx - boxW / 2}
                              y={y - 20}
                              width={boxW}
                              height={16}
                              rx={4}
                              fill={isDark ? "#061229" : "#e2e8f0"}
                              fillOpacity={0.95}
                            />
                            <text
                              x={cx}
                              y={y - 9}
                              textAnchor="middle"
                              fill={isDark ? "#f1f5f9" : "#0f172a"}
                              fontSize={10}
                              fontWeight={700}
                            >
                              {label}
                            </text>
                          </g>
                        );
                      }}
                    />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Legenda Explicativa do Gráfico */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-cyan-500 inline-block"></span>
                <span>Faturamento (Eixo Esquerdo)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Margem % (Eixo Direito)</span>
              </div>
            </div>
            <span className="text-[11px] text-slate-500 italic">
              * Clique em "Comparativo 3 Meses" para ver a evolução trimestral das lojas
            </span>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VISUALIZAÇÃO EM TABELA ANALÍTICA NORMAL COM EXPANSÃO POR LOJA            */
        /* ========================================================================= */
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Departamento / Seção</th>
                  <th className="py-2.5 px-3 text-right">Faturamento</th>
                  <th className="py-2.5 px-3 text-right">Lucro Bruto (R$)</th>
                  <th className="py-2.5 px-3 text-right">Margem %</th>
                  <th className="py-2.5 px-3 text-right">Cupons / Notas</th>
                  <th className="py-2.5 px-3 text-center">Detalhamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {sortedDepartamentos.map((dept) => {
                  const isExpanded = expandedDept === dept.departamento;
                  return (
                    <tr key={dept.departamento} className="contents">
                      <tr
                        onClick={() => setExpandedDept(isExpanded ? null : dept.departamento)}
                        className="hover:bg-white/[0.04] cursor-pointer transition-colors group"
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-100 flex items-center gap-2">
                          <span className="text-slate-500 group-hover:text-primary transition-colors">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <span className="capitalize text-xs">{dept.departamento.toLowerCase()}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-200">
                          {fmtCurrency(dept.faturamento)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                          {fmtCurrency(dept.lucro)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${getMargemBadgeColor(
                              dept.margemPct
                            )}`}
                          >
                            {dept.margemPct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 font-mono">
                          {dept.notas ? dept.notas.toLocaleString("pt-BR") : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-400 text-[10px]">
                          {dept.lojas?.length > 0 ? (
                            <span className="text-primary group-hover:underline">
                              {dept.lojas.length} lojas
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Sub-tabela com Desdobramento por Loja quando expandido */}
                      {isExpanded && dept.lojas?.length > 0 && (
                        <tr className="bg-black/40">
                          <td colSpan={6} className="p-3 pl-8">
                            <div className="bg-slate-950/70 border border-white/5 rounded-xl p-3 flex flex-col gap-2 shadow-inner">
                              <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between border-b border-white/5 pb-2">
                                <span className="flex items-center gap-1.5 text-primary">
                                  <Building2 className="w-3.5 h-3.5" />
                                  Detalhamento de {dept.departamento} por Loja:
                                </span>
                                <span className="text-slate-500 text-[10px]">
                                  {dept.lojas.length} filiais ativas neste setor
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                                {dept.lojas.map((l) => (
                                  <div
                                    key={l.idEmpresa}
                                    className="bg-black/30 border border-white/[0.04] rounded-lg p-2.5 flex flex-col gap-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-semibold text-slate-200 truncate">
                                        {l.nomeLoja}
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getMargemBadgeColor(
                                          l.margemPct
                                        )}`}
                                      >
                                        {l.margemPct.toFixed(1)}%
                                      </span>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                                      <span>Venda: {fmtCurrency(l.faturamento)}</span>
                                      <span className="text-emerald-400">
                                        Lucro: {fmtCurrency(l.lucro)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
