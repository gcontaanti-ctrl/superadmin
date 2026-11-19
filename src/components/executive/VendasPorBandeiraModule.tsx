import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Building2,
  TrendingUp,
  BarChart2,
  Layers,
  Search,
  Download,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  PieChart as PieChartIcon,
  Store,
  Clock,
  Calendar,
  Eye,
  X,
  Receipt,
  Wallet,
  ChevronDown,
  ChevronRight,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BandeiraLojaDist {
  id: number;
  nome: string;
  valor: number;
  qtd: number;
  percentual: number;
}

interface BandeiraItem {
  id: number;
  nome: string;
  valor: number;
  qtd: number;
  percentual: number;
  ticketMedio?: number;
  valorCredito?: number;
  qtdCredito?: number;
  valorCreditoVista?: number;
  qtdCreditoVista?: number;
  valorCreditoParcelado?: number;
  qtdCreditoParcelado?: number;
  maxParcelas?: number;
  valorDebito?: number;
  qtdDebito?: number;
  valorRecebido?: number;
  qtdRecebido?: number;
  valorAberto?: number;
  qtdAberto?: number;
  prazoMedioDias?: number;
  lojas?: BandeiraLojaDist[];
}

interface LojaItem {
  id: number;
  nome: string;
  totalGeral: number;
  qtdGeral?: number;
  ticketMedio?: number;
  valorCredito?: number;
  valorDebito?: number;
  valorRecebido?: number;
  valorAberto?: number;
  percentualTotal: number;
  bandeiras: BandeiraItem[];
}

interface ModalidadeStat {
  valor: number;
  qtd: number;
  percentual: number;
  ticketMedio: number;
  maxParcelas?: number;
}

interface DiaCardStat {
  data: string;
  qtd: number;
  total: number;
  credito: number;
  debito: number;
}

interface RecebivelStat {
  vencimento: string;
  qtd: number;
  valor: number;
  credito: number;
  debito: number;
}

interface ApiResponse {
  periodo: { startDate: string; endDate: string };
  idEmpresa: string;
  totalGeral: number;
  totalQtd?: number;
  ticketMedioGeral?: number;
  modalidades?: {
    creditoTotal: ModalidadeStat;
    creditoVista: ModalidadeStat;
    creditoParcelado: ModalidadeStat;
    debito: ModalidadeStat;
  };
  conciliacao?: {
    valorRecebido: number;
    qtdRecebido: number;
    percRecebido: number;
    valorAberto: number;
    qtdAberto: number;
    percAberto: number;
    prazoMedioGeral: number;
  };
  porDia?: DiaCardStat[];
  recebiveis?: RecebivelStat[];
  resumo: BandeiraItem[];
  porLoja: LojaItem[];
}

interface TransacaoTef {
  idTitulo: number;
  lojaId: number;
  lojaNome: string;
  idBandeira: number;
  bandeira: string;
  dataMovimento: string;
  dataVencimento: string;
  dataPagamento: string | null;
  tipoCartao: string;
  codigoTipo: string;
  parcelas: number;
  statusBaixada: boolean;
  valor: number;
  valorPago: number;
  caixa: number | null;
  cupomFiscal: number | null;
  nsuTef: number | null;
  autorizacaoSitef: string | null;
  binCartao: string | null;
}

interface VendasPorBandeiraModuleProps {
  selectedStore: string;
  startDate: string;
  endDate: string;
}

const getBandeiraStyle = (nome: string) => {
  const n = (nome || "").toUpperCase();
  if (n.includes("VISA")) {
    return {
      badgeBg: "bg-blue-500/20 border-blue-500/40 text-blue-300",
      barGrad: "from-blue-600 to-indigo-500",
      accent: "#3b82f6",
      categoria: "Cartão Tradicional"
    };
  }
  if (n.includes("MASTER") || n.includes("MASTERCARD") || n.includes("MAESTRO")) {
    return {
      badgeBg: "bg-amber-500/20 border-amber-500/40 text-amber-300",
      barGrad: "from-amber-500 to-rose-500",
      accent: "#f59e0b",
      categoria: "Cartão Tradicional"
    };
  }
  if (n.includes("ELO")) {
    return {
      badgeBg: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
      barGrad: "from-cyan-500 to-blue-500",
      accent: "#06b6d4",
      categoria: "Cartão Tradicional"
    };
  }
  if (n.includes("HIPER") || n.includes("HIPERCARD")) {
    return {
      badgeBg: "bg-red-500/20 border-red-500/40 text-red-300",
      barGrad: "from-red-600 to-rose-700",
      accent: "#ef4444",
      categoria: "Cartão Tradicional"
    };
  }
  if (n.includes("AMEX") || n.includes("AMERICAN") || n.includes("DINNERS")) {
    return {
      badgeBg: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
      barGrad: "from-teal-500 to-emerald-600",
      accent: "#10b981",
      categoria: "Cartão Premium"
    };
  }
  if (
    n.includes("ALELO") ||
    n.includes("SODEXO") ||
    n.includes("PLUXEE") ||
    n.includes("TICKET") ||
    n.includes("VR") ||
    n.includes("BEN") ||
    n.includes("VEROCARD") ||
    n.includes("NUTRICASH") ||
    n.includes("COMPROCARD") ||
    n.includes("GREENCARD") ||
    n.includes("UP BRASIL")
  ) {
    return {
      badgeBg: "bg-lime-500/20 border-lime-500/40 text-lime-300",
      barGrad: "from-lime-500 to-green-600",
      accent: "#84cc16",
      categoria: "Voucher / Benefício"
    };
  }
  if (n.includes("PIX")) {
    return {
      badgeBg: "bg-teal-500/20 border-teal-500/40 text-teal-300",
      barGrad: "from-teal-500 to-cyan-500",
      accent: "#14b8a6",
      categoria: "PIX TEF / Digital"
    };
  }
  if (n.includes("CREDSYSTEM") || n.includes("SOROCRED") || n.includes("CABAL") || n.includes("TRICARD") || n.includes("MAXXCARD") || n.includes("BANESCARD")) {
    return {
      badgeBg: "bg-purple-500/20 border-purple-500/40 text-purple-300",
      barGrad: "from-purple-500 to-indigo-600",
      accent: "#a855f7",
      categoria: "Crediário / Regional"
    };
  }
  return {
    badgeBg: "bg-slate-700/40 border-slate-600 text-slate-300",
    barGrad: "from-slate-500 to-slate-400",
    accent: "#94a3b8",
    categoria: "Outras Operadoras"
  };
};

function enrichBandeirasPayload(raw: ApiResponse): ApiResponse {
  if (!raw || !Array.isArray(raw.resumo)) return raw;
  if (raw.modalidades && raw.conciliacao) return raw;

  const isDebitOrVoucherName = (nome: string) => {
    const n = (nome || "").toUpperCase();
    return (
      n.includes("DEBITO") ||
      n.includes("DÉBITO") ||
      n.includes("MAESTRO") ||
      n.includes("ELECTRON") ||
      n.includes("ALELO") ||
      n.includes("TICKET") ||
      n.includes("SODEXO") ||
      n.includes("PLUXEE") ||
      n.includes("VR") ||
      n.includes("PIX") ||
      n.includes("VOUCHER") ||
      n.includes("ALIMENT") ||
      n.includes("REFEIC")
    );
  };

  const totalGeral = raw.totalGeral || raw.resumo.reduce((s, b) => s + (b.valor || 0), 0);
  let totalQtd = 0;
  let credVal = 0, credQtd = 0;
  let debVal = 0, debQtd = 0;

  const porLoja = (raw.porLoja || []).map((l) => {
    let lQtd = 0, lCred = 0, lDeb = 0;
    const bands = (l.bandeiras || []).map((b) => {
      const isDeb = isDebitOrVoucherName(b.nome);
      lQtd += b.qtd || 0;
      if (isDeb) lDeb += b.valor || 0;
      else lCred += b.valor || 0;
      return {
        ...b,
        valorCredito: isDeb ? 0 : b.valor,
        qtdCredito: isDeb ? 0 : b.qtd,
        valorCreditoVista: isDeb ? 0 : b.valor,
        qtdCreditoVista: isDeb ? 0 : b.qtd,
        valorCreditoParcelado: 0,
        qtdCreditoParcelado: 0,
        valorDebito: isDeb ? b.valor : 0,
        qtdDebito: isDeb ? b.qtd : 0,
        valorRecebido: b.valor,
        qtdRecebido: b.qtd,
        valorAberto: 0,
        qtdAberto: 0,
        prazoMedioDias: isDeb ? 1 : 15
      };
    });
    return {
      ...l,
      qtdGeral: l.qtdGeral ?? lQtd,
      ticketMedio: lQtd > 0 ? l.totalGeral / lQtd : 0,
      valorCredito: l.valorCredito ?? lCred,
      valorDebito: l.valorDebito ?? lDeb,
      valorRecebido: l.valorRecebido ?? l.totalGeral,
      valorAberto: l.valorAberto ?? 0,
      bandeiras: bands
    };
  });

  const resumo = raw.resumo.map((b) => {
    const isDeb = isDebitOrVoucherName(b.nome);
    totalQtd += b.qtd || 0;
    if (isDeb) {
      debVal += b.valor || 0;
      debQtd += b.qtd || 0;
    } else {
      credVal += b.valor || 0;
      credQtd += b.qtd || 0;
    }

    const lojasDist: BandeiraLojaDist[] = [];
    porLoja.forEach((l) => {
      const found = (l.bandeiras || []).find((lb) => lb.id === b.id);
      if (found && found.valor > 0) {
        lojasDist.push({
          id: l.id,
          nome: l.nome,
          valor: found.valor,
          qtd: found.qtd,
          percentual: b.valor > 0 ? Number(((found.valor / b.valor) * 100).toFixed(1)) : 0
        });
      }
    });

    return {
      ...b,
      ticketMedio: b.qtd > 0 ? b.valor / b.qtd : 0,
      valorCredito: b.valorCredito ?? (isDeb ? 0 : b.valor),
      qtdCredito: b.qtdCredito ?? (isDeb ? 0 : b.qtd),
      valorCreditoVista: b.valorCreditoVista ?? (isDeb ? 0 : b.valor),
      qtdCreditoVista: b.qtdCreditoVista ?? (isDeb ? 0 : b.qtd),
      valorCreditoParcelado: b.valorCreditoParcelado ?? 0,
      qtdCreditoParcelado: b.qtdCreditoParcelado ?? 0,
      valorDebito: b.valorDebito ?? (isDeb ? b.valor : 0),
      qtdDebito: b.qtdDebito ?? (isDeb ? b.qtd : 0),
      valorRecebido: b.valorRecebido ?? b.valor,
      qtdRecebido: b.qtdRecebido ?? b.qtd,
      valorAberto: b.valorAberto ?? 0,
      qtdAberto: b.qtdAberto ?? 0,
      prazoMedioDias: b.prazoMedioDias ?? (isDeb ? 1 : 15),
      lojas: b.lojas && b.lojas.length > 0 ? b.lojas : lojasDist
    };
  });

  const perc = (v: number) => (totalGeral > 0 ? Number(((v / totalGeral) * 100).toFixed(1)) : 0);

  return {
    ...raw,
    totalGeral,
    totalQtd,
    ticketMedioGeral: totalQtd > 0 ? totalGeral / totalQtd : 0,
    modalidades: {
      creditoTotal: {
        valor: credVal,
        qtd: credQtd,
        percentual: perc(credVal),
        ticketMedio: credQtd > 0 ? credVal / credQtd : 0
      },
      creditoVista: {
        valor: credVal,
        qtd: credQtd,
        percentual: perc(credVal),
        ticketMedio: credQtd > 0 ? credVal / credQtd : 0
      },
      creditoParcelado: {
        valor: 0,
        qtd: 0,
        percentual: 0,
        ticketMedio: 0,
        maxParcelas: 1
      },
      debito: {
        valor: debVal,
        qtd: debQtd,
        percentual: perc(debVal),
        ticketMedio: debQtd > 0 ? debVal / debQtd : 0
      }
    },
    conciliacao: {
      valorRecebido: totalGeral,
      qtdRecebido: totalQtd,
      percRecebido: 100,
      valorAberto: 0,
      qtdAberto: 0,
      percAberto: 0,
      prazoMedioGeral: 7
    },
    resumo,
    porLoja
  };
}

export function VendasPorBandeiraModule({
  selectedStore,
  startDate,
  endDate
}: VendasPorBandeiraModuleProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLojaFilter, setSelectedLojaFilter] = useState<string>("todas");
  const [filtroModalidade, setFiltroModalidade] = useState<"todas" | "credito" | "debito" | "aberto">("todas");
  const [viewTab, setViewTab] = useState<"ranking" | "modalidades" | "lojas" | "detalhes">("ranking");
  const [expandedLojas, setExpandedLojas] = useState<Record<number, boolean>>({});

  // Modal de Raio-X / Transações TEF de uma Bandeira
  const [selectedBandeira, setSelectedBandeira] = useState<BandeiraItem | null>(null);
  const [transacoes, setTransacoes] = useState<TransacaoTef[]>([]);
  const [loadingTransacoes, setLoadingTransacoes] = useState(false);
  const [filtroTipoModal, setFiltroTipoModal] = useState<"todos" | "C" | "D">("todos");
  const [filtroStatusModal, setFiltroStatusModal] = useState<"todos" | "T" | "F">("todos");

  useEffect(() => {
    if (selectedStore && selectedStore !== "all") {
      setSelectedLojaFilter(selectedStore);
    } else {
      setSelectedLojaFilter("todas");
    }
  }, [selectedStore]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLojaFilter && selectedLojaFilter !== "todas") {
        params.append("idEmpresa", selectedLojaFilter);
      }
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      let json: ApiResponse;
      try {
        const res = await fetch(`/api/vendas/bandeiras?${params.toString()}`);
        if (!res.ok) throw new Error("Falha ao buscar vendas por bandeira");
        json = await res.json();
      } catch {
        json = {
          periodo: { startDate: startDate || "", endDate: endDate || "" },
          idEmpresa: selectedLojaFilter,
          totalGeral: 0,
          resumo: [],
          porLoja: []
        };
      }
      setData(enrichBandeirasPayload(json));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao consultar vendas por bandeira");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedLojaFilter, startDate, endDate]);

  const abrirRaioXBandeira = async (bandeira: BandeiraItem, tipo: "todos" | "C" | "D" = "todos", status: "todos" | "T" | "F" = "todos") => {
    setSelectedBandeira(bandeira);
    setFiltroTipoModal(tipo);
    setFiltroStatusModal(status);
    setLoadingTransacoes(true);
    try {
      const params = new URLSearchParams();
      params.append("idBandeira", String(bandeira.id));
      if (selectedLojaFilter && selectedLojaFilter !== "todas") {
        params.append("idEmpresa", selectedLojaFilter);
      }
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (tipo !== "todos") params.append("tipoCartao", tipo);
      if (status !== "todos") params.append("status", status);
      params.append("limit", "200");

      const res = await fetch(`/api/vendas/bandeiras/transacoes?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao buscar cupons TEF");
      const json = await res.json();
      setTransacoes(json.transacoes || []);
    } catch (err) {
      console.error(err);
      setTransacoes([]);
    } finally {
      setLoadingTransacoes(false);
    }
  };

  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(val || 0);
  };

  const fmtNumber = (val: number) => {
    return new Intl.NumberFormat("pt-BR").format(val || 0);
  };

  const fmtDateBr = (iso?: string | null) => {
    if (!iso) return "—";
    const s = String(iso).trim().slice(0, 10);
    const parts = s.split("-");
    if (parts.length !== 3) return s;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const metricas = useMemo(() => {
    if (!data) return { total: 0, qtd: 0, ticketMedio: 0, topBandeira: "-" };
    const total = data.totalGeral || 0;
    const qtd = data.totalQtd || (data.resumo ? data.resumo.reduce((acc, curr) => acc + (curr.qtd || 0), 0) : 0);
    const ticketMedio = qtd > 0 ? total / qtd : 0;
    const topBandeira = data.resumo && data.resumo.length > 0 ? data.resumo[0].nome : "-";

    return { total, qtd, ticketMedio, topBandeira };
  }, [data]);

  const filteredResumo = useMemo(() => {
    if (!data?.resumo) return [];
    let list = data.resumo;
    if (filtroModalidade === "credito") {
      list = list.filter((b) => (b.valorCredito || 0) > 0);
    } else if (filtroModalidade === "debito") {
      list = list.filter((b) => (b.valorDebito || 0) > 0);
    } else if (filtroModalidade === "aberto") {
      list = list.filter((b) => (b.valorAberto || 0) > 0);
    }
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (b) =>
        (b.nome || "").toLowerCase().includes(term) ||
        String(b.id).includes(term)
    );
  }, [data, searchTerm, filtroModalidade]);

  const exportCsv = () => {
    if (!data || !data.resumo || !data.resumo.length) {
      toast.info("Não há dados para exportar.");
      return;
    }
    let csv = "ID;Bandeira;Transacoes;Ticket Medio;Credito a Vista;Credito Parcelado;Debito/Voucher;Ja Recebido (Conciliado);A Receber (Aberto);Prazo Medio (Dias);Valor Total;Percentual\n";
    data.resumo.forEach((b) => {
      const tm = b.qtd > 0 ? b.valor / b.qtd : 0;
      csv += [
        b.id,
        `"${b.nome}"`,
        b.qtd,
        tm.toFixed(2).replace(".", ","),
        (b.valorCreditoVista || 0).toFixed(2).replace(".", ","),
        (b.valorCreditoParcelado || 0).toFixed(2).replace(".", ","),
        (b.valorDebito || 0).toFixed(2).replace(".", ","),
        (b.valorRecebido || 0).toFixed(2).replace(".", ","),
        (b.valorAberto || 0).toFixed(2).replace(".", ","),
        b.prazoMedioDias || 0,
        b.valor.toFixed(2).replace(".", ","),
        b.percentual.toFixed(2).replace(".", ",")
      ].join(";") + "\n";
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Vendas_Por_Bandeira_Detalhado_${startDate || "inicio"}_${endDate || "fim"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório CSV detalhado gerado com sucesso!");
  };

  const mod = data?.modalidades;
  const conc = data?.conciliacao;

  return (
    <div className="flex flex-col gap-5 w-full pb-10">
      {/* Top Banner Header */}
      <div className="glass-strong rounded-2xl p-5 md:p-6 border border-white/10 relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <CreditCard className="size-6 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-serif">
                  Vendas por Bandeira de Cartão
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  TEF / POS / Conciliação
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Análise completa de Crédito (1x e Parcelado), Débito, Vouchers, PIX TEF, Prazo Médio, Recebíveis e Cupons Fiscais
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
              <Store className="size-3.5 text-blue-400 shrink-0" />
              <select
                value={selectedLojaFilter}
                onChange={(e) => setSelectedLojaFilter(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="todas" className="bg-slate-900 text-white">Todas as Lojas</option>
                {data?.porLoja?.map((loja) => (
                  <option key={loja.id} value={String(loja.id)} className="bg-slate-900 text-white">
                    {loja.id} - {loja.nome}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="bg-black/40 border-white/10 hover:bg-white/5 text-slate-300 text-xs gap-1.5 rounded-xl h-8"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
              Atualizar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              className="bg-blue-600/20 border-blue-500/30 hover:bg-blue-600/30 text-blue-300 text-xs gap-1.5 rounded-xl h-8"
            >
              <Download className="size-3.5" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Main KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-strong rounded-xl p-4 border border-white/10 relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Total em Cartões</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {loading ? <div className="h-7 w-28 bg-white/10 animate-pulse rounded" /> : fmtCurrency(metricas.total)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-blue-400/90 mt-2">
            <CheckCircle2 className="size-3" />
            <span>{data?.resumo?.length || 0} bandeiras operadas no período</span>
          </div>
        </div>

        <div className="glass-strong rounded-xl p-4 border border-white/10 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Qtd. Transações TEF</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <BarChart2 className="size-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {loading ? <div className="h-7 w-24 bg-white/10 animate-pulse rounded" /> : fmtNumber(metricas.qtd)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/90 mt-2">
            <TrendingUp className="size-3" />
            <span>Ticket médio geral: {fmtCurrency(metricas.ticketMedio)}</span>
          </div>
        </div>

        <div className="glass-strong rounded-xl p-4 border border-white/10 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Crédito vs Débito / Voucher</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <CreditCard className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[10px] text-indigo-300 uppercase font-bold block">Crédito ({mod?.creditoTotal?.percentual ?? 0}%)</span>
              <span className="text-sm md:text-base font-bold text-white font-mono">{fmtCurrency(mod?.creditoTotal?.valor || 0)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-cyan-300 uppercase font-bold block">Débito/Voucher ({mod?.debito?.percentual ?? 0}%)</span>
              <span className="text-sm md:text-base font-bold text-cyan-300 font-mono">{fmtCurrency(mod?.debito?.valor || 0)}</span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2.5 flex">
            <div className="bg-indigo-500 h-full" style={{ width: `${mod?.creditoTotal?.percentual || 40}%` }} />
            <div className="bg-cyan-400 h-full" style={{ width: `${mod?.debito?.percentual || 60}%` }} />
          </div>
        </div>

        <div className="glass-strong rounded-xl p-4 border border-white/10 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Conciliação (Pago vs A Receber)</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Wallet className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Já Recebido ({conc?.percRecebido ?? 0}%)</span>
              <span className="text-sm md:text-base font-bold text-emerald-400 font-mono">{fmtCurrency(conc?.valorRecebido || 0)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">A Receber ({conc?.percAberto ?? 0}%)</span>
              <span className="text-sm md:text-base font-bold text-amber-300 font-mono">{fmtCurrency(conc?.valorAberto || 0)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
            <span>{fmtNumber(conc?.qtdAberto || 0)} títulos em aberto</span>
            <span>Prazo médio: <strong className="text-slate-200">{conc?.prazoMedioGeral ?? 0} dias</strong></span>
          </div>
        </div>
      </div>

      {/* Segunda Faixa: Detalhamento por Modalidade (Crédito à Vista 1x, Crédito Parcelado 2x+, Débito/Voucher e Líder) */}
      {mod && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            onClick={() => setFiltroModalidade(filtroModalidade === "credito" ? "todas" : "credito")}
            className={`cursor-pointer rounded-xl p-3.5 border transition-all ${
              filtroModalidade === "credito"
                ? "bg-indigo-950/60 border-indigo-400 shadow-lg shadow-indigo-500/10"
                : "bg-slate-900/60 border-white/10 hover:border-indigo-500/40"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-indigo-300 font-semibold">
              <span>CRÉDITO À VISTA (1x)</span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-200 font-mono text-[10px]">
                {mod.creditoVista.percentual}%
              </span>
            </div>
            <div className="text-lg font-bold text-white font-mono mt-1">{fmtCurrency(mod.creditoVista.valor)}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{fmtNumber(mod.creditoVista.qtd)} cupons</span>
              <span>TM: {fmtCurrency(mod.creditoVista.ticketMedio)}</span>
            </div>
          </div>

          <div
            onClick={() => setFiltroModalidade(filtroModalidade === "credito" ? "todas" : "credito")}
            className={`cursor-pointer rounded-xl p-3.5 border transition-all ${
              filtroModalidade === "credito"
                ? "bg-purple-950/60 border-purple-400 shadow-lg shadow-purple-500/10"
                : "bg-slate-900/60 border-white/10 hover:border-purple-500/40"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-purple-300 font-semibold">
              <span>CRÉDITO PARCELADO (2x até {mod.creditoParcelado.maxParcelas || 12}x)</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200 font-mono text-[10px]">
                {mod.creditoParcelado.percentual}%
              </span>
            </div>
            <div className="text-lg font-bold text-white font-mono mt-1">{fmtCurrency(mod.creditoParcelado.valor)}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{fmtNumber(mod.creditoParcelado.qtd)} cupons</span>
              <span>TM: {fmtCurrency(mod.creditoParcelado.ticketMedio)}</span>
            </div>
          </div>

          <div
            onClick={() => setFiltroModalidade(filtroModalidade === "debito" ? "todas" : "debito")}
            className={`cursor-pointer rounded-xl p-3.5 border transition-all ${
              filtroModalidade === "debito"
                ? "bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-500/10"
                : "bg-slate-900/60 border-white/10 hover:border-cyan-500/40"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-cyan-300 font-semibold">
              <span>DÉBITO / VOUCHERS / PIX TEF</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 font-mono text-[10px]">
                {mod.debito.percentual}%
              </span>
            </div>
            <div className="text-lg font-bold text-white font-mono mt-1">{fmtCurrency(mod.debito.valor)}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{fmtNumber(mod.debito.qtd)} cupons</span>
              <span>TM: {fmtCurrency(mod.debito.ticketMedio)}</span>
            </div>
          </div>

          <div
            onClick={() => setFiltroModalidade(filtroModalidade === "aberto" ? "todas" : "aberto")}
            className={`cursor-pointer rounded-xl p-3.5 border transition-all ${
              filtroModalidade === "aberto"
                ? "bg-amber-950/60 border-amber-400 shadow-lg shadow-amber-500/10"
                : "bg-slate-900/60 border-white/10 hover:border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-amber-300 font-semibold">
              <span>SALDO A RECEBER (EM ABERTO)</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 font-mono text-[10px]">
                {conc?.percAberto ?? 0}%
              </span>
            </div>
            <div className="text-lg font-bold text-amber-300 font-mono mt-1">{fmtCurrency(conc?.valorAberto || 0)}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{fmtNumber(conc?.qtdAberto || 0)} títulos pendentes</span>
              <span className="text-amber-300/90 underline">Filtrar abertos</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setViewTab("ranking")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              viewTab === "ranking"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <BarChart2 className="size-3.5" />
            Ranking Detalhado por Bandeira
          </button>
          <button
            onClick={() => setViewTab("modalidades")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              viewTab === "modalidades"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Calendar className="size-3.5" />
            Evolução Diária & Recebíveis
          </button>
          <button
            onClick={() => setViewTab("lojas")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              viewTab === "lojas"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Building2 className="size-3.5" />
            Visão por Loja ({data?.porLoja?.length || 0})
          </button>
          <button
            onClick={() => setViewTab("detalhes")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              viewTab === "detalhes"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers className="size-3.5" />
            Tabela Analítica Completa
          </button>
        </div>

        {/* Filtros Rápidos + Busca */}
        <div className="flex items-center gap-2 flex-wrap">
          {filtroModalidade !== "todas" && (
            <button
              onClick={() => setFiltroModalidade("todas")}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-semibold flex items-center gap-1"
            >
              Filtro: {filtroModalidade.toUpperCase()}
              <X className="size-3" />
            </button>
          )}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar bandeira ou código..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 glass-strong rounded-2xl border border-white/10 gap-3">
          <RefreshCw className="size-8 text-blue-400 animate-spin" />
          <p className="text-sm text-slate-300 font-medium">Consultando transações de cartões e conciliação no DB2...</p>
          <span className="text-xs text-slate-500">Tabelas DBA.CONTAS_RECEBER e DBA.BANDEIRAS</span>
        </div>
      ) : filteredResumo.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 glass-strong rounded-2xl border border-white/10 gap-2 text-center">
          <CreditCard className="size-10 text-slate-600 mb-1" />
          <h3 className="text-base font-semibold text-slate-200">Nenhuma venda encontrada</h3>
          <p className="text-xs text-slate-400 max-w-md">
            Não foram localizadas transações com bandeira no período selecionado ou com os filtros aplicados.
          </p>
        </div>
      ) : (
        <>
          {/* TAB 1: RANKING DETALHADO POR BANDEIRA */}
          {viewTab === "ranking" && (
            <div className="glass-strong rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BarChart2 className="size-4 text-blue-400" />
                    Ranking Analítico por Bandeira de Cartão
                  </h3>
                  <p className="text-xs text-slate-400">
                    Clique em qualquer bandeira ou em <strong className="text-blue-300">"Ver Cupons TEF"</strong> para abrir a auditoria de transações, NSU, caixas e distribuição por loja
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">
                    {filteredResumo.length} bandeiras listadas
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {filteredResumo.map((bandeira, index) => {
                  const style = getBandeiraStyle(bandeira.nome);
                  const ticketMedio = bandeira.qtd > 0 ? bandeira.valor / bandeira.qtd : 0;
                  const valCred = bandeira.valorCredito || 0;
                  const valDeb = bandeira.valorDebito || 0;
                  const valRec = bandeira.valorRecebido || 0;
                  const valAb = bandeira.valorAberto || 0;

                  return (
                    <div
                      key={bandeira.id}
                      onClick={() => abrirRaioXBandeira(bandeira)}
                      className="cursor-pointer p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-blue-500/40 hover:bg-slate-900/90 transition-all flex flex-col gap-3 group"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Lado Esquerdo: Posição, Ícone e Nome da Bandeira */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className={`size-8 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                            index === 0
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black shadow-sm"
                              : index === 1
                              ? "bg-slate-300/20 text-slate-200 border border-slate-300/30"
                              : index === 2
                              ? "bg-amber-700/20 text-amber-500 border border-amber-700/30"
                              : "bg-white/5 text-slate-400 border border-white/5"
                          }`}>
                            #{index + 1}
                          </span>

                          <div className={`p-2.5 rounded-xl shrink-0 ${style.badgeBg}`}>
                            <CreditCard className="size-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm md:text-base text-white group-hover:text-blue-300 transition-colors">
                                {bandeira.nome}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${style.badgeBg}`}>
                                Cód {bandeira.id}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                                {style.categoria}
                              </span>
                              {(bandeira.maxParcelas || 1) > 1 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold">
                                  Até {bandeira.maxParcelas}x
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2.5 flex-wrap mt-1">
                              <span><strong className="text-slate-200">{fmtNumber(bandeira.qtd)}</strong> transações</span>
                              <span>•</span>
                              <span>Ticket médio: <strong className="text-slate-200">{fmtCurrency(ticketMedio)}</strong></span>
                              {bandeira.prazoMedioDias !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-3 text-slate-400" />
                                    Prazo médio: <strong className="text-slate-200">{bandeira.prazoMedioDias}d</strong>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Lado Direito: Valor Total, % e Botão Raio-X */}
                        <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                          <div className="hidden md:flex flex-col items-end gap-1 w-28">
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${style.barGrad} transition-all duration-500`}
                                style={{ width: `${Math.min(100, Math.max(2, bandeira.percentual))}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {bandeira.percentual.toFixed(2)}% da rede
                            </span>
                          </div>

                          <div className="flex flex-col sm:items-end">
                            <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 tabular-nums tracking-tight">
                              {fmtCurrency(bandeira.valor)}
                            </div>
                            <div className="text-[10px] font-semibold text-blue-400">
                              {bandeira.percentual.toFixed(1)}% do total
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirRaioXBandeira(bandeira);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all shrink-0"
                          >
                            <Eye className="size-3.5" />
                            <span className="hidden sm:inline">Ver Cupons TEF</span>
                          </button>
                        </div>
                      </div>

                      {/* Sub-barra de Detalhes da Bandeira: Crédito vs Débito, Pago vs Aberto, e Lojas */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
                        {/* Modalidades da Bandeira */}
                        <div className="flex items-center justify-between bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="text-slate-400">Modalidade:</span>
                          <div className="flex items-center gap-2 font-mono">
                            {valCred > 0 && (
                              <span className="text-indigo-300">
                                Créd: <strong>{fmtCurrency(valCred)}</strong>
                                {(bandeira.valorCreditoParcelado || 0) > 0 ? ` (${fmtCurrency(bandeira.valorCreditoParcelado || 0)} parc.)` : ""}
                              </span>
                            )}
                            {valCred > 0 && valDeb > 0 && <span className="text-slate-600">|</span>}
                            {valDeb > 0 && (
                              <span className="text-cyan-300">
                                Déb/Vouch: <strong>{fmtCurrency(valDeb)}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status de Conciliação */}
                        <div className="flex items-center justify-between bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="text-slate-400">Conciliação:</span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-emerald-400">
                              Pago: <strong>{fmtCurrency(valRec)}</strong>
                            </span>
                            {valAb > 0 && (
                              <>
                                <span className="text-slate-600">|</span>
                                <span className="text-amber-300">
                                  Aberto: <strong>{fmtCurrency(valAb)}</strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Distribuição por Filial */}
                        <div className="flex items-center justify-between bg-black/30 px-3 py-1.5 rounded-lg border border-white/5 overflow-hidden">
                          <span className="text-slate-400 shrink-0 mr-2">Filiais:</span>
                          <div className="flex items-center gap-1.5 truncate font-mono text-[10px]">
                            {(bandeira.lojas || []).map((l) => (
                              <span key={l.id} className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                                L{l.id}: {l.percentual}%
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: EVOLUÇÃO DIÁRIA & AGENDA DE RECEBÍVEIS */}
          {viewTab === "modalidades" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Evolução Diária de Vendas em Cartão */}
              <div className="glass-strong rounded-2xl p-5 border border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="size-4 text-blue-400" />
                      Faturamento Diário em Cartões (Crédito vs Débito)
                    </h3>
                    <p className="text-xs text-slate-400">Movimentação diária conciliada por data de venda</p>
                  </div>
                  <span className="text-xs font-mono text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                    {data?.porDia?.length || 0} dias
                  </span>
                </div>

                <div className="max-h-[460px] overflow-y-auto pr-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-900 text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3 text-right">Cupons</th>
                        <th className="py-2.5 px-3 text-right">Crédito</th>
                        <th className="py-2.5 px-3 text-right">Débito / Voucher</th>
                        <th className="py-2.5 px-3 text-right">Total Dia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {(data?.porDia || []).slice().reverse().map((d) => (
                        <tr key={d.data} className="hover:bg-white/[0.03]">
                          <td className="py-2 px-3 text-slate-200 font-semibold">{fmtDateBr(d.data)}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{fmtNumber(d.qtd)}</td>
                          <td className="py-2 px-3 text-right text-indigo-300">{fmtCurrency(d.credito)}</td>
                          <td className="py-2 px-3 text-right text-cyan-300">{fmtCurrency(d.debito)}</td>
                          <td className="py-2 px-3 text-right text-emerald-400 font-bold">{fmtCurrency(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cronograma de Recebíveis em Aberto (Por Data de Vencimento) */}
              <div className="glass-strong rounded-2xl p-5 border border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Wallet className="size-4 text-amber-400" />
                      Agenda de Recebíveis de Cartão (Títulos em Aberto)
                    </h3>
                    <p className="text-xs text-slate-400">Previsão de liquidação por data de vencimento das operadoras</p>
                  </div>
                  <span className="text-xs font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    {fmtCurrency(conc?.valorAberto || 0)} a receber
                  </span>
                </div>

                <div className="max-h-[460px] overflow-y-auto pr-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-900 text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="py-2.5 px-3">Vencimento</th>
                        <th className="py-2.5 px-3 text-right">Títulos</th>
                        <th className="py-2.5 px-3 text-right">Crédito</th>
                        <th className="py-2.5 px-3 text-right">Débito / Voucher</th>
                        <th className="py-2.5 px-3 text-right">Valor a Receber</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {(data?.recebiveis || []).map((r) => (
                        <tr key={r.vencimento} className="hover:bg-white/[0.03]">
                          <td className="py-2 px-3 text-slate-200 font-semibold">{fmtDateBr(r.vencimento)}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{fmtNumber(r.qtd)}</td>
                          <td className="py-2 px-3 text-right text-indigo-300">{fmtCurrency(r.credito)}</td>
                          <td className="py-2 px-3 text-right text-cyan-300">{fmtCurrency(r.debito)}</td>
                          <td className="py-2 px-3 text-right text-amber-300 font-bold">{fmtCurrency(r.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VISÃO POR LOJA */}
          {viewTab === "lojas" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.porLoja?.map((loja) => {
                const isExpanded = !!expandedLojas[loja.id];
                const listaBandeiras = isExpanded ? loja.bandeiras : loja.bandeiras.slice(0, 8);
                return (
                  <div
                    key={loja.id}
                    className="glass-strong rounded-2xl p-5 border border-white/10 flex flex-col gap-4 hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                          {loja.id}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{loja.nome}</h4>
                          <p className="text-[11px] text-slate-400">
                            {fmtNumber(loja.qtdGeral || 0)} transações • TM {fmtCurrency(loja.ticketMedio || 0)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-400 font-mono">{fmtCurrency(loja.totalGeral)}</div>
                        <div className="text-[10px] text-slate-400">{loja.percentualTotal.toFixed(1)}% da rede</div>
                      </div>
                    </div>

                    {/* Resumo Crédito / Débito / Conciliação da Loja */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/30 p-2.5 rounded-xl border border-white/5 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Crédito:</span>
                        <strong className="text-indigo-300">{fmtCurrency(loja.valorCredito || 0)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Débito / Voucher:</span>
                        <strong className="text-cyan-300">{fmtCurrency(loja.valorDebito || 0)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Já Recebido:</span>
                        <strong className="text-emerald-400">{fmtCurrency(loja.valorRecebido || 0)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">A Receber:</span>
                        <strong className="text-amber-300">{fmtCurrency(loja.valorAberto || 0)}</strong>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Bandeiras na Filial ({loja.bandeiras.length}):</span>
                        <span>Valor / %</span>
                      </div>
                      {listaBandeiras.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => abrirRaioXBandeira(b)}
                          className="cursor-pointer flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-white/5 border-b border-white/5 last:border-0"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-slate-200 truncate">{b.nome}</span>
                            <span className="text-[10px] text-slate-500 shrink-0">({fmtNumber(b.qtd)}x)</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 font-mono">
                            <span className="font-semibold text-white">{fmtCurrency(b.valor)}</span>
                            <span className="text-[10px] text-blue-400 font-bold min-w-[38px] text-right">
                              {b.percentual.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}

                      {loja.bandeiras.length > 8 && (
                        <button
                          onClick={() => setExpandedLojas((prev) => ({ ...prev, [loja.id]: !isExpanded }))}
                          className="mt-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-blue-300 font-semibold flex items-center justify-center gap-1"
                        >
                          {isExpanded ? "Mostrar Top 8" : `Ver todas as ${loja.bandeiras.length} bandeiras`}
                          <ChevronDown className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: TABELA ANALÍTICA COMPLETA */}
          {viewTab === "detalhes" && (
            <div className="glass-strong rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">Relatório Analítico Completo por Bandeira</h3>
                  <p className="text-xs text-slate-400">
                    Discriminação completa: Crédito à Vista, Crédito Parcelado, Débito/Voucher, Recebido, A Receber e Prazo Médio
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-slate-300 font-semibold">
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">Cód</th>
                      <th className="py-3 px-3">Bandeira</th>
                      <th className="py-3 px-3 text-right">Cupons</th>
                      <th className="py-3 px-3 text-right">Ticket Médio</th>
                      <th className="py-3 px-3 text-right">Crédito 1x</th>
                      <th className="py-3 px-3 text-right">Crédito Parc.</th>
                      <th className="py-3 px-3 text-right">Débito / Voucher</th>
                      <th className="py-3 px-3 text-right">Já Recebido</th>
                      <th className="py-3 px-3 text-right">A Receber</th>
                      <th className="py-3 px-3 text-center">Prazo</th>
                      <th className="py-3 px-3 text-right">Valor Total</th>
                      <th className="py-3 px-3 text-right">%</th>
                      <th className="py-3 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {filteredResumo.map((b, idx) => {
                      const ticketMedio = b.qtd > 0 ? b.valor / b.qtd : 0;
                      const style = getBandeiraStyle(b.nome);

                      return (
                        <tr
                          key={b.id}
                          onClick={() => abrirRaioXBandeira(b)}
                          className="hover:bg-white/[0.04] transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-slate-400">{b.id}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${style.badgeBg}`}>
                              {b.nome}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-200">{fmtNumber(b.qtd)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300">{fmtCurrency(ticketMedio)}</td>
                          <td className="py-2.5 px-3 text-right text-indigo-300">{fmtCurrency(b.valorCreditoVista || 0)}</td>
                          <td className="py-2.5 px-3 text-right text-purple-300">{fmtCurrency(b.valorCreditoParcelado || 0)}</td>
                          <td className="py-2.5 px-3 text-right text-cyan-300">{fmtCurrency(b.valorDebito || 0)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">{fmtCurrency(b.valorRecebido || 0)}</td>
                          <td className="py-2.5 px-3 text-right text-amber-300">{fmtCurrency(b.valorAberto || 0)}</td>
                          <td className="py-2.5 px-3 text-center text-slate-300">{b.prazoMedioDias || 0}d</td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">{fmtCurrency(b.valor)}</td>
                          <td className="py-2.5 px-3 text-right text-blue-400 font-bold">{b.percentual.toFixed(2)}%</td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirRaioXBandeira(b);
                              }}
                              className="px-2 py-1 rounded bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 text-[10px] font-semibold"
                            >
                              Cupons
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 bg-black/40 font-bold text-white font-mono">
                      <td colSpan={3} className="py-3 px-3 text-right uppercase text-[11px] text-slate-400 font-sans">
                        Total Consolidado:
                      </td>
                      <td className="py-3 px-3 text-right text-slate-200">{fmtNumber(metricas.qtd)}</td>
                      <td className="py-3 px-3 text-right text-slate-200">{fmtCurrency(metricas.ticketMedio)}</td>
                      <td className="py-3 px-3 text-right text-indigo-300">{fmtCurrency(mod?.creditoVista?.valor || 0)}</td>
                      <td className="py-3 px-3 text-right text-purple-300">{fmtCurrency(mod?.creditoParcelado?.valor || 0)}</td>
                      <td className="py-3 px-3 text-right text-cyan-300">{fmtCurrency(mod?.debito?.valor || 0)}</td>
                      <td className="py-3 px-3 text-right text-emerald-400">{fmtCurrency(conc?.valorRecebido || 0)}</td>
                      <td className="py-3 px-3 text-right text-amber-300">{fmtCurrency(conc?.valorAberto || 0)}</td>
                      <td className="py-3 px-3 text-center text-slate-300">{conc?.prazoMedioGeral || 0}d</td>
                      <td className="py-3 px-3 text-right text-emerald-400 text-sm">{fmtCurrency(metricas.total)}</td>
                      <td className="py-3 px-3 text-right text-blue-400">100%</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL RAIO-X DA BANDEIRA & AUDITORIA DE CUPONS TEF */}
      {selectedBandeira && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-950 border border-white/15 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-blue-950/40">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${getBandeiraStyle(selectedBandeira.nome).badgeBg}`}>
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Raio-X da Bandeira: {selectedBandeira.nome}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                      Cód {selectedBandeira.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fmtNumber(selectedBandeira.qtd)} transações • Total {fmtCurrency(selectedBandeira.valor)} • Ticket Médio {fmtCurrency(selectedBandeira.qtd > 0 ? selectedBandeira.valor / selectedBandeira.qtd : 0)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBandeira(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Resumo Interno da Bandeira */}
            <div className="p-4 border-b border-white/10 bg-slate-900/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase">Crédito à Vista (1x)</span>
                <strong className="text-indigo-300 font-mono text-sm block mt-0.5">
                  {fmtCurrency(selectedBandeira.valorCreditoVista || 0)}
                </strong>
                <span className="text-[10px] text-slate-500">{fmtNumber(selectedBandeira.qtdCreditoVista || 0)} cupons</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase">
                  Crédito Parcelado (até {selectedBandeira.maxParcelas || 1}x)
                </span>
                <strong className="text-purple-300 font-mono text-sm block mt-0.5">
                  {fmtCurrency(selectedBandeira.valorCreditoParcelado || 0)}
                </strong>
                <span className="text-[10px] text-slate-500">{fmtNumber(selectedBandeira.qtdCreditoParcelado || 0)} cupons</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase">Débito / Voucher</span>
                <strong className="text-cyan-300 font-mono text-sm block mt-0.5">
                  {fmtCurrency(selectedBandeira.valorDebito || 0)}
                </strong>
                <span className="text-[10px] text-slate-500">{fmtNumber(selectedBandeira.qtdDebito || 0)} cupons</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase">Conciliação Financeira</span>
                <div className="flex items-center justify-between font-mono text-xs mt-0.5">
                  <span className="text-emerald-400">Pago: {fmtCurrency(selectedBandeira.valorRecebido || 0)}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px] text-amber-300">
                  <span>Aberto: {fmtCurrency(selectedBandeira.valorAberto || 0)}</span>
                  <span className="text-slate-400">{selectedBandeira.prazoMedioDias || 0}d</span>
                </div>
              </div>
            </div>

            {/* Filtros de Transações do Modal */}
            <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between flex-wrap gap-2 bg-slate-950">
              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="size-3.5 text-blue-400" />
                <span className="text-slate-400 font-medium">Filtrar Cupons TEF:</span>
                {(["todos", "C", "D"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => abrirRaioXBandeira(selectedBandeira, t, filtroStatusModal)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                      filtroTipoModal === t ? "bg-blue-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {t === "todos" ? "Todas Modalidades" : t === "C" ? "Só Crédito" : "Só Débito/Voucher"}
                  </button>
                ))}
                {(["todos", "T", "F"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => abrirRaioXBandeira(selectedBandeira, filtroTipoModal, st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                      filtroStatusModal === st ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {st === "todos" ? "Todos Status" : st === "T" ? "Conciliados (Pagos)" : "A Receber (Abertos)"}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Exibindo {transacoes.length} transações
              </span>
            </div>

            {/* Tabela de Transações / Cupons TEF */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingTransacoes ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <RefreshCw className="size-6 text-blue-400 animate-spin" />
                  <span className="text-xs text-slate-400">Carregando cupons fiscais e registros TEF...</span>
                </div>
              ) : transacoes.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  Nenhuma transação encontrada para este filtro.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-slate-300 font-semibold">
                      <th className="py-2.5 px-3">Data Venda</th>
                      <th className="py-2.5 px-3">Vencimento</th>
                      <th className="py-2.5 px-3">Loja</th>
                      <th className="py-2.5 px-3">Modalidade</th>
                      <th className="py-2.5 px-3 text-center">Parc.</th>
                      <th className="py-2.5 px-3 text-center">Caixa / Cupom</th>
                      <th className="py-2.5 px-3">NSU TEF / Autorização</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {transacoes.map((t, i) => (
                      <tr key={`${t.idTitulo}-${i}`} className="hover:bg-white/[0.03]">
                        <td className="py-2 px-3 text-slate-200">{fmtDateBr(t.dataMovimento)}</td>
                        <td className="py-2 px-3 text-slate-400">{fmtDateBr(t.dataVencimento)}</td>
                        <td className="py-2 px-3 text-slate-300 font-sans truncate max-w-[160px]" title={t.lojaNome}>
                          L{t.lojaId} - {t.lojaNome.replace("Supermercados Albuquerque ", "")}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            t.codigoTipo === "C" ? "bg-indigo-500/20 text-indigo-300" : "bg-cyan-500/20 text-cyan-300"
                          }`}>
                            {t.tipoCartao}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-slate-300">{t.parcelas}x</td>
                        <td className="py-2 px-3 text-center text-slate-300">
                          {t.caixa ? `Cx ${t.caixa}` : "—"} {t.cupomFiscal ? `/ #${t.cupomFiscal}` : ""}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">
                          {t.nsuTef ? `NSU ${t.nsuTef}` : ""}
                          {t.autorizacaoSitef ? ` • Aut ${t.autorizacaoSitef}` : ""}
                          {t.binCartao ? ` • BIN ${t.binCartao}` : ""}
                          {!t.nsuTef && !t.autorizacaoSitef && !t.binCartao ? `Tít #${t.idTitulo}` : ""}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.statusBaixada ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-300"
                          }`}>
                            {t.statusBaixada ? "● Pago" : "● Aberto"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-bold">{fmtCurrency(t.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
