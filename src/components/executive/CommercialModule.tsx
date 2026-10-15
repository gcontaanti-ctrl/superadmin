import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  Search, 
  Calendar, 
  FileText, 
  AlertCircle, 
  Filter, 
  DollarSign,
  User,
  ShoppingBag,
  Building,
  ArrowUpRight,
  TrendingDown,
  Percent,
  CheckCircle,
  ThumbsUp,
  BrainCircuit,
  Lightbulb,
  Building2,
  X,
  Clock
} from "lucide-react";
import { 
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
  Area, AreaChart, Line, LineChart 
} from "recharts";
import { toast } from "sonner";

interface CommercialModuleProps {
  selectedStore: string;
  globalStartDate: string;
  globalEndDate: string;
}

export function CommercialModule({ selectedStore, globalStartDate, globalEndDate }: CommercialModuleProps) {
  // Filtros
  const [subTab, setSubTab] = useState<"compradores" | "fornecedores" | "vendedores">("compradores");
  const [busca, setBusca] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [startDate, setStartDate] = useState(globalStartDate || "");
  const [endDate, setEndDate] = useState(globalEndDate || "");
  const [statusRecebimento, setStatusRecebimento] = useState("");
  const [compradorBusca, setCompradorBusca] = useState("");
  const [lojaFiltro, setLojaFiltro] = useState(selectedStore || "todas");
  const [mesSelecionado, setMesSelecionado] = useState("2026-06");

  const mesesDisponiveis = [
    { label: "Julho / 2026", value: "2026-07", start: "2026-07-01", end: "2026-07-31" },
    { label: "Junho / 2026", value: "2026-06", start: "2026-06-01", end: "2026-06-30" },
    { label: "Abril / 2026", value: "2026-04", start: "2026-04-01", end: "2026-04-30" },
    { label: "Dezembro / 2025", value: "2025-12", start: "2025-12-01", end: "2025-12-31" },
    { label: "Fevereiro / 2025", value: "2025-02", start: "2025-02-01", end: "2025-02-28" }
  ];

  // Sync with global dates
  useEffect(() => {
    if (globalStartDate && subTab !== "compradores") setStartDate(globalStartDate);
  }, [globalStartDate, subTab]);

  useEffect(() => {
    if (globalEndDate && subTab !== "compradores") setEndDate(globalEndDate);
  }, [globalEndDate, subTab]);

  useEffect(() => {
    setLojaFiltro(selectedStore || "todas");
  }, [selectedStore]);

  useEffect(() => {
    if (subTab === "compradores") {
      const match = mesesDisponiveis.find(m => m.value === mesSelecionado);
      if (match) {
        setStartDate(match.start);
        setEndDate(match.end);
      }
    }
  }, [mesSelecionado, subTab]);

  // Dados
  const [compradores, setCompradores] = useState<any[]>([]);
  const [compras, setCompras] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [selectedVendedor, setSelectedVendedor] = useState<any | null>(null);
  const [vendedorDetalhes, setVendedorDetalhes] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  // Modal de detalhes de comprador
  const [selectedComprador, setSelectedComprador] = useState<any | null>(null);
  const [compradorCompras, setCompradorCompras] = useState<any[]>([]);
  const [loadingComprasModal, setLoadingComprasModal] = useState(false);

  const fetchCompradorCompras = async (comprador: any) => {
    setSelectedComprador(comprador);
    setLoadingComprasModal(true);
    try {
      let url = `/api/comercial/comprador-compras?compradorId=${comprador.IDUSUARIO || comprador.idComprador || ''}&compradorNome=${encodeURIComponent(comprador.COMPRADOR)}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      const res = await fetch(url);
      const json = await res.json();
      setCompradorCompras(json.lista || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar histórico de compras do comprador");
    } finally {
      setLoadingComprasModal(false);
    }
  };

  // Modal de Detalhes do Pedido
  const [modalPedidoOpen, setModalPedidoOpen] = useState(false);
  const [pedidoItens, setPedidoItens] = useState<any[]>([]);
  const [loadingPedido, setLoadingPedido] = useState(false);
  const [currentPedidoId, setCurrentPedidoId] = useState<number | null>(null);

  const fetchPedidoDetalhes = async (idPedido: number) => {
    setCurrentPedidoId(idPedido);
    setModalPedidoOpen(true);
    setLoadingPedido(true);
    try {
      const res = await fetch(`/api/comercial/pedido-detalhes?idPedido=${idPedido}`);
      const json = await res.json();
      setPedidoItens(json.itens || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar detalhes do pedido");
    } finally {
      setLoadingPedido(false);
    }
  };

  // Aba interna do modulo comercial

  // Configurar períodos automáticos (Ex: 6 meses para vendedores)
  useEffect(() => {
    if (subTab === "vendedores") {
      const today = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(today.getMonth() - 6);
      
      setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
      setBusca("");
    } else if (subTab !== "compradores") {
      setStartDate(globalStartDate || "");
      setEndDate(globalEndDate || "");
      setBusca("");
    }
  }, [subTab]);

  // Carregar lista de fornecedores e empresas para dropdown
  useEffect(() => {
    fetch("/api/fornecedores")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFornecedores(data);
        }
      })
      .catch(console.error);

    fetch('/api/empresas')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setEmpresas(data);
      })
      .catch(console.error);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (subTab === "compradores") {
        let url = `/api/comercial/compras-por-comprador`;
        const params: string[] = [];
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        if (selectedStore) params.push(`idEmpresa=${selectedStore}`);
        if (params.length > 0) url += `?${params.join("&")}`;

        const res = await fetch(url);
        const json = await res.json();
        setCompradores(json.lista || []);
      } else if (subTab === "fornecedores") {
        let url = `/api/comercial/compras-por-fornecedor?`;
        const params: string[] = [];
        if (fornecedorId) params.push(`fornecedorId=${fornecedorId}`);
        if (busca) params.push(`busca=${encodeURIComponent(busca)}`);
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        if (statusRecebimento) params.push(`statusRecebimento=${statusRecebimento}`);
        if (compradorBusca) params.push(`compradorBusca=${encodeURIComponent(compradorBusca)}`);
        if (lojaFiltro && lojaFiltro !== "todas") params.push(`idEmpresa=${lojaFiltro}`);
        url += params.join("&");

        const res = await fetch(url);
        const json = await res.json();
        setCompras(json.lista || []);
      } else if (subTab === "vendedores") {
        let url = `/api/comercial/vendedores?idEmpresa=${selectedStore}`;
        const params: string[] = [];
        if (busca) params.push(`busca=${encodeURIComponent(busca)}`);
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        if (params.length > 0) url += `&${params.join("&")}`;

        const res = await fetch(url);
        const json = await res.json();
        setVendedores(json.lista || []);

        // Auto-selecionar o primeiro vendedor retornado
        if (json.lista && json.lista.length > 0) {
          setSelectedVendedor(json.lista[0]);
        } else {
          setSelectedVendedor(null);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar dados comerciais:", e);
      toast.error("Erro ao conectar com as APIs do módulo comercial.");
    } finally {
      setLoading(false);
    }
  };

  // Carregar detalhes do vendedor selecionado
  useEffect(() => {
    if (selectedVendedor && subTab === "vendedores") {
      setLoadingDetalhes(true);
      fetch(`/api/comercial/vendedor-detalhes?idVendedor=${selectedVendedor.IDVENDEDOR}`)
        .then((res) => res.json())
        .then((data) => {
          setVendedorDetalhes(data);
        })
        .catch(console.error)
        .finally(() => setLoadingDetalhes(false));
    } else {
      setVendedorDetalhes(null);
    }
  }, [selectedVendedor, subTab]);

  useEffect(() => {
    fetchData();
  }, [subTab, fornecedorId, selectedStore, lojaFiltro, startDate, endDate, statusRecebimento, compradorBusca]);

  const handleApplyFilters = () => {
    fetchData();
    toast.success("Filtros comerciais aplicados!");
  };

  const handleClearFilters = () => {
    setBusca("");
    setFornecedorId("");
    setStatusRecebimento("");
    setCompradorBusca("");
    setLojaFiltro(selectedStore || "todas");
    if (subTab === "vendedores") {
      const today = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(today.getMonth() - 6);
      setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
    }
    toast.info("Filtros comerciais limpos.");
    setTimeout(() => {
      fetchData();
    }, 50);
  };

  const fmtCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const fmtDate = (dStr: string) => {
    if (!dStr) return "S/ Data";
    const date = new Date(dStr);
    return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  };

  // KPIs calculados
  const totalOrcadoGeral = compradores.reduce((acc, cur) => acc + (cur.ORCADO || 0), 0);
  const totalGastoGeral = compradores.reduce((acc, cur) => acc + (cur.GASTO || 0), 0);
  const totalVendasGeral = compradores.reduce((acc, cur) => acc + (cur.VENDAS || 0), 0);
  const totalCmvGeral = compradores.reduce((acc, cur) => acc + (cur.CMV || 0), 0);
  const margemGeral = totalVendasGeral > 0 ? ((totalVendasGeral - totalCmvGeral) / totalVendasGeral) * 100 : 0;

  // Paleta de cores premium para os gráficos
  const chartColors = ["#6366f1", "#a855f7", "#ec4899", "#f43f5e", "#f57c00", "#10b981", "#14b8a6", "#06b6d4"];

  // Função para retornar as recomendações inteligentes baseadas em IA (Varredura de Melhoria)
  const getAiRecommendations = (vendedorName: string, kpis: any) => {
    if (!kpis) return null;
    const ating = kpis.atingimento || 0;
    
    let profile = {
      status: "Em Análise",
      badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      recomendacoes: [
        "Estimular cross-selling de produtos com maior valor agregado.",
        "Oferecer combos promocionais nos fins de semana."
      ],
      pontosFortes: ["Ótima fidelização de clientes recorrentes.", "Frequência estável nos atendimentos."],
      oportunidades: ["Aumentar o número de itens por cupom.", "Explorar vendas consultivas no setor de limpeza."]
    };

    if (ating >= 100) {
      profile = {
        status: "Desempenho Estrela ⭐",
        badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        pontosFortes: [
          "Superação consistente da meta de faturamento.",
          "Altíssima satisfação do cliente (NPS Excelente).",
          "Excelente penetração na categoria principal (Bebidas)."
        ],
        oportunidades: [
          "Disseminar as práticas adotadas para os demais membros da equipe.",
          "Explorar vendas de ticket ainda maior (seção premium)."
        ],
        recomendacoes: [
          "Premiação por meta superada (Campanha de incentivo).",
          "Promover a mentorias com outros vendedores de menor faturamento."
        ]
      };
    } else if (ating >= 85) {
      profile = {
        status: "Atingimento Saudável 📈",
        badgeClass: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
        pontosFortes: [
          "Desempenho operacional consistente com a média do setor.",
          "Média estável de itens por cupom (Fidelização consolidada)."
        ],
        oportunidades: [
          "Alavancar vendas na categoria secundária de Mercearia Seca.",
          "Ativação de carteira de clientes inativos nos últimos 30 dias."
        ],
        recomendacoes: [
          "Realizar treinamento rápido sobre técnicas de fechamento adicional no checkout.",
          "Alocar contatos frios para prospecção ativa de compras casadas."
        ]
      };
    } else {
      profile = {
        status: "Atenção Operacional ⚠️",
        badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        pontosFortes: [
          "Presença regular de atendimento.",
          "Ticket médio individual em patamar aceitável."
        ],
        oportunidades: [
          "Corrigir queda acentuada no fluxo de faturamento recente.",
          "Aumentar o ticket médio de compras através de metas diárias individuais."
        ],
        recomendacoes: [
          "Acompanhamento presencial da supervisão nas próximas negociações.",
          "Revisão de metas de prospecção e check-ins semanais.",
          "Aplicação de campanha de descontos especiais sob controle do vendedor."
        ]
      };
    }

    return profile;
  };

  const aiProfile = vendedorDetalhes?.kpis ? getAiRecommendations(selectedVendedor?.VENDEDOR, vendedorDetalhes.kpis) : null;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto mt-4 px-4">


      {/* Menu Interno de Abas do Comercial */}
      <div className="flex border-b border-white/10 gap-6 mb-2 overflow-x-auto pb-1">
        <button 
          onClick={() => setSubTab("compradores")}
          className={`pb-3 font-serif font-bold text-[15px] border-b-2 transition shrink-0 ${subTab === "compradores" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Desempenho por Compradora
        </button>
        <button 
          onClick={() => setSubTab("fornecedores")}
          className={`pb-3 font-serif font-bold text-[15px] border-b-2 transition shrink-0 ${subTab === "fornecedores" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Compras por Fornecedor (Valores)
        </button>
        <button 
          onClick={() => setSubTab("vendedores")}
          className={`pb-3 font-serif font-bold text-[15px] border-b-2 transition shrink-0 ${subTab === "vendedores" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Desempenho de Vendedores (6 Meses)
        </button>
      </div>

      {/* 1. ABA DE DESEMPENHO POR COMPRADORA */}
      {subTab === "compradores" && (
        <div className="flex flex-col gap-6">
          {/* Seletor Mensal de Orçamento */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-slate-200">Período de Competência do Orçamento</h4>
                <p className="text-[11px] text-slate-400">Selecione o mês para analisar a verba definida vs. compras e CMV</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-primary"
              >
                {mesesDisponiveis.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid de KPIs rápidos */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Orçado */}
            <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[120px] hover:border-blue-500/20 transition duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] tracking-executive text-slate-400 block font-semibold">ORÇAMENTO DEFINIDO</span>
                  <h2 className="text-2xl font-bold font-serif text-blue-400 mt-1 tabular-nums">
                    {fmtCurrency(totalOrcadoGeral)}
                  </h2>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-3 border-t border-white/5 pt-2">
                Verba de compras aprovada no mês
              </div>
            </div>

            {/* Total Gasto */}
            <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[120px] hover:border-emerald-500/20 transition duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] tracking-executive text-slate-400 block font-semibold">TOTAL COMPRADO (GASTO)</span>
                  <h2 className="text-2xl font-bold font-serif text-emerald-400 mt-1 tabular-nums">
                    {fmtCurrency(totalGastoGeral)}
                  </h2>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 border-t border-white/5 pt-2">
                <span>Atingimento da verba:</span>
                <span className={`font-bold ${totalGastoGeral > totalOrcadoGeral ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {totalOrcadoGeral > 0 ? ((totalGastoGeral / totalOrcadoGeral) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* Faturamento */}
            <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[120px] hover:border-indigo-500/20 transition duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] tracking-executive text-slate-400 block font-semibold">VENDAS (FATURAMENTO)</span>
                  <h2 className="text-2xl font-bold font-serif text-indigo-400 mt-1 tabular-nums">
                    {fmtCurrency(totalVendasGeral)}
                  </h2>
                </div>
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-3 border-t border-white/5 pt-2">
                Venda gerada pelas categorias
              </div>
            </div>

            {/* Margem Comercial */}
            <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[120px] hover:border-purple-500/20 transition duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] tracking-executive text-slate-400 block font-semibold">MARGEM BRUTA COMERCIAL</span>
                  <h2 className="text-2xl font-bold font-serif text-purple-400 mt-1 tabular-nums">
                    {margemGeral.toFixed(2)}%
                  </h2>
                </div>
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-3 border-t border-white/5 pt-2">
                CMV Consolidado: <span className="font-semibold text-slate-200">{fmtCurrency(totalCmvGeral)}</span>
              </div>
            </div>
          </div>

          {/* Gráficos Comparativos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Orçamento vs. Gasto */}
            <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
              <div>
                <span className="text-[10px] tracking-executive text-primary font-bold">Orçamento de Compras</span>
                <h3 className="font-serif text-base font-bold mt-1 text-slate-200">Verba Definida vs. Valor Comprado</h3>
                <p className="text-xs text-slate-400">Comparativo financeiro mensal de orçado vs gasto por compradora</p>
              </div>

              {loading ? (
                <div className="h-64 flex justify-center items-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="h-64 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compradores} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="COMPRADOR" 
                        stroke="rgba(255,255,255,0.4)" 
                        fontSize={10} 
                        tickLine={false}
                        tickFormatter={(v) => v && typeof v === "string" ? v.split(" ")[0] : ""}
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.4)" 
                        fontSize={10} 
                        tickLine={false}
                        tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "rgba(0,0,0,0.85)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
                        labelStyle={{ fontFamily: "serif", fontWeight: "bold", color: "#f8fafc" }}
                        itemStyle={{ color: "#f1f5f9" }}
                        formatter={(value: any) => [fmtCurrency(value)]}
                      />
                      <Bar dataKey="ORCADO" name="Orçado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="GASTO" name="Comprado" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Gráfico 2: Vendas vs. CMV */}
            <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
              <div>
                <span className="text-[10px] tracking-executive text-purple-400 font-bold">Performance de Vendas</span>
                <h3 className="font-serif text-base font-bold mt-1 text-slate-200">Venda Líquida vs. CMV</h3>
                <p className="text-xs text-slate-400">Relação entre o faturamento gerado e o custo das mercadorias vendidas</p>
              </div>

              {loading ? (
                <div className="h-64 flex justify-center items-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="h-64 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compradores} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="COMPRADOR" 
                        stroke="rgba(255,255,255,0.4)" 
                        fontSize={10} 
                        tickLine={false}
                        tickFormatter={(v) => v && typeof v === "string" ? v.split(" ")[0] : ""}
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.4)" 
                        fontSize={10} 
                        tickLine={false}
                        tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "rgba(0,0,0,0.85)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
                        labelStyle={{ fontFamily: "serif", fontWeight: "bold", color: "#f8fafc" }}
                        itemStyle={{ color: "#f1f5f9" }}
                        formatter={(value: any) => [fmtCurrency(value)]}
                      />
                      <Bar dataKey="VENDAS" name="Vendas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="CMV" name="CMV" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Tabela de Resultados por Compradora */}
          <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-200">Demonstrativo por Compradora</h3>
              <p className="text-xs text-slate-400">Tabela analítica cruzando orçado, gasto, vendas, CMV e margem do período</p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-10">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Compradora</th>
                      <th className="py-3 px-4 text-right">Orçamento</th>
                      <th className="py-3 px-4 text-right">Gasto (Compras)</th>
                      <th className="py-3 px-4 text-center">Atingido %</th>
                      <th className="py-3 px-4 text-right">Vendas</th>
                      <th className="py-3 px-4 text-right">CMV</th>
                      <th className="py-3 px-4 text-center">Margem %</th>
                      <th className="py-3 px-4 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compradores.map((c, i) => {
                      const atingido = c.ORCADO > 0 ? (c.GASTO / c.ORCADO) * 100 : 0;
                      const margem = c.VENDAS > 0 ? ((c.VENDAS - c.CMV) / c.VENDAS) * 100 : 0;
                      return (
                        <tr key={c.COMPRADOR || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-200 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                            {c.COMPRADOR}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-300">{fmtCurrency(c.ORCADO)}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-300">{fmtCurrency(c.GASTO)}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${atingido > 100 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                              {atingido.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-300">{fmtCurrency(c.VENDAS)}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-300">{fmtCurrency(c.CMV)}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`font-bold ${margem >= 20 ? 'text-emerald-400' : margem >= 10 ? 'text-indigo-400' : 'text-amber-400'}`}>
                              {margem.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => fetchCompradorCompras(c)}
                              className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[10px] text-primary hover:bg-primary/20 transition font-bold"
                            >
                              Ver Pedidos
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ABA DE COMPRAS FILTRADAS POR FORNECEDOR */}
      {subTab === "fornecedores" && (
        <div className="glass-strong rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-200">
                Filtro de Compras por Fornecedor
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulte os pedidos de compra fechados com cada fornecedor e seus respectivos valores totais
              </p>
            </div>
            
            <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary font-mono self-start md:self-auto">
              {compras.length} pedidos listados
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 text-sm">
            {/* Selecionar Loja */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Loja</label>
              <select
                value={lojaFiltro}
                onChange={(e) => setLojaFiltro(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary text-slate-300 text-xs"
              >
                <option value="todas" className="bg-slate-950">Todas as Lojas</option>
                {empresas.map((emp) => (
                  <option key={emp.IDEMPRESA} value={emp.IDEMPRESA} className="bg-slate-950">
                    {emp.IDEMPRESA} - {emp.DESCREMPRESA || emp.NOMEFANTASIA || "Loja"}
                  </option>
                ))}
              </select>
            </div>

            {/* Selecionar Fornecedor */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Fornecedor</label>
              <select
                value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 focus:outline-none focus:border-primary text-slate-300 text-xs"
              >
                <option value="" className="text-slate-100 bg-slate-950">-- Todos os Fornecedores --</option>
                {fornecedores.map((f) => (
                  <option key={f.IDCLIFOR} value={f.IDCLIFOR} className="text-slate-100 bg-slate-950">
                    {f.NOME}
                  </option>
                ))}
              </select>
            </div>

            {/* Busca livre */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Buscar Fornecedor / ID Pedido</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="ID Pedido ou nome..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-primary text-slate-200 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                />
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Data Inicial */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Período Inicial</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary text-slate-300 text-xs font-mono"
              />
            </div>

            {/* Data Final */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Período Final</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary text-slate-300 text-xs font-mono"
              />
            </div>

            {/* Buscar Comprador */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Comprador</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Ex: ANA LUIZA"
                  value={compradorBusca}
                  onChange={(e) => setCompradorBusca(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-primary text-slate-300 text-xs"
                />
              </div>
            </div>

            {/* Status de Recebimento */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Status de Recebimento</label>
              <select
                value={statusRecebimento}
                onChange={(e) => setStatusRecebimento(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary text-slate-300 text-xs"
              >
                <option value="" className="text-slate-100 bg-slate-950">Todos</option>
                <option value="pendente" className="text-slate-100 bg-slate-950">Pendente (Não Entregue)</option>
                <option value="parcial" className="text-slate-100 bg-slate-950">Recebido Parcial</option>
                <option value="total" className="text-slate-100 bg-slate-950">Recebido Total</option>
              </select>
            </div>
          </div>

          {/* Ações de Filtro */}
          <div className="flex justify-end gap-2 border-b border-white/5 pb-4">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              Limpar Filtros
            </button>
            <button
              onClick={handleApplyFilters}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow shadow-primary/20 hover:opacity-90 transition flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Filtrar Compras
            </button>
          </div>

          {/* Listagem em Tabela */}
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : compras.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center gap-2">
              <FileText className="w-10 h-10 text-slate-500" />
              <span>Nenhum pedido de compra localizado para os filtros aplicados.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Pedido ID</th>
                    <th className="py-3 px-4">Data do Pedido</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4">Comprador Responsável</th>
                    <th className="py-3 px-4 text-center">Itens Distintos</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Valor Total do Pedido</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.map((comp) => (
                    <tr key={comp.IDPEDIDO} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-300 tabular-nums">
                        <button 
                          onClick={() => fetchPedidoDetalhes(comp.IDPEDIDO)}
                          className="hover:text-primary transition-colors hover:underline text-left"
                          title="Clique para ver os itens"
                        >
                          #{comp.IDPEDIDO}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{fmtDate(comp.DATA_PEDIDO)}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-200 max-w-[220px] truncate">{comp.FORNECEDOR}</td>
                      <td className="py-3.5 px-4 text-slate-300">{comp.COMPRADOR || "Comprador Geral"}</td>
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono">{comp.QTD_ITENS || 1} un</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          comp.STATUS_RECEBIMENTO === 'Parcial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                          comp.STATUS_RECEBIMENTO === 'Total' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {comp.STATUS_RECEBIMENTO}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-sm text-primary tabular-nums">{fmtCurrency(comp.VALOR_TOTAL)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. ABA DE DESEMPENHO DE VENDEDORES (6 MESES) */}
      {subTab === "vendedores" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna Esquerda: Listagem e Filtro local */}
          <div className="glass-strong rounded-2xl p-5 lg:col-span-1 flex flex-col gap-4 self-start">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-200">Equipe de Vendas</h3>
              <p className="text-xs text-slate-400">Movimentação acumulada nos últimos 6 meses</p>
            </div>

            {/* Barra de Filtros Local */}
            <div className="flex flex-col gap-2 bg-black/25 p-3 rounded-xl border border-white/5">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Buscar vendedor..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-primary text-xs text-slate-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                />
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="text-[9px] text-slate-500 block uppercase font-bold">Início</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 focus:outline-none text-[10px] text-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block uppercase font-bold">Fim</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 focus:outline-none text-[10px] text-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-white/5">
                <button
                  onClick={handleClearFilters}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 font-semibold transition"
                >
                  Limpar
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-3 py-1 rounded bg-primary text-primary-foreground text-[10px] font-bold shadow transition flex items-center gap-1"
                >
                  <Filter className="w-2.5 h-2.5" />
                  Filtrar
                </button>
              </div>
            </div>

            {/* Listagem de vendedores */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : vendedores.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Nenhum vendedor encontrado.
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px]">
                {vendedores.map((v, i) => (
                  <button
                    key={v.IDVENDEDOR}
                    onClick={() => setSelectedVendedor(v)}
                    className={`text-left p-3 rounded-xl border transition flex items-center justify-between gap-3 ${selectedVendedor?.IDVENDEDOR === v.IDVENDEDOR ? 'bg-primary/10 border-primary/40 shadow-sm' : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03]'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate" title={v.VENDEDOR}>
                          {v.VENDEDOR}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <Building2 className="w-2.5 h-2.5 shrink-0" />
                          <span>{v.LOJA}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-slate-100">
                        {fmtCurrency(v.TOTAL_VENDIDO)}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        {v.QTD_VENDAS} atendimentos
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Coluna Direita: Análise de Desempenho e Recomendações (Varredura de Melhoria) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {!selectedVendedor ? (
              <div className="glass-strong rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <User className="w-12 h-12 text-slate-600 animate-pulse" />
                <span>Selecione um vendedor ao lado para visualizar a análise detalhada.</span>
              </div>
            ) : loadingDetalhes ? (
              <div className="glass-strong rounded-2xl p-24 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                
                {/* Header do Dossiê */}
                <div className="glass-strong rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-indigo-500">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-serif text-xl font-bold text-slate-100">{selectedVendedor.VENDEDOR}</h3>
                      <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded font-mono text-slate-400">
                        ID: #{selectedVendedor.IDVENDEDOR}
                      </span>
                      {aiProfile && (
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${aiProfile.badgeClass}`}>
                          {aiProfile.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Lotação atual: <strong>{selectedVendedor.LOJA}</strong> • Dados sincronizados de 6 meses atrás
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[9px] block text-slate-400 font-bold uppercase tracking-wider">FATURAMENTO ACUMULADO</span>
                    <h4 className="text-xl font-bold text-primary font-mono tabular-nums">{fmtCurrency(selectedVendedor.TOTAL_VENDIDO)}</h4>
                  </div>
                </div>

                {/* Grid de KPIs Detalhados */}
                {vendedorDetalhes?.kpis && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* KPI Meta */}
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Atingimento de Meta</span>
                        <h5 className="text-lg font-bold font-mono text-slate-200 mt-0.5">
                          {vendedorDetalhes.kpis.atingimento.toFixed(1)}%
                        </h5>
                        <span className="text-[9px] text-slate-500">
                          Real: {fmtCurrency(vendedorDetalhes.kpis.realizado)}
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg ${vendedorDetalhes.kpis.atingimento >= 100 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        <Percent className="w-5 h-5" />
                      </div>
                    </div>

                    {/* KPI Itens por Cupom */}
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Itens por Atendimento</span>
                        <h5 className="text-lg font-bold font-mono text-indigo-400 mt-0.5">
                          {vendedorDetalhes.kpis.itensPorCupom.toFixed(1)} un
                        </h5>
                        <span className="text-[9px] text-slate-500">
                          Média de compras casadas
                        </span>
                      </div>
                      <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    </div>

                    {/* KPI NPS */}
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Índice NPS (Satisfação)</span>
                        <h5 className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                          {vendedorDetalhes.kpis.nps} pts
                        </h5>
                        <span className="text-[9px] text-slate-500">
                          Zona de Excelência (Alvo &gt;75)
                        </span>
                      </div>
                      <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                        <ThumbsUp className="w-5 h-5" />
                      </div>
                    </div>

                  </div>
                )}

                {/* Gráfico de Evolução de Vendas */}
                {vendedorDetalhes?.historico && (
                  <div className="glass-strong rounded-2xl p-5 flex flex-col gap-4">
                    <div>
                      <h4 className="font-serif text-sm font-bold text-slate-200">Evolução Mensal do Faturamento</h4>
                      <p className="text-[11px] text-slate-400">Análise de oscilação e sazonalidade nos últimos 6 meses</p>
                    </div>
                    
                    <div className="h-48 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={vendedorDetalhes.historico} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                          <YAxis 
                            stroke="rgba(255,255,255,0.4)" 
                            fontSize={9} 
                            tickLine={false}
                            tickFormatter={(v) => `R$ ${v/1000}k`}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "rgba(0,0,0,0.85)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
                            labelStyle={{ fontFamily: "serif", fontWeight: "bold", color: "#f8fafc" }}
                            itemStyle={{ color: "#f1f5f9" }}
                            formatter={(value: any) => [fmtCurrency(value), "Faturamento"]}
                          />
                          <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Grid de Tabelas (Top Produtos e Participação) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Top Produtos */}
                  {vendedorDetalhes?.topProdutos && (
                    <div className="glass-strong rounded-2xl p-5 flex flex-col gap-3">
                      <h4 className="font-serif text-sm font-bold text-slate-200">Mais Vendidos pelo Profissional</h4>
                      <div className="flex flex-col gap-2 overflow-y-auto max-h-[180px] mt-1">
                        {vendedorDetalhes.topProdutos.map((p: any, i: number) => (
                          <div key={i} className="flex justify-between items-center bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-[11px]">
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-slate-200 block truncate" title={p.produto}>{p.produto}</span>
                              <span className="text-[10px] text-slate-400">{p.qtd} unidades vendidas</span>
                            </div>
                            <span className="font-mono font-bold text-slate-100 shrink-0">{fmtCurrency(p.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Participação por Categoria */}
                  {vendedorDetalhes?.topCategorias && (
                    <div className="glass-strong rounded-2xl p-5 flex flex-col gap-3">
                      <h4 className="font-serif text-sm font-bold text-slate-200">Mix de Vendas por Categoria</h4>
                      <div className="flex flex-col gap-3 mt-1">
                        {vendedorDetalhes.topCategorias.map((c: any, i: number) => {
                          const maxVal = vendedorDetalhes.topCategorias[0]?.value || 1;
                          const pct = (c.value / maxVal) * 100;
                          return (
                            <div key={i} className="flex flex-col gap-1 text-[11px]">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-300">{c.name}</span>
                                <span className="font-mono text-slate-400 font-bold">{fmtCurrency(c.value)}</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ 
                                    width: `${pct}%`,
                                    backgroundColor: chartColors[i % chartColors.length]
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>

                {/* Box de Análise Avançada de IA (Varredura de Melhoria) */}
                {aiProfile && (
                  <div className="glass-strong rounded-2xl p-5 border border-indigo-500/20 bg-indigo-950/15 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-indigo-400" />
                      <h4 className="font-serif text-sm font-bold text-slate-200">Varredura e IA Insights (Melhoria Analítica)</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      
                      {/* Diagnóstico Operacional */}
                      <div className="flex flex-col gap-2">
                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Pontos Fortes Identificados
                        </span>
                        <ul className="list-disc pl-4 text-slate-400 space-y-1">
                          {aiProfile.pontosFortes.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Gargalos / Oportunidades */}
                      <div className="flex flex-col gap-2">
                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-indigo-400" /> Oportunidades de Crescimento
                        </span>
                        <ul className="list-disc pl-4 text-slate-400 space-y-1">
                          {aiProfile.oportunidades.map((o, i) => (
                            <li key={i}>{o}</li>
                          ))}
                        </ul>
                      </div>

                    </div>

                    {/* Recomendações de Ação */}
                    <div className="bg-black/35 rounded-xl p-3 border border-white/5 text-xs flex flex-col gap-2 mt-1">
                      <span className="font-bold text-indigo-300 flex items-center gap-1">
                        🚀 Plano de Ação Recomendado para {selectedVendedor.VENDEDOR}:
                      </span>
                      <ol className="list-decimal pl-4 text-slate-300 space-y-1 font-medium">
                        {aiProfile.recomendacoes.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ol>
                    </div>

                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      )}
      {/* === MODAL: Pedidos do Comprador === */}
      {selectedComprador && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-strong rounded-2xl w-full max-w-3xl border border-white/10 shadow-2xl p-6 relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            
            {/* Close */}
            <button 
              onClick={() => { setSelectedComprador(null); setCompradorCompras([]); }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-slate-100">Pedidos de Compra — {selectedComprador.COMPRADOR}</h3>
                <p className="text-[10px] text-slate-400">Histórico completo com status de entrega</p>
              </div>
              {/* KPI bar */}
              {!loadingComprasModal && compradorCompras.length > 0 && (() => {
                const entregues = compradorCompras.filter(p => p.STATUS === 'Entregue').length;
                const pendentes = compradorCompras.filter(p => p.STATUS === 'Pendente').length;
                const total = fmtCurrency(compradorCompras.reduce((s, p) => s + (p.VALOR_TOTAL || 0), 0));
                return (
                  <div className="ml-auto flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="font-bold">{entregues}</span> Entregues
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-bold">{pendentes}</span> Pendentes
                    </div>
                    <div className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-2.5 py-1.5 font-mono font-bold">{total}</div>
                  </div>
                );
              })()}
            </div>

            {/* Table */}
            {loadingComprasModal ? (
              <div className="flex justify-center items-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : compradorCompras.length === 0 ? (
              <div className="text-center text-slate-400 py-12 text-sm">Nenhum pedido encontrado para este comprador no período.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Pedido</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Fornecedor</th>
                      <th className="py-2.5 px-3 text-center">Itens</th>
                      <th className="py-2.5 px-3 text-right">Valor Total</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compradorCompras.map((p, i) => (
                      <tr key={p.IDPEDIDO || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-primary">#{p.IDPEDIDO}</td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {p.DATA_PEDIDO ? new Date(p.DATA_PEDIDO).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 max-w-[200px] truncate" title={p.FORNECEDOR}>{p.FORNECEDOR || '—'}</td>
                        <td className="py-2.5 px-3 text-center text-slate-400">{p.QTD_ITENS}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">{fmtCurrency(p.VALOR_TOTAL)}</td>
                        <td className="py-2.5 px-3 text-center">
                          {p.STATUS === 'Entregue' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle className="w-2.5 h-2.5" /> Entregue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                              <Clock className="w-2.5 h-2.5" /> Pendente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Pedido (Itens) */}
      {modalPedidoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-100">
                    Detalhes do Pedido <span className="text-primary">#{currentPedidoId}</span>
                  </h3>
                  <p className="text-xs text-slate-400">Relação de itens solicitados e entregues</p>
                </div>
              </div>
              <button 
                onClick={() => setModalPedidoOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-0 overflow-y-auto flex-1">
              {loadingPedido ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-slate-400 text-sm font-medium">Buscando itens do pedido...</span>
                </div>
              ) : pedidoItens.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm flex flex-col items-center gap-2">
                  <ShoppingBag className="w-10 h-10 text-slate-500 opacity-50" />
                  <span>Nenhum item localizado para este pedido.</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                    <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Cod. Subproduto</th>
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-4 text-center">Qtd. Solicitada</th>
                      <th className="py-3 px-4 text-center">Qtd. Atendida</th>
                      <th className="py-3 px-4 text-center">Pendente</th>
                      <th className="py-3 px-4 text-right">Valor Un.</th>
                      <th className="py-3 px-4 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidoItens.map((item, i) => (
                      <tr key={item.IDSUBPRODUTO || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{item.IDSUBPRODUTO}</td>
                        <td className="py-3 px-4 text-slate-200 font-medium max-w-[250px] truncate" title={item.DESCRICAO}>
                          {item.DESCRICAO}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-300">
                          {item.QTDSOLICITADA}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-400">
                          {item.QTDATENDIDA}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.QTDPENDENTE > 0 ? (
                            <span className="bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded font-mono">
                              {item.QTDPENDENTE}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {fmtCurrency(item.VALUNITARIO)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-primary">
                          {fmtCurrency(item.VALORTOTAL)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
              <button
                onClick={() => setModalPedidoOpen(false)}
                className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

