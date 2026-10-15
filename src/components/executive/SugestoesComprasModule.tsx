import React, { useState, useEffect, useMemo } from "react";
import { 
  ShoppingBag, 
  Search, 
  AlertTriangle, 
  Package, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  Layers, 
  ShieldCheck, 
  RotateCcw, 
  Send, 
  Filter, 
  TrendingUp, 
  Eye, 
  Sparkles, 
  UserCheck, 
  Check, 
  ChevronRight, 
  AlertOctagon, 
  Tag, 
  Store,
  RefreshCw,
  FileSpreadsheet,
  BadgeAlert,
  ArrowUpDown,
  History,
  Info,
  Smartphone,
  QrCode,
  ExternalLink,
  Copy,
  Ban,
  Power
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SugestoesComprasModuleProps {
  selectedStore?: string;
}

interface ProdutoItem {
  idProduto: number;
  descricao: string;
  referencia: string;
  marca: string;
  codBarras: string;
  estoqueAtual: number;
  valorVenda: number;
  custoMedio: number;
  dtUltimaVenda: string | null;
  inativo?: boolean;
}

interface SolicitacaoItem {
  id: string;
  tipo: "sugestao_compra" | "estoque_zerado" | "correcao_estoque";
  idProduto: number;
  descricao: string;
  codBarras: string;
  marca: string;
  referencia: string;
  idEmpresa: number;
  nomeLoja: string;
  gerente: string;
  dataHora: string;
  status: "pendente" | "em_analise" | "aprovado" | "comprado" | "rejeitado";
  quantidadeSugerida: number;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  observacao: string;
  estoqueSistema: number;
  estoqueFisico: number | null;
  diferenca: number | null;
  motivoCorrecao: string | null;
  requerAprovacao: boolean;
  respostaCentral: string;
  responsavelAprovacao: string | null;
  dataAprovacao: string | null;
  historico: Array<{
    dataHora: string;
    status: string;
    usuario: string;
    acao: string;
  }>;
}

interface GrupoProduto {
  idProduto: number;
  descricao: string;
  marca: string;
  codBarras: string;
  referencia: string;
  totalQtdSugerida: number;
  totalLojas: number;
  maiorPrioridade: "baixa" | "media" | "alta" | "urgente";
  solicitacoesIds: string[];
  lojas: Array<{
    idEmpresa: number;
    nomeLoja: string;
    gerente: string;
    quantidade: number;
    prioridade: string;
    dataHora: string;
    solicitacoes: SolicitacaoItem[];
  }>;
}

interface LojaOption {
  IDEMPRESA: number;
  DESCREMPRESA: string;
}

const fmtCurrency = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return d;
  }
};

export function SugestoesComprasModule({ selectedStore: externalStore }: SugestoesComprasModuleProps) {
  // Controle de modo: "gerente" (Unidade do Gerente) vs "central" (Setor de Compras / Diretoria)
  const [userRole, setUserRole] = useState<"gerente" | "central">("gerente");
  
  // Unidade ativa do Gerente
  const [lojas, setLojas] = useState<LojaOption[]>([]);
  const [activeLojaId, setActiveLojaId] = useState<number>(1);
  const [gerenteNome, setGerenteNome] = useState<string>("Gerente da Unidade");

  // Abas do módulo
  const [currentTab, setCurrentTab] = useState<"produtos" | "solicitacoes" | "central" | "agrupado">("produtos");

  // Estados de Busca e Produtos
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [filtroEstoque, setFiltroEstoque] = useState<"todos" | "sem_estoque" | "com_estoque">("todos");
  const [filtroStatusInativo, setFiltroStatusInativo] = useState<"todos" | "ativos" | "inativos">("todos");

  const handleToggleInativarProduto = async (prod: ProdutoItem) => {
    const novoStatusInativo = !prod.inativo;
    try {
      const res = await fetch("/api/sugestoes-compras/produtos/inativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idProduto: prod.idProduto,
          inativo: novoStatusInativo,
          gerente: gerenteNome
        })
      });

      if (!res.ok) throw new Error("Erro ao alterar status de inativação");

      setProdutos((prev) =>
        prev.map((p) =>
          p.idProduto === prod.idProduto ? { ...p, inativo: novoStatusInativo } : p
        )
      );

      if (novoStatusInativo) {
        toast.warning(`Produto #${prod.idProduto} (${prod.descricao}) marcado como INATIVO!`);
      } else {
        toast.success(`Produto #${prod.idProduto} (${prod.descricao}) REATIVADO com sucesso!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao inativar produto.");
    }
  };

  const produtosExibidos = useMemo(() => {
    return produtos.filter((p) => {
      if (filtroStatusInativo === "ativos") return !p.inativo;
      if (filtroStatusInativo === "inativos") return p.inativo;
      return true;
    });
  }, [produtos, filtroStatusInativo]);

  // Estados de Solicitações e Agrupados
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoItem[]>([]);
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(false);
  const [agrupados, setAgrupados] = useState<GrupoProduto[]>([]);
  const [loadingAgrupados, setLoadingAgrupados] = useState(false);

  // Filtros de Solicitações
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>("todos");
  const [filtroLojaCentral, setFiltroLojaCentral] = useState<string>("todas");

  // Modais de Ação
  const [selectedProduct, setSelectedProduct] = useState<ProdutoItem | null>(null);
  const [modalCompraOpen, setModalCompraOpen] = useState(false);
  const [modalZeradoOpen, setModalZeradoOpen] = useState(false);
  const [modalCorrecaoOpen, setModalCorrecaoOpen] = useState(false);
  const [modalDetalheOpen, setModalDetalheOpen] = useState(false);
  const [modalQrOpen, setModalQrOpen] = useState(false);
  const [solicitacaoAtiva, setSolicitacaoAtiva] = useState<SolicitacaoItem | null>(null);

  // Form Fields para Sugestão de Compra
  const [formQtd, setFormQtd] = useState<number>(10);
  const [formPrioridade, setFormPrioridade] = useState<"baixa" | "media" | "alta" | "urgente">("media");
  const [formObs, setFormObs] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Form Fields para Correção de Estoque
  const [formEstoqueFisico, setFormEstoqueFisico] = useState<number>(0);
  const [formMotivoCorrecao, setFormMotivoCorrecao] = useState("Avaria não lançada");
  const [formCorrecaoObs, setFormCorrecaoObs] = useState("");

  // Form Fields para Aprovação / Central de Compras
  const [statusResposta, setStatusResposta] = useState("");
  const [responsavelCentralNome, setResponsavelCentralNome] = useState("Equipe de Compras & Auditoria");

  // Carregar lista de empresas
  useEffect(() => {
    fetch("/api/empresas")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLojas(data);
          if (externalStore && externalStore !== "todas") {
            setActiveLojaId(Number(externalStore));
          } else {
            setActiveLojaId(data[0].IDEMPRESA);
          }
        }
      })
      .catch((err) => console.error("Erro ao carregar lojas:", err));
  }, [externalStore]);

  // Atualizar nome do gerente quando trocar de loja
  useEffect(() => {
    const lojaAtual = lojas.find((l) => l.IDEMPRESA === activeLojaId);
    if (lojaAtual) {
      const nomeLimpo = String(lojaAtual.DESCREMPRESA || "").trim();
      setGerenteNome(`Gerente - ${nomeLimpo}`);
    }
  }, [activeLojaId, lojas]);

  // Nome da loja ativa
  const currentLojaNome = useMemo(() => {
    const l = lojas.find((item) => item.IDEMPRESA === activeLojaId);
    return l ? String(l.DESCREMPRESA || "").trim() : `Unidade ${activeLojaId}`;
  }, [lojas, activeLojaId]);

  // Buscar produtos com base no termo e na loja ativa
  const buscarProdutos = async (termo = searchQuery, apenasZerados = filtroEstoque === "sem_estoque") => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("idEmpresa", String(activeLojaId));
      if (termo) params.append("query", termo);
      if (apenasZerados) params.append("apenasSemEstoque", "true");
      params.append("limit", "60");

      const res = await fetch(`/api/sugestoes-compras/produtos?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProdutos(data);
      } else {
        setProdutos([]);
      }
    } catch (err) {
      toast.error("Falha ao consultar produtos no banco DB2");
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Carregar produtos iniciais da unidade
  useEffect(() => {
    buscarProdutos(searchQuery, filtroEstoque === "sem_estoque");
  }, [activeLojaId, filtroEstoque]);

  // Carregar lista de solicitações
  const carregarSolicitacoes = async () => {
    setLoadingSolicitacoes(true);
    try {
      const params = new URLSearchParams();
      if (userRole === "gerente") {
        params.append("idEmpresa", String(activeLojaId));
      } else if (filtroLojaCentral !== "todas") {
        params.append("idEmpresa", filtroLojaCentral);
      }
      if (filtroTipo !== "todos") params.append("tipo", filtroTipo);
      if (filtroStatus !== "todos") params.append("status", filtroStatus);
      if (filtroPrioridade !== "todos") params.append("prioridade", filtroPrioridade);

      const res = await fetch(`/api/sugestoes-compras/solicitacoes?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSolicitacoes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSolicitacoes(false);
    }
  };

  // Carregar agrupamento de produtos
  const carregarAgrupados = async () => {
    setLoadingAgrupados(true);
    try {
      const res = await fetch("/api/sugestoes-compras/agrupado-produtos");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAgrupados(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAgrupados(false);
    }
  };

  // Gatilho para recarregar solicitações e agrupados
  useEffect(() => {
    if (currentTab === "solicitacoes" || currentTab === "central") {
      carregarSolicitacoes();
    }
    if (currentTab === "agrupado" || currentTab === "central") {
      carregarAgrupados();
    }
  }, [currentTab, userRole, activeLojaId, filtroLojaCentral, filtroTipo, filtroStatus, filtroPrioridade]);

  // Ação 1: Enviar Sugestão de Compra
  const handleEnviarSugestaoCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmittingAction(true);

    try {
      const payload = {
        tipo: "sugestao_compra",
        idProduto: selectedProduct.idProduto,
        descricao: selectedProduct.descricao,
        codBarras: selectedProduct.codBarras,
        marca: selectedProduct.marca,
        referencia: selectedProduct.referencia,
        idEmpresa: activeLojaId,
        nomeLoja: currentLojaNome,
        gerente: gerenteNome,
        quantidadeSugerida: formQtd,
        prioridade: formPrioridade,
        observacao: formObs,
        estoqueSistema: selectedProduct.estoqueAtual
      };

      const res = await fetch("/api/sugestoes-compras/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Erro ao salvar solicitação");

      toast.success(`Sugestão de compra enviada para "${selectedProduct.descricao}" (${formQtd} un)!`);
      setModalCompraOpen(false);
      setFormObs("");
      setFormQtd(10);
      carregarSolicitacoes();
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar sugestão de compra");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Ação 2: Sinalizar Estoque Zerado (Ruptura Imediata)
  const handleConfirmarEstoqueZerado = async () => {
    if (!selectedProduct) return;
    setSubmittingAction(true);

    try {
      const payload = {
        tipo: "estoque_zerado",
        idProduto: selectedProduct.idProduto,
        descricao: selectedProduct.descricao,
        codBarras: selectedProduct.codBarras,
        marca: selectedProduct.marca,
        referencia: selectedProduct.referencia,
        idEmpresa: activeLojaId,
        nomeLoja: currentLojaNome,
        gerente: gerenteNome,
        quantidadeSugerida: formQtd > 0 ? formQtd : 20,
        prioridade: "urgente",
        observacao: formObs || "Sinalizado pelo gerente da unidade: Gôndola e estoque físico esgotados (Ruptura).",
        estoqueSistema: selectedProduct.estoqueAtual
      };

      const res = await fetch("/api/sugestoes-compras/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Erro ao sinalizar estoque zerado");

      toast.error(`Ruptura sinalizada com prioridade URGENTE para a Central de Compras!`);
      setModalZeradoOpen(false);
      setFormObs("");
      carregarSolicitacoes();
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar ruptura");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Ação 3: Solicitar Correção de Estoque Físico
  const handleEnviarCorrecaoEstoque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmittingAction(true);

    try {
      const payload = {
        tipo: "correcao_estoque",
        idProduto: selectedProduct.idProduto,
        descricao: selectedProduct.descricao,
        codBarras: selectedProduct.codBarras,
        marca: selectedProduct.marca,
        referencia: selectedProduct.referencia,
        idEmpresa: activeLojaId,
        nomeLoja: currentLojaNome,
        gerente: gerenteNome,
        quantidadeSugerida: Math.abs(formEstoqueFisico - selectedProduct.estoqueAtual),
        prioridade: "alta",
        observacao: formCorrecaoObs,
        estoqueSistema: selectedProduct.estoqueAtual,
        estoqueFisico: formEstoqueFisico,
        motivoCorrecao: formMotivoCorrecao
      };

      const res = await fetch("/api/sugestoes-compras/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Erro ao registrar correção");

      toast.info(
        `Solicitação de correção de estoque enviada para auditoria! Físico: ${formEstoqueFisico} vs Sistema: ${selectedProduct.estoqueAtual}.`
      );
      setModalCorrecaoOpen(false);
      setFormCorrecaoObs("");
      carregarSolicitacoes();
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar correção de estoque");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Atualizar Status (Para Central de Compras e Auditoria)
  const handleAtualizarStatus = async (
    id: string,
    novoStatus: "pendente" | "em_analise" | "aprovado" | "comprado" | "rejeitado",
    notaCentral?: string
  ) => {
    try {
      const res = await fetch(`/api/sugestoes-compras/solicitacoes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: novoStatus,
          respostaCentral: notaCentral !== undefined ? notaCentral : statusResposta,
          responsavelAprovacao: responsavelCentralNome,
          observacao: `Status alterado para [${novoStatus}] por ${responsavelCentralNome}`
        })
      });

      if (!res.ok) throw new Error("Erro ao atualizar status");

      toast.success(`Solicitação atualizada para [${novoStatus.toUpperCase()}] com sucesso!`);
      if (solicitacaoAtiva && solicitacaoAtiva.id === id) {
        setSolicitacaoAtiva(null);
        setModalDetalheOpen(false);
      }
      carregarSolicitacoes();
      carregarAgrupados();
    } catch (err: any) {
      toast.error(err.message || "Falha ao atualizar");
    }
  };

  // Atualização em Lote de Grupo de Produtos (Marcar todas as lojas como "Comprado" ou "Aprovado")
  const handleAtualizarLoteGrupo = async (grupo: GrupoProduto, novoStatus: "aprovado" | "comprado") => {
    try {
      const res = await fetch("/api/sugestoes-compras/solicitacoes/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: grupo.solicitacoesIds,
          status: novoStatus,
          respostaCentral: `Pedido consolidado emitido para ${grupo.totalLojas} lojas (Total: ${grupo.totalQtdSugerida} un).`,
          responsavelAprovacao: responsavelCentralNome
        })
      });

      if (!res.ok) throw new Error("Erro na atualização em lote");
      toast.success(
        `Consolidação concluída! ${grupo.solicitacoesIds.length} solicitações do produto foram marcadas como [${novoStatus.toUpperCase()}].`
      );
      carregarAgrupados();
      carregarSolicitacoes();
    } catch (err: any) {
      toast.error(err.message || "Falha ao processar em lote");
    }
  };

  // Contadores para KPIs Rápidos
  const kpis = useMemo(() => {
    const list = userRole === "gerente" 
      ? solicitacoes.filter((s) => s.idEmpresa === activeLojaId)
      : solicitacoes;

    return {
      total: list.length,
      pendentes: list.filter((s) => s.status === "pendente").length,
      zerados: list.filter((s) => s.tipo === "estoque_zerado" && s.status !== "comprado").length,
      correcoesPendentes: list.filter((s) => s.tipo === "correcao_estoque" && s.status === "pendente").length,
      aprovadosOuComprados: list.filter((s) => s.status === "aprovado" || s.status === "comprado").length
    };
  }, [solicitacoes, userRole, activeLojaId]);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 pb-12">
      {/* Top Banner & Perfil Selector */}
      <div className="glass-strong rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 grid place-items-center shadow-lg shadow-cyan-500/10">
            <ShoppingBag className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg md:text-xl font-bold font-serif text-slate-100">
                Sugestões de Compras & Estoque
              </h2>
              <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 bg-cyan-500/10 text-[10px] uppercase font-bold">
                {userRole === "gerente" ? "Visão do Gerente de Unidade" : "Central de Compras & Auditoria"}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {userRole === "gerente" 
                ? `Você está gerenciando exclusivamente: ${currentLojaNome}` 
                : "Painel unificado da rede com agrupamento de pedidos por produto e fila de auditoria"}
            </p>
          </div>
        </div>

        {/* Alternador de Modo e Unidade */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          {/* Alternador de Papel / Role */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => {
                setUserRole("gerente");
                setCurrentTab("produtos");
                toast.info(`Modo Gerente ativado para ${currentLojaNome}`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                userRole === "gerente"
                  ? "bg-cyan-500 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Gerente Unidade
            </button>
            <button
              onClick={() => {
                setUserRole("central");
                setCurrentTab("central");
                toast.success("Modo Central de Compras & Estoque ativado");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                userRole === "central"
                  ? "bg-purple-600 text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Central de Compras
            </button>
          </div>

          {/* Seletor de Loja do Gerente */}
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 uppercase font-medium leading-none">
                {userRole === "gerente" ? "Sua Unidade" : "Simular Unidade"}
              </span>
              <select
                value={activeLojaId}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setActiveLojaId(val);
                  const l = lojas.find((it) => it.IDEMPRESA === val);
                  toast.success(`Loja alterada para: ${l ? l.DESCREMPRESA : val}`);
                }}
                className="bg-transparent border-none text-slate-100 text-xs font-bold focus:outline-none cursor-pointer pr-2 mt-0.5"
              >
                {lojas.map((l) => (
                  <option key={l.IDEMPRESA} value={l.IDEMPRESA} className="bg-slate-900 text-slate-200">
                    {l.IDEMPRESA} - {String(l.DESCREMPRESA || "").trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botão de Acesso Mobile para Smartphone */}
          <Button
            size="sm"
            onClick={() => setModalQrOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Abrir no Celular (QR Code)
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-card rounded-xl p-3.5 border border-white/5 flex flex-col gap-1">
          <span className="text-[11px] text-slate-400 flex items-center justify-between">
            Total Solicitações
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </span>
          <span className="text-xl font-bold font-mono text-slate-100">{kpis.total}</span>
          <span className="text-[10px] text-slate-400">
            {userRole === "gerente" ? "Registradas nesta loja" : "Em toda a rede"}
          </span>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-amber-500/20 bg-amber-500/5 flex flex-col gap-1">
          <span className="text-[11px] text-amber-300 flex items-center justify-between">
            Aguardando Análise
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </span>
          <span className="text-xl font-bold font-mono text-amber-400">{kpis.pendentes}</span>
          <span className="text-[10px] text-amber-300/70">Fila da Central</span>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-rose-500/20 bg-rose-500/5 flex flex-col gap-1">
          <span className="text-[11px] text-rose-300 flex items-center justify-between">
            Rupturas / Zerados
            <BadgeAlert className="w-3.5 h-3.5 text-rose-400" />
          </span>
          <span className="text-xl font-bold font-mono text-rose-400">{kpis.zerados}</span>
          <span className="text-[10px] text-rose-300/70">Urgência de reposição</span>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-blue-500/20 bg-blue-500/5 flex flex-col gap-1">
          <span className="text-[11px] text-blue-300 flex items-center justify-between">
            Correção Pendente
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
          </span>
          <span className="text-xl font-bold font-mono text-blue-400">{kpis.correcoesPendentes}</span>
          <span className="text-[10px] text-blue-300/70">Requer aprovação</span>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-1 col-span-2 md:col-span-1">
          <span className="text-[11px] text-emerald-300 flex items-center justify-between">
            Aprovados / Comprados
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <span className="text-xl font-bold font-mono text-emerald-400">{kpis.aprovadosOuComprados}</span>
          <span className="text-[10px] text-emerald-300/70">Em atendimento/pedido</span>
        </div>
      </div>

      {/* Navegação entre Abas */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setCurrentTab("produtos")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            currentTab === "produtos"
              ? "bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Search className="w-4 h-4" />
          Catálogo & Estoque da Unidade ({currentLojaNome})
        </button>

        <button
          onClick={() => setCurrentTab("solicitacoes")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            currentTab === "solicitacoes"
              ? "bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Clock className="w-4 h-4" />
          Minhas Solicitações ({userRole === "gerente" ? currentLojaNome : "Unidade"})
        </button>

        <button
          onClick={() => setCurrentTab("central")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            currentTab === "central"
              ? "bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Central de Compras & Auditoria de Estoque
          <span className="bg-purple-400/20 text-purple-200 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            REDE
          </span>
        </button>

        <button
          onClick={() => setCurrentTab("agrupado")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            currentTab === "agrupado"
              ? "bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Layers className="w-4 h-4" />
          Agrupamento por Produto ({agrupados.length})
          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            VOLUME
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: CATÁLOGO & ESTOQUE DA UNIDADE (AÇÕES DO GERENTE)                   */}
      {/* ========================================================================= */}
      {currentTab === "produtos" && (
        <div className="flex flex-col gap-4">
          {/* Barra de Pesquisa e Filtros */}
          <div className="glass-strong rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por nome, código de barras, código interno ou marca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") buscarProdutos(searchQuery);
                }}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Filtro Rápido de Estoque */}
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
                <button
                  onClick={() => setFiltroEstoque("todos")}
                  className={`px-3 py-1 text-[11px] rounded-lg font-semibold transition cursor-pointer ${
                    filtroEstoque === "todos" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroEstoque("sem_estoque")}
                  className={`px-3 py-1 text-[11px] rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                    filtroEstoque === "sem_estoque" ? "bg-rose-500/20 text-rose-400 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  Sem Estoque (Zerados)
                </button>
              </div>

              {/* Filtro Rápido de Status (Ativos / Inativos) */}
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
                <button
                  onClick={() => setFiltroStatusInativo("todos")}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition cursor-pointer ${
                    filtroStatusInativo === "todos" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Todos Status
                </button>
                <button
                  onClick={() => setFiltroStatusInativo("ativos")}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition cursor-pointer ${
                    filtroStatusInativo === "ativos" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Ativos
                </button>
                <button
                  onClick={() => setFiltroStatusInativo("inativos")}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                    filtroStatusInativo === "inativos" ? "bg-rose-500/20 text-rose-300 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Ban className="w-3 h-3 text-rose-400" />
                  Inativos
                </button>
              </div>

              <Button
                onClick={() => buscarProdutos(searchQuery)}
                disabled={searchLoading}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
              >
                {searchLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Buscar
              </Button>
            </div>
          </div>

          {/* Disclaimer de isolamento de unidade */}
          <div className="flex items-center justify-between bg-cyan-950/20 border border-cyan-500/20 rounded-xl px-4 py-2.5 text-xs text-cyan-300">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Exibindo estoque apurado exclusivamente para a unidade: <strong>{currentLojaNome}</strong> (ID: {activeLojaId}).
              </span>
            </div>
            <span className="text-[11px] text-cyan-400/80">
              {produtos.length} produtos carregados
            </span>
          </div>

          {/* Tabela de Produtos com Ações do Gerente */}
          <div className="glass-strong rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Cód / Ref</th>
                    <th className="py-3 px-4">Descrição do Produto & Marca</th>
                    <th className="py-3 px-3">Cód. Barras</th>
                    <th className="py-3 px-3 text-center">Estoque Unidade</th>
                    <th className="py-3 px-3 text-right">Preço Venda</th>
                    <th className="py-3 px-3 text-right">Custo Médio</th>
                    <th className="py-3 px-4 text-center">Ações Rápidas do Gerente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {searchLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                        Consultando catálogo e estoque em tempo real no DB2...
                      </td>
                    </tr>
                  ) : produtosExibidos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                        Nenhum produto encontrado com o filtro aplicado.
                      </td>
                    </tr>
                  ) : (
                    produtosExibidos.map((p) => {
                      const isZerado = p.estoqueAtual <= 0;
                      return (
                        <tr key={p.idProduto} className={`hover:bg-white/[0.03] transition-colors group ${p.inativo ? "bg-rose-950/20 opacity-75" : ""}`}>
                          {/* Código e Referência */}
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-slate-200">{p.idProduto}</span>
                            {p.referencia && (
                              <span className="block text-[10px] text-slate-500 font-mono">Ref: {p.referencia}</span>
                            )}
                          </td>

                          {/* Descrição e Marca */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold block leading-snug ${p.inativo ? "text-rose-300 line-through" : "text-slate-100"}`}>
                                {p.descricao}
                              </span>
                              {p.inativo && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0 flex items-center gap-1">
                                  <Ban className="w-2.5 h-2.5" />
                                  INATIVO
                                </span>
                              )}
                            </div>
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-slate-400">
                              {p.marca || "GERAL"}
                            </span>
                          </td>

                          {/* Código de Barras */}
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                            {p.codBarras || "—"}
                          </td>

                          {/* Estoque Atual da Unidade */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                                isZerado
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                                  : p.estoqueAtual <= 5
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {p.estoqueAtual} un
                            </span>
                          </td>

                          {/* Preço de Venda */}
                          <td className="py-3 px-3 text-right font-mono text-slate-200">
                            {fmtCurrency(p.valorVenda)}
                          </td>

                          {/* Custo Médio */}
                          <td className="py-3 px-3 text-right font-mono text-slate-400 text-[11px]">
                            {fmtCurrency(p.custoMedio)}
                          </td>

                          {/* Botões de Ação do Gerente */}
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Botão 1: Sugerir Compra */}
                              <button
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setFormQtd(15);
                                  setFormPrioridade("media");
                                  setFormObs("");
                                  setModalCompraOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:text-white text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                                title="Sugerir compra para reposição desta unidade"
                              >
                                <ShoppingBag className="w-3 h-3 text-cyan-400" />
                                Sugerir Compra
                              </button>

                              {/* Botão 2: Estoque Zerado */}
                              <button
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setFormQtd(25);
                                  setModalZeradoOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                                title="Sinalizar que a gôndola/estoque está zerado (Ruptura)"
                              >
                                <AlertOctagon className="w-3 h-3 text-rose-400" />
                                Estoque Zerado
                              </button>

                              {/* Botão 3: Solicitar Correção de Estoque */}
                              <button
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setFormEstoqueFisico(p.estoqueAtual);
                                  setFormMotivoCorrecao("Avaria não lançada");
                                  setFormCorrecaoObs("");
                                  setModalCorrecaoOpen(true);
                                }}
                                className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                                title="Informar divergência física para auditoria do estoque"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-400" />
                                Correção
                              </button>

                              {/* Botão 4: Flag de Inativar Produto */}
                              <button
                                onClick={() => handleToggleInativarProduto(p)}
                                className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                                  p.inativo
                                    ? "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-300"
                                    : "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400 hover:text-rose-300"
                                }`}
                                title={p.inativo ? "Reativar comercialização deste produto" : "Sinalizar / Flag de Inativar este produto sem estoque"}
                              >
                                {p.inativo ? <Power className="w-3 h-3 text-emerald-400" /> : <Ban className="w-3 h-3 text-rose-400" />}
                                {p.inativo ? "Reativar" : "Inativar"}
                              </button>
                            </div>
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

      {/* ========================================================================= */}
      {/* ABA 2: MINHAS SOLICITAÇÕES (HISTÓRICO DA UNIDADE / GERENTE)               */}
      {/* ========================================================================= */}
      {(currentTab === "solicitacoes" || currentTab === "central") && (
        <div className="flex flex-col gap-4">
          {/* Cabeçalho da Lista de Solicitações com Filtros */}
          <div className="glass-strong rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="font-bold text-sm text-slate-100">
                  {currentTab === "central" 
                    ? "Central de Solicitações da Rede (Todas as Lojas)" 
                    : `Solicitações Registradas - ${currentLojaNome}`}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Acompanhamento de status em tempo real com parecer do setor de compras
                </p>
              </div>
            </div>

            {/* Filtros da Central / Gerente */}
            <div className="flex items-center gap-2 flex-wrap">
              {currentTab === "central" && (
                <select
                  value={filtroLojaCentral}
                  onChange={(e) => setFiltroLojaCentral(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="todas">🏢 Todas as Unidades</option>
                  {lojas.map((l) => (
                    <option key={l.IDEMPRESA} value={String(l.IDEMPRESA)}>
                      {l.IDEMPRESA} - {String(l.DESCREMPRESA || "").trim()}
                    </option>
                  ))}
                </select>
              )}

              {/* Filtro por Tipo */}
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="sugestao_compra">🛒 Sugestão de Compra</option>
                <option value="estoque_zerado">🚫 Estoque Zerado (Ruptura)</option>
                <option value="correcao_estoque">⚖️ Correção de Estoque</option>
              </select>

              {/* Filtro por Status */}
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos os Status</option>
                <option value="pendente">🟡 Pendente</option>
                <option value="em_analise">🔵 Em Análise</option>
                <option value="aprovado">🟢 Aprovado</option>
                <option value="comprado">🟣 Comprado / Pedido</option>
                <option value="rejeitado">🔴 Rejeitado</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={carregarSolicitacoes}
                className="border-white/10 text-slate-300 hover:text-white text-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Tabela de Solicitações */}
          <div className="glass-strong rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Data / Hora</th>
                    <th className="py-3 px-3">Tipo</th>
                    <th className="py-3 px-3">Unidade & Gerente</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-3 text-center">Qtd / Dif</th>
                    <th className="py-3 px-3 text-center">Prioridade</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {loadingSolicitacoes ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                        Carregando solicitações...
                      </td>
                    </tr>
                  ) : solicitacoes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                        Nenhuma solicitação encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    solicitacoes.map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
                        {/* Data e Hora */}
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {fmtDate(s.dataHora)}
                        </td>

                        {/* Tipo de Solicitação */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {s.tipo === "sugestao_compra" && (
                            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] font-semibold">
                              Sugestão Compra
                            </Badge>
                          )}
                          {s.tipo === "estoque_zerado" && (
                            <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] font-semibold animate-pulse">
                              Estoque Zerado
                            </Badge>
                          )}
                          {s.tipo === "correcao_estoque" && (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-semibold">
                              Correção Estoque
                            </Badge>
                          )}
                        </td>

                        {/* Unidade e Gerente */}
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-200 block text-[11px]">{s.nomeLoja}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-cyan-400" />
                            {s.gerente}
                          </span>
                        </td>

                        {/* Produto */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-100 block leading-snug">{s.descricao}</span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="font-mono">Cód: {s.idProduto}</span>
                            {s.codBarras && <span>• EAN: {s.codBarras}</span>}
                            <span>• Marca: {s.marca}</span>
                          </div>
                        </td>

                        {/* Quantidade / Divergência */}
                        <td className="py-3 px-3 text-center font-mono">
                          {s.tipo === "correcao_estoque" ? (
                            <div className="text-center">
                              <span className="text-xs font-bold text-slate-100">
                                Real: {s.estoqueFisico} un
                              </span>
                              <span
                                className={`block text-[10px] font-bold ${
                                  (s.diferenca || 0) < 0 ? "text-rose-400" : "text-emerald-400"
                                }`}
                              >
                                Dif: {(s.diferenca || 0) > 0 ? `+${s.diferenca}` : s.diferenca} un
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-cyan-300">
                              {s.quantidadeSugerida} un
                            </span>
                          )}
                        </td>

                        {/* Prioridade */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              s.prioridade === "urgente"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : s.prioridade === "alta"
                                ? "bg-amber-500/20 text-amber-300"
                                : s.prioridade === "media"
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-slate-500/20 text-slate-400"
                            }`}
                          >
                            {s.prioridade}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                              s.status === "comprado"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                : s.status === "aprovado"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : s.status === "em_analise"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                : s.status === "rejeitado"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            }`}
                          >
                            {s.status === "pendente" && <Clock className="w-3 h-3 text-amber-400" />}
                            {s.status === "aprovado" && <Check className="w-3 h-3 text-emerald-400" />}
                            {s.status === "comprado" && <ShoppingBag className="w-3 h-3 text-purple-400" />}
                            {s.status === "rejeitado" && <XCircle className="w-3 h-3 text-rose-400" />}
                            {s.status}
                          </span>
                        </td>

                        {/* Ações / Detalhes */}
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSolicitacaoAtiva(s);
                              setStatusResposta(s.respostaCentral || "");
                              setModalDetalheOpen(true);
                            }}
                            className="text-cyan-400 hover:text-white hover:bg-cyan-500/20 text-xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detalhes & Parecer
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: AGRUPAMENTO POR PRODUTO (COMPRAS EM VOLUME / REDE)                 */}
      {/* ========================================================================= */}
      {currentTab === "agrupado" && (
        <div className="flex flex-col gap-4">
          <div className="glass-strong rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  Consolidação Inteligente de Compras por Produto
                </h3>
                <Badge className="bg-purple-500/20 text-purple-300 text-[10px]">
                  Poder de Negociação
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mostra quantas unidades e lojas solicitaram o mesmo produto para negociação direta de lote/fornecedor
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={carregarAgrupados}
              disabled={loadingAgrupados}
              className="border-white/10 text-slate-300 hover:text-white text-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingAgrupados ? "animate-spin" : ""}`} />
              Atualizar Agrupamentos
            </Button>
          </div>

          {/* Cards ou Tabela de Agrupamento */}
          <div className="grid grid-cols-1 gap-3.5">
            {loadingAgrupados ? (
              <div className="glass-strong rounded-2xl p-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400 mb-2" />
                Consolidando pedidos por produto na rede...
              </div>
            ) : agrupados.length === 0 ? (
              <div className="glass-strong rounded-2xl p-12 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                Não há sugestões de compra pendentes para agrupamento no momento.
              </div>
            ) : (
              agrupados.map((grupo) => (
                <div
                  key={grupo.idProduto}
                  className="glass-card rounded-2xl p-4 border border-purple-500/20 bg-purple-950/10 hover:border-purple-500/40 transition shadow-lg flex flex-col gap-3"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-purple-500/20 border border-purple-500/30 grid place-items-center text-purple-300 font-mono font-bold shrink-0">
                        {grupo.totalLojas}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-100 text-sm">{grupo.descricao}</h4>
                          <span className="text-[10px] font-bold uppercase bg-white/5 px-2 py-0.5 rounded text-slate-400">
                            {grupo.marca}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                          <span>Cód: <strong className="text-slate-200">{grupo.idProduto}</strong></span>
                          {grupo.codBarras && <span>EAN: <strong className="text-slate-200">{grupo.codBarras}</strong></span>}
                          <span className="text-purple-300 font-semibold">
                            Solicitado por <strong>{grupo.totalLojas} {grupo.totalLojas === 1 ? "loja" : "lojas"}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Destaque de Volume Total e Ação em Lote */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Consolidado</span>
                        <span className="text-xl font-bold font-mono text-cyan-400">
                          {grupo.totalQtdSugerida} un
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAtualizarLoteGrupo(grupo, "aprovado")}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Aprovar em Lote
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAtualizarLoteGrupo(grupo, "comprado")}
                          className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer shadow-md"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                          Marcar como Comprado
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Lojas que solicitaram */}
                  <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Detalhamento por Unidade Solicitante:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {grupo.lojas.map((l) => (
                        <div
                          key={l.idEmpresa}
                          className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-slate-200 text-xs block">{l.nomeLoja}</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <UserCheck className="w-2.5 h-2.5 text-cyan-400" />
                              {l.gerente}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-cyan-300 text-sm">
                              {l.quantidade} un
                            </span>
                            <span
                              className={`block text-[9px] font-bold uppercase ${
                                l.prioridade === "urgente" ? "text-rose-400" : "text-amber-400"
                              }`}
                            >
                              {l.prioridade}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SUGERIR COMPRA                                                   */}
      {/* ========================================================================= */}
      {modalCompraOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="glass-strong border border-cyan-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl bg-slate-950 flex flex-col gap-4">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                  Unidade: {currentLojaNome}
                </span>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                  <ShoppingBag className="w-4 h-4 text-cyan-400" />
                  Sugerir Compra para a Unidade
                </h3>
              </div>
              <button
                onClick={() => setModalCompraOpen(false)}
                className="text-slate-400 hover:text-white rounded-full p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Produto */}
            <div className="bg-black/40 rounded-xl p-3.5 border border-white/10 flex flex-col gap-1.5">
              <span className="font-semibold text-slate-100 text-sm">{selectedProduct.descricao}</span>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>Cód: <strong className="text-slate-200">{selectedProduct.idProduto}</strong></span>
                <span>Marca: <strong className="text-slate-200">{selectedProduct.marca}</strong></span>
                <span>
                  Estoque Atual:{" "}
                  <strong className={selectedProduct.estoqueAtual <= 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>
                    {selectedProduct.estoqueAtual} un
                  </strong>
                </span>
              </div>
            </div>

            <form onSubmit={handleEnviarSugestaoCompra} className="flex flex-col gap-3.5">
              {/* Quantidade Sugerida com Botões Rápidos */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Quantidade Sugerida (Unidades)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={formQtd}
                    onChange={(e) => setFormQtd(Math.max(1, Number(e.target.value)))}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setFormQtd((q) => q + 10)}
                    className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormQtd((q) => q + 50)}
                    className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    +50
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormQtd((q) => q + 100)}
                    className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    +100
                  </button>
                </div>
              </div>

              {/* Grau de Prioridade */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Grau de Prioridade
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["baixa", "media", "alta", "urgente"] as const).map((prio) => (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setFormPrioridade(prio)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize transition cursor-pointer border ${
                        formPrioridade === prio
                          ? prio === "urgente"
                            ? "bg-rose-500/20 text-rose-300 border-rose-500"
                            : prio === "alta"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500"
                            : "bg-cyan-500/20 text-cyan-300 border-cyan-500"
                          : "border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {prio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Justificativa / Observação */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Observação / Justificativa para Compras
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Alta procura no fim de semana, cliente solicitou fardo, previsão de esgotar em 2 dias..."
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalCompraOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submittingAction}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Enviar Solicitação
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ESTOQUE ZERADO (RUPTURA IMEDIATA)                                */}
      {/* ========================================================================= */}
      {modalZeradoOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="glass-strong border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl bg-slate-950 flex flex-col gap-4">
            <div className="flex items-start justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-500 animate-pulse" />
                <div>
                  <h3 className="text-base font-bold text-rose-400">Sinalizar Estoque Zerado (Ruptura)</h3>
                  <p className="text-[11px] text-slate-400">Notificação imediata para a Central de Compras</p>
                </div>
              </div>
              <button
                onClick={() => setModalZeradoOpen(false)}
                className="text-slate-400 hover:text-white rounded-full p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3.5 text-xs text-rose-200">
              Você está confirmando que o produto <strong>{selectedProduct.descricao}</strong> está sem estoque físico
              na gôndola/depósito da unidade <strong>{currentLojaNome}</strong>.
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">
                Quantidade recomendada para reabastecimento
              </label>
              <input
                type="number"
                min="1"
                value={formQtd}
                onChange={(e) => setFormQtd(Math.max(1, Number(e.target.value)))}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">
                Observação do Gerente (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Produto esgotou ontem após o almoço, clientes procurando..."
                value={formObs}
                onChange={(e) => setFormObs(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalZeradoOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmarEstoqueZerado}
                disabled={submittingAction}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                <AlertOctagon className="w-3.5 h-3.5 mr-1" />
                Confirmar Ruptura Imediata
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SOLICITAR CORREÇÃO DE ESTOQUE                                    */}
      {/* ========================================================================= */}
      {modalCorrecaoOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="glass-strong border border-amber-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl bg-slate-950 flex flex-col gap-4">
            <div className="flex items-start justify-between border-b border-amber-500/20 pb-3">
              <div>
                <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">
                  Auditoria de Estoque: {currentLojaNome}
                </span>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  Solicitar Correção de Saldo Físico
                </h3>
              </div>
              <button
                onClick={() => setModalCorrecaoOpen(false)}
                className="text-slate-400 hover:text-white rounded-full p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Aviso Obrigatório */}
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Importante:</strong> Esta solicitação <strong>não altera o estoque automaticamente</strong>.
                Ela é enviada para auditoria da Central para conferência e aprovação do responsável autorizado.
              </span>
            </div>

            {/* Comparativo de Saldos */}
            <div className="grid grid-cols-2 gap-3 bg-black/40 p-3 rounded-xl border border-white/10">
              <div className="text-center p-2 rounded-lg bg-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Estoque no Sistema</span>
                <span className="text-lg font-bold font-mono text-slate-200">
                  {selectedProduct.estoqueAtual} un
                </span>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] text-amber-300 uppercase font-semibold block">Divergência Apurada</span>
                <span
                  className={`text-lg font-bold font-mono ${
                    formEstoqueFisico - selectedProduct.estoqueAtual < 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {formEstoqueFisico - selectedProduct.estoqueAtual > 0
                    ? `+${formEstoqueFisico - selectedProduct.estoqueAtual}`
                    : formEstoqueFisico - selectedProduct.estoqueAtual}{" "}
                  un
                </span>
              </div>
            </div>

            <form onSubmit={handleEnviarCorrecaoEstoque} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Estoque Físico Real Encontrado (Contagem Física)
                </label>
                <input
                  type="number"
                  required
                  value={formEstoqueFisico}
                  onChange={(e) => setFormEstoqueFisico(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Motivo da Divergência
                </label>
                <select
                  value={formMotivoCorrecao}
                  onChange={(e) => setFormMotivoCorrecao(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="Avaria não lançada">Avaria física não baixada</option>
                  <option value="Erro de contagem anterior">Erro de contagem / inventário anterior</option>
                  <option value="Furto / Perda">Suspeita de furto / perda na área de vendas</option>
                  <option value="Sobra física">Sobra física de mercadoria no depósito</option>
                  <option value="Código trocado no caixa">Venda com código trocado no frente de caixa</option>
                  <option value="Validade vencida descartada">Produto vencido descartado sem nota</option>
                  <option value="Outro motivo">Outro motivo especificado abaixo</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Detalhes / Justificativa da Contagem
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva onde o produto foi contado, caixas abertas ou detalhes da auditoria..."
                  value={formCorrecaoObs}
                  onChange={(e) => setFormCorrecaoObs(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalCorrecaoOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submittingAction}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Enviar para Auditoria
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DETALHES & PARECER DA CENTRAL DE COMPRAS                         */}
      {/* ========================================================================= */}
      {modalDetalheOpen && solicitacaoAtiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="glass-strong border border-white/20 rounded-2xl w-full max-w-xl p-6 shadow-2xl bg-slate-950 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                  Protocolo: {solicitacaoAtiva.id}
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-0.5">
                  Análise & Parecer da Solicitação
                </h3>
              </div>
              <button
                onClick={() => setModalDetalheOpen(false)}
                className="text-slate-400 hover:text-white rounded-full p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Informações Centrais */}
            <div className="bg-black/40 rounded-xl p-4 border border-white/10 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Unidade Solicitante</span>
                  <span className="font-bold text-slate-100 text-sm">{solicitacaoAtiva.nomeLoja}</span>
                  <span className="text-[11px] text-slate-400 block">Gerente: {solicitacaoAtiva.gerente}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase block">Data / Hora</span>
                  <span className="font-mono text-xs text-slate-200">{fmtDate(solicitacaoAtiva.dataHora)}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Produto</span>
                <span className="font-bold text-slate-100 text-sm">{solicitacaoAtiva.descricao}</span>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Código: <strong className="text-slate-200">{solicitacaoAtiva.idProduto}</strong></span>
                  {solicitacaoAtiva.codBarras && <span>EAN: <strong className="text-slate-200">{solicitacaoAtiva.codBarras}</strong></span>}
                  <span>Marca: <strong className="text-slate-200">{solicitacaoAtiva.marca}</strong></span>
                </div>
              </div>

              {/* Se for correção de estoque, destaca a auditoria */}
              {solicitacaoAtiva.tipo === "correcao_estoque" && (
                <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Estoque Sistema</span>
                    <span className="font-mono font-bold text-slate-200 text-sm">
                      {solicitacaoAtiva.estoqueSistema} un
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-300 uppercase block">Estoque Físico</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {solicitacaoAtiva.estoqueFisico} un
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-rose-300 uppercase block">Diferença</span>
                    <span className="font-mono font-bold text-rose-400 text-sm">
                      {(solicitacaoAtiva.diferenca || 0) > 0 ? `+${solicitacaoAtiva.diferenca}` : solicitacaoAtiva.diferenca} un
                    </span>
                  </div>
                  <div className="col-span-3 text-left pt-2 border-t border-amber-500/10 text-xs text-slate-300">
                    Motivo declarado: <strong>{solicitacaoAtiva.motivoCorrecao}</strong>
                  </div>
                </div>
              )}

              {/* Justificativa do Gerente */}
              {solicitacaoAtiva.observacao && (
                <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5 text-xs text-slate-300">
                  <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Observação da Loja:</span>
                  "{solicitacaoAtiva.observacao}"
                </div>
              )}
            </div>

            {/* Histórico de Auditoria */}
            <div>
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                Linha do Tempo & Histórico de Auditoria
              </span>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {(solicitacaoAtiva.historico || []).map((h, i) => (
                  <div key={i} className="text-xs bg-black/30 p-2 rounded-lg border border-white/5 flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-200">{h.usuario}:</span>{" "}
                      <span className="text-slate-400">{h.acao}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {fmtDate(h.dataHora)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Parecer / Resposta da Central de Compras */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <label className="text-xs font-semibold text-slate-200">
                Parecer / Resposta da Central para o Gerente
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Pedido nº 1234 lançado junto ao fornecedor, entrega prevista para sexta-feira..."
                value={statusResposta}
                onChange={(e) => setStatusResposta(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Botões de Ação para o Usuário Central */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalDetalheOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                Fechar
              </Button>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => handleAtualizarStatus(solicitacaoAtiva.id, "rejeitado")}
                  className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Rejeitar
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleAtualizarStatus(solicitacaoAtiva.id, "em_analise")}
                  className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 font-bold text-xs cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Em Análise
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleAtualizarStatus(solicitacaoAtiva.id, "aprovado")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Aprovar
                </Button>

                {solicitacaoAtiva.tipo !== "correcao_estoque" && (
                  <Button
                    size="sm"
                    onClick={() => handleAtualizarStatus(solicitacaoAtiva.id, "comprado")}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                    Marcar como Comprado
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: QR CODE & LINK PARA SMARTPHONES (ACESSO GERENTE)                 */}
      {/* ========================================================================= */}
      {modalQrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-strong border border-cyan-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl bg-slate-950 flex flex-col gap-4 text-center">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="text-left">
                <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                  Acesso Móvel para Gerentes
                </span>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  App no Smartphone
                </h3>
              </div>
              <button
                onClick={() => setModalQrOpen(false)}
                className="text-slate-400 hover:text-white rounded-full p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 text-left">
              Aponte a câmera do seu celular para o QR Code abaixo para abrir a tela de lançamento rápido:
            </p>

            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl shadow-inner mx-auto inline-block border-2 border-cyan-400/40">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://${window.location.hostname}:8082`}
                alt="QR Code Acesso Mobile"
                className="size-48 object-contain"
              />
            </div>

            <div className="bg-black/40 rounded-xl p-3 border border-white/10 text-left flex flex-col gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Endereço direto no navegador do celular:</span>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs font-mono font-bold text-cyan-300 truncate">
                  http://{window.location.hostname}:8082
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(`http://${window.location.hostname}:8082`);
                    toast.success("Link copiado para a área de transferência!");
                  }}
                  className="text-slate-300 hover:text-white text-xs h-7 px-2 cursor-pointer shrink-0"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalQrOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                Fechar
              </Button>
              <a
                href={`http://${window.location.hostname}:8082`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir em Nova Aba
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
