import { useEffect, useState } from "react";
import {
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Package,
  FileWarning,
  Search,
  RefreshCw,
  Trophy,
  Building2,
  Store,
  Tag,
  ShoppingBag,
  DollarSign,
  Calendar,
  Filter,
  ChevronUp,
  ChevronDown,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface GerencialModuleProps {
  selectedStore: string;
  globalStartDate: string;
  globalEndDate: string;
}

interface TopVendido {
  rank: number;
  idProduto: number;
  produto: string;
  marca: string;
  secao: string;
  grupo: string;
  quantidadeVendida: number;
  faturamentoTotal: number;
  numVendas: number;
  numLojas: number;
  precoMedio: number;
}

interface TopPorLoja {
  idEmpresa: number;
  loja: string;
  produtos: TopVendido[];
}

interface NotaSemPreco {
  notaFiscal: string;
  dataEntrada: string;
  loja: string;
  fornecedor: string;
  usuarioEntrada: string;
  produto: string;
  idProduto: number;
  marca: string;
  qtdEntrada: number;
  custoUnitario: number;
  precoVenda: number;
  idEmpresa: number;
}

type SubTab = "top-vendidos" | "top-por-loja" | "sem-preco" | "vendas-hora" | "margem-critica" | "sem-movimento";
type SortField = "rank" | "quantidadeVendida" | "faturamentoTotal" | "precoMedio";
type SortDir = "asc" | "desc";

const fmtCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtNum = (v: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const fmtDate = (d: string) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const fmtTimestamp = (ts: string) => {
  if (!ts) return "—";
  try {
    const parts = ts.split(" ");
    const datePart = parts[0];
    const timePart = parts[1];
    const [y, m, d] = datePart.split("-");
    const cleanTime = timePart ? timePart.substring(0, 5) : "";
    return `${d}/${m}/${y} ${cleanTime}`;
  } catch (e) {
    return ts;
  }
};

export function GerencialModule({ selectedStore, globalStartDate, globalEndDate }: GerencialModuleProps) {
  const [subTab, setSubTab] = useState<SubTab>("top-vendidos");
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingPorLoja, setLoadingPorLoja] = useState(false);
  const [loadingSemPreco, setLoadingSemPreco] = useState(false);
  const [topVendidos, setTopVendidos] = useState<TopVendido[]>([]);
  const [topPorLoja, setTopPorLoja] = useState<TopPorLoja[]>([]);
  const [notasSemPreco, setNotasSemPreco] = useState<NotaSemPreco[]>([]);
  const [vendasHora, setVendasHora] = useState<any[]>([]);
  const [margemCritica, setMargemCritica] = useState<any[]>([]);
  const [semMovimento, setSemMovimento] = useState<any[]>([]);
  const [diasFiltro, setDiasFiltro] = useState<30 | 60 | 90>(30);
  const [agrupamentoHora, setAgrupamentoHora] = useState<"secao" | "loja">("secao");

  const [loadingVendasHora, setLoadingVendasHora] = useState(false);
  const [loadingMargem, setLoadingMargem] = useState(false);
  const [loadingSemMov, setLoadingSemMov] = useState(false);

  const [busca, setBusca] = useState("");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // ─── Carrega Top 50 ──────────────────────────────────────────────────────────
  const fetchTopVendidos = async () => {
    setLoadingTop(true);
    try {
      const params = new URLSearchParams();
      if (selectedStore && selectedStore !== "todas") params.set("idEmpresa", selectedStore);
      if (globalStartDate) params.set("startDate", globalStartDate);
      if (globalEndDate) params.set("endDate", globalEndDate);

      const res = await fetch(`/api/gerencial/top-vendidos?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setTopVendidos(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(`Erro ao carregar top vendidos: ${e.message}`);
      setTopVendidos([]);
    } finally {
      setLoadingTop(false);
    }
  };

  // ─── Carrega Top por Loja ───────────────────────────────────────────────────
  const fetchTopPorLoja = async () => {
    setLoadingPorLoja(true);
    try {
      const params = new URLSearchParams();
      if (globalStartDate) params.set("startDate", globalStartDate);
      if (globalEndDate) params.set("endDate", globalEndDate);

      const res = await fetch(`/api/gerencial/top-vendidos-por-loja?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setTopPorLoja(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(`Erro ao carregar top por loja: ${e.message}`);
      setTopPorLoja([]);
    } finally {
      setLoadingPorLoja(false);
    }
  };

  // ─── Carrega Notas Sem Preço ─────────────────────────────────────────────────
  const fetchNotasSemPreco = async () => {
    setLoadingSemPreco(true);
    try {
      const params = new URLSearchParams();
      if (selectedStore && selectedStore !== "todas") params.set("idEmpresa", selectedStore);
      if (globalStartDate) params.set("startDate", globalStartDate);
      if (globalEndDate) params.set("endDate", globalEndDate);

      const res = await fetch(`/api/gerencial/notas-sem-preco?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setNotasSemPreco(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(`Erro ao carregar notas sem precificação: ${e.message}`);
      setNotasSemPreco([]);
    } finally {
      setLoadingSemPreco(false);
    }
  };

  // ─── Carrega Vendas por Hora ─────────────────────────────────────────────────
  const fetchVendasHora = async () => {
    setLoadingVendasHora(true);
    try {
      const params = new URLSearchParams();
      if (selectedStore && selectedStore !== "todas") params.set("idEmpresa", selectedStore);
      if (globalStartDate) params.set("startDate", globalStartDate);
      if (globalEndDate) params.set("endDate", globalEndDate);

      const res = await fetch(`/api/gerencial/vendas-hora-secao?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setVendasHora(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(`Erro ao carregar vendas por hora: ${e.message}`);
      setVendasHora([]);
    } finally {
      setLoadingVendasHora(false);
    }
  };

  // ─── Carrega Margem Crítica ──────────────────────────────────────────────────
  const fetchMargemCritica = async () => {
    setLoadingMargem(true);
    try {
      const params = new URLSearchParams();
      if (selectedStore && selectedStore !== "todas") params.set("idEmpresa", selectedStore);
      if (globalStartDate) params.set("startDate", globalStartDate);
      if (globalEndDate) params.set("endDate", globalEndDate);

      const res = await fetch(`/api/gerencial/itens-margem-critica?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMargemCritica(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(`Erro ao carregar itens com margem crítica: ${e.message}`);
      setMargemCritica([]);
    } finally {
      setLoadingMargem(false);
    }
  };

  // ─── Carrega Itens sem Movimento ─────────────────────────────────────────────
  const fetchSemMovimento = async () => {
    setLoadingSemMov(true);
    try {
      const params = new URLSearchParams();
      if (selectedStore && selectedStore !== "todas") params.set("idEmpresa", selectedStore);

      const res = await fetch(`/api/gerencial/itens-sem-movimento?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSemMovimento(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(`Erro ao carregar itens sem movimento: ${e.message}`);
      setSemMovimento([]);
    } finally {
      setLoadingSemMov(false);
    }
  };

  useEffect(() => {
    fetchTopVendidos();
    fetchTopPorLoja();
    fetchNotasSemPreco();
    fetchVendasHora();
    fetchMargemCritica();
    fetchSemMovimento();
  }, [selectedStore, globalStartDate, globalEndDate]);

  // ─── Ordenação do Top 50 ──────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const sortedTop = [...topVendidos]
    .filter(item => {
      if (!busca) return true;
      const t = busca.toLowerCase();
      return item.produto.toLowerCase().includes(t)
        || item.marca.toLowerCase().includes(t)
        || item.secao.toLowerCase().includes(t)
        || item.grupo.toLowerCase().includes(t);
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      return (a[sortField] - b[sortField]) * mul;
    });

  const filteredNotas = notasSemPreco.filter(n => {
    if (!busca) return true;
    const t = busca.toLowerCase();
    return n.produto.toLowerCase().includes(t)
      || n.notaFiscal.toLowerCase().includes(t)
      || n.fornecedor.toLowerCase().includes(t)
      || n.loja.toLowerCase().includes(t);
  });

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  const totalQtd = topVendidos.reduce((a, i) => a + i.quantidadeVendida, 0);
  const totalFat = topVendidos.reduce((a, i) => a + i.faturamentoTotal, 0);
  const maxQtd = topVendidos[0]?.quantidadeVendida || 1;
  const notasUnicas = new Set(notasSemPreco.map(n => n.notaFiscal)).size;
  const produtosSemPreco = new Set(notasSemPreco.map(n => n.idProduto)).size;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-25" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-primary" />
      : <ChevronDown className="w-3 h-3 text-primary" />;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto mt-4 px-4 pb-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="glass-strong rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-slate-100">Módulo Gerencial</h2>
            <p className="text-xs text-slate-400 mt-0.5">Análise de desempenho de produtos e controle de precificação</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { 
              fetchTopVendidos(); 
              fetchTopPorLoja(); 
              fetchNotasSemPreco(); 
              fetchVendasHora();
              fetchMargemCritica();
              fetchSemMovimento();
              toast.success("Dados atualizados!"); 
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-semibold transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            {globalStartDate && globalEndDate
              ? `${fmtDate(globalStartDate)} → ${fmtDate(globalEndDate)}`
              : "Últimos 30 dias"}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-strong rounded-2xl p-5 flex flex-col gap-2 hover:border-amber-500/20 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-executive text-slate-400">TOP PRODUTOS</span>
            <Trophy className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold font-serif text-amber-400 tabular-nums">{topVendidos.length}</p>
          <p className="text-[10px] text-slate-500">itens no ranking</p>
        </div>

        <div className="glass-strong rounded-2xl p-5 flex flex-col gap-2 hover:border-emerald-500/20 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-executive text-slate-400">QTD VENDIDA</span>
            <Package className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold font-serif text-emerald-400 tabular-nums">{fmtNum(totalQtd)}</p>
          <p className="text-[10px] text-slate-500">unidades top 50</p>
        </div>

        <div className="glass-strong rounded-2xl p-5 flex flex-col gap-2 hover:border-primary/20 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-executive text-slate-400">FATURAMENTO</span>
            <DollarSign className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-xl font-bold font-serif text-primary tabular-nums">{fmtCurrency(totalFat)}</p>
          <p className="text-[10px] text-slate-500">top 50 produtos</p>
        </div>

        <div className="glass-strong rounded-2xl p-5 flex flex-col gap-2 hover:border-red-500/20 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-executive text-slate-400">SEM PREÇO</span>
            <AlertTriangle className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold font-serif text-red-400 tabular-nums">{produtosSemPreco}</p>
          <p className="text-[10px] text-slate-500">{notasUnicas} notas pendentes</p>
        </div>
      </div>

      {/* ── Sub Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={() => { setSubTab("top-vendidos"); setBusca(""); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            subTab === "top-vendidos"
              ? "bg-primary/15 text-primary border border-primary/30"
              : "text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Top 50 Mais Vendidos
        </button>
        <button
          onClick={() => { setSubTab("top-por-loja"); setBusca(""); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            subTab === "top-por-loja"
              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
              : "text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]"
          }`}
        >
          <Store className="w-4 h-4" />
          Top por Loja
        </button>
        <button
          onClick={() => { setSubTab("sem-preco"); setBusca(""); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            subTab === "sem-preco"
              ? "bg-red-500/15 text-red-400 border border-red-500/30"
              : "text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]"
          }`}
        >
          <FileWarning className="w-4 h-4" />
          Notas sem Precificação
          {notasSemPreco.length > 0 && (
            <span className="ml-1 bg-red-500/20 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {produtosSemPreco}
            </span>
          )}
        </button>
        <button
          onClick={() => { setSubTab("vendas-hora"); setBusca(""); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            subTab === "vendas-hora"
              ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
              : "text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Vendas por Hora
        </button>
        <button
          onClick={() => { setSubTab("margem-critica"); setBusca(""); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            subTab === "margem-critica"
              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
              : "text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Margem Crítica
        </button>
        <button
          onClick={() => { setSubTab("sem-movimento"); setBusca(""); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            subTab === "sem-movimento"
              ? "bg-slate-500/15 text-slate-300 border border-slate-500/30"
              : "text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]"
          }`}
        >
          <Layers className="w-4 h-4" />
          Sem Movimento
        </button>
      </div>

      {/* ── TOP 50 MAIS VENDIDOS ─────────────────────────────────────────── */}
      {subTab === "top-vendidos" && (
        <div className="glass-strong rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Top 50 Itens Mais Vendidos
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Ranking por quantidade vendida no período selecionado</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Filtrar produto, seção, marca..."
                className="pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-primary w-64"
              />
            </div>
          </div>

          {loadingTop && topVendidos.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sortedTop.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
              <Package className="w-12 h-12 text-slate-600" />
              <p className="text-sm">Nenhum produto encontrado no período.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider">
                    <th
                      className="py-3 px-3 text-center cursor-pointer select-none hover:text-primary transition-colors"
                      onClick={() => handleSort("rank")}
                    >
                      <span className="flex items-center justify-center gap-1">#<SortIcon field="rank" /></span>
                    </th>
                    <th className="py-3 px-3 text-left">Produto</th>
                    <th className="py-3 px-3 text-left hidden md:table-cell">Seção / Grupo</th>
                    <th className="py-3 px-3 text-left hidden lg:table-cell">Marca</th>
                    <th
                      className="py-3 px-3 text-right cursor-pointer select-none hover:text-primary transition-colors"
                      onClick={() => handleSort("quantidadeVendida")}
                    >
                      <span className="flex items-center justify-end gap-1">Qtd Vendida<SortIcon field="quantidadeVendida" /></span>
                    </th>
                    <th
                      className="py-3 px-3 text-right cursor-pointer select-none hover:text-primary transition-colors"
                      onClick={() => handleSort("faturamentoTotal")}
                    >
                      <span className="flex items-center justify-end gap-1">Faturamento<SortIcon field="faturamentoTotal" /></span>
                    </th>
                    <th
                      className="py-3 px-3 text-right cursor-pointer select-none hover:text-primary transition-colors hidden sm:table-cell"
                      onClick={() => handleSort("precoMedio")}
                    >
                      <span className="flex items-center justify-end gap-1">Preço Médio<SortIcon field="precoMedio" /></span>
                    </th>
                    <th className="py-3 px-3 text-center hidden md:table-cell">Lojas</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTop.map((item) => {
                    const pct = Math.round((item.quantidadeVendida / maxQtd) * 100);
                    const rankColor =
                      item.rank === 1 ? "text-amber-400" :
                      item.rank === 2 ? "text-slate-300" :
                      item.rank === 3 ? "text-amber-700" :
                      "text-slate-500";
                    const barColor =
                      item.rank <= 3 ? "bg-amber-400/60" :
                      item.rank <= 10 ? "bg-primary/50" :
                      "bg-slate-600/40";

                    return (
                      <tr
                        key={item.idProduto}
                        className={`border-b border-white/5 hover:bg-white/[0.04] transition-colors group ${item.rank <= 3 ? "bg-amber-400/[0.02]" : ""}`}
                      >
                        {/* Rank */}
                        <td className="py-3 px-3 text-center">
                          <span className={`font-bold font-mono text-sm ${rankColor}`}>
                            {item.rank <= 3 ? ["🥇","🥈","🥉"][item.rank - 1] : `#${item.rank}`}
                          </span>
                        </td>

                        {/* Produto */}
                        <td className="py-3 px-3 max-w-[220px]">
                          <div className="font-semibold text-slate-200 truncate">{item.produto || "—"}</div>
                          {/* Mini bar */}
                          <div className="mt-1.5 w-full bg-white/5 rounded-full h-1">
                            <div
                              className={`h-1 rounded-full transition-all ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>

                        {/* Seção / Grupo */}
                        <td className="py-3 px-3 hidden md:table-cell">
                          <div className="flex flex-col gap-0.5">
                            {item.secao && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold w-fit truncate max-w-[120px]">
                                {item.secao}
                              </span>
                            )}
                            {item.grupo && (
                              <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{item.grupo}</span>
                            )}
                          </div>
                        </td>

                        {/* Marca */}
                        <td className="py-3 px-3 hidden lg:table-cell">
                          <span className="text-slate-400 text-[11px] truncate block max-w-[100px]">{item.marca || "—"}</span>
                        </td>

                        {/* Qtd */}
                        <td className="py-3 px-3 text-right">
                          <span className="font-bold text-emerald-400 font-mono tabular-nums">
                            {fmtNum(item.quantidadeVendida)}
                          </span>
                          <div className="text-[10px] text-slate-500">{item.numVendas} vendas</div>
                        </td>

                        {/* Faturamento */}
                        <td className="py-3 px-3 text-right">
                          <span className="font-bold text-primary font-mono tabular-nums text-sm">
                            {fmtCurrency(item.faturamentoTotal)}
                          </span>
                        </td>

                        {/* Preço médio */}
                        <td className="py-3 px-3 text-right hidden sm:table-cell">
                          <span className="text-slate-300 font-mono tabular-nums">
                            {fmtCurrency(item.precoMedio)}
                          </span>
                        </td>

                        {/* Lojas */}
                        <td className="py-3 px-3 text-center hidden md:table-cell">
                          <span className="text-[11px] font-semibold text-slate-300 flex items-center justify-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            {item.numLojas}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TOP POR LOJA ────────────────────────────────────────────────── */}
      {subTab === "top-por-loja" && (
        <div className="flex flex-col gap-5">
          {loadingPorLoja ? (
            <div className="glass-strong rounded-2xl p-6 flex items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : topPorLoja.length === 0 ? (
            <div className="glass-strong rounded-2xl p-6 flex flex-col items-center gap-3 py-16 text-slate-400">
              <Store className="w-12 h-12 text-slate-600" />
              <p className="text-sm">Nenhuma loja com vendas encontrada no período.</p>
            </div>
          ) : (
            topPorLoja.map((loja) => {
              const maxQtdLoja = loja.produtos[0]?.quantidadeVendida || 1;
              return (
                <div key={loja.idEmpresa} className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
                  {/* Header da loja */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Store className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-serif text-base font-bold text-slate-100">{loja.loja}</h3>
                        <p className="text-[10px] text-slate-500">Top 10 mais vendidos nesta filial</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Faturamento Top 10</p>
                        <p className="text-sm font-bold font-mono text-primary tabular-nums">
                          {fmtCurrency(loja.produtos.reduce((a, p) => a + p.faturamentoTotal, 0))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Qtd Vendida</p>
                        <p className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                          {fmtNum(loja.produtos.reduce((a, p) => a + p.quantidadeVendida, 0))}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de produtos */}
                  {loja.produtos.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">Sem vendas no período.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider">
                            <th className="py-2.5 px-3 text-center w-10">#</th>
                            <th className="py-2.5 px-3 text-left">Produto</th>
                            <th className="py-2.5 px-3 text-left hidden md:table-cell">Seção / Grupo</th>
                            <th className="py-2.5 px-3 text-left hidden lg:table-cell">Marca</th>
                            <th className="py-2.5 px-3 text-right">Qtd Vendida</th>
                            <th className="py-2.5 px-3 text-right">Faturamento</th>
                            <th className="py-2.5 px-3 text-right hidden sm:table-cell">Preço Médio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loja.produtos.map((item) => {
                            const pct = Math.round((item.quantidadeVendida / maxQtdLoja) * 100);
                            const rankColor =
                              item.rank === 1 ? "text-amber-400" :
                              item.rank === 2 ? "text-slate-300" :
                              item.rank === 3 ? "text-amber-700" :
                              "text-slate-500";
                            const barColor =
                              item.rank <= 3 ? "bg-blue-400/60" :
                              item.rank <= 5 ? "bg-blue-500/40" :
                              "bg-slate-600/40";

                            return (
                              <tr
                                key={item.idProduto}
                                className={`border-b border-white/5 hover:bg-white/[0.04] transition-colors ${item.rank <= 3 ? "bg-blue-400/[0.02]" : ""}`}
                              >
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`font-bold font-mono text-sm ${rankColor}`}>
                                    {item.rank <= 3 ? ["🥇","🥈","🥉"][item.rank - 1] : `#${item.rank}`}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 max-w-[220px]">
                                  <div className="font-semibold text-slate-200 truncate">{item.produto || "—"}</div>
                                  <div className="mt-1 w-full bg-white/5 rounded-full h-1">
                                    <div
                                      className={`h-1 rounded-full transition-all ${barColor}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 hidden md:table-cell">
                                  <div className="flex flex-col gap-0.5">
                                    {item.secao && (
                                      <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-semibold w-fit truncate max-w-[120px]">
                                        {item.secao}
                                      </span>
                                    )}
                                    {item.grupo && (
                                      <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{item.grupo}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 hidden lg:table-cell">
                                  <span className="text-slate-400 text-[11px] truncate block max-w-[100px]">{item.marca || "—"}</span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span className="font-bold text-emerald-400 font-mono tabular-nums">
                                    {fmtNum(item.quantidadeVendida)}
                                  </span>
                                  <div className="text-[10px] text-slate-500">{item.numVendas} vendas</div>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span className="font-bold text-primary font-mono tabular-nums text-sm">
                                    {fmtCurrency(item.faturamentoTotal)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right hidden sm:table-cell">
                                  <span className="text-slate-300 font-mono tabular-nums">
                                    {fmtCurrency(item.precoMedio)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── NOTAS SEM PRECIFICAÇÃO ──────────────────────────────────────── */}
      {subTab === "sem-preco" && (
        <div className="glass-strong rounded-2xl p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-red-400" />
                Notas de Entrada Sem Precificação
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Produtos recebidos com custo registrado, mas <strong className="text-red-400">sem preço de venda</strong> definido
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                {filteredNotas.length} itens pendentes
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Nota, produto, fornecedor..."
                  className="pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-red-400/60 w-52"
                />
              </div>
            </div>
          </div>

          {/* Alert banner */}
          {notasSemPreco.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300">
                  {produtosSemPreco} produto{produtosSemPreco !== 1 ? "s" : ""} sem preço de venda em {notasUnicas} nota{notasUnicas !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Esses itens foram recebidos mas não possuem preço de venda definido. É necessário precificar para evitar vendas com margem incorreta.
                </p>
              </div>
            </div>
          )}

          {loadingSemPreco ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredNotas.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
              <ShoppingBag className="w-12 h-12 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-400">Nenhuma nota sem precificação encontrada!</p>
              <p className="text-xs text-slate-500">Todos os produtos do período estão precificados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-3 text-left">Nota / Data</th>
                    <th className="py-3 px-3 text-left">Produto</th>
                    <th className="py-3 px-3 text-left hidden md:table-cell">Fornecedor</th>
                    <th className="py-3 px-3 text-left hidden lg:table-cell">Loja</th>
                    <th className="py-3 px-3 text-right">Qtd Entrada</th>
                    <th className="py-3 px-3 text-right">Custo Unit.</th>
                    <th className="py-3 px-3 text-center">Preço Venda</th>
                    <th className="py-3 px-3 text-left hidden xl:table-cell">Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotas.map((nota, i) => (
                    <tr key={`${nota.notaFiscal}-${nota.idProduto}-${i}`} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors">
                      {/* Nota / Data */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-200">#{nota.notaFiscal}</div>
                        <div className="text-[10px] text-slate-500">{fmtDate(nota.dataEntrada)}</div>
                      </td>

                      {/* Produto */}
                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-semibold text-slate-200 truncate">{nota.produto}</div>
                        {nota.marca && (
                          <div className="text-[10px] text-slate-500 truncate">{nota.marca}</div>
                        )}
                      </td>

                      {/* Fornecedor */}
                      <td className="py-3 px-3 hidden md:table-cell max-w-[150px]">
                        <span className="text-slate-300 truncate block">{nota.fornecedor}</span>
                      </td>

                      {/* Loja */}
                      <td className="py-3 px-3 hidden lg:table-cell">
                        <span className="text-slate-300 text-[11px]">{nota.loja}</span>
                      </td>

                      {/* Qtd Entrada */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono font-bold text-slate-200">
                          {nota.qtdEntrada.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Custo Unit. */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono text-amber-400">{fmtCurrency(nota.custoUnitario)}</span>
                      </td>

                      {/* Preço Venda */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          SEM PREÇO
                        </span>
                      </td>

                      {/* Usuário */}
                      <td className="py-3 px-3 hidden xl:table-cell">
                        <span className="text-slate-500 text-[11px]">{nota.usuarioEntrada}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* ── VENDAS POR HORA ────────────────────────────────────────────── */}
      {subTab === "vendas-hora" && (() => {
        const pivotedVendasHora = (() => {
          const hoursMap: Record<string, Record<string, any>> = {};
          for (let h = 0; h < 24; h++) {
            const hourStr = `${h.toString().padStart(2, '0')}:00`;
            hoursMap[hourStr] = { hora: hourStr };
          }

          vendasHora.forEach(row => {
            const hourStr = `${parseInt(row.hora).toString().padStart(2, '0')}:00`;
            const key = agrupamentoHora === "secao" ? row.secao : row.loja;
            const valor = parseFloat(row.totalVendas) || 0;
            if (hoursMap[hourStr]) {
              hoursMap[hourStr][key] = (hoursMap[hourStr][key] || 0) + valor;
            }
          });

          return Object.values(hoursMap).filter((hObj: Record<string, any>) => {
            const keys = Object.keys(hObj).filter(k => k !== 'hora');
            const sum = keys.reduce((acc, k) => acc + hObj[k], 0);
            return sum > 0;
          });
        })();

        const activeKeys = (() => {
          const keysSet = new Set<string>();
          pivotedVendasHora.forEach((hObj: Record<string, any>) => {
            Object.keys(hObj).forEach(k => {
              if (k !== 'hora') keysSet.add(k);
            });
          });
          return Array.from(keysSet);
        })();

        const colors = [
          "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#3b82f6",
          "#ef4444", "#10b981", "#6366f1", "#f43f5e", "#06b6d4"
        ];

        return (
          <div className="glass-strong rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  Vendas por Hora {agrupamentoHora === "secao" ? "(por Seção)" : "(por Filial)"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Distribuição de vendas ao longo do dia comercial</p>
              </div>

              {/* Segmented Control para selecionar agrupamento */}
              <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 shrink-0">
                <button
                  onClick={() => setAgrupamentoHora("secao")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    agrupamentoHora === "secao"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Agrupar por Seção
                </button>
                <button
                  onClick={() => setAgrupamentoHora("loja")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    agrupamentoHora === "loja"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Agrupar por Filial
                </button>
              </div>
            </div>

            {loadingVendasHora ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pivotedVendasHora.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">Sem dados de vendas por hora no período.</div>
            ) : (
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pivotedVendasHora} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hora" stroke="#475569" fontSize={11} tickMargin={10} />
                    <YAxis stroke="#475569" fontSize={11} tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '8px' }}
                      formatter={(val: number) => fmtCurrency(val)}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                    
                    {activeKeys.slice(0, 10).map((keyName, i) => {
                      const color = colors[i % colors.length];
                      return (
                        <Area 
                          key={keyName}
                          type="monotone" 
                          dataKey={keyName} 
                          stackId="1"
                          stroke={color} 
                          fill={i === 0 ? "url(#colorPrimary)" : color} 
                          fillOpacity={0.4}
                        />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── MARGEM CRÍTICA ────────────────────────────────────────────── */}
      {subTab === "margem-critica" && (
        <div className="glass-strong rounded-2xl p-6 flex flex-col gap-5">
          <div className="border-b border-white/10 pb-4">
            <h3 className="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Itens com Margem Crítica (Abaixo de 15%)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Clique em um produto para abrir o fluxo completo no módulo de Rastreamento.</p>
          </div>

          {loadingMargem ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : margemCritica.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">Nenhum produto com margem crítica. Ótimo!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-3 text-left">Produto</th>
                    <th className="py-3 px-3 text-left">Seção</th>
                    <th className="py-3 px-3 text-right">Custo Unitário</th>
                    <th className="py-3 px-3 text-right">Preço Venda</th>
                    <th className="py-3 px-3 text-right">Margem %</th>
                  </tr>
                </thead>
                <tbody>
                  {margemCritica.map((item, i) => {
                    const precoUnit = item.receita / (item.qtd || 1);
                    const custoUnit = item.custo / (item.qtd || 1);
                    return (
                      <tr 
                        key={`${item.idProduto}-${i}`} 
                        className="border-b border-white/5 hover:bg-rose-500/10 cursor-pointer transition-colors"
                        onClick={() => {
                          // Dispara evento para o App.tsx ou Rastreamento
                          window.dispatchEvent(new CustomEvent('openRastreamento', { detail: { idProduto: item.idProduto }}));
                          toast.success(`Redirecionando para rastreamento do produto ${item.idProduto}`);
                        }}
                      >
                        <td className="py-3 px-3 font-semibold text-slate-200">{item.produto}</td>
                        <td className="py-3 px-3 text-slate-400 text-[10px]">{item.secao}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">{fmtCurrency(custoUnit)}</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-400">{fmtCurrency(precoUnit)}</td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${item.margem < 0 ? 'bg-red-500/20 text-red-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {item.margem.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SEM MOVIMENTO ────────────────────────────────────────────── */}
      {subTab === "sem-movimento" && (() => {
        const filteredSemMov = semMovimento.filter(item => item.diasParado >= diasFiltro);
        return (
          <div className="glass-strong rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-slate-300" />
                  Itens Sem Movimento (Estoque Parado)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Produtos com estoque maior que zero, mas sem vendas recentes.</p>
              </div>

              {/* Pills de Filtro por Dias Parados */}
              <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 shrink-0">
                <button
                  onClick={() => setDiasFiltro(30)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    diasFiltro === 30
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  +30 dias
                </button>
                <button
                  onClick={() => setDiasFiltro(60)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    diasFiltro === 60
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  +60 dias
                </button>
                <button
                  onClick={() => setDiasFiltro(90)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    diasFiltro === 90
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  +90 dias
                </button>
              </div>
            </div>

            {loadingSemMov ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredSemMov.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">Estoque saudável! Nenhum item parado detectado para +{diasFiltro} dias.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-3 text-left">Produto</th>
                      <th className="py-3 px-3 text-center">Dias Parado</th>
                      <th className="py-3 px-3 text-center">Última Venda</th>
                      <th className="py-3 px-3 text-left">Última Entrada (Nota/Data/User)</th>
                      <th className="py-3 px-3 text-right">Qtd Estoque</th>
                      <th className="py-3 px-3 text-right">Custo Parado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSemMov.map((item, i) => (
                      <tr 
                        key={`${item.idProduto}-${i}`} 
                        className="border-b border-white/5 hover:bg-white/[0.04] cursor-pointer transition-colors"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('openRastreamento', { detail: { idProduto: item.idProduto }}));
                          toast.success(`Redirecionando para rastreamento do produto ${item.idProduto}`);
                        }}
                      >
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-200">{item.produto}</div>
                          <div className="text-[10px] text-slate-500">{item.secao}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            item.diasParado > 90 ? 'bg-red-500/20 text-red-400' : 
                            item.diasParado > 60 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-300'
                          }`}>
                            {item.diasParado} dias
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400">{fmtDate(item.ultimaVenda)}</td>
                        <td className="py-3 px-3">
                          {item.ultimaNotaNum ? (
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="font-semibold text-slate-200">NF #{item.ultimaNotaNum}</span>
                              <span className="text-[10px] text-slate-400">{fmtTimestamp(item.ultimaNotaData)}</span>
                              <span className="text-[9px] text-slate-500">Por: {item.ultimaNotaUsuario}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[10px]">Sem registros</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-300 font-mono">{item.estoqueTotal.toFixed(0)}</td>
                        <td className="py-3 px-3 text-right font-bold text-rose-400 font-mono">{fmtCurrency(item.custoTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}
