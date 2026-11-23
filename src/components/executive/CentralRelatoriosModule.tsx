import { useEffect, useMemo, useState } from "react";
import {
  Printer,
  FileSpreadsheet,
  BarChart3,
  Layers,
  Wallet,
  ShoppingCart,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Building2,
  Filter,
  CheckCircle2,
  Clock
} from "lucide-react";
import { toast } from "sonner";

interface CentralRelatoriosProps {
  selectedStore: string;
  globalStartDate: string;
  globalEndDate: string;
  dbLojas?: any[];
}

type ReportId =
  | "fechamento"
  | "departamentos"
  | "contas-pagar"
  | "compras"
  | "validade";

const fmtMoeda = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDataBr = (iso?: string) => {
  if (!iso || iso.length < 10) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export function CentralRelatoriosModule({
  selectedStore,
  globalStartDate,
  globalEndDate,
  dbLojas = [],
}: CentralRelatoriosProps) {
  const [activeReport, setActiveReport] = useState<ReportId>("fechamento");
  const [storeFilter, setStoreFilter] = useState<string>(selectedStore || "todas");
  const [startDate, setStartDate] = useState<string>(globalStartDate);
  const [endDate, setEndDate] = useState<string>(globalEndDate);
  const [loading, setLoading] = useState(false);

  // Filtros específicos por relatório
  const [incluirModalidades, setIncluirModalidades] = useState(true);
  const [fechamentoForma, setFechamentoForma] = useState<string>("todas");
  const [deptSort, setDeptSort] = useState<"faturamento" | "margemPct" | "lucro">("faturamento");
  const [deptLimit, setDeptLimit] = useState<number>(20);
  const [deptSelecionado, setDeptSelecionado] = useState<string>("todos");
  const [cpStatus, setCpStatus] = useState<"F" | "T" | "todos">("F");
  const [cpCategoria, setCpCategoria] = useState<"TODOS" | "FORNECEDORES" | "OUTROS">("TODOS");
  const [cpBusca, setCpBusca] = useState<string>("");
  const [pedidoStatus, setPedidoStatus] = useState<"todos" | "entregue" | "pendente">("todos");
  const [pedidoComprador, setPedidoComprador] = useState<string>("todos");
  const [pedidoBusca, setPedidoBusca] = useState<string>("");
  const [validadeDias, setValidadeDias] = useState<number>(30);
  const [validadeSecao, setValidadeSecao] = useState<string>("todas");
  const [validadeBusca, setValidadeBusca] = useState<string>("");

  // Dados carregados
  const [fechamentoData, setFechamentoData] = useState<any>(null);
  const [deptData, setDeptData] = useState<any>(null);
  const [cpData, setCpData] = useState<any[]>([]);
  const [comprasData, setComprasData] = useState<{ resumo: any; pedidos: any[] }>({ resumo: null, pedidos: [] });
  const [validadeData, setValidadeData] = useState<any[]>([]);

  useEffect(() => {
    if (selectedStore) setStoreFilter(selectedStore);
  }, [selectedStore]);

  useEffect(() => {
    if (globalStartDate) setStartDate(globalStartDate);
    if (globalEndDate) setEndDate(globalEndDate);
  }, [globalStartDate, globalEndDate]);

  const storeLabel = useMemo(() => {
    if (storeFilter === "todas") return "Todas as Lojas (Rede Completa)";
    const found = dbLojas.find((l: any) => String(l.IDEMPRESA) === String(storeFilter));
    return found ? `Loja ${found.IDEMPRESA} — ${String(found.DESCREMPRESA || "").replace(/Itapu\uFFFD/gi, "Itapuã")}` : `Loja ${storeFilter}`;
  }, [storeFilter, dbLojas]);

  const carregarRelatorio = async () => {
    setLoading(true);
    try {
      if (activeReport === "fechamento") {
        const qs = `idEmpresa=${storeFilter}&startDate=${startDate}&endDate=${endDate}`;
        const [kpiRes, pagRes, rankRes] = await Promise.all([
          fetch(`/api/dashboard-executivo?${qs}`).then((r) => r.json()).catch(() => null),
          fetch(`/api/vendas/formas-pagamento?${qs}`).then((r) => r.json()).catch(() => null),
          fetch(`/api/ranking-lojas?${qs}`).then((r) => r.json()).catch(() => []),
        ]);
        setFechamentoData({
          kpis: kpiRes,
          pagamentos: pagRes,
          ranking: Array.isArray(rankRes) ? rankRes : [],
        });
      } else if (activeReport === "departamentos") {
        const qs = `idEmpresa=${storeFilter}&startDate=${startDate}&endDate=${endDate}`;
        const res = await fetch(`/api/vendas-margem-departamento?${qs}`).then((r) => r.json()).catch(() => null);
        setDeptData(res);
      } else if (activeReport === "contas-pagar") {
        const url = `/api/financeiro/contas-pagar?dataBase=${endDate}&loja=${storeFilter}&status=${cpStatus}`;
        const res = await fetch(url).then((r) => r.json()).catch(() => null);
        const hoje = Array.isArray(res?.diaAtual?.todos) ? res.diaAtual.todos : [];
        const amanha = Array.isArray(res?.proximoDia?.todos) ? res.proximoDia.todos : [];
        setCpData([...hoje, ...amanha]);
      } else if (activeReport === "compras") {
        const qs = `startDate=${startDate}&endDate=${endDate}${storeFilter !== "todas" ? `&idEmpresa=${storeFilter}` : ""}`;
        const [resResumo, resPed] = await Promise.all([
          fetch(`/api/pedidos-compradores/resumo?${qs}`).then((r) => r.json()).catch(() => null),
          fetch(`/api/pedidos-compradores/pedidos?${qs}`).then((r) => r.json()).catch(() => []),
        ]);
        setComprasData({
          resumo: resResumo,
          pedidos: Array.isArray(resPed) ? resPed : Array.isArray(resPed?.pedidos) ? resPed.pedidos : [],
        });
      } else if (activeReport === "validade") {
        const qs = `dias=${validadeDias}${storeFilter !== "todas" ? `&idEmpresa=${storeFilter}` : ""}`;
        const res = await fetch(`/api/validade-critica?${qs}`).then((r) => r.json()).catch(() => []);
        setValidadeData(Array.isArray(res) ? res : Array.isArray(res?.itens) ? res.itens : []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados do relatório.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRelatorio();
  }, [activeReport, storeFilter, startDate, endDate, cpStatus, validadeDias]);

  const deptOptions = useMemo(() => {
    const list = Array.isArray(deptData?.departamentos) ? deptData.departamentos : [];
    return list.map((d: any) => d.departamento).filter(Boolean).sort();
  }, [deptData]);

  const sortedDepts = useMemo(() => {
    let list = Array.isArray(deptData?.departamentos) ? [...deptData.departamentos] : [];
    if (deptSelecionado !== "todos") {
      list = list.filter((d: any) => d.departamento === deptSelecionado);
    }
    list.sort((a, b) => (Number(b[deptSort]) || 0) - (Number(a[deptSort]) || 0));
    return deptLimit > 0 && deptSelecionado === "todos" ? list.slice(0, deptLimit) : list;
  }, [deptData, deptSort, deptLimit, deptSelecionado]);

  const filteredCp = useMemo(() => {
    const q = cpBusca.trim().toLowerCase();
    return cpData.filter((item) => {
      if (cpCategoria === "FORNECEDORES" && !item.IS_FORNECEDOR) return false;
      if (cpCategoria === "OUTROS" && item.IS_FORNECEDOR) return false;
      if (q) {
        const hay = `${item.FORNECEDOR || ""} ${item.NOME || ""} ${item.NUMERO_TITULO || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [cpData, cpCategoria, cpBusca]);

  const compradoresOptions = useMemo(() => {
    const set = new Set<string>();
    (comprasData.pedidos || []).forEach((p: any) => {
      if (p.COMPRADOR) set.add(String(p.COMPRADOR).trim());
    });
    return Array.from(set).sort();
  }, [comprasData.pedidos]);

  const filteredPedidos = useMemo(() => {
    const q = pedidoBusca.trim().toLowerCase();
    return (comprasData.pedidos || []).filter((p: any) => {
      if (pedidoStatus === "entregue" && p.STATUS !== "Entregue") return false;
      if (pedidoStatus === "pendente" && p.STATUS === "Entregue") return false;
      if (pedidoComprador !== "todos" && String(p.COMPRADOR || "").trim() !== pedidoComprador) return false;
      if (q) {
        const hay = `${p.IDPEDIDO || ""} ${p.FORNECEDOR || ""} ${p.COMPRADOR || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [comprasData.pedidos, pedidoStatus, pedidoComprador, pedidoBusca]);

  const validadeSecoesOptions = useMemo(() => {
    const set = new Set<string>();
    (validadeData || []).forEach((v: any) => {
      if (v.DESCRSECAO) set.add(String(v.DESCRSECAO).trim());
    });
    return Array.from(set).sort();
  }, [validadeData]);

  const filteredValidade = useMemo(() => {
    const q = validadeBusca.trim().toLowerCase();
    return (validadeData || []).filter((v: any) => {
      if (validadeSecao !== "todas" && String(v.DESCRSECAO || "").trim() !== validadeSecao) return false;
      if (q) {
        const hay = `${v.DESCRPRODUTO || v.DESCRICAO || ""} ${v.DESCRSECAO || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [validadeData, validadeSecao, validadeBusca]);

  const exportCsv = () => {
    let rows: string[][] = [];
    let filename = `relatorio_${activeReport}_${startDate}_${endDate}.csv`;

    if (activeReport === "fechamento" && fechamentoData) {
      rows = [["Loja", "Notas", "Faturamento (R$)", "Lucro Bruto (R$)", "Margem (%)"]];
      (fechamentoData.ranking || []).forEach((l: any) => {
        rows.push([
          String(l.name || `Loja ${l.idEmpresa}`).replace(/Itapu\uFFFD/gi, "Itapuã"),
          String(l.numNotas || 0),
          String((Number(l.faturamento) || 0).toFixed(2)),
          String((Number(l.margemReais) || 0).toFixed(2)),
          String((Number(l.margemPct) || 0).toFixed(2)),
        ]);
      });
    } else if (activeReport === "departamentos") {
      rows = [["Departamento", "Faturamento (R$)", "Custo (R$)", "Lucro Bruto (R$)", "Margem (%)", "Notas"]];
      sortedDepts.forEach((d: any) => {
        rows.push([
          d.departamento,
          String((Number(d.faturamento) || 0).toFixed(2)),
          String((Number(d.custo) || 0).toFixed(2)),
          String((Number(d.lucro) || 0).toFixed(2)),
          String((Number(d.margemPct) || 0).toFixed(2)),
          String(d.notas || 0),
        ]);
      });
    } else if (activeReport === "contas-pagar") {
      rows = [["Loja", "Vencimento", "Fornecedor / Favorecido", "Título", "Tipo", "Valor (R$)", "Status"]];
      filteredCp.forEach((c: any) => {
        rows.push([
          `Loja ${c.LOJA || ""}`,
          fmtDataBr(c.DTVENCIMENTO || c.DATA_VENCIMENTO),
          String(c.FORNECEDOR || c.NOME || ""),
          String(c.NUMERO_TITULO || ""),
          c.IS_FORNECEDOR ? "Fornecedor" : "Outros",
          String((Number(c.VALOR || c.VALLIQUIDO) || 0).toFixed(2)),
          c.STATUS === "T" ? "Pago" : "A Pagar",
        ]);
      });
    } else if (activeReport === "compras") {
      rows = [["Pedido", "Loja", "Data", "Comprador", "Fornecedor", "Valor Total (R$)", "Status"]];
      filteredPedidos.forEach((p: any) => {
        rows.push([
          String(p.IDPEDIDO || ""),
          `Loja ${p.IDEMPRESA || ""}`,
          fmtDataBr(p.DATA_PEDIDO),
          String(p.COMPRADOR || ""),
          String(p.FORNECEDOR || ""),
          String((Number(p.VALOR_TOTAL) || 0).toFixed(2)),
          String(p.STATUS || ""),
        ]);
      });
    } else if (activeReport === "validade") {
      rows = [["Loja", "Produto", "Seção", "Validade", "Dias Restantes", "Qtd Estoque", "Custo Total (R$)"]];
      filteredValidade.forEach((v: any) => {
        rows.push([
          `Loja ${v.IDEMPRESA || ""}`,
          String(v.DESCRPRODUTO || v.DESCRICAO || ""),
          String(v.DESCRSECAO || ""),
          fmtDataBr(v.DTVALIDADE),
          String(v.DIAS_PARA_VENCER ?? ""),
          String(v.QTDATUALESTOQUE || v.QTD || 0),
          String((Number(v.CUSTO_TOTAL || v.VALCUSTOTOTAL) || 0).toFixed(2)),
        ]);
      });
    }

    if (rows.length <= 1) {
      toast.info("Não há linhas suficientes para exportar.");
      return;
    }

    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado em Excel (CSV)!");
  };

  const reportsList: { id: ReportId; label: string; desc: string; icon: any }[] = [
    { id: "fechamento", label: "Fechamento Executivo", desc: "KPIs, Lojas & Caixa", icon: BarChart3 },
    { id: "departamentos", label: "Departamentos & Margem", desc: "Lucro e Rentabilidade", icon: Layers },
    { id: "contas-pagar", label: "Contas a Pagar", desc: "Boletos e Vencimentos", icon: Wallet },
    { id: "compras", label: "Compras & Orçamento", desc: "Verba e Pedidos NF", icon: ShoppingCart },
    { id: "validade", label: "Validade Crítica", desc: "Risco e Perdas", icon: AlertTriangle },
  ];

  const activeReportMeta = reportsList.find((r) => r.id === activeReport)!;

  return (
    <div className="flex flex-col gap-4 w-full text-slate-100">
      {/* Cabeçalho + Ações de Impressão / Exportação */}
      <div className="glass-strong rounded-2xl p-4 md:p-5 border border-white/10 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 grid place-items-center text-white shadow-lg shrink-0">
            <Printer className="size-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold font-serif text-white">
              Central de Relatórios Executivos
            </h1>
            <p className="text-xs text-slate-400">
              Visualize, filtre e imprima em A4 (PDF) ou exporte para Excel os dados reais do DB2
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={carregarRelatorio}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
          >
            <FileSpreadsheet className="size-3.5" />
            Exportar Excel (CSV)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0088ff] to-[#0055ff] hover:opacity-95 text-white text-xs font-bold transition shadow-md shadow-blue-500/25 cursor-pointer"
          >
            <Printer className="size-3.5" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Seletor de Relatórios (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 print:hidden">
        {reportsList.map((rep) => {
          const active = activeReport === rep.id;
          return (
            <button
              key={rep.id}
              type="button"
              onClick={() => setActiveReport(rep.id)}
              className={`rounded-2xl p-3 border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                active
                  ? "bg-gradient-to-br from-cyan-500/25 to-blue-600/20 border-cyan-400/50 shadow-lg"
                  : "glass-strong border-white/10 hover:bg-white/5"
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${active ? "bg-cyan-500 text-slate-950" : "bg-white/5 text-cyan-400"}`}>
                <rep.icon className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{rep.label}</div>
                <div className="text-[10px] text-slate-400 truncate">{rep.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Barra de Filtros do Relatório */}
      <div className="glass-strong rounded-2xl p-3.5 border border-white/10 flex flex-wrap items-center gap-3 text-xs print:hidden">
        <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
          <Filter className="size-3.5" />
          Filtros:
        </div>

        <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5">
          <Building2 className="size-3.5 text-slate-400" />
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="bg-transparent text-slate-200 focus:outline-none text-xs"
          >
            <option value="todas" className="bg-slate-900">Todas as Lojas</option>
            {dbLojas.map((l: any) => (
              <option key={l.IDEMPRESA} value={String(l.IDEMPRESA)} className="bg-slate-900">
                Loja {l.IDEMPRESA} - {String(l.DESCREMPRESA || "").replace(/Itapu\uFFFD/gi, "Itapuã")}
              </option>
            ))}
          </select>
        </div>

        {activeReport !== "validade" && (
          <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5">
            <Calendar className="size-3.5 text-cyan-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none text-xs [color-scheme:dark]"
            />
            <span className="text-slate-500">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none text-xs [color-scheme:dark]"
            />
          </div>
        )}

        {activeReport === "fechamento" && (
          <>
            <label className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={incluirModalidades}
                onChange={(e) => setIncluirModalidades(e.target.checked)}
                className="accent-cyan-400"
              />
              <span>Incluir finalizadoras por loja</span>
            </label>
            {incluirModalidades && (
              <select
                value={fechamentoForma}
                onChange={(e) => setFechamentoForma(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
              >
                <option value="todas" className="bg-slate-900">Todas as Finalizadoras</option>
                <option value="DINHEIRO" className="bg-slate-900">Somente Dinheiro</option>
                <option value="PIX" className="bg-slate-900">Somente PIX</option>
                <option value="DEBITO" className="bg-slate-900">Somente Débito</option>
                <option value="CREDITO" className="bg-slate-900">Somente Crédito</option>
                <option value="CONVENIO" className="bg-slate-900">Somente Convênio</option>
              </select>
            )}
          </>
        )}

        {activeReport === "departamentos" && (
          <>
            <select
              value={deptSelecionado}
              onChange={(e) => setDeptSelecionado(e.target.value)}
              className="bg-black/30 border border-cyan-500/30 rounded-xl px-3 py-1.5 text-cyan-200 font-semibold focus:outline-none"
            >
              <option value="todos" className="bg-slate-900">Todos os Departamentos</option>
              {deptOptions.map((dep: string) => (
                <option key={dep} value={dep} className="bg-slate-900">{dep}</option>
              ))}
            </select>
            <select
              value={deptSort}
              onChange={(e: any) => setDeptSort(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="faturamento" className="bg-slate-900">Ordenar: Maior Faturamento</option>
              <option value="margemPct" className="bg-slate-900">Ordenar: Maior Margem %</option>
              <option value="lucro" className="bg-slate-900">Ordenar: Maior Lucro R$</option>
            </select>
            {deptSelecionado === "todos" && (
              <select
                value={deptLimit}
                onChange={(e) => setDeptLimit(Number(e.target.value))}
                className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
              >
                <option value={10} className="bg-slate-900">Top 10</option>
                <option value={20} className="bg-slate-900">Top 20</option>
                <option value={0} className="bg-slate-900">Todos</option>
              </select>
            )}
          </>
        )}

        {activeReport === "contas-pagar" && (
          <>
            <select
              value={cpStatus}
              onChange={(e: any) => setCpStatus(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="F" className="bg-slate-900">A Pagar</option>
              <option value="T" className="bg-slate-900">Pagos</option>
              <option value="todos" className="bg-slate-900">Todos</option>
            </select>
            <select
              value={cpCategoria}
              onChange={(e: any) => setCpCategoria(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="TODOS" className="bg-slate-900">Todas Categorias</option>
              <option value="FORNECEDORES" className="bg-slate-900">Somente Fornecedores</option>
              <option value="OUTROS" className="bg-slate-900">Outras Despesas</option>
            </select>
            <input
              type="text"
              value={cpBusca}
              onChange={(e) => setCpBusca(e.target.value)}
              placeholder="Filtrar fornecedor ou título..."
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none w-48"
            />
          </>
        )}

        {activeReport === "compras" && (
          <>
            <select
              value={pedidoComprador}
              onChange={(e) => setPedidoComprador(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="todos" className="bg-slate-900">Todos os Compradores</option>
              {compradoresOptions.map((c) => (
                <option key={c} value={c} className="bg-slate-900">{c}</option>
              ))}
            </select>
            <select
              value={pedidoStatus}
              onChange={(e: any) => setPedidoStatus(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="todos" className="bg-slate-900">Todos os Pedidos</option>
              <option value="entregue" className="bg-slate-900">Entregues (com NF)</option>
              <option value="pendente" className="bg-slate-900">Pendentes</option>
            </select>
            <input
              type="text"
              value={pedidoBusca}
              onChange={(e) => setPedidoBusca(e.target.value)}
              placeholder="Filtrar fornecedor ou nº..."
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none w-44"
            />
          </>
        )}

        {activeReport === "validade" && (
          <>
            <select
              value={validadeDias}
              onChange={(e) => setValidadeDias(Number(e.target.value))}
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value={7} className="bg-slate-900">Vencendo em até 7 dias</option>
              <option value={15} className="bg-slate-900">Vencendo em até 15 dias</option>
              <option value={30} className="bg-slate-900">Vencendo em até 30 dias</option>
              <option value={60} className="bg-slate-900">Vencendo em até 60 dias</option>
            </select>
            <select
              value={validadeSecao}
              onChange={(e) => setValidadeSecao(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="todas" className="bg-slate-900">Todas as Seções</option>
              {validadeSecoesOptions.map((sec) => (
                <option key={sec} value={sec} className="bg-slate-900">{sec}</option>
              ))}
            </select>
            <input
              type="text"
              value={validadeBusca}
              onChange={(e) => setValidadeBusca(e.target.value)}
              placeholder="Filtrar produto..."
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none w-44"
            />
          </>
        )}
      </div>

      {/* Área Imprimível (Folha do Relatório) */}
      <div className="glass-strong rounded-2xl p-5 md:p-6 border border-white/10 flex flex-col gap-5 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0">
        {/* Cabeçalho Oficial do Relatório */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 print:border-slate-300 pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 print:text-slate-600">
              HORUS ANALYTICS • SUPERMERCADOS ALBUQUERQUE
            </div>
            <h2 className="text-xl font-bold font-serif text-white print:text-black mt-0.5">
              Relatório: {activeReportMeta.label}
            </h2>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
              <strong>Filial:</strong> {storeLabel} &nbsp;|&nbsp;{" "}
              <strong>Período:</strong>{" "}
              {activeReport === "validade"
                ? `Próximos ${validadeDias} dias`
                : `${fmtDataBr(startDate)} até ${fmtDataBr(endDate)}`}
              {activeReport === "departamentos" && deptSelecionado !== "todos" && (
                <> &nbsp;|&nbsp; <strong>Departamento:</strong> {deptSelecionado}</>
              )}
              {activeReport === "compras" && pedidoComprador !== "todos" && (
                <> &nbsp;|&nbsp; <strong>Comprador:</strong> {pedidoComprador}</>
              )}
              {activeReport === "validade" && validadeSecao !== "todas" && (
                <> &nbsp;|&nbsp; <strong>Seção:</strong> {validadeSecao}</>
              )}
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-400 print:text-slate-600">
            <div>Emitido em: {new Date().toLocaleString("pt-BR")}</div>
            <div>Fonte: DB2 CISS ERP (Tempo Real)</div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
            <RefreshCw className="size-6 animate-spin text-cyan-400" />
            Gerando relatório com dados reais do DB2...
          </div>
        ) : activeReport === "fechamento" && fechamentoData ? (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Faturamento Dia", val: fmtMoeda(fechamentoData.kpis?.faturamento_hoje) },
                { label: "Faturamento Período", val: fmtMoeda(fechamentoData.kpis?.faturamento_mes) },
                { label: "Lucro Líquido", val: fmtMoeda(fechamentoData.kpis?.lucro_liquido) },
                { label: "Margem Real", val: `${(Number(fechamentoData.kpis?.margem_lucro) || 0).toFixed(2)}%` },
                { label: "Ticket Médio", val: `${fmtMoeda(fechamentoData.kpis?.ticket_medio)} (${(fechamentoData.kpis?.qtd_tickets ?? fechamentoData.kpis?.clientes_ativos ?? 0).toLocaleString("pt-BR")} tk)` },
              ].map((k) => (
                <div key={k.label} className="bg-black/30 print:bg-slate-100 border border-white/10 print:border-slate-300 rounded-xl p-3">
                  <div className="text-[10px] uppercase text-slate-400 print:text-slate-600 font-bold">{k.label}</div>
                  <div className="text-sm font-bold text-white print:text-black mt-1 tabular-nums">{k.val}</div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 print:text-black mb-2">
                Desempenho por Filial
              </h3>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 print:border-slate-300 text-slate-400 print:text-slate-700">
                    <th className="py-2 px-3">Filial</th>
                    <th className="py-2 px-3 text-right">Notas</th>
                    <th className="py-2 px-3 text-right">Faturamento</th>
                    <th className="py-2 px-3 text-right">Lucro Bruto</th>
                    <th className="py-2 px-3 text-right">Margem %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-slate-200">
                  {(fechamentoData.ranking || []).map((l: any) => (
                    <tr key={l.idEmpresa}>
                      <td className="py-2 px-3 font-semibold">{String(l.name || `Loja ${l.idEmpresa}`).replace(/Itapu\uFFFD/gi, "Itapuã")}</td>
                      <td className="py-2 px-3 text-right font-mono">{(l.numNotas || 0).toLocaleString("pt-BR")}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{fmtMoeda(l.faturamento)}</td>
                      <td className="py-2 px-3 text-right font-mono">{fmtMoeda(l.margemReais)}</td>
                      <td className="py-2 px-3 text-right font-mono">{(Number(l.margemPct) || 0).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 print:text-black mb-2">
                Recebimentos por Forma de Pagamento (Total: {fmtMoeda(fechamentoData.pagamentos?.totalGeral)})
              </h3>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 print:border-slate-300 text-slate-400 print:text-slate-700">
                    <th className="py-2 px-3">Modalidade</th>
                    <th className="py-2 px-3 text-right">Transações</th>
                    <th className="py-2 px-3 text-right">Valor</th>
                    <th className="py-2 px-3 text-right">Part. %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-slate-200">
                  {(fechamentoData.pagamentos?.resumo || []).map((p: any) => (
                    <tr key={p.id}>
                      <td className="py-2 px-3 font-semibold">{p.nome}</td>
                      <td className="py-2 px-3 text-right font-mono">{(p.qtd || 0).toLocaleString("pt-BR")}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{fmtMoeda(p.valor)}</td>
                      <td className="py-2 px-3 text-right font-mono">{p.percentual}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {incluirModalidades && (fechamentoData.pagamentos?.detalhes || []).length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 print:text-black mb-2">
                  Detalhamento de Finalizadoras por Filial
                </h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 print:border-slate-300 text-slate-400 print:text-slate-700">
                      <th className="py-2 px-3">Loja</th>
                      <th className="py-2 px-3">Finalizadora</th>
                      <th className="py-2 px-3 text-right">Transações</th>
                      <th className="py-2 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-slate-200">
                    {(fechamentoData.pagamentos?.detalhes || [])
                      .filter((d: any) => fechamentoForma === "todas" || String(d.forma || "").toUpperCase().includes(fechamentoForma))
                      .map((d: any, i: number) => (
                      <tr key={i}>
                        <td className="py-1.5 px-3">Loja {d.idLoja}</td>
                        <td className="py-1.5 px-3 font-medium">{d.forma}</td>
                        <td className="py-1.5 px-3 text-right font-mono">{(d.qtd || 0).toLocaleString("pt-BR")}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold">{fmtMoeda(d.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeReport === "departamentos" ? (
          <div className="flex flex-col gap-5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 print:border-slate-300 text-slate-400 print:text-slate-700">
                  <th className="py-2 px-3">Departamento</th>
                  <th className="py-2 px-3 text-right">Notas</th>
                  <th className="py-2 px-3 text-right">Faturamento</th>
                  <th className="py-2 px-3 text-right">Custo</th>
                  <th className="py-2 px-3 text-right">Lucro Bruto</th>
                  <th className="py-2 px-3 text-right">Margem %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-slate-200">
                {sortedDepts.map((d: any) => (
                  <tr key={d.departamento}>
                    <td className="py-2 px-3 font-semibold">{d.departamento}</td>
                    <td className="py-2 px-3 text-right font-mono">{(d.notas || 0).toLocaleString("pt-BR")}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{fmtMoeda(d.faturamento)}</td>
                    <td className="py-2 px-3 text-right font-mono">{fmtMoeda(d.custo)}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-400 print:text-black">{fmtMoeda(d.lucro)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{(Number(d.margemPct) || 0).toFixed(2)}%</td>
                  </tr>
                ))}
                {sortedDepts.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500">Nenhum departamento encontrado para este período.</td></tr>
                )}
              </tbody>
            </table>

            {deptSelecionado !== "todos" && sortedDepts[0]?.lojas?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 print:text-black mb-2">
                  Detalhamento por Filial — {deptSelecionado}
                </h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 print:border-slate-300 text-slate-400 print:text-slate-700">
                      <th className="py-2 px-3">Filial</th>
                      <th className="py-2 px-3 text-right">Notas</th>
                      <th className="py-2 px-3 text-right">Faturamento</th>
                      <th className="py-2 px-3 text-right">Custo</th>
                      <th className="py-2 px-3 text-right">Lucro Bruto</th>
                      <th className="py-2 px-3 text-right">Margem %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-slate-200">
                    {sortedDepts[0].lojas.map((l: any) => (
                      <tr key={l.idEmpresa}>
                        <td className="py-2 px-3 font-semibold">{String(l.nomeLoja || `Loja ${l.idEmpresa}`).replace(/Itapu\uFFFD/gi, "Itapuã")}</td>
                        <td className="py-2 px-3 text-right font-mono">{(l.notas || 0).toLocaleString("pt-BR")}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{fmtMoeda(l.faturamento)}</td>
                        <td className="py-2 px-3 text-right font-mono">{fmtMoeda(l.custo)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-400 print:text-black">{fmtMoeda(l.lucro)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{(Number(l.margemPct) || 0).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeReport === "contas-pagar" ? (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-slate-300 print:text-black font-semibold">
              Total listado: {filteredCp.length} títulos — {fmtMoeda(filteredCp.reduce((acc, c) => acc + (Number(c.VALOR || c.VALLIQUIDO) || 0), 0))}
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 print:border-slate-300 text-slate-400 print:text-slate-700">
                  <th className="py-2 px-3">Loja</th>
                  <th className="py-2 px-3">Vencimento</th>
                  <th className="py-2 px-3">Fornecedor / Favorecido</th>
                  <th className="py-2 px-3">Título</th>
                  <th className="py-2 px-3 text-right">Valor</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-slate-200">
                {filteredCp.map((c: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2 px-3">Loja {c.LOJA}</td>
                    <td className="py-2 px-3 font-mono">{fmtDataBr(c.DTVENCIMENTO || c.DATA_VENCIMENTO)}</td>
                    <td className="py-2 px-3 font-semibold">{c.FORNECEDOR || c.NOME}</td>
                    <td className="py-2 px-3 font-mono">{c.NUMERO_TITULO}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{fmtMoeda(c.VALOR || c.VALLIQUIDO)}</td>
                    <td className="py-2 px-3 text-center">{c.STATUS === "T" ? "Pago" : "A Pagar"}</td>
                  </tr>
                ))}
                {filteredCp.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500">Nenhum título encontrado para os filtros aplicados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeReport === "compras" ? (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-slate-300 print:text-black font-semibold">
              Pedidos listados: {filteredPedidos.length} — Total: {fmtMoeda(filteredPedidos.reduce((acc, p) => acc + (Number(p.VALOR_TOTAL) || 0), 0))}
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 print:border-slate-300 text-slate-400 print:text-slate-700">
                  <th className="py-2 px-3">Pedido</th>
                  <th className="py-2 px-3">Loja</th>
                  <th className="py-2 px-3">Data</th>
                  <th className="py-2 px-3">Comprador</th>
                  <th className="py-2 px-3">Fornecedor</th>
                  <th className="py-2 px-3 text-right">Valor Total</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-slate-200">
                {filteredPedidos.slice(0, 200).map((p: any, idx: number) => (
                  <tr key={`${p.IDPEDIDO}-${idx}`}>
                    <td className="py-2 px-3 font-mono font-bold">#{p.IDPEDIDO}</td>
                    <td className="py-2 px-3">Loja {p.IDEMPRESA}</td>
                    <td className="py-2 px-3 font-mono">{fmtDataBr(p.DATA_PEDIDO)}</td>
                    <td className="py-2 px-3">{p.COMPRADOR}</td>
                    <td className="py-2 px-3 font-semibold">{p.FORNECEDOR}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{fmtMoeda(p.VALOR_TOTAL)}</td>
                    <td className="py-2 px-3 text-center">
                      {p.STATUS === "Entregue" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 print:text-black"><CheckCircle2 className="size-3" /> Entregue</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-400 print:text-black"><Clock className="size-3" /> Pendente</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPedidos.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">Nenhum pedido encontrado para o filtro selecionado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 print:border-slate-300 text-slate-400 print:text-slate-700">
                <th className="py-2 px-3">Loja</th>
                <th className="py-2 px-3">Produto</th>
                <th className="py-2 px-3">Seção</th>
                <th className="py-2 px-3">Validade</th>
                <th className="py-2 px-3 text-right">Dias</th>
                <th className="py-2 px-3 text-right">Estoque</th>
                <th className="py-2 px-3 text-right">Custo em Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 print:divide-slate-200">
              {filteredValidade.slice(0, 200).map((v: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-2 px-3">Loja {v.IDEMPRESA}</td>
                  <td className="py-2 px-3 font-semibold">{v.DESCRPRODUTO || v.DESCRICAO}</td>
                  <td className="py-2 px-3">{v.DESCRSECAO}</td>
                  <td className="py-2 px-3 font-mono">{fmtDataBr(v.DTVALIDADE)}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold">{v.DIAS_PARA_VENCER ?? "—"}</td>
                  <td className="py-2 px-3 text-right font-mono">{(v.QTDATUALESTOQUE || v.QTD || 0).toLocaleString("pt-BR")}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold">{fmtMoeda(v.CUSTO_TOTAL || v.VALCUSTOTOTAL || 0)}</td>
                </tr>
              ))}
              {filteredValidade.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">Nenhum item com validade crítica encontrado para os filtros aplicados.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
