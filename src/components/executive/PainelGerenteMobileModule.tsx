import React, { useState, useEffect, useMemo } from "react";
import {
  Smartphone,
  Tag,
  AlertTriangle,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  Package,
  TrendingUp,
  Activity,
  BarChart3,
  Calendar,
  User,
  Store,
  Box,
  Sparkles,
  ArrowUpDown,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ======================== TIPOS ========================

interface Sinalizacao {
  id: number;
  temEstoque: boolean;
  qtdEstoque: number;
  temBoton: boolean;
  sinalizado: boolean;
  data: string;
  // Enriquecidos com dados de promoções
  nome?: string;
  ean?: string;
  precoPromo?: string;
}

interface PreRuptura {
  id: number;
  tipo: string;
  idProduto: number;
  descricao: string;
  codBarras: string;
  marca: string;
  referencia: string;
  idEmpresa: number;
  nomeLoja: string;
  gerente: string;
  quantidadeSugerida: number;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  observacao: string;
  estoqueSistema: number;
  dataHora?: string;
}

interface Solicitacao {
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
}

interface PainelGerenteMobileModuleProps {
  selectedStore?: string;
}

// ======================== HELPERS ========================

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch { return iso; }
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

const prioridadeConfig: Record<string, { label: string; color: string; bg: string }> = {
  urgente: { label: "URGENTE", color: "text-rose-400", bg: "bg-rose-500/20" },
  alta: { label: "ALTA", color: "text-amber-400", bg: "bg-amber-500/20" },
  media: { label: "MÉDIA", color: "text-blue-400", bg: "bg-blue-500/20" },
  baixa: { label: "BAIXA", color: "text-slate-400", bg: "bg-slate-500/20" },
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pendente: { label: "Pendente", color: "text-amber-400", bg: "bg-amber-500/15", icon: Clock },
  em_analise: { label: "Em Análise", color: "text-blue-400", bg: "bg-blue-500/15", icon: Eye },
  aprovado: { label: "Aprovado", color: "text-emerald-400", bg: "bg-emerald-500/15", icon: CheckCircle2 },
  comprado: { label: "Comprado", color: "text-cyan-400", bg: "bg-cyan-500/15", icon: ShoppingBag },
  rejeitado: { label: "Rejeitado", color: "text-rose-400", bg: "bg-rose-500/15", icon: XCircle },
};

const tipoConfig: Record<string, { label: string; color: string }> = {
  sugestao_compra: { label: "Sugestão Compra", color: "text-cyan-400" },
  estoque_zerado: { label: "Estoque Zerado", color: "text-rose-400" },
  correcao_estoque: { label: "Correção Estoque", color: "text-amber-400" },
};

// ======================== COMPONENTE PRINCIPAL ========================

export function PainelGerenteMobileModule({ selectedStore }: PainelGerenteMobileModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<"visao-geral" | "sinalizacoes" | "pre-rupturas" | "solicitacoes">("visao-geral");
  const [sinalizacoes, setSinalizacoes] = useState<Sinalizacao[]>([]);
  const [preRupturas, setPreRupturas] = useState<PreRuptura[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPrioridade, setFilterPrioridade] = useState("todas");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [sortField, setSortField] = useState<string>("data");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ======================== FETCH DATA ========================

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sinRes, rupRes, solRes] = await Promise.all([
        fetch("/api/gerente/promocoes").then(r => r.json()).catch(() => []),
        fetch("/api/gerente/pre-rupturas").then(r => r.json()).catch(() => []),
        fetch(`/api/sugestoes-compras/solicitacoes${selectedStore && selectedStore !== "todas" ? `?idEmpresa=${selectedStore}` : ""}`).then(r => r.json()).catch(() => []),
      ]);

      // Sinalizações: filtra apenas os que foram sinalizados
      const sinalizados = Array.isArray(sinRes)
        ? sinRes.filter((p: any) => p.sinalizado).map((p: any) => ({
            id: p.id,
            temEstoque: p.temEstoque,
            qtdEstoque: p.qtdEstoque,
            temBoton: p.temBoton,
            sinalizado: p.sinalizado,
            data: p.data || new Date().toISOString(),
            nome: p.nome || `Produto #${p.id}`,
            ean: p.ean || "N/A",
            precoPromo: p.precoPromo || "0,00",
          }))
        : [];

      setSinalizacoes(sinalizados);
      setPreRupturas(Array.isArray(rupRes) ? rupRes : []);
      setSolicitacoes(Array.isArray(solRes) ? solRes : ((solRes as any)?.items || []));
    } catch (e) {
      toast.error("Falha ao carregar dados do mobile");
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedStore]);

  // ======================== KPIs ========================

  const kpis = useMemo(() => {
    const totalSinalizacoes = sinalizacoes.length;
    const semEstoque = sinalizacoes.filter(s => !s.temEstoque).length;
    const semBoton = sinalizacoes.filter(s => !s.temBoton).length;

    const totalRupturas = preRupturas.length;
    const rupturasHoje = preRupturas.filter(r => {
      const d = r.dataHora || (r as any).data;
      if (!d) return false;
      return new Date(d).toDateString() === new Date().toDateString();
    }).length;

    const totalSolicitacoes = solicitacoes.length;
    const pendentes = solicitacoes.filter(s => s.status === "pendente").length;
    const urgentes = solicitacoes.filter(s => s.prioridade === "urgente").length;

    const gerentes = new Set([
      ...preRupturas.map(r => r.gerente).filter(Boolean),
      ...solicitacoes.map(s => s.gerente).filter(Boolean),
    ]);

    return {
      totalSinalizacoes, semEstoque, semBoton,
      totalRupturas, rupturasHoje,
      totalSolicitacoes, pendentes, urgentes,
      totalGerentes: gerentes.size,
    };
  }, [sinalizacoes, preRupturas, solicitacoes]);

  // ======================== FILTERED DATA ========================

  const filteredSolicitacoes = useMemo(() => {
    let list = [...solicitacoes];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(s =>
        s.descricao?.toLowerCase().includes(term) ||
        s.gerente?.toLowerCase().includes(term) ||
        s.nomeLoja?.toLowerCase().includes(term) ||
        String(s.idProduto).includes(term)
      );
    }
    if (filterPrioridade !== "todas") {
      list = list.filter(s => s.prioridade === filterPrioridade);
    }
    if (filterStatus !== "todos") {
      list = list.filter(s => s.status === filterStatus);
    }
    list.sort((a, b) => {
      const aVal = sortField === "data" ? new Date(a.dataHora).getTime() : (a as any)[sortField];
      const bVal = sortField === "data" ? new Date(b.dataHora).getTime() : (b as any)[sortField];
      return sortDir === "desc" ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
    });
    return list;
  }, [solicitacoes, searchTerm, filterPrioridade, filterStatus, sortField, sortDir]);

  const filteredRupturas = useMemo(() => {
    let list = [...preRupturas];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(r =>
        r.descricao?.toLowerCase().includes(term) ||
        r.gerente?.toLowerCase().includes(term) ||
        r.nomeLoja?.toLowerCase().includes(term)
      );
    }
    if (filterPrioridade !== "todas") {
      list = list.filter(r => r.prioridade === filterPrioridade);
    }
    return list;
  }, [preRupturas, searchTerm, filterPrioridade]);

  // ======================== RENDER ========================

  const subTabs = [
    { id: "visao-geral" as const, label: "Visão Geral", icon: BarChart3 },
    { id: "sinalizacoes" as const, label: "Sinalizações", icon: Tag, count: kpis.totalSinalizacoes },
    { id: "pre-rupturas" as const, label: "Pré-Rupturas", icon: AlertTriangle, count: kpis.totalRupturas },
    { id: "solicitacoes" as const, label: "Solicitações", icon: ShoppingBag, count: kpis.totalSolicitacoes },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20">
              <Smartphone className="size-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                Painel Gerente Mobile
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Acompanhe lançamentos feitos pelos gerentes via smartphone
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Servidor Mobile Ativo</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="border-white/10 hover:bg-white/5 text-xs"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="flex gap-1 mt-4 p-1 bg-black/30 rounded-xl border border-white/5">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${
                activeSubTab === tab.id
                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/20 shadow-lg shadow-cyan-500/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <tab.icon className="size-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeSubTab === tab.id ? "bg-cyan-400/20 text-cyan-300" : "bg-white/10 text-slate-400"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-strong rounded-2xl p-12 border border-white/5 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="size-8 text-cyan-400 animate-spin" />
          <p className="text-sm text-slate-400">Carregando dados do mobile...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* ============= VISÃO GERAL ============= */}
          {activeSubTab === "visao-geral" && (
            <div className="space-y-5">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  icon={<Tag className="size-5 text-purple-400" />}
                  label="Sinalizações"
                  value={kpis.totalSinalizacoes}
                  sub={`${kpis.semEstoque} sem estoque · ${kpis.semBoton} sem boton`}
                  gradient="from-purple-500/10 to-violet-500/10"
                  borderColor="border-purple-500/15"
                />
                <KpiCard
                  icon={<AlertTriangle className="size-5 text-rose-400" />}
                  label="Pré-Rupturas"
                  value={kpis.totalRupturas}
                  sub={`${kpis.rupturasHoje} hoje`}
                  gradient="from-rose-500/10 to-pink-500/10"
                  borderColor="border-rose-500/15"
                />
                <KpiCard
                  icon={<ShoppingBag className="size-5 text-cyan-400" />}
                  label="Solicitações"
                  value={kpis.totalSolicitacoes}
                  sub={`${kpis.pendentes} pendentes · ${kpis.urgentes} urgentes`}
                  gradient="from-cyan-500/10 to-blue-500/10"
                  borderColor="border-cyan-500/15"
                />
                <KpiCard
                  icon={<User className="size-5 text-emerald-400" />}
                  label="Gerentes Ativos"
                  value={kpis.totalGerentes}
                  sub="Enviando dados via app"
                  gradient="from-emerald-500/10 to-teal-500/10"
                  borderColor="border-emerald-500/15"
                />
              </div>

              {/* Resumo por tipo de solicitação */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ResumoCard
                  title="Sugestões de Compra"
                  icon={<ShoppingBag className="size-4 text-cyan-400" />}
                  items={solicitacoes.filter(s => s.tipo === "sugestao_compra")}
                  color="cyan"
                />
                <ResumoCard
                  title="Estoque Zerado"
                  icon={<XCircle className="size-4 text-rose-400" />}
                  items={solicitacoes.filter(s => s.tipo === "estoque_zerado")}
                  color="rose"
                />
                <ResumoCard
                  title="Correções de Estoque"
                  icon={<Package className="size-4 text-amber-400" />}
                  items={solicitacoes.filter(s => s.tipo === "correcao_estoque")}
                  color="amber"
                />
              </div>

              {/* Timeline recente */}
              <div className="glass-strong rounded-2xl p-5 border border-white/5">
                <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Activity className="size-4 text-cyan-400" />
                  Atividade Recente
                </h3>
                <TimelineRecente
                  sinalizacoes={sinalizacoes}
                  preRupturas={preRupturas}
                  solicitacoes={solicitacoes}
                />
              </div>
            </div>
          )}

          {/* ============= SINALIZAÇÕES ============= */}
          {activeSubTab === "sinalizacoes" && (
            <div className="glass-strong rounded-2xl p-5 border border-white/5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Tag className="size-4 text-purple-400" />
                  Sinalizações de Promoções ({sinalizacoes.length})
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                      <CheckCircle2 className="size-3" /> Com Estoque
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/15">
                      <XCircle className="size-3" /> Sem Estoque
                    </span>
                  </div>
                </div>
              </div>

              {sinalizacoes.length === 0 ? (
                <EmptyState message="Nenhuma sinalização registrada ainda" />
              ) : (
                <div className="space-y-2">
                  {sinalizacoes.map((s, idx) => (
                    <div
                      key={`${s.id}-${idx}`}
                      className="flex items-center gap-4 p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-200 truncate">{s.nome || `Produto #${s.id}`}</span>
                          {s.precoPromo && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                              R$ {s.precoPromo}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>EAN: {s.ean}</span>
                          <span>ID: {s.id}</span>
                          <span>{timeAgo(s.data)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-center">
                          <div className="text-[10px] text-slate-500 mb-0.5">Estoque</div>
                          <div className={`flex items-center gap-1 text-xs font-semibold ${s.temEstoque ? "text-emerald-400" : "text-rose-400"}`}>
                            {s.temEstoque ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                            {s.temEstoque ? `${s.qtdEstoque} un` : "Sem"}
                          </div>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="text-center">
                          <div className="text-[10px] text-slate-500 mb-0.5">Boton</div>
                          <div className={`flex items-center gap-1 text-xs font-semibold ${s.temBoton ? "text-emerald-400" : "text-rose-400"}`}>
                            {s.temBoton ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                            {s.temBoton ? "OK" : "Sem"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============= PRÉ-RUPTURAS ============= */}
          {activeSubTab === "pre-rupturas" && (
            <div className="glass-strong rounded-2xl p-5 border border-white/5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <AlertTriangle className="size-4 text-rose-400" />
                  Pré-Rupturas Reportadas ({filteredRupturas.length})
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-black/30 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40 w-48"
                    />
                  </div>
                  <select
                    value={filterPrioridade}
                    onChange={e => setFilterPrioridade(e.target.value)}
                    className="text-xs bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500/40"
                  >
                    <option value="todas">Todas Prioridades</option>
                    <option value="urgente">Urgente</option>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
              </div>

              {filteredRupturas.length === 0 ? (
                <EmptyState message="Nenhuma pré-ruptura reportada" />
              ) : (
                <div className="space-y-2">
                  {filteredRupturas.map((r, idx) => {
                    const prio = prioridadeConfig[r.prioridade] || prioridadeConfig.media;
                    const dataStr = r.dataHora || (r as any).data;
                    return (
                      <div
                        key={`${r.id}-${idx}`}
                        className="p-4 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${prio.bg} shrink-0 mt-0.5`}>
                            <AlertTriangle className={`size-4 ${prio.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-medium text-slate-200">{r.descricao || `Produto #${r.idProduto}`}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${prio.bg} ${prio.color}`}>
                                {prio.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                              {r.gerente && (
                                <span className="flex items-center gap-1">
                                  <User className="size-3" /> {r.gerente}
                                </span>
                              )}
                              {r.nomeLoja && (
                                <span className="flex items-center gap-1">
                                  <Store className="size-3" /> {r.nomeLoja}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Box className="size-3" /> Estoque: {r.estoqueSistema} un
                              </span>
                              <span className="flex items-center gap-1">
                                <ShoppingBag className="size-3" /> Sugerido: {r.quantidadeSugerida} un
                              </span>
                              {dataStr && (
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3" /> {timeAgo(dataStr)}
                                </span>
                              )}
                            </div>
                            {r.observacao && (
                              <p className="text-[11px] text-slate-400 mt-1.5 italic bg-black/20 rounded-lg px-2.5 py-1.5">
                                "{r.observacao}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============= SOLICITAÇÕES ============= */}
          {activeSubTab === "solicitacoes" && (
            <div className="glass-strong rounded-2xl p-5 border border-white/5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <ShoppingBag className="size-4 text-cyan-400" />
                  Solicitações dos Gerentes ({filteredSolicitacoes.length})
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Buscar produto, gerente..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-black/30 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40 w-52"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="text-xs bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500/40"
                  >
                    <option value="todos">Todos Status</option>
                    <option value="pendente">Pendente</option>
                    <option value="em_analise">Em Análise</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="comprado">Comprado</option>
                    <option value="rejeitado">Rejeitado</option>
                  </select>
                  <select
                    value={filterPrioridade}
                    onChange={e => setFilterPrioridade(e.target.value)}
                    className="text-xs bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500/40"
                  >
                    <option value="todas">Todas Prioridades</option>
                    <option value="urgente">Urgente</option>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
              </div>

              {filteredSolicitacoes.length === 0 ? (
                <EmptyState message="Nenhuma solicitação encontrada" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <Th>Tipo</Th>
                        <Th>Produto</Th>
                        <Th>Gerente / Loja</Th>
                        <Th>Qtd</Th>
                        <Th>Prioridade</Th>
                        <Th>Status</Th>
                        <Th
                          sortable
                          active={sortField === "data"}
                          dir={sortDir}
                          onClick={() => {
                            if (sortField === "data") setSortDir(d => d === "asc" ? "desc" : "asc");
                            else { setSortField("data"); setSortDir("desc"); }
                          }}
                        >
                          Data
                        </Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSolicitacoes.map((s, idx) => {
                        const tipo = tipoConfig[s.tipo] || tipoConfig.sugestao_compra;
                        const prio = prioridadeConfig[s.prioridade] || prioridadeConfig.media;
                        const st = statusConfig[s.status] || statusConfig.pendente;
                        const StIcon = st.icon;
                        return (
                          <tr key={`${s.id}-${idx}`} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 px-3">
                              <span className={`text-[10px] font-semibold ${tipo.color}`}>{tipo.label}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-slate-200 font-medium truncate max-w-[200px]">{s.descricao}</div>
                              <div className="text-[10px] text-slate-500">ID: {s.idProduto}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-slate-300">{s.gerente || "—"}</div>
                              <div className="text-[10px] text-slate-500">{s.nomeLoja || "—"}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="text-slate-200 font-semibold">{s.quantidadeSugerida}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${prio.bg} ${prio.color}`}>
                                {prio.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${st.bg} ${st.color}`}>
                                <StIcon className="size-3" />
                                {st.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                              {formatDate(s.dataHora)}
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
        </>
      )}
    </div>
  );
}

// ======================== SUB-COMPONENTES ========================

function KpiCard({ icon, label, value, sub, gradient, borderColor }: {
  icon: React.ReactNode; label: string; value: number; sub: string; gradient: string; borderColor: string;
}) {
  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br ${gradient} border ${borderColor} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-2.5 mb-2">
        {icon}
        <span className="text-[11px] text-slate-400 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-100 font-serif">{value}</div>
      <div className="text-[10px] text-slate-500 mt-1">{sub}</div>
    </div>
  );
}

function ResumoCard({ title, icon, items, color }: {
  title: string; icon: React.ReactNode; items: Solicitacao[]; color: string;
}) {
  const statusCounts = {
    pendente: items.filter(i => i.status === "pendente").length,
    em_analise: items.filter(i => i.status === "em_analise").length,
    aprovado: items.filter(i => i.status === "aprovado").length,
    comprado: items.filter(i => i.status === "comprado").length,
    rejeitado: items.filter(i => i.status === "rejeitado").length,
  };

  return (
    <div className="glass-strong rounded-xl p-4 border border-white/5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs font-semibold text-slate-300">{title}</span>
        <span className={`ml-auto text-lg font-bold font-serif text-${color}-400`}>{items.length}</span>
      </div>
      <div className="space-y-1.5">
        {Object.entries(statusCounts).map(([key, count]) => {
          if (count === 0) return null;
          const st = statusConfig[key];
          return (
            <div key={key} className="flex items-center justify-between">
              <span className={`text-[11px] ${st.color}`}>{st.label}</span>
              <div className="flex items-center gap-2 flex-1 mx-3">
                <div className="h-1.5 flex-1 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${st.bg.replace("/15", "/50")}`}
                    style={{ width: `${items.length > 0 ? (count / items.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineRecente({ sinalizacoes, preRupturas, solicitacoes }: {
  sinalizacoes: Sinalizacao[];
  preRupturas: PreRuptura[];
  solicitacoes: Solicitacao[];
}) {
  const events = useMemo(() => {
    const all: Array<{ type: string; data: string; desc: string; detail: string; icon: React.ElementType; color: string }> = [];

    sinalizacoes.forEach(s => {
      all.push({
        type: "Sinalização",
        data: s.data,
        desc: s.nome || `Produto #${s.id}`,
        detail: `Estoque: ${s.temEstoque ? "SIM" : "NÃO"} | Boton: ${s.temBoton ? "SIM" : "NÃO"}`,
        icon: Tag,
        color: "text-purple-400",
      });
    });

    preRupturas.forEach(r => {
      const d = r.dataHora || (r as any).data || "";
      all.push({
        type: "Pré-Ruptura",
        data: d,
        desc: r.descricao || `Produto #${r.idProduto}`,
        detail: `${r.gerente || "Gerente"} · ${r.nomeLoja || "Loja"} · ${r.prioridade}`,
        icon: AlertTriangle,
        color: "text-rose-400",
      });
    });

    solicitacoes.slice(0, 20).forEach(s => {
      all.push({
        type: tipoConfig[s.tipo]?.label || "Solicitação",
        data: s.dataHora,
        desc: s.descricao || `Produto #${s.idProduto}`,
        detail: `${s.gerente || "Gerente"} · ${s.nomeLoja || "Loja"} · ${s.status}`,
        icon: ShoppingBag,
        color: "text-cyan-400",
      });
    });

    all.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    return all.slice(0, 15);
  }, [sinalizacoes, preRupturas, solicitacoes]);

  if (events.length === 0) return <EmptyState message="Nenhuma atividade recente" />;

  return (
    <div className="space-y-1">
      {events.map((ev, idx) => (
        <div key={idx} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
          <div className="relative">
            <ev.icon className={`size-4 ${ev.color}`} />
            {idx < events.length - 1 && (
              <div className="absolute left-1/2 top-full w-px h-4 bg-white/5 -translate-x-1/2" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold ${ev.color}`}>{ev.type}</span>
              <span className="text-xs text-slate-300 truncate">{ev.desc}</span>
            </div>
            <div className="text-[10px] text-slate-500">{ev.detail}</div>
          </div>
          <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">{timeAgo(ev.data)}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      <Info className="size-8 text-slate-600" />
      <p className="text-sm text-slate-500">{message}</p>
      <p className="text-[10px] text-slate-600">Os dados aparecerão aqui quando os gerentes fizerem lançamentos no app mobile</p>
    </div>
  );
}

function Th({ children, sortable, active, dir, onClick }: {
  children: React.ReactNode;
  sortable?: boolean;
  active?: boolean;
  dir?: "asc" | "desc";
  onClick?: () => void;
}) {
  return (
    <th
      className={`py-2 px-3 text-left text-[10px] text-slate-500 uppercase font-semibold tracking-wider ${
        sortable ? "cursor-pointer hover:text-slate-300 transition-colors select-none" : ""
      }`}
      onClick={onClick}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortable && (
          <ArrowUpDown className={`size-3 ${active ? "text-cyan-400" : "text-slate-600"}`} />
        )}
      </span>
    </th>
  );
}
