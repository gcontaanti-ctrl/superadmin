import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Store,
  Building2,
  Search,
  Filter,
  Download,
  RefreshCw,
  X,
  Layers,
  TrendingUp,
  FileSpreadsheet,
  ChevronRight,
  ArrowUpDown,
  FileText,
  DollarSign,
  PieChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface ConvenioTitulo {
  idTitulo: number;
  idEmpresa: number;
  nomeLoja: string;
  idCliente: number;
  cliente: string;
  forma: string;
  valor: number;
  valorPago: number;
  saldo: number;
  dtEmissao: string;
  dtVencimento: string;
  dtBaixa: string | null;
  flagBaixada: "T" | "F";
  status: "BAIXADO" | "VENCIDO" | "A_VENCER";
  detalhes?: string;
}

export interface ConveniosApiResponse {
  periodo: { startDate: string; endDate: string };
  idEmpresa: string;
  isMock?: boolean;
  totais: {
    totalGeral: number;
    qtdGeral: number;
    totalBaixado: number;
    qtdBaixado: number;
    percentualBaixado: number;
    totalPendente: number;
    qtdPendente: number;
    percentualPendente: number;
    totalVencido: number;
    qtdVencido: number;
    totalAVencer: number;
    qtdAVencer: number;
  };
  lojas: Array<{
    id: number;
    nome: string;
    total: number;
    totalBaixado: number;
    totalPendente: number;
    qtdTotal: number;
    qtdBaixado: number;
    qtdPendente: number;
  }>;
  empresas: Array<{
    nome: string;
    total: number;
    totalBaixado: number;
    totalPendente: number;
    qtdTotal: number;
    qtdBaixado: number;
    qtdPendente: number;
    lojas: string[];
    percentualLiquidado: number;
  }>;
  titulos: ConvenioTitulo[];
}

interface ConveniosDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStore?: string;
  startDate?: string;
  endDate?: string;
}

export function ConveniosDetailsModal({
  isOpen,
  onClose,
  selectedStore: propStore = "todas",
  startDate: propStartDate,
  endDate: propEndDate
}: ConveniosDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConveniosApiResponse | null>(null);

  // Filtros internos
  const [statusFilter, setStatusFilter] = useState<"todos" | "baixado" | "pendente" | "vencido" | "a_vencer">("todos");
  const [lojaFilter, setLojaFilter] = useState<string>(propStore || "todas");
  const [filtroDataTipo, setFiltroDataTipo] = useState<"vencimento" | "emissao">("vencimento");
  const [filterStartDate, setFilterStartDate] = useState<string>(propStartDate || "");
  const [filterEndDate, setFilterEndDate] = useState<string>(propEndDate || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"titulos" | "empresas" | "lojas">("titulos");
  const [sortBy, setSortBy] = useState<"valor_desc" | "valor_asc" | "venc_asc" | "venc_desc" | "cliente_asc">("venc_asc");

  // Detalhe de título selecionado
  const [selectedTitulo, setSelectedTitulo] = useState<ConvenioTitulo | null>(null);

  // Paginação
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Sincroniza loja quando props mudam
  useEffect(() => {
    if (propStore) setLojaFilter(propStore);
  }, [propStore]);

  // Carrega dados da API
  const fetchData = () => {
    setLoading(true);
    let url = `/api/vendas/convenios-detalhes?idEmpresa=${lojaFilter}&filtroData=${filtroDataTipo}`;
    if (filterStartDate) url += `&startDate=${filterStartDate}`;
    if (filterEndDate) url += `&endDate=${filterEndDate}`;

    fetch(url)
      .then((res) => res.json())
      .then((resJson) => {
        if (!resJson.error) {
          setData(resJson);
        } else {
          toast.error("Erro ao carregar dados de convênios: " + resJson.error);
        }
      })
      .catch((err) => {
        console.error("Erro ao buscar convênios:", err);
        toast.error("Falha na comunicação com o servidor.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, lojaFilter, filtroDataTipo, filterStartDate, filterEndDate]);

  const formatBRL = (val: number) => {
    return (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const clean = dateStr.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Atalhos de datas
  const setQuickDate = (dias: number | "mes_atual" | "todos") => {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split("T")[0];

    if (dias === "todos") {
      setFilterStartDate("");
      setFilterEndDate("");
    } else if (dias === "mes_atual") {
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0];
      setFilterStartDate(primeiroDia);
      setFilterEndDate(hojeStr);
    } else {
      const passado = new Date(Date.now() - dias * 24 * 3600 * 1000).toISOString().split("T")[0];
      setFilterStartDate(passado);
      setFilterEndDate(hojeStr);
    }
    setPage(1);
  };

  // Processamento e filtragem dos títulos
  const filteredTitulos = useMemo(() => {
    if (!data?.titulos) return [];

    let list = [...data.titulos];

    // Filtro por Status
    if (statusFilter !== "todos") {
      if (statusFilter === "baixado") {
        list = list.filter((t) => t.flagBaixada === "T");
      } else if (statusFilter === "pendente") {
        list = list.filter((t) => t.flagBaixada === "F");
      } else if (statusFilter === "vencido") {
        list = list.filter((t) => t.status === "VENCIDO");
      } else if (statusFilter === "a_vencer") {
        list = list.filter((t) => t.status === "A_VENCER");
      }
    }

    // Filtro por Loja
    if (lojaFilter && lojaFilter !== "todas") {
      list = list.filter((t) => String(t.idEmpresa) === String(lojaFilter));
    }

    // Filtro de Busca Textual
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((t) =>
        t.cliente.toLowerCase().includes(q) ||
        String(t.idTitulo).includes(q) ||
        t.nomeLoja.toLowerCase().includes(q) ||
        t.forma.toLowerCase().includes(q) ||
        (t.detalhes && t.detalhes.toLowerCase().includes(q))
      );
    }

    // Ordenação
    list.sort((a, b) => {
      if (sortBy === "valor_desc") return b.valor - a.valor;
      if (sortBy === "valor_asc") return a.valor - b.valor;
      if (sortBy === "venc_asc") return (a.dtVencimento || "").localeCompare(b.dtVencimento || "");
      if (sortBy === "venc_desc") return (b.dtVencimento || "").localeCompare(a.dtVencimento || "");
      if (sortBy === "cliente_asc") return a.cliente.localeCompare(b.cliente);
      return 0;
    });

    return list;
  }, [data?.titulos, statusFilter, lojaFilter, searchTerm, sortBy]);

  // Itens paginados
  const paginatedTitulos = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTitulos.slice(start, start + pageSize);
  }, [filteredTitulos, page]);

  const totalPages = Math.ceil(filteredTitulos.length / pageSize) || 1;

  // Exportar para CSV
  const handleExportCSV = () => {
    if (!filteredTitulos || filteredTitulos.length === 0) {
      toast.warning("Nenhum registro para exportar.");
      return;
    }

    const headers = [
      "ID Título",
      "Filial / Loja",
      "Empresa Conveniada / Cliente",
      "Modalidade",
      "Emissão",
      "Vencimento",
      "Data Baixa",
      "Status",
      "Valor Total (R$)",
      "Valor Pago (R$)",
      "Saldo Aberto (R$)",
      "Detalhes / Autorização"
    ];

    const rows = filteredTitulos.map((t) => [
      t.idTitulo,
      `"${t.nomeLoja.replace(/"/g, '""')}"`,
      `"${t.cliente.replace(/"/g, '""')}"`,
      `"${t.forma.replace(/"/g, '""')}"`,
      formatDate(t.dtEmissao),
      formatDate(t.dtVencimento),
      t.dtBaixa ? formatDate(t.dtBaixa) : "Pendente",
      t.status === "BAIXADO" ? "Baixado (Quitado)" : t.status === "VENCIDO" ? "Vencido" : "A Vencer",
      t.valor.toFixed(2).replace(".", ","),
      t.valorPago.toFixed(2).replace(".", ","),
      t.saldo.toFixed(2).replace(".", ","),
      `"${(t.detalhes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relatorio_convenios_${statusFilter}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Relatório de Convênios exportado com sucesso!");
  };

  const totais = data?.totais || {
    totalGeral: 0,
    qtdGeral: 0,
    totalBaixado: 0,
    qtdBaixado: 0,
    percentualBaixado: 0,
    totalPendente: 0,
    qtdPendente: 0,
    percentualPendente: 0,
    totalVencido: 0,
    qtdVencido: 0,
    totalAVencer: 0,
    qtdAVencer: 0
  };

  const lojas = data?.lojas || [];
  const empresas = data?.empresas || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-950 border border-white/10 text-slate-100 max-w-6xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
        {/* Header Modal */}
        <DialogHeader className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/40 grid place-items-center shadow-[0_0_20px_rgba(245,158,11,0.25)] shrink-0">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold font-serif text-slate-100">
                  Gestão & Detalhamento de Convênios
                </DialogTitle>
                <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  CONVÊNIOS & OUTROS
                </span>
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  BAIXAS & PENDENTES
                </span>
              </div>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Acompanhamento analítico de recebíveis corporativos, títulos quitados e faturas a vencer
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs h-8 px-2.5 rounded-xl gap-1.5"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs h-8 px-2.5 rounded-xl gap-1.5"
              title="Exportar CSV para Excel"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Corpo Scrollável do Modal */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5 flex flex-col gap-4">
          {/* CARDS DE RESUMO KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Total Geral */}
            <div
              onClick={() => { setStatusFilter("todos"); setPage(1); }}
              className={`rounded-xl p-3 border transition-all cursor-pointer ${statusFilter === "todos" ? "bg-amber-500/15 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "bg-black/40 border-white/10 hover:border-white/20"}`}
            >
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-1">
                <span>Total Movimentado</span>
                <Users className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-base sm:text-lg font-bold font-serif text-slate-100">
                {formatBRL(totais.totalGeral)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>{totais.qtdGeral} títulos</span>
                <span className="font-bold text-amber-400">100%</span>
              </div>
            </div>

            {/* Baixados / Quitados */}
            <div
              onClick={() => { setStatusFilter("baixado"); setPage(1); }}
              className={`rounded-xl p-3 border transition-all cursor-pointer ${statusFilter === "baixado" ? "bg-emerald-500/15 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-black/40 border-white/10 hover:border-emerald-500/30"}`}
            >
              <div className="flex items-center justify-between text-emerald-400 text-[11px] font-semibold mb-1">
                <span>Baixas (Recebidas)</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-base sm:text-lg font-bold font-serif text-emerald-300">
                {formatBRL(totais.totalBaixado)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>{totais.qtdBaixado} quitados</span>
                <span className="font-bold text-emerald-400 font-mono">{totais.percentualBaixado}%</span>
              </div>
            </div>

            {/* Pendentes de Pagamento */}
            <div
              onClick={() => { setStatusFilter("pendente"); setPage(1); }}
              className={`rounded-xl p-3 border transition-all cursor-pointer ${statusFilter === "pendente" ? "bg-amber-500/15 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "bg-black/40 border-white/10 hover:border-amber-500/30"}`}
            >
              <div className="flex items-center justify-between text-amber-400 text-[11px] font-semibold mb-1">
                <span>Pendentes (Aberto)</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-base sm:text-lg font-bold font-serif text-amber-300">
                {formatBRL(totais.totalPendente)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>{totais.qtdPendente} em aberto</span>
                <span className="font-bold text-amber-400 font-mono">{totais.percentualPendente}%</span>
              </div>
            </div>

            {/* Pendentes Vencidos */}
            <div
              onClick={() => { setStatusFilter("vencido"); setPage(1); }}
              className={`rounded-xl p-3 border transition-all cursor-pointer ${statusFilter === "vencido" ? "bg-rose-500/15 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]" : "bg-black/40 border-white/10 hover:border-rose-500/30"}`}
            >
              <div className="flex items-center justify-between text-rose-400 text-[11px] font-semibold mb-1">
                <span>Vencidos (Atraso)</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-base sm:text-lg font-bold font-serif text-rose-300">
                {formatBRL(totais.totalVencido)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>{totais.qtdVencido} em atraso</span>
                <span className="font-bold text-rose-400 font-mono">
                  {totais.totalGeral > 0 ? ((totais.totalVencido / totais.totalGeral) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* Pendentes A Vencer */}
            <div
              onClick={() => { setStatusFilter("a_vencer"); setPage(1); }}
              className={`col-span-2 sm:col-span-1 rounded-xl p-3 border transition-all cursor-pointer ${statusFilter === "a_vencer" ? "bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "bg-black/40 border-white/10 hover:border-cyan-500/30"}`}
            >
              <div className="flex items-center justify-between text-cyan-400 text-[11px] font-semibold mb-1">
                <span>A Vencer (No Prazo)</span>
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-base sm:text-lg font-bold font-serif text-cyan-300">
                {formatBRL(totais.totalAVencer)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>{totais.qtdAVencer} a vencer</span>
                <span className="font-bold text-cyan-400 font-mono">
                  {totais.totalGeral > 0 ? ((totais.totalAVencer / totais.totalGeral) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* BARRA DE LIQUIDAÇÃO (PROGRESSO) */}
          {totais.totalGeral > 0 && (
            <div className="bg-black/35 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-amber-400" />
                  Taxa de Liquidação de Convênios
                </span>
                <span className="text-slate-400 text-[11px]">
                  <strong className="text-emerald-400">{totais.percentualBaixado}% baixado</strong> ({formatBRL(totais.totalBaixado)}) • <strong className="text-amber-400">{totais.percentualPendente}% a receber</strong> ({formatBRL(totais.totalPendente)})
                </span>
              </div>
              <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden flex p-0.5 gap-1">
                <div
                  style={{ width: `${Math.max(1, totais.percentualBaixado)}%` }}
                  className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-sm transition-all duration-500"
                  title={`Baixado / Recebido: ${formatBRL(totais.totalBaixado)} (${totais.percentualBaixado}%)`}
                />
                <div
                  style={{ width: `${Math.max(1, totais.percentualPendente)}%` }}
                  className="bg-gradient-to-r from-amber-500 to-orange-400 h-full rounded-sm transition-all duration-500"
                  title={`Pendente / Em Aberto: ${formatBRL(totais.totalPendente)} (${totais.percentualPendente}%)`}
                />
              </div>
            </div>
          )}

          {/* BARRA DE FILTROS E ABAS */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-3 flex flex-col gap-3">
            {/* Linha 1: Abas de Status Rápidas & Visualização */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-white/5">
              {/* Abas de Status */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3 text-cyan-400" /> Status:
                </span>
                <button
                  onClick={() => { setStatusFilter("todos"); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${statusFilter === "todos" ? "bg-amber-500 text-slate-950 font-bold" : "bg-black/40 text-slate-300 hover:bg-white/5"}`}
                >
                  Todos ({data?.titulos?.length || 0})
                </button>
                <button
                  onClick={() => { setStatusFilter("baixado"); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${statusFilter === "baixado" ? "bg-emerald-500 text-slate-950 font-bold" : "bg-black/40 text-emerald-400 hover:bg-emerald-500/10"}`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Baixados ({totais.qtdBaixado})
                </button>
                <button
                  onClick={() => { setStatusFilter("pendente"); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${statusFilter === "pendente" ? "bg-amber-500 text-slate-950 font-bold" : "bg-black/40 text-amber-400 hover:bg-amber-500/10"}`}
                >
                  <Clock className="w-3 h-3" />
                  Pendentes ({totais.qtdPendente})
                </button>
                <button
                  onClick={() => { setStatusFilter("vencido"); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${statusFilter === "vencido" ? "bg-rose-500 text-white font-bold" : "bg-black/40 text-rose-400 hover:bg-rose-500/10"}`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Vencidos ({totais.qtdVencido})
                </button>
                <button
                  onClick={() => { setStatusFilter("a_vencer"); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${statusFilter === "a_vencer" ? "bg-cyan-500 text-slate-950 font-bold" : "bg-black/40 text-cyan-400 hover:bg-cyan-500/10"}`}
                >
                  <Calendar className="w-3 h-3" />
                  A Vencer ({totais.qtdAVencer})
                </button>
              </div>

              {/* Toggle de Visão */}
              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 self-end sm:self-auto">
                <button
                  onClick={() => setViewMode("titulos")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${viewMode === "titulos" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  <FileText className="w-3 h-3" /> Títulos ({filteredTitulos.length})
                </button>
                <button
                  onClick={() => setViewMode("empresas")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${viewMode === "empresas" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  <Building2 className="w-3 h-3" /> Por Empresa ({empresas.length})
                </button>
                <button
                  onClick={() => setViewMode("lojas")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${viewMode === "lojas" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  <Store className="w-3 h-3" /> Por Filial ({lojas.length})
                </button>
              </div>
            </div>

            {/* Linha 2: Filtro de Loja, Filtro de Período e Busca */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-2.5 items-end">
              {/* Seletor de Loja */}
              <div className="lg:col-span-3 flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Store className="w-3 h-3 text-cyan-400" /> Filial / Loja:
                </label>
                <select
                  value={lojaFilter}
                  onChange={(e) => { setLojaFilter(e.target.value); setPage(1); }}
                  className="bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="todas">Todas as Lojas (Consolidado)</option>
                  {lojas.map((l) => (
                    <option key={l.id} value={String(l.id)}>
                      Loja {l.id} - {l.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Data e Datas */}
              <div className="lg:col-span-4 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" /> Período:
                  </span>
                  <div className="flex items-center gap-2 text-[10px] lowercase">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={filtroDataTipo === "vencimento"}
                        onChange={() => setFiltroDataTipo("vencimento")}
                        className="accent-amber-500"
                      />
                      <span>vencimento</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={filtroDataTipo === "emissao"}
                        onChange={() => setFiltroDataTipo("emissao")}
                        className="accent-amber-500"
                      />
                      <span>emissão</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }}
                    className="w-1/2 bg-black/50 border border-white/10 rounded-xl px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-slate-500 text-xs">até</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }}
                    className="w-1/2 bg-black/50 border border-white/10 rounded-xl px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Busca Textual */}
              <div className="lg:col-span-3 flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Search className="w-3 h-3 text-cyan-400" /> Buscar Conveniado ou Título:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                    placeholder="Empresa, cliente, Nº título, cupom..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Ordenação */}
              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-cyan-400" /> Ordenar:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-black/50 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="venc_asc">Vencimento Próximo</option>
                  <option value="venc_desc">Vencimento Distante</option>
                  <option value="valor_desc">Maior Valor</option>
                  <option value="valor_asc">Menor Valor</option>
                  <option value="cliente_asc">Nome Cliente (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Atalhos rápidos de datas */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Atalhos:</span>
              <button
                onClick={() => setQuickDate("mes_atual")}
                className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 text-[10px]"
              >
                Mês Atual
              </button>
              <button
                onClick={() => setQuickDate(30)}
                className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 text-[10px]"
              >
                Últimos 30 Dias
              </button>
              <button
                onClick={() => setQuickDate(60)}
                className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 text-[10px]"
              >
                Últimos 60 Dias
              </button>
              <button
                onClick={() => setQuickDate("todos")}
                className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 text-[10px]"
              >
                Limpar Período
              </button>
            </div>
          </div>

          {/* CONTEÚDO PRINCIPAL (TABELA DE TÍTULOS / RESUMO EMPRESAS / RESUMO LOJAS) */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Carregando detalhes dos convênios...</p>
            </div>
          ) : viewMode === "titulos" ? (
            /* TABELA DE TÍTULOS DETALHADA */
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Mostrando <strong className="text-slate-200">{filteredTitulos.length}</strong> títulos encontrados
                  {statusFilter !== "todos" && ` (filtro: ${statusFilter})`}
                </span>
                <span>Página {page} de {totalPages}</span>
              </div>

              <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-white/10 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Nº Título</th>
                        <th className="py-2.5 px-3">Loja</th>
                        <th className="py-2.5 px-3">Empresa Conveniada / Cliente</th>
                        <th className="py-2.5 px-3">Emissão</th>
                        <th className="py-2.5 px-3">Vencimento</th>
                        <th className="py-2.5 px-3">Data Baixa</th>
                        <th className="py-2.5 px-3 text-right">Valor Total</th>
                        <th className="py-2.5 px-3 text-right">Valor Baixado</th>
                        <th className="py-2.5 px-3 text-right">Saldo Aberto</th>
                        <th className="py-2.5 px-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {paginatedTitulos.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-slate-500 text-xs">
                            Nenhum convênio encontrado com os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        paginatedTitulos.map((t) => {
                          const isBaixado = t.flagBaixada === "T";
                          const isVencido = t.status === "VENCIDO";

                          return (
                            <tr
                              key={t.idTitulo}
                              onClick={() => setSelectedTitulo(t)}
                              className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                            >
                              {/* Status Badge */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {isBaixado ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Baixado
                                  </span>
                                ) : isVencido ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Vencido
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    <Clock className="w-2.5 h-2.5" /> A Vencer
                                  </span>
                                )}
                              </td>

                              {/* ID Título */}
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-200 whitespace-nowrap">
                                #{t.idTitulo}
                              </td>

                              {/* Loja */}
                              <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                                <span className="bg-black/60 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-semibold text-cyan-300">
                                  Loja {t.idEmpresa}
                                </span>
                              </td>

                              {/* Empresa / Cliente */}
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-100 max-w-[220px] truncate" title={t.cliente}>
                                  {t.cliente}
                                </div>
                                <span className="text-[10px] text-slate-400 block truncate max-w-[220px]">
                                  {t.forma}
                                </span>
                              </td>

                              {/* Emissão */}
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                {formatDate(t.dtEmissao)}
                              </td>

                              {/* Vencimento */}
                              <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                                <span className={isVencido ? "text-rose-400 font-bold" : "text-slate-300 font-medium"}>
                                  {formatDate(t.dtVencimento)}
                                </span>
                              </td>

                              {/* Data Baixa */}
                              <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                                {isBaixado && t.dtBaixa ? (
                                  <span className="text-emerald-400 font-medium">
                                    {formatDate(t.dtBaixa)}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>

                              {/* Valor Total */}
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                                {formatBRL(t.valor)}
                              </td>

                              {/* Valor Baixado */}
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400 whitespace-nowrap">
                                {isBaixado ? formatBRL(t.valorPago) : "-"}
                              </td>

                              {/* Saldo Aberto */}
                              <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                                {!isBaixado ? (
                                  <span className={isVencido ? "text-rose-400" : "text-amber-400"}>
                                    {formatBRL(t.saldo)}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">R$ 0,00</span>
                                )}
                              </td>

                              {/* Ações */}
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <span className="text-[10px] text-cyan-400 group-hover:text-cyan-300 font-semibold underline flex items-center justify-center gap-0.5">
                                  Detalhes <ChevronRight className="w-3 h-3" />
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-400">
                    Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, filteredTitulos.length)} de {filteredTitulos.length}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="bg-black/40 border-white/10 text-xs h-7 px-2.5 text-slate-300 disabled:opacity-30"
                    >
                      Anterior
                    </Button>
                    <span className="text-xs font-mono font-bold text-slate-300 px-2">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="bg-black/40 border-white/10 text-xs h-7 px-2.5 text-slate-300 disabled:opacity-30"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : viewMode === "empresas" ? (
            /* RESUMO POR EMPRESA CONVENIADA */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Total de <strong className="text-slate-200">{empresas.length}</strong> empresas conveniadas registradas</span>
                <span>Ordenadas por volume financeiro total</span>
              </div>

              <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-white/10 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Empresa Conveniada</th>
                      <th className="py-2.5 px-3">Filiais Atendidas</th>
                      <th className="py-2.5 px-3 text-center">Títulos</th>
                      <th className="py-2.5 px-3 text-right">Total Convênio</th>
                      <th className="py-2.5 px-3 text-right">Já Baixado</th>
                      <th className="py-2.5 px-3 text-right">Saldo Pendente</th>
                      <th className="py-2.5 px-3 text-center">Taxa Liquidação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {empresas.map((emp) => (
                      <tr key={emp.nome} className="hover:bg-white/[0.03]">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            {emp.nome}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {emp.lojas.map((lj) => (
                              <span key={lj} className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-300">
                                {lj}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-400">
                          {emp.qtdTotal} ({emp.qtdBaixado} quit. / {emp.qtdPendente} pend.)
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-100">
                          {formatBRL(emp.total)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                          {formatBRL(emp.totalBaixado)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                          {formatBRL(emp.totalPendente)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-black/60 rounded-full overflow-hidden flex">
                              <div
                                style={{ width: `${emp.percentualLiquidado}%` }}
                                className="bg-emerald-500 h-full"
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold text-emerald-300 w-10 text-right">
                              {emp.percentualLiquidado}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* RESUMO POR LOJA */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {lojas.map((l) => {
                const percLiq = l.total > 0 ? Number(((l.totalBaixado / l.total) * 100).toFixed(1)) : 0;
                return (
                  <div
                    key={l.id}
                    className="rounded-xl p-4 border bg-black/40 border-white/10 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="size-7 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-black grid place-items-center">
                          {l.id}
                        </span>
                        <div>
                          <h5 className="font-bold text-sm text-slate-100">{l.nome}</h5>
                          <span className="text-[10px] text-slate-400">{l.qtdTotal} títulos emitidos</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-serif text-cyan-300">
                        {formatBRL(l.total)}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Baixado (Recebido):
                        </span>
                        <span className="font-bold font-mono text-emerald-300">
                          {formatBRL(l.totalBaixado)} ({l.qtdBaixado})
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-amber-400 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Pendente de Liquidação:
                        </span>
                        <span className="font-bold font-mono text-amber-300">
                          {formatBRL(l.totalPendente)} ({l.qtdPendente})
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>Taxa de Quitação</span>
                        <span className="font-bold text-emerald-400">{percLiq}%</span>
                      </div>
                      <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden flex">
                        <div style={{ width: `${percLiq}%` }} className="bg-emerald-500 h-full" />
                        <div style={{ width: `${100 - percLiq}%` }} className="bg-amber-400 h-full" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL / DRAWER INTERNO: DETALHE DO TÍTULO SELECIONADO */}
        {selectedTitulo && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-5 flex flex-col gap-4 shadow-2xl relative">
              <button
                onClick={() => setSelectedTitulo(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-xl bg-amber-500/20 border border-amber-500/30 grid place-items-center text-amber-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100">
                    Título #{selectedTitulo.idTitulo}
                  </h4>
                  <p className="text-xs text-slate-400">{selectedTitulo.nomeLoja}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-black/40 p-3.5 rounded-xl border border-white/5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Conveniado / Empresa</span>
                  <strong className="text-slate-200 block mt-0.5">{selectedTitulo.cliente}</strong>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Modalidade</span>
                  <strong className="text-slate-200 block mt-0.5">{selectedTitulo.forma}</strong>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Data de Emissão</span>
                  <span className="text-slate-300 font-mono block mt-0.5">{formatDate(selectedTitulo.dtEmissao)}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Data de Vencimento</span>
                  <span className="text-slate-300 font-mono block mt-0.5">{formatDate(selectedTitulo.dtVencimento)}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Status da Baixa</span>
                  {selectedTitulo.flagBaixada === "T" ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Baixado em {formatDate(selectedTitulo.dtBaixa)}
                    </span>
                  ) : selectedTitulo.status === "VENCIDO" ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3" /> Pendente (Vencido)
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> Pendente (A Vencer)
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Valor do Título</span>
                  <strong className="text-cyan-300 font-mono text-sm block mt-0.5">
                    {formatBRL(selectedTitulo.valor)}
                  </strong>
                </div>

                {selectedTitulo.flagBaixada === "F" && (
                  <div className="col-span-2 pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">Saldo Restante a Receber:</span>
                    <strong className="text-amber-400 font-mono text-sm">{formatBRL(selectedTitulo.saldo)}</strong>
                  </div>
                )}
              </div>

              {selectedTitulo.detalhes && (
                <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Observações / Registro do Caixa
                  </span>
                  <p className="text-xs text-slate-300 font-mono">{selectedTitulo.detalhes}</p>
                </div>
              )}

              <Button
                onClick={() => setSelectedTitulo(null)}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs h-9 rounded-xl"
              >
                Fechar Detalhes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

