import { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet, TrendingUp, TrendingDown, DollarSign, Building2,
  Search, Download, AlertTriangle, ChevronRight, Layers, Receipt,
  Filter, RefreshCw, Eye, EyeOff, ArrowUpRight, ArrowDownRight, X
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

interface DreDespesasModuleProps {
  selectedStore: string;
}

type SubTab = "dre" | "comparativo" | "multinivel" | "despesas" | "lancamentos";

export function DreDespesasModule({ selectedStore }: DreDespesasModuleProps) {
  const { isDark } = useTheme();
  const [subTab, setSubTab] = useState<SubTab>("dre");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [mostrarAposImpostos, setMostrarAposImpostos] = useState(false);
  const [incluirTransitorias, setIncluirTransitorias] = useState(false);

  // Filtros de Lançamentos & Despesas
  const [buscaConta, setBuscaConta] = useState("");
  const [grupoFiltro, setGrupoFiltro] = useState("todos");
  const [anoMesFiltro, setAnoMesFiltro] = useState("todos");
  const [contaSelecionada, setContaSelecionada] = useState<string>("");
  const [buscaLancamento, setBuscaLancamento] = useState("");
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [loadingLanc, setLoadingLanc] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, any[]>>({});
  const [loadingAccountKey, setLoadingAccountKey] = useState<string>("");
  const [mesMultinivel, setMesMultinivel] = useState<string>("2026-10");
  const [selectedLanc, setSelectedLanc] = useState<any>(null);
  const [raioX, setRaioX] = useState<any>(null);
  const [loadingRaioX, setLoadingRaioX] = useState(false);

  const openRaioX = async (lanc: any) => {
    setSelectedLanc(lanc);
    setRaioX(null);
    if (!lanc?.idPlanilha) return;
    setLoadingRaioX(true);
    try {
      const res = await fetch(`/api/contabilidade/planilha-detalhe?idPlanilha=${lanc.idPlanilha}&_t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRaioX(json);
    } catch (err) {
      console.error("Erro Raio-X:", err);
      toast.error("Erro ao carregar detalhes profundos da planilha.");
    } finally {
      setLoadingRaioX(false);
    }
  };

  const fmtCurrency = (val: number) => {
    const num = Number(val) || 0;
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const fmtPct = (val: number) => `${(Number(val) || 0).toFixed(1).replace(".", ",")}%`;

  const fetchDre = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const qs = new URLSearchParams({
        idEmpresa: selectedStore || "todas",
        meses: "3",
        _t: String(Date.now())
      });
      const res = await fetch(`/api/contabilidade/dre-comparativo?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString("pt-BR"));
    } catch (err: any) {
      console.error("Erro DRE:", err);
      if (!silent) toast.error("Erro ao carregar DRE e Comparativo de 3 Meses.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchLancamentos = async (overrideConta?: string, silent = false) => {
    if (!silent) setLoadingLanc(true);
    try {
      const cls = overrideConta !== undefined ? overrideConta : contaSelecionada;
      const qs = new URLSearchParams({
        idEmpresa: selectedStore || "todas",
        limit: "800",
        _t: String(Date.now())
      });
      if (anoMesFiltro && anoMesFiltro !== "todos") qs.set("anoMes", anoMesFiltro);
      if (cls) qs.set("classificacao", cls);
      if (grupoFiltro && grupoFiltro !== "todos") qs.set("grupo", grupoFiltro);
      if (buscaLancamento.trim()) qs.set("busca", buscaLancamento.trim());

      const res = await fetch(`/api/contabilidade/despesas-lancamentos?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setLancamentos(json.lista || []);
      setLastUpdated(new Date().toLocaleTimeString("pt-BR"));
    } catch (err) {
      console.error("Erro lançamentos:", err);
      if (!silent) toast.error("Erro ao buscar lançamentos de despesas.");
    } finally {
      if (!silent) setLoadingLanc(false);
    }
  };

  useEffect(() => {
    fetchDre();
  }, [selectedStore]);

  useEffect(() => {
    if (subTab === "lancamentos") {
      fetchLancamentos();
    }
  }, [subTab, selectedStore, anoMesFiltro, grupoFiltro, contaSelecionada]);

  // Atualização automática em tempo real a cada 60 segundos direto do DB2
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchDre(true);
      if (subTab === "lancamentos") {
        fetchLancamentos(undefined, true);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [autoRefresh, subTab, selectedStore, anoMesFiltro, grupoFiltro, contaSelecionada, buscaLancamento]);

  const periodos: any[] = data?.periodos || [];
  const periodosFechados = useMemo(() => periodos.filter(p => !p.isCurrent), [periodos]);
  const drePorPeriodo = data?.drePorPeriodo || {};

  // Alerta de pico em Despesas Financeiras (42105)
  const picoFinanceiro = useMemo(() => {
    const vals = periodosFechados.map(p => ({
      label: p.label,
      val: drePorPeriodo[p.key]?.FINANCEIRAS || 0
    }));
    const maxItem = vals.reduce((acc, cur) => (cur.val > acc.val ? cur : acc), { label: "", val: 0 });
    const minVal = vals.length > 0 ? Math.min(...vals.map(v => v.val)) : 0;
    if (maxItem.val > 150000 && maxItem.val > minVal * 3) {
      return maxItem;
    }
    return null;
  }, [periodosFechados, drePorPeriodo]);

  const contasFiltradas = useMemo(() => {
    const list: any[] = data?.despesasPorConta || [];
    return list.filter(c => {
      if (!incluirTransitorias && c.isTransitoria) return false;
      if (grupoFiltro !== "todos" && c.grpCode !== grupoFiltro) return false;
      if (buscaConta.trim()) {
        const q = buscaConta.toLowerCase();
        return (
          String(c.conta || "").toLowerCase().includes(q) ||
          String(c.classificacao || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, incluirTransitorias, grupoFiltro, buscaConta]);

  const chartData = useMemo(() => {
    return periodos.map(p => {
      const b = drePorPeriodo[p.key] || {};
      return {
        mes: p.label,
        Faturamento: Math.round(b.fatLiquido || 0),
        "Lucro Bruto": Math.round(b.lucroBruto || 0),
        "Desp. Operacionais": Math.round(b.despOperacionais || 0),
        "Desp. Financeiras": Math.round(b.FINANCEIRAS || 0),
        "Res. Operacional": Math.round(b.resultadoOperacional || 0)
      };
    });
  }, [periodos, drePorPeriodo]);

  const openContaLancamentos = (classificacao: string) => {
    setContaSelecionada(classificacao);
    setSubTab("lancamentos");
  };

  const toggleGroup = (grpKey: string) => {
    setExpandedGroups(prev => ({ ...prev, [grpKey]: !prev[grpKey] }));
  };

  const toggleAccountDrill = async (classificacao: string) => {
    const key = `${mesMultinivel}_${classificacao}`;
    if (expandedAccounts[key]) {
      setExpandedAccounts(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    setLoadingAccountKey(key);
    try {
      const qs = new URLSearchParams({
        idEmpresa: selectedStore || "todas",
        classificacao,
        limit: "500",
        _t: String(Date.now())
      });
      if (mesMultinivel !== "todos") qs.set("anoMes", mesMultinivel);
      const res = await fetch(`/api/contabilidade/despesas-lancamentos?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setExpandedAccounts(prev => ({ ...prev, [key]: json.lista || [] }));
    } catch {
      toast.error("Erro ao carregar lançamentos da conta.");
    } finally {
      setLoadingAccountKey("");
    }
  };

  const multinivelGrupos = useMemo(() => {
    const list: any[] = data?.despesasPorConta || [];
    const mesObj = periodos.find(p => p.anoMes === mesMultinivel);
    const map = new Map<string, { grpCode: string; grupo: string; total: number; contas: any[] }>();

    for (const c of list) {
      if (!incluirTransitorias && c.isTransitoria) continue;
      const val = mesObj ? (c.meses?.[mesObj.key] || 0) : (c.totalGeral || 0);
      if (Math.abs(val) < 0.01 && mesObj) continue;

      if (!map.has(c.grpCode)) {
        map.set(c.grpCode, { grpCode: c.grpCode, grupo: c.grupo, total: 0, contas: [] });
      }
      const g = map.get(c.grpCode)!;
      g.total += val;
      g.contas.push({ ...c, valorMes: val });
    }
    return Array.from(map.values())
      .map(g => ({ ...g, contas: g.contas.sort((a, b) => Math.abs(b.valorMes) - Math.abs(a.valorMes)) }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }, [data, periodos, mesMultinivel, incluirTransitorias]);

  const exportLancamentosCsv = () => {
    if (!lancamentos.length) return;
    const header = "DATA_MOV;DATA_LANC;LOJA;CLASSIFICACAO;CONTA;GRUPO;D_C;VALOR;ORIGEM;USUARIO;HISTORICO\n";
    const body = lancamentos.map(l => [
      l.dtMovimento,
      l.dtLancamento,
      `"${l.loja}"`,
      `"${l.classificacao}"`,
      `"${l.conta.replace(/"/g, '""')}"`,
      `"${l.grupo}"`,
      l.nat,
      Number(l.valorLiquido || 0).toFixed(2).replace(".", ","),
      `"${l.origem}"`,
      `"${l.usuario.replace(/"/g, '""')}"`,
      `"${l.historico.replace(/"/g, '""')}"`
    ].join(";")).join("\n");

    const blob = new Blob(["\uFEFF" + header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Despesas_Lancamentos_${selectedStore || "todas"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // KPIs do último mês fechado
  const lastClosed = periodosFechados[periodosFechados.length - 1];
  const prevClosed = periodosFechados[periodosFechados.length - 2];
  const bLast = lastClosed ? (drePorPeriodo[lastClosed.key] || {}) : {};
  const bPrev = prevClosed ? (drePorPeriodo[prevClosed.key] || {}) : {};
  const varFatPct = bPrev.fatLiquido > 0 ? ((bLast.fatLiquido - bPrev.fatLiquido) / bPrev.fatLiquido) * 100 : 0;

  // Linhas da DRE
  const dreLines = [
    { label: "1. Faturamento Bruto de Vendas", get: (b: any) => b.fatBruto || 0, type: "normal" },
    { label: "(-) Descontos Concedidos", get: (b: any) => -(b.descontos || 0), type: "neg" },
    { label: "(=) Faturamento Líquido (Receita Bruta)", get: (b: any) => b.fatLiquido || 0, type: "subtotal" },
    { label: "(-) Custo das Mercadorias Vendidas (CMV)", get: (b: any) => -(b.cmv || 0), type: "neg" },
    { label: "(=) Lucro Bruto (Margem Bruta Gerencial)", get: (b: any) => b.lucroBruto || 0, type: "highlight_green" },
    ...(mostrarAposImpostos ? [
      { label: "(-) Impostos s/ Vendas (ICMS + PIS + COFINS)", get: (b: any) => -(b.impostosVenda || 0), type: "neg" },
      { label: "(=) Margem Líquida após Impostos s/ Venda", get: (b: any) => (b.lucroBruto || 0) - (b.impostosVenda || 0), type: "subtotal" }
    ] : []),
    { label: "(-) Despesas com Pessoal (42103)", get: (b: any) => -(b.PESSOAL || 0), type: "neg", grp: "PESSOAL" },
    { label: "(-) Despesas Gerais e Administrativas (42102)", get: (b: any) => -(b.ADMINISTRATIVAS || 0), type: "neg", grp: "ADMINISTRATIVAS" },
    { label: "(-) Despesas Comerciais e Marketing (42101)", get: (b: any) => -(b.COMERCIAIS_MKT || 0), type: "neg", grp: "COMERCIAIS_MKT" },
    { label: "(-) Impostos e Taxas Operacionais (42104)", get: (b: any) => -(b.TAXAS_IMPOSTOS || 0), type: "neg", grp: "TAXAS_IMPOSTOS" },
    { label: "(-) Perdas e Quebras de Estoque (422)", get: (b: any) => -(b.PERDAS_QUEBRAS || 0), type: "neg", grp: "PERDAS_QUEBRAS" },
    { label: "(=) Total das Despesas Operacionais", get: (b: any) => -(b.despOperacionais || 0), type: "highlight_amber" },
    {
      label: mostrarAposImpostos ? "(=) Resultado Operacional (após Imp. Venda)" : "(=) Resultado Operacional / EBITDA Gerencial",
      get: (b: any) => mostrarAposImpostos ? (b.resultadoOperacionalAposImp || 0) : (b.resultadoOperacional || 0),
      type: "highlight_blue"
    },
    { label: "(-) Despesas Financeiras e Bancárias (42105)", get: (b: any) => -(b.FINANCEIRAS || 0), type: "neg", grp: "FINANCEIRAS" },
    {
      label: "(=) Resultado Líquido Gerencial",
      get: (b: any) => mostrarAposImpostos ? (b.resultadoLiquidoAposImp || 0) : (b.resultadoLiquido || 0),
      type: "total"
    },
    ...(incluirTransitorias ? [
      { label: "[Informativo] Movimentação Numerários (4220115/425)", get: (b: any) => b.TRANSITORIA_NUMERARIO || 0, type: "normal", grp: "TRANSITORIA_NUMERARIO" }
    ] : [])
  ];

  const fatTotal3M = periodosFechados.reduce((s, p) => s + (drePorPeriodo[p.key]?.fatLiquido || 0), 0);

  return (
    <div className="space-y-6 pb-10">
      {/* Cabeçalho + Sub-abas */}
      <div className={cn(
        "rounded-2xl border p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4",
        isDark ? "bg-slate-900/70 border-white/10" : "bg-white border-slate-200 shadow-sm"
      )}>
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 grid place-items-center text-white shadow-lg">
            <FileSpreadsheet className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              DRE Gerencial, Despesas & Comparativo 3 Meses
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                DB2 TEMPO REAL
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Faturamento & CMV reais (`ESTOQUE_ANALITICO`) cruzados com despesas contábeis (`CONTABIL_MOVIMENTO` 42*)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "dre", label: "DRE Gerencial (3M)", icon: FileSpreadsheet },
            { id: "comparativo", label: "Comparativo Lojas", icon: Building2 },
            { id: "multinivel", label: "Multinível por Mês", icon: Layers },
            { id: "despesas", label: "Despesas por Conta", icon: DollarSign },
            { id: "lancamentos", label: "Lançamentos (Auditoria)", icon: Receipt }
          ].map(t => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id as SubTab)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow"
                    : isDark
                      ? "bg-slate-800/70 border-white/10 text-slate-300 hover:bg-slate-800"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                )}
              >
                <Icon className="size-3.5" />
                {t.label}
              </button>
            );
          })}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5",
              autoRefresh
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : isDark ? "border-white/10 bg-slate-800/70 text-muted-foreground" : "border-slate-200 bg-slate-100 text-slate-600"
            )}
            title="Atualiza automaticamente direto do banco DB2 a cada 60 segundos"
          >
            <span className={cn("size-2 rounded-full", autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-slate-500")} />
            {autoRefresh ? `Ao Vivo (60s)${lastUpdated ? ` · ${lastUpdated}` : ""}` : "Ao Vivo Pausado"}
          </button>
          <button
            onClick={() => { fetchDre(); if (subTab === "lancamentos") fetchLancamentos(); }}
            disabled={loading}
            className={cn(
              "p-2 rounded-xl border text-xs flex items-center gap-1",
              isDark ? "border-white/10 bg-slate-800/70 hover:bg-slate-800" : "border-slate-200 bg-slate-100 hover:bg-slate-200"
            )}
            title="Atualizar dados do DB2"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* KPIs do Último Mês Fechado */}
      {lastClosed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className={cn("rounded-2xl border p-4", isDark ? "bg-slate-900/60 border-white/10" : "bg-white border-slate-200")}>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Faturamento ({lastClosed.label})
            </span>
            <div className="text-xl font-bold mt-1">{fmtCurrency(bLast.fatLiquido)}</div>
            <div className={cn("text-xs mt-1 flex items-center gap-1", varFatPct >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {varFatPct >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {varFatPct >= 0 ? "+" : ""}{varFatPct.toFixed(1)}% vs {prevClosed?.label}
            </div>
          </div>

          <div className={cn("rounded-2xl border p-4", isDark ? "bg-slate-900/60 border-white/10" : "bg-white border-slate-200")}>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Lucro Bruto ({lastClosed.label})
            </span>
            <div className="text-xl font-bold text-emerald-400 mt-1">{fmtCurrency(bLast.lucroBruto)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Margem Bruta: <strong className="text-foreground">{fmtPct(bLast.margemBrutaPct)}</strong>
            </div>
          </div>

          <div className={cn("rounded-2xl border p-4", isDark ? "bg-slate-900/60 border-white/10" : "bg-white border-slate-200")}>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Desp. Operacionais ({lastClosed.label})
            </span>
            <div className="text-xl font-bold text-amber-400 mt-1">{fmtCurrency(bLast.despOperacionais)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {bLast.fatLiquido > 0 ? fmtPct((bLast.despOperacionais / bLast.fatLiquido) * 100) : "0,0%"} sobre vendas
            </div>
          </div>

          <div className={cn("rounded-2xl border p-4", isDark ? "bg-slate-900/60 border-white/10" : "bg-white border-slate-200")}>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Resultado Operacional ({lastClosed.label})
            </span>
            <div className={cn("text-xl font-bold mt-1", (bLast.resultadoOperacional || 0) >= 0 ? "text-cyan-400" : "text-rose-400")}>
              {fmtCurrency(bLast.resultadoOperacional)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Antes de Desp. Financeiras</div>
          </div>

          <div className={cn("rounded-2xl border p-4", isDark ? "bg-slate-900/60 border-white/10" : "bg-white border-slate-200")}>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Desp. Financeiras ({lastClosed.label})
            </span>
            <div className="text-xl font-bold text-rose-400 mt-1">{fmtCurrency(bLast.FINANCEIRAS)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              <button
                onClick={() => { setGrupoFiltro("FINANCEIRAS"); setSubTab("lancamentos"); }}
                className="underline hover:text-foreground"
              >
                Ver lançamentos 42105
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerta se houver pico em Despesas Financeiras */}
      {picoFinanceiro && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="text-amber-300">Ponto de atenção em Despesas Financeiras (42105):</strong>{" "}
              Em <strong>{picoFinanceiro.label}</strong> as despesas financeiras somaram{" "}
              <strong>{fmtCurrency(picoFinanceiro.val)}</strong>. Clique para auditar lançamentos de{" "}
              <em>Juros s/ Limite / Cobertura de Saldo</em>.
            </div>
          </div>
          <button
            onClick={() => { setGrupoFiltro("FINANCEIRAS"); setContaSelecionada(""); setSubTab("lancamentos"); }}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold shrink-0 border border-amber-500/30"
          >
            Auditar Lançamentos
          </button>
        </div>
      )}

      {/* ABA 1: DRE GERENCIAL */}
      {subTab === "dre" && (
        <div className={cn("rounded-2xl border overflow-hidden", isDark ? "bg-slate-900/70 border-white/10" : "bg-white border-slate-200 shadow-sm")}>
          <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm">Demonstrativo de Resultado (DRE) — Últimos 3 Meses + Atual</h3>
              <p className="text-xs text-muted-foreground">Clique em qualquer linha de despesa para ver as contas e lançamentos</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setMostrarAposImpostos(!mostrarAposImpostos)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5",
                  mostrarAposImpostos ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "border-white/10 text-muted-foreground"
                )}
              >
                {mostrarAposImpostos ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                Deduzir ICMS/PIS/COFINS
              </button>
              <button
                onClick={() => setIncluirTransitorias(!incluirTransitorias)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5",
                  incluirTransitorias ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "border-white/10 text-muted-foreground"
                )}
              >
                {incluirTransitorias ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                Mostrar Numerários (4220115/425)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={cn("border-b text-left", isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200")}>
                  <th className="py-3 px-4 font-semibold min-w-[260px]">Conta / Estrutura DRE</th>
                  {periodos.map(p => (
                    <th key={p.key} className="py-3 px-3 text-right font-semibold whitespace-nowrap">{p.label}</th>
                  ))}
                  <th className="py-3 px-3 text-right font-semibold whitespace-nowrap">Acumulado 3M</th>
                  <th className="py-3 px-3 text-right font-semibold whitespace-nowrap">AV % (3M)</th>
                </tr>
              </thead>
              <tbody>
                {dreLines.map((line, idx) => {
                  const sum3M = periodosFechados.reduce((s, p) => s + line.get(drePorPeriodo[p.key] || {}), 0);
                  const av = fatTotal3M > 0 ? (sum3M / fatTotal3M) * 100 : 0;

                  const rowClass =
                    line.type === "total"
                      ? (isDark ? "bg-indigo-500/15 font-bold border-t border-indigo-500/30" : "bg-indigo-50 font-bold border-t border-indigo-200")
                      : line.type === "highlight_green"
                      ? (isDark ? "bg-emerald-500/10 font-bold text-emerald-300" : "bg-emerald-50 font-bold text-emerald-800")
                      : line.type === "highlight_amber"
                      ? (isDark ? "bg-amber-500/10 font-bold text-amber-300" : "bg-amber-50 font-bold text-amber-800")
                      : line.type === "highlight_blue"
                      ? (isDark ? "bg-cyan-500/10 font-bold text-cyan-300" : "bg-cyan-50 font-bold text-cyan-800")
                      : line.type === "subtotal"
                      ? (isDark ? "bg-white/5 font-semibold" : "bg-slate-100 font-semibold")
                      : "hover:bg-white/5";

                  return (
                    <tr
                      key={idx}
                      onClick={() => {
                        if (line.grp) {
                          setGrupoFiltro(line.grp);
                          setSubTab("despesas");
                        }
                      }}
                      className={cn("border-b border-white/5 transition-colors", rowClass, line.grp && "cursor-pointer")}
                    >
                      <td className="py-2.5 px-4 flex items-center gap-1.5">
                        <span>{line.label}</span>
                        {line.grp && <ChevronRight className="size-3.5 opacity-50" />}
                      </td>
                      {periodos.map(p => {
                        const v = line.get(drePorPeriodo[p.key] || {});
                        return (
                          <td key={p.key} className={cn("py-2.5 px-3 text-right tabular-nums whitespace-nowrap", v < 0 && "text-rose-400")}>
                            {fmtCurrency(v)}
                          </td>
                        );
                      })}
                      <td className={cn("py-2.5 px-3 text-right tabular-nums font-semibold whitespace-nowrap", sum3M < 0 && "text-rose-400")}>
                        {fmtCurrency(sum3M)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                        {fmtPct(av)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: COMPARATIVO 3 MESES POR LOJA */}
      {subTab === "comparativo" && (
        <div className="space-y-6">
          <div className={cn("rounded-2xl border p-5", isDark ? "bg-slate-900/70 border-white/10" : "bg-white border-slate-200 shadow-sm")}>
            <h3 className="font-bold text-sm mb-4">Evolução Mensal: Faturamento x Lucro Bruto x Despesas Operacionais</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => fmtCurrency(Number(val))} />
                  <Legend />
                  <Bar dataKey="Faturamento" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Lucro Bruto" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Desp. Operacionais" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Desp. Financeiras" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cn("rounded-2xl border overflow-hidden", isDark ? "bg-slate-900/70 border-white/10" : "bg-white border-slate-200 shadow-sm")}>
            <div className="p-4 border-b border-white/10">
              <h3 className="font-bold text-sm">Comparativo Detalhado por Loja (Últimos 3 Meses + Mês Atual)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={cn("border-b text-left", isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200")}>
                    <th className="py-3 px-4 font-semibold">Unidade / Loja</th>
                    <th className="py-3 px-3 font-semibold">Mês</th>
                    <th className="py-3 px-3 text-right font-semibold">Faturamento</th>
                    <th className="py-3 px-3 text-right font-semibold">CMV</th>
                    <th className="py-3 px-3 text-right font-semibold">Lucro Bruto</th>
                    <th className="py-3 px-3 text-right font-semibold">Margem Bruta</th>
                    <th className="py-3 px-3 text-right font-semibold">Desp. Operac.</th>
                    <th className="py-3 px-3 text-right font-semibold">Res. Operac.</th>
                    <th className="py-3 px-3 text-right font-semibold">Desp. Financ.</th>
                    <th className="py-3 px-3 text-right font-semibold">Res. Gerencial</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.comparativoLojas || []).map((loja: any) =>
                    periodos.map((p, pIdx) => {
                      const b = loja.meses?.[p.key] || {};
                      return (
                        <tr
                          key={`${loja.idEmpresa}_${p.key}`}
                          className={cn(
                            "border-b border-white/5",
                            loja.isTotal ? (isDark ? "bg-indigo-500/10 font-bold" : "bg-indigo-50 font-bold") : "hover:bg-white/5",
                            pIdx === periodos.length - 1 && "border-b-2 border-white/15"
                          )}
                        >
                          <td className="py-2 px-4 whitespace-nowrap">{pIdx === 0 ? loja.nome : ""}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">{p.label}</td>
                          <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">{fmtCurrency(b.fatLiquido)}</td>
                          <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">{fmtCurrency(b.cmv)}</td>
                          <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap text-emerald-400">{fmtCurrency(b.lucroBruto)}</td>
                          <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">{fmtPct(b.margemBrutaPct)}</td>
                          <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap text-amber-400">{fmtCurrency(b.despOperacionais)}</td>
                          <td className={cn("py-2 px-3 text-right tabular-nums whitespace-nowrap font-semibold", (b.resultadoOperacional || 0) >= 0 ? "text-cyan-400" : "text-rose-400")}>
                            {fmtCurrency(b.resultadoOperacional)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap text-rose-400">{fmtCurrency(b.FINANCEIRAS)}</td>
                          <td className={cn("py-2 px-3 text-right tabular-nums whitespace-nowrap font-semibold", (b.resultadoLiquido || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                            {fmtCurrency(b.resultadoLiquido)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2.5: RELATÓRIO MULTINÍVEL (MÊS -> GRUPO -> CONTA -> LANÇAMENTOS) */}
      {subTab === "multinivel" && (
        <div className={cn("rounded-2xl border overflow-hidden", isDark ? "bg-slate-900/70 border-white/10" : "bg-white border-slate-200 shadow-sm")}>
          <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm">Relatório Multinível de Despesas (Mês → Grupo → Conta → Lançamentos)</h3>
              <p className="text-xs text-muted-foreground">Selecione o mês e clique nos grupos e contas para abrir os lançamentos individuais que estão dentro</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {periodos.map(p => (
                <button
                  key={p.anoMes}
                  onClick={() => { setMesMultinivel(p.anoMes); setExpandedAccounts({}); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    mesMultinivel === p.anoMes
                      ? "bg-primary text-primary-foreground border-primary"
                      : isDark ? "bg-slate-800/70 border-white/10 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                  )}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => { setMesMultinivel("todos"); setExpandedAccounts({}); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                  mesMultinivel === "todos"
                    ? "bg-primary text-primary-foreground border-primary"
                    : isDark ? "bg-slate-800/70 border-white/10 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                )}
              >
                Todos os Meses
              </button>
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {multinivelGrupos.map(g => {
              const isGrpOpen = expandedGroups[g.grpCode] !== false;
              return (
                <div key={g.grpCode}>
                  <button
                    onClick={() => toggleGroup(g.grpCode)}
                    className={cn(
                      "w-full px-4 py-3 flex items-center justify-between text-left transition-colors",
                      isDark ? "bg-slate-950/60 hover:bg-slate-900" : "bg-slate-100 hover:bg-slate-200/70"
                    )}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <ChevronRight className={cn("size-4 transition-transform", isGrpOpen && "rotate-90")} />
                      <span>{g.grupo}</span>
                      <span className="text-[11px] font-normal text-muted-foreground">({g.contas.length} contas)</span>
                    </div>
                    <span className="font-bold text-sm text-rose-400 tabular-nums">{fmtCurrency(g.total)}</span>
                  </button>

                  {isGrpOpen && (
                    <div className="divide-y divide-white/5">
                      {g.contas.map((c: any) => {
                        const accKey = `${mesMultinivel}_${c.classificacao}`;
                        const lancs = expandedAccounts[accKey];
                        const isAccOpen = !!lancs;
                        const isLoadingAcc = loadingAccountKey === accKey;

                        return (
                          <div key={c.classificacao}>
                            <button
                              onClick={() => toggleAccountDrill(c.classificacao)}
                              className="w-full pl-9 pr-4 py-2.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronRight className={cn("size-3.5 text-cyan-400 transition-transform", isAccOpen && "rotate-90")} />
                                <span className="font-mono text-muted-foreground">{c.classificacao}</span>
                                <span className="font-semibold text-cyan-400">{c.conta}</span>
                                {isLoadingAcc && <RefreshCw className="size-3 animate-spin text-muted-foreground" />}
                              </div>
                              <span className="font-semibold tabular-nums">{fmtCurrency(c.valorMes)}</span>
                            </button>

                            {isAccOpen && (
                              <div className={cn("pl-14 pr-4 pb-3 pt-1 overflow-x-auto", isDark ? "bg-black/25" : "bg-slate-50")}>
                                {lancs.length === 0 ? (
                                  <div className="text-xs text-muted-foreground py-2">Nenhum lançamento individual encontrado neste filtro.</div>
                                ) : (
                                  <table className="w-full text-[11px]">
                                    <thead>
                                      <tr className="border-b border-white/10 text-muted-foreground text-left">
                                        <th className="py-1.5 pr-3">Data</th>
                                        <th className="py-1.5 pr-3">Loja</th>
                                        <th className="py-1.5 pr-3">D/C</th>
                                        <th className="py-1.5 pr-3 text-right">Valor</th>
                                        <th className="py-1.5 pr-3">Usuário</th>
                                        <th className="py-1.5">Histórico / Complemento</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lancs.map((l: any, i: number) => (
                                        <tr
                                          key={i}
                                          onClick={() => openRaioX(l)}
                                          className="border-b border-white/5 hover:bg-cyan-500/10 cursor-pointer transition-colors"
                                          title="Clique para ver partidas D/C, nota fiscal, título e baixas"
                                        >
                                          <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">{l.dtMovimento}</td>
                                          <td className="py-1.5 pr-3 whitespace-nowrap">{l.loja}</td>
                                          <td className="py-1.5 pr-3 font-mono">{l.nat}</td>
                                          <td className="py-1.5 pr-3 text-right tabular-nums font-semibold text-rose-400 whitespace-nowrap">
                                            {fmtCurrency(l.valorLiquido)}
                                          </td>
                                          <td className="py-1.5 pr-3 whitespace-nowrap">{l.usuario}</td>
                                          <td className="py-1.5 text-muted-foreground whitespace-normal break-words">
                                            <span>{l.historico || "-"}</span>
                                            {l.idPlanilha && (
                                              <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-cyan-400 font-semibold">
                                                <Eye className="size-3" /> Raio-X
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA 3: DESPESAS DETALHADAS POR CONTA E LOJA */}
      {subTab === "despesas" && (
        <div className={cn("rounded-2xl border overflow-hidden", isDark ? "bg-slate-900/70 border-white/10" : "bg-white border-slate-200 shadow-sm")}>
          <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={buscaConta}
                  onChange={e => setBuscaConta(e.target.value)}
                  placeholder="Buscar conta ou código (ex: 42105, salario)..."
                  className={cn(
                    "pl-8 pr-3 py-1.5 rounded-lg text-xs border w-64",
                    isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200"
                  )}
                />
              </div>
              <select
                value={grupoFiltro}
                onChange={e => setGrupoFiltro(e.target.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs border",
                  isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200"
                )}
              >
                <option value="todos">Todos os Grupos</option>
                <option value="PESSOAL">Pessoal (42103)</option>
                <option value="ADMINISTRATIVAS">Gerais e Adm (42102)</option>
                <option value="COMERCIAIS_MKT">Comerciais / Mkt (42101)</option>
                <option value="TAXAS_IMPOSTOS">Taxas e Impostos (42104)</option>
                <option value="FINANCEIRAS">Financeiras (42105)</option>
                <option value="PERDAS_QUEBRAS">Perdas e Quebras (422)</option>
              </select>
            </div>
            <button
              onClick={() => setIncluirTransitorias(!incluirTransitorias)}
              className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-muted-foreground hover:text-foreground"
            >
              {incluirTransitorias ? "Ocultar Numerários" : "Incluir Numerários"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={cn("border-b text-left", isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200")}>
                  <th className="py-3 px-3 font-semibold">Código</th>
                  <th className="py-3 px-3 font-semibold">Conta Contábil</th>
                  <th className="py-3 px-3 font-semibold">Grupo</th>
                  {periodos.map(p => (
                    <th key={p.key} className="py-3 px-3 text-right font-semibold whitespace-nowrap">{p.label}</th>
                  ))}
                  {(data?.lojas || []).map((l: any) => (
                    <th key={l.idEmpresa} className="py-3 px-3 text-right font-semibold whitespace-nowrap">
                      L{l.idEmpresa}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right font-semibold whitespace-nowrap">Total Período</th>
                  <th className="py-3 px-3 text-center font-semibold">Lanç.</th>
                </tr>
              </thead>
              <tbody>
                {contasFiltradas.map((c: any) => (
                  <tr
                    key={c.classificacao}
                    onClick={() => openContaLancamentos(c.classificacao)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                    title="Clique para ver os lançamentos desta conta"
                  >
                    <td className="py-2 px-3 font-mono text-muted-foreground">{c.classificacao}</td>
                    <td className="py-2 px-3 font-medium text-cyan-400 hover:underline">{c.conta}</td>
                    <td className="py-2 px-3 text-muted-foreground">{c.grupo}</td>
                    {periodos.map(p => (
                      <td key={p.key} className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                        {fmtCurrency(c.meses?.[p.key] || 0)}
                      </td>
                    ))}
                    {(data?.lojas || []).map((l: any) => (
                      <td key={l.idEmpresa} className="py-2 px-3 text-right tabular-nums whitespace-nowrap text-muted-foreground">
                        {fmtCurrency(c.porLoja?.[l.idEmpresa] || 0)}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right tabular-nums font-bold whitespace-nowrap">{fmtCurrency(c.totalGeral)}</td>
                    <td className="py-2 px-3 text-center tabular-nums">{c.qtdLanc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 4: LANÇAMENTOS INDIVIDUAIS DE DESPESAS */}
      {subTab === "lancamentos" && (
        <div className={cn("rounded-2xl border overflow-hidden", isDark ? "bg-slate-900/70 border-white/10" : "bg-white border-slate-200 shadow-sm")}>
          <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={anoMesFiltro}
                onChange={e => setAnoMesFiltro(e.target.value)}
                className={cn("px-3 py-1.5 rounded-lg text-xs border", isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200")}
              >
                <option value="todos">Todos os Meses (Últimos 4)</option>
                {periodos.map(p => (
                  <option key={p.anoMes} value={p.anoMes}>{p.label}</option>
                ))}
              </select>

              <select
                value={grupoFiltro}
                onChange={e => setGrupoFiltro(e.target.value)}
                className={cn("px-3 py-1.5 rounded-lg text-xs border", isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200")}
              >
                <option value="todos">Todos os Grupos</option>
                <option value="PESSOAL">Pessoal (42103)</option>
                <option value="ADMINISTRATIVAS">Gerais e Adm (42102)</option>
                <option value="COMERCIAIS_MKT">Comerciais / Mkt (42101)</option>
                <option value="TAXAS_IMPOSTOS">Taxas e Impostos (42104)</option>
                <option value="FINANCEIRAS">Financeiras (42105)</option>
                <option value="PERDAS_QUEBRAS">Perdas e Quebras (422)</option>
                <option value="TRANSITORIA_NUMERARIO">Numerários (4220115/425)</option>
              </select>

              {contaSelecionada && (
                <button
                  onClick={() => setContaSelecionada("")}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                >
                  Conta: {contaSelecionada} ×
                </button>
              )}

              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={buscaLancamento}
                  onChange={e => setBuscaLancamento(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchLancamentos()}
                  placeholder="Buscar histórico, usuário ou conta (Enter)..."
                  className={cn("pl-8 pr-3 py-1.5 rounded-lg text-xs border w-64", isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200")}
                />
              </div>

              <button
                onClick={() => fetchLancamentos()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground flex items-center gap-1"
              >
                <Filter className="size-3.5" /> Filtrar
              </button>
            </div>

            <button
              onClick={exportLancamentosCsv}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 flex items-center gap-1.5"
            >
              <Download className="size-3.5" /> Exportar CSV ({lancamentos.length})
            </button>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className={cn("border-b text-left", isDark ? "bg-slate-950 border-white/10" : "bg-slate-100 border-slate-200")}>
                  <th className="py-3 px-3 font-semibold">Data Mov.</th>
                  <th className="py-3 px-3 font-semibold">Loja</th>
                  <th className="py-3 px-3 font-semibold">Conta Contábil</th>
                  <th className="py-3 px-3 font-semibold">D/C</th>
                  <th className="py-3 px-3 text-right font-semibold">Valor (R$)</th>
                  <th className="py-3 px-3 font-semibold">Usuário</th>
                  <th className="py-3 px-3 font-semibold">Histórico / Complemento</th>
                </tr>
              </thead>
              <tbody>
                {loadingLanc ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">Carregando lançamentos no DB2...</td>
                  </tr>
                ) : lancamentos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">Nenhum lançamento encontrado para os filtros selecionados.</td>
                  </tr>
                ) : (
                  lancamentos.map((l, idx) => (
                    <tr
                      key={idx}
                      onClick={() => openRaioX(l)}
                      className="border-b border-white/5 hover:bg-cyan-500/10 cursor-pointer transition-colors"
                      title="Clique para abrir o Raio-X completo (Partidas D/C, Nota, Contas a Pagar e Baixas)"
                    >
                      <td className="py-2 px-3 whitespace-nowrap tabular-nums">
                        <div>{l.dtMovimento}</div>
                        {l.dtHoraAlteracao && (
                          <div className="text-[10px] text-muted-foreground font-mono">{l.dtHoraAlteracao.slice(11, 16)}</div>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">{l.loja}</td>
                      <td className="py-2 px-3">
                        <div className="font-medium">{l.conta}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{l.classificacao} · {l.grupo}</div>
                      </td>
                      <td className="py-2 px-3 font-mono">{l.nat}</td>
                      <td className={cn("py-2 px-3 text-right tabular-nums font-semibold whitespace-nowrap", l.valorLiquido < 0 ? "text-emerald-400" : "text-rose-400")}>
                        {fmtCurrency(l.valorLiquido)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div>{l.usuario}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{l.origem || "-"} {l.idPlanilha ? `· #${l.idPlanilha}` : ""}</div>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground min-w-[280px] whitespace-normal break-words leading-relaxed">
                        <div className="text-foreground/90">{l.historico || "-"}</div>
                        {l.idPlanilha && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 font-semibold mt-0.5">
                            <Eye className="size-3" /> Ver detalhes completos (Partidas / Título / Nota)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Raio-X Profundo da Planilha / Lançamento */}
      {selectedLanc && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedLanc(null)}
        >
          <div
            className={cn(
              "w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-2xl border shadow-2xl p-5 space-y-5",
              isDark ? "bg-slate-950 border-white/15 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono">
                  <span>RAIO-X DO LANÇAMENTO</span>
                  {selectedLanc.idPlanilha && <span>· PLANILHA #{selectedLanc.idPlanilha}</span>}
                  {selectedLanc.origem && <span>· ORIGEM: {selectedLanc.origem}</span>}
                </div>
                <h3 className="text-lg font-bold mt-0.5">
                  {selectedLanc.conta} ({selectedLanc.classificacao})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedLanc.loja} · Mov: {selectedLanc.dtMovimento}
                  {selectedLanc.dtHoraAlteracao ? ` · Alt: ${selectedLanc.dtHoraAlteracao}` : ""} · Usuário: <strong>{selectedLanc.usuario}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedLanc(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className={cn("rounded-xl border p-3.5", isDark ? "bg-slate-900/70 border-white/10" : "bg-slate-50 border-slate-200")}>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Descrição / Motivo Completo Digitado
              </div>
              <div className="text-sm font-medium whitespace-normal break-words">
                {selectedLanc.historico || "Sem descrição/complemento informado."}
              </div>
            </div>

            {loadingRaioX ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Buscando partidas contábeis, títulos, baixas e nota fiscal no DB2...
              </div>
            ) : raioX ? (
              <div className="space-y-5">
                {/* Nível 2: Partidas Contábeis D/C */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-bold text-cyan-400 mb-2">
                    Nível 2 · Partidas Contábeis da Planilha (Débito x Crédito)
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={cn("border-b text-left", isDark ? "bg-slate-900 border-white/10" : "bg-slate-100 border-slate-200")}>
                          <th className="py-2 px-3">D/C</th>
                          <th className="py-2 px-3">Conta Contábil</th>
                          <th className="py-2 px-3 text-right">Valor</th>
                          <th className="py-2 px-3">Usuário / Data Hora</th>
                          <th className="py-2 px-3">Complemento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(raioX.partidas || []).map((p: any, i: number) => (
                          <tr key={i} className="border-b border-white/5">
                            <td className={cn("py-2 px-3 font-mono font-bold", p.nat === "D" ? "text-rose-400" : "text-emerald-400")}>
                              {p.nat === "D" ? "D (Débito)" : "C (Crédito)"}
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-medium">{p.conta}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{p.classificacao}</div>
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums font-semibold">{fmtCurrency(p.valor)}</td>
                            <td className="py-2 px-3 whitespace-nowrap text-[11px]">
                              <div>{p.usuario}</div>
                              <div className="text-muted-foreground font-mono">{p.dtHoraAlteracao || p.dtMovimento}</div>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground whitespace-normal break-words">{p.complemento || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Nível 3: Contas a Pagar / Títulos / Observação */}
                {(raioX.titulos?.length > 0 || raioX.notas?.length > 0) && (
                  <div className="space-y-4">
                    {raioX.titulos?.length > 0 && (
                      <div>
                        <h4 className="text-xs uppercase tracking-wider font-bold text-amber-400 mb-2">
                          Nível 3 · Título no Contas a Pagar & Observações
                        </h4>
                        <div className="space-y-2">
                          {raioX.titulos.map((t: any, i: number) => (
                            <div key={i} className={cn("rounded-xl border p-3 text-xs space-y-1.5", isDark ? "bg-slate-900/50 border-white/10" : "bg-slate-50 border-slate-200")}>
                              <div className="flex flex-wrap justify-between gap-2">
                                <span><strong>Credor / Fornecedor:</strong> {t.idClifor} - {t.credor}</span>
                                <span className={cn("px-2 py-0.5 rounded font-semibold", t.baixada ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>
                                  {t.baixada ? "PAGO / BAIXADO" : "EM ABERTO"}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-4 text-muted-foreground">
                                <span>Título: <strong className="text-foreground">{t.idTitulo}{t.serie ? `/${t.serie}` : ""}</strong></span>
                                <span>Emissão: <strong className="text-foreground">{t.dtEmissao || "-"}</strong></span>
                                <span>Vencimento: <strong className="text-foreground">{t.dtVencimento || "-"}</strong></span>
                                <span>Val. Título: <strong className="text-foreground">{fmtCurrency(t.valTitulo)}</strong></span>
                                <span>Pago: <strong className="text-emerald-400">{fmtCurrency(t.valPago)}</strong></span>
                                {t.dtUltimoPagamento && <span>Dt. Pagto: <strong className="text-foreground">{t.dtUltimoPagamento}</strong></span>}
                              </div>
                              {t.obsTitulo && (
                                <div className="pt-1 border-t border-white/10">
                                  <strong>Observação digitada no Título:</strong> <span className="text-amber-300">{t.obsTitulo}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {raioX.baixas?.length > 0 && (
                      <div>
                        <h4 className="text-xs uppercase tracking-wider font-bold text-emerald-400 mb-2">
                          Nível 3 · Pagamentos / Baixas Realizadas
                        </h4>
                        <div className="overflow-x-auto rounded-xl border border-white/10">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className={cn("border-b text-left", isDark ? "bg-slate-900 border-white/10" : "bg-slate-100 border-slate-200")}>
                                <th className="py-1.5 px-3">Data Pagto</th>
                                <th className="py-1.5 px-3">Título</th>
                                <th className="py-1.5 px-3">Origem</th>
                                <th className="py-1.5 px-3 text-right">Valor Pago</th>
                                <th className="py-1.5 px-3 text-right">Juros</th>
                                <th className="py-1.5 px-3 text-right">Desconto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {raioX.baixas.map((b: any, i: number) => (
                                <tr key={i} className="border-b border-white/5">
                                  <td className="py-1.5 px-3">{b.dtPagamento}</td>
                                  <td className="py-1.5 px-3 font-mono">{b.idTitulo}</td>
                                  <td className="py-1.5 px-3">{b.origem}</td>
                                  <td className="py-1.5 px-3 text-right font-semibold text-emerald-400">{fmtCurrency(b.valPago)}</td>
                                  <td className="py-1.5 px-3 text-right">{fmtCurrency(b.valJuros)}</td>
                                  <td className="py-1.5 px-3 text-right">{fmtCurrency(b.valDesc)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {raioX.notas?.length > 0 && (
                      <div>
                        <h4 className="text-xs uppercase tracking-wider font-bold text-indigo-400 mb-2">
                          Nível 3 · Nota Fiscal Vinculada
                        </h4>
                        <div className="space-y-1.5">
                          {raioX.notas.map((n: any, i: number) => (
                            <div key={i} className={cn("rounded-xl border p-3 text-xs flex flex-wrap gap-4", isDark ? "bg-slate-900/50 border-white/10" : "bg-slate-50 border-slate-200")}>
                              <span>Nota: <strong>{n.numNota}{n.serie ? `/${n.serie}` : ""}</strong></span>
                              <span>Tipo: <strong>{n.tipo}</strong></span>
                              <span>Fornecedor/Cliente: <strong>{n.fornecedor || "-"}</strong></span>
                              <span>Movimento: <strong>{n.dtMovimento}</strong></span>
                              <span>Usuário Nota: <strong>{n.usuario}</strong></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
