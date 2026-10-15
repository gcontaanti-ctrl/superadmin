import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  Filter,
  Search,
  Building2,
  User,
  FileSpreadsheet,
  ArrowUpDown,
  FileText,
  AlertCircle,
  Eye,
  RefreshCw,
  TrendingUp,
  Percent,
  X,
  ChevronRight,
  Package,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Treemap
} from 'recharts';

const PALETA_CORES = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#e11d48',
  '#84cc16', '#a855f7', '#0ea5e9', '#eab308', '#64748b'
];

const CustomTooltipGrafico = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-white/20 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs z-50">
        <p className="font-bold text-slate-100 border-b border-white/10 pb-1 mb-2">{label}</p>
        <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="truncate max-w-[140px]">{entry.name}:</span>
              </span>
              <span className="font-mono font-bold text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value || 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface PedidosCompradoresModuleProps {
  selectedStore?: string;
  globalStartDate?: string;
  globalEndDate?: string;
}

export function PedidosCompradoresModule({
  selectedStore = 'todas',
  globalStartDate,
  globalEndDate
}: PedidosCompradoresModuleProps) {
  // Estados de Filtros
  const [activeTab, setActiveTab] = useState<'compradores' | 'graficos' | 'orcamentos' | 'pedidos'>('compradores');
  const [periodoPreset, setPeriodoPreset] = useState<'mes_atual' | '7d' | '15d' | '30d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filtroLoja, setFiltroLoja] = useState<string>(selectedStore);
  const [filtroComprador, setFiltroComprador] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'entregue' | 'pendente'>('todos');
  const [busca, setBusca] = useState('');

  // Estados dos Gráficos
  const [graficoModoLoja, setGraficoModoLoja] = useState<'total' | 'empilhado'>('total');
  const [limiteSecoes, setLimiteSecoes] = useState<number>(10);
  const [filtroCompradorSecao, setFiltroCompradorSecao] = useState<string>('todos');

  // Dados das APIs
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<any>({
    totalPedidos: 0,
    pedidosEntregues: 0,
    pedidosPendentes: 0,
    taxaEntrega: 0,
    valorTotalComprado: 0,
    valorEntregue: 0,
    valorPendente: 0,
    totalOrcado: 0,
    saldoOrcamento: 0,
    atingimentoOrcamento: 0
  });
  const [compradores, setCompradores] = useState<any[]>([]);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);

  // Dados de Gráficos
  const [graficos, setGraficos] = useState<any>({
    compradores: [],
    lojas: [],
    secoes: [],
    totalPorLoja: [],
    totalPorSecao: [],
    compradorPorLoja: [],
    compradorPorSecao: []
  });

  // Modal de Detalhes dos Itens do Pedido
  const [modalItensOpen, setModalItensOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);
  const [itensPedido, setItensPedido] = useState<any[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);

  // Inicializar datas padrão
  useEffect(() => {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    let startStr = '';

    if (periodoPreset === 'mes_atual') {
      startStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    } else if (periodoPreset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startStr = d.toISOString().split('T')[0];
    } else if (periodoPreset === '15d') {
      const d = new Date();
      d.setDate(d.getDate() - 15);
      startStr = d.toISOString().split('T')[0];
    } else if (periodoPreset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startStr = d.toISOString().split('T')[0];
    }

    if (periodoPreset !== 'custom') {
      setStartDate(startStr);
      setEndDate(endStr);
    }
  }, [periodoPreset]);

  // Carregar lista de Lojas
  useEffect(() => {
    fetch('/api/empresas')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEmpresas(data);
      })
      .catch(console.error);
  }, []);

  // Sincronizar com filtro global de loja se mudar
  useEffect(() => {
    if (selectedStore) setFiltroLoja(selectedStore);
  }, [selectedStore]);

  // Carregar dados principais
  const carregarDados = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      // 1. Resumo e Compradores
      let urlResumo = `/api/pedidos-compradores/resumo?startDate=${startDate}&endDate=${endDate}`;
      if (filtroLoja && filtroLoja !== 'todas') urlResumo += `&idEmpresa=${filtroLoja}`;
      if (filtroComprador && filtroComprador !== 'todos') urlResumo += `&compradorId=${filtroComprador}`;

      const resResumo = await fetch(urlResumo);
      const jsonResumo = await resResumo.json();
      if (jsonResumo.kpis) setKpis(jsonResumo.kpis);
      if (jsonResumo.compradores) setCompradores(jsonResumo.compradores);

      // 2. Orçamentos Lançados
      let urlOrc = `/api/pedidos-compradores/orcamentos?startDate=${startDate}&endDate=${endDate}`;
      if (filtroLoja && filtroLoja !== 'todas') urlOrc += `&idEmpresa=${filtroLoja}`;
      if (filtroComprador && filtroComprador !== 'todos') urlOrc += `&compradorId=${filtroComprador}`;

      const resOrc = await fetch(urlOrc);
      const jsonOrc = await resOrc.json();
      if (jsonOrc.orcamentos) setOrcamentos(jsonOrc.orcamentos);

      // 3. Dados para Gráficos
      let urlGraf = `/api/pedidos-compradores/graficos?startDate=${startDate}&endDate=${endDate}`;
      if (filtroLoja && filtroLoja !== 'todas') urlGraf += `&idEmpresa=${filtroLoja}`;
      if (filtroComprador && filtroComprador !== 'todos') urlGraf += `&compradorId=${filtroComprador}`;

      const resGraf = await fetch(urlGraf);
      const jsonGraf = await resGraf.json();
      if (jsonGraf.compradores) setGraficos(jsonGraf);

      // 4. Pedidos detalhados
      carregarPedidos();
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao conectar ao banco de dados CISS.');
    } finally {
      setLoading(false);
    }
  };

  const carregarPedidos = async () => {
    try {
      let urlPed = `/api/pedidos-compradores/pedidos?startDate=${startDate}&endDate=${endDate}&limit=300`;
      if (filtroLoja && filtroLoja !== 'todas') urlPed += `&idEmpresa=${filtroLoja}`;
      if (filtroComprador && filtroComprador !== 'todos') urlPed += `&compradorId=${filtroComprador}`;
      if (filtroStatus && filtroStatus !== 'todos') urlPed += `&status=${filtroStatus}`;
      if (busca && busca.trim()) urlPed += `&busca=${encodeURIComponent(busca.trim())}`;

      const resPed = await fetch(urlPed);
      const jsonPed = await resPed.json();
      if (jsonPed.pedidos) setPedidos(jsonPed.pedidos);
    } catch (e) {
      console.error(e);
    }
  };

  // Filtragem reativa instantânea
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((ped) => {
      if (filtroStatus === 'entregue' && ped.STATUS !== 'Entregue') return false;
      if (filtroStatus === 'pendente' && ped.STATUS !== 'Pendente') return false;
      if (busca && busca.trim()) {
        const b = busca.toLowerCase();
        const matchFornec = (ped.FORNECEDOR || '').toLowerCase().includes(b);
        const matchPed = String(ped.IDPEDIDO).includes(b);
        const matchNf = (ped.NOTAS_FISCAIS || '').toLowerCase().includes(b);
        const matchComp = (ped.COMPRADOR || '').toLowerCase().includes(b);
        const matchCond = (ped.CONDICAO_PAGTO || '').toLowerCase().includes(b);
        const matchPrazo = (ped.PRAZO || '').toLowerCase().includes(b);
        const matchBoleto = (ped.DATA_BOLETO || '').toLowerCase().includes(b);
        if (!matchFornec && !matchPed && !matchNf && !matchComp && !matchCond && !matchPrazo && !matchBoleto) return false;
      }
      return true;
    });
  }, [pedidos, filtroStatus, busca]);

  useEffect(() => {
    if (startDate && endDate) {
      carregarDados();
    }
  }, [startDate, endDate, filtroLoja, filtroComprador]);

  useEffect(() => {
    if (startDate && endDate) {
      carregarPedidos();
    }
  }, [filtroStatus, busca]);

  // Abrir Modal de Itens do Pedido
  const abrirItensPedido = async (pedido: any) => {
    setSelectedPedido(pedido);
    setModalItensOpen(true);
    setLoadingItens(true);
    try {
      const res = await fetch(`/api/pedidos-compradores/pedido-itens?idPedido=${pedido.IDPEDIDO}`);
      const json = await res.json();
      setItensPedido(json.itens || []);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao buscar itens do pedido.');
    } finally {
      setLoadingItens(false);
    }
  };

  // Formatações
  const fmtMoeda = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const fmtCompacto = (val: number) => {
    if (Math.abs(val) >= 1_000_000) {
      return `R$ ${(val / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(val) >= 1_000) {
      return `R$ ${(val / 1_000).toFixed(1)}k`;
    }
    return fmtMoeda(val);
  };

  const fmtData = (dt: string) => {
    if (!dt) return '-';
    const parts = dt.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dt;
  };

  // Cores dinâmicas para gráficos e compradores
  const cores = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb923c', '#4ade80', '#2dd4bf'];

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in text-slate-100">
      {/* 1. CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-strong p-6 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
              Módulo CISS ERP
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              Validação por Nota Fiscal
            </span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-slate-100 tracking-tight flex items-center gap-3">
            Gestão de Pedidos & Orçamentos
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Acompanhamento analítico de pedidos digitados por comprador, conferência de entregas validadas pela entrada da nota fiscal e controle de orçamentos lançados no CISS.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={carregarDados}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar CISS
          </button>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS AVANÇADOS */}
      <div className="glass-strong p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row flex-wrap items-center justify-between gap-4 text-xs">
        {/* Preset de Período */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setPeriodoPreset('mes_atual')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${periodoPreset === 'mes_atual' ? 'bg-primary text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriodoPreset('7d')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${periodoPreset === '7d' ? 'bg-primary text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            7 Dias
          </button>
          <button
            onClick={() => setPeriodoPreset('15d')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${periodoPreset === '15d' ? 'bg-primary text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            15 Dias
          </button>
          <button
            onClick={() => setPeriodoPreset('30d')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${periodoPreset === '30d' ? 'bg-primary text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            30 Dias
          </button>
        </div>

        {/* Datas Manuais */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodoPreset('custom');
              }}
              className="bg-transparent text-slate-200 focus:outline-none text-xs"
            />
            <span className="text-slate-500">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodoPreset('custom');
              }}
              className="bg-transparent text-slate-200 focus:outline-none text-xs"
            />
          </div>
        </div>

        {/* Filtro por Loja */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <select
            value={filtroLoja}
            onChange={(e) => setFiltroLoja(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary text-xs"
          >
            <option value="todas">Todas as Lojas (Rede)</option>
            {empresas.map((emp) => (
              <option key={emp.IDEMPRESA} value={emp.IDEMPRESA}>
                {emp.IDEMPRESA} - {emp.DESCREMPRESA || emp.NOMEFANTASIA || `Loja ${emp.IDEMPRESA}`}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Comprador */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          <select
            value={filtroComprador}
            onChange={(e) => setFiltroComprador(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary text-xs"
          >
            <option value="todos">Todos os Compradores</option>
            {compradores.map((c) => (
              <option key={c.IDUSUARIO} value={c.IDUSUARIO}>
                {c.COMPRADOR}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. CARDS DE KPIS EXECUTIVOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pedidos Digitados */}
        <div className="glass-strong rounded-2xl p-5 border border-white/5 flex flex-col justify-between hover:border-cyan-500/20 transition group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Pedidos Digitados
              </span>
              <h2 className="text-3xl font-bold font-serif text-slate-100 mt-1 tabular-nums">
                {kpis.totalPedidos.toLocaleString('pt-BR')}
              </h2>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-3 mt-3 border-t border-white/5 text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {kpis.pedidosEntregues} Entregues (NF)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              {kpis.pedidosPendentes} Pendentes
            </span>
          </div>
        </div>

        {/* Total Comprado (R$) */}
        <div className="glass-strong rounded-2xl p-5 border border-white/5 flex flex-col justify-between hover:border-indigo-500/20 transition group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Total Comprado (R$)
              </span>
              <h2 className="text-3xl font-bold font-serif text-indigo-400 mt-1 tabular-nums">
                {fmtCompacto(kpis.valorTotalComprado)}
              </h2>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] pt-3 mt-3 border-t border-white/5 text-slate-400 flex justify-between">
            <span>Ticket Médio por Pedido:</span>
            <span className="font-semibold text-slate-200">
              {fmtMoeda(kpis.totalPedidos > 0 ? kpis.valorTotalComprado / kpis.totalPedidos : 0)}
            </span>
          </div>
        </div>

        {/* Mercadorias Entregues vs Pendentes */}
        <div className="glass-strong rounded-2xl p-5 border border-white/5 flex flex-col justify-between hover:border-emerald-500/20 transition group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Entregue com Nota Fiscal
              </span>
              <h2 className="text-3xl font-bold font-serif text-emerald-400 mt-1 tabular-nums">
                {fmtCompacto(kpis.valorEntregue)}
              </h2>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-3 mt-3 border-t border-white/5 text-slate-400">
            <span>Pendente de Entrega:</span>
            <span className="text-amber-400 font-bold tabular-nums">
              {fmtCompacto(kpis.valorPendente)}
            </span>
          </div>
        </div>

        {/* Orçamento CISS vs Saldo */}
        <div className="glass-strong rounded-2xl p-5 border border-white/5 flex flex-col justify-between hover:border-purple-500/20 transition group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Orçamento Lançado (CISS)
              </span>
              <h2 className="text-3xl font-bold font-serif text-purple-400 mt-1 tabular-nums">
                {fmtCompacto(kpis.totalOrcado)}
              </h2>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-3 mt-3 border-t border-white/5 text-slate-400">
            <span>Saldo da Verba:</span>
            <span className={`font-bold tabular-nums ${kpis.saldoOrcamento >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {fmtCompacto(kpis.saldoOrcamento)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. SELETOR DE ABAS DO MÓDULO */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-1">
        <button
          onClick={() => setActiveTab('compradores')}
          className={`flex items-center gap-2 pb-3 font-serif font-bold text-sm border-b-2 transition ${activeTab === 'compradores' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <User className="w-4 h-4" />
          Acompanhamento por Comprador
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-mono">
            {compradores.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('graficos')}
          className={`flex items-center gap-2 pb-3 font-serif font-bold text-sm border-b-2 transition ${activeTab === 'graficos' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <BarChart3 className="w-4 h-4" />
          Gráficos & Análises
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-mono font-bold">
            NOVO
          </span>
        </button>

        <button
          onClick={() => setActiveTab('orcamentos')}
          className={`flex items-center gap-2 pb-3 font-serif font-bold text-sm border-b-2 transition ${activeTab === 'orcamentos' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Orçamentos Lançados (CISS)
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-400 font-mono">
            {orcamentos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pedidos')}
          className={`flex items-center gap-2 pb-3 font-serif font-bold text-sm border-b-2 transition ${activeTab === 'pedidos' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <ShoppingCart className="w-4 h-4" />
          Lista de Pedidos & Validação NF
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/10 text-cyan-400 font-mono">
            {pedidosFiltrados.length}
          </span>
        </button>
      </div>

      {/* 5. CONTEÚDO DAS ABAS */}

      {/* ABA 1: COMPRADORES */}
      {activeTab === 'compradores' && (
        <div className="glass-strong rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold font-serif text-slate-100">
                Desempenho & Pedidos por Comprador
              </h3>
              <p className="text-xs text-slate-400">
                Relação de pedidos digitados, status de entrega validado pela entrada de NF e cumprimento da verba orçamentária.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Comprador</th>
                  <th className="py-3 px-4 font-semibold text-center">Pedidos Digitados</th>
                  <th className="py-3 px-4 font-semibold text-center">Entregues (NF)</th>
                  <th className="py-3 px-4 font-semibold text-center">Pendentes</th>
                  <th className="py-3 px-4 font-semibold text-center">% Entregue</th>
                  <th className="py-3 px-4 font-semibold text-right">Valor Comprado (R$)</th>
                  <th className="py-3 px-4 font-semibold text-right">Valor Entregue</th>
                  <th className="py-3 px-4 font-semibold text-right">Valor Pendente</th>
                  <th className="py-3 px-4 font-semibold text-right">Orçamento CISS</th>
                  <th className="py-3 px-4 font-semibold text-right">Saldo Verba</th>
                  <th className="py-3 px-4 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {compradores.map((comp, idx) => {
                  const percEnt = comp.TOTAL_PEDIDOS > 0 ? (comp.PEDIDOS_ENTREGUES / comp.TOTAL_PEDIDOS) * 100 : 0;
                  const saldo = comp.ORCADO > 0 ? comp.ORCADO - comp.VALOR_TOTAL_COMPRADO : 0;
                  return (
                    <tr key={comp.IDUSUARIO || idx} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-200 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cores[idx % cores.length] }}
                        />
                        {comp.COMPRADOR}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-100">
                        {comp.TOTAL_PEDIDOS}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                        {comp.PEDIDOS_ENTREGUES}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-400">
                        {comp.PEDIDOS_PENDENTES}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(percEnt, 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">
                            {percEnt.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-400">
                        {fmtMoeda(comp.VALOR_TOTAL_COMPRADO)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                        {fmtMoeda(comp.VALOR_ENTREGUE)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-amber-400">
                        {fmtMoeda(comp.VALOR_PENDENTE)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-purple-400">
                        {comp.ORCADO > 0 ? fmtMoeda(comp.ORCADO) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {comp.ORCADO > 0 ? (
                          <span className={saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {fmtMoeda(saldo)}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setFiltroComprador(String(comp.IDUSUARIO));
                            setActiveTab('pedidos');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold transition"
                        >
                          Ver Pedidos
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {compradores.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-500">
                      Nenhum dado encontrado para o período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: GRÁFICOS & ANÁLISES VISUAIS */}
      {activeTab === 'graficos' && (
        <div className="flex flex-col gap-6">
          {/* CARDS RESUMO ANALÍTICO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-strong rounded-2xl p-4 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Total em Pedidos</span>
                <p className="text-xl font-bold font-serif text-slate-100 mt-1">
                  {fmtMoeda(kpis.valorTotalComprado)}
                </p>
                <span className="text-[10px] text-slate-500">{kpis.totalPedidos} pedidos emitidos</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-strong rounded-2xl p-4 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Loja com Maior Volume</span>
                <p className="text-xl font-bold font-serif text-cyan-400 mt-1">
                  {graficos.totalPorLoja?.[0]?.loja || 'Loja 1'}
                </p>
                <span className="text-[10px] text-slate-500">
                  {fmtMoeda(
                    [...(graficos.totalPorLoja || [])].sort((a: any, b: any) => b.total - a.total)[0]?.total || 0
                  )}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-strong rounded-2xl p-4 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Seção Líder em Compras</span>
                <p className="text-xl font-bold font-serif text-emerald-400 mt-1 truncate max-w-[150px]">
                  {graficos.totalPorSecao?.[0]?.secao || 'Sem dados'}
                </p>
                <span className="text-[10px] text-slate-500">
                  {fmtMoeda(graficos.totalPorSecao?.[0]?.total || 0)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Package className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-strong rounded-2xl p-4 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Comprador em Destaque</span>
                <p className="text-xl font-bold font-serif text-indigo-400 mt-1 truncate max-w-[150px]">
                  {compradores?.[0]?.COMPRADOR || 'Sem dados'}
                </p>
                <span className="text-[10px] text-slate-500">
                  {fmtMoeda(compradores?.[0]?.VALOR_TOTAL_COMPRADO || 0)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* GRÁFICO 1: COMPRAS POR LOJA (TOTAL VS EMPILHADO POR COMPRADOR) */}
          <div className="glass-strong rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold font-serif text-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  Valor de Compra por Loja & Comprador
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualize o volume financeiro destinado a cada filial e a composição por comprador.
                </p>
              </div>

              {/* Botões de Alternância do Gráfico de Lojas */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                <button
                  onClick={() => setGraficoModoLoja('total')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${graficoModoLoja === 'total' ? 'bg-primary text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Total por Loja
                </button>
                <button
                  onClick={() => setGraficoModoLoja('empilhado')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${graficoModoLoja === 'empilhado' ? 'bg-primary text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Empilhado por Comprador
                </button>
              </div>
            </div>

            {/* Container do Gráfico de Lojas */}
            <div className="h-80 w-full pt-4">
              {graficoModoLoja === 'total' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={graficos.totalPorLoja || []} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                    <XAxis dataKey="loja" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                    <YAxis tickFormatter={fmtCompacto} stroke="#94a3b8" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                    <Tooltip content={<CustomTooltipGrafico />} />
                    <Bar dataKey="total" name="Total Comprado (R$)" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={graficos.compradorPorLoja || []} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                    <XAxis dataKey="loja" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                    <YAxis tickFormatter={fmtCompacto} stroke="#94a3b8" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                    <Tooltip content={<CustomTooltipGrafico />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    {(graficos.compradores || []).map((comp: string, idx: number) => (
                      <Bar
                        key={comp}
                        dataKey={comp}
                        stackId="lojaStack"
                        fill={PALETA_CORES[idx % PALETA_CORES.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* GRÁFICO 2: COMPRAS POR SEÇÃO (CATEGORIAS) */}
          <div className="glass-strong rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold font-serif text-slate-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  Compras por Seção (Categorias de Produtos)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Distribuição dos valores investidos nas principais seções (Açougue, Hortifruti, Mercearia, etc.).
                </p>
              </div>

              {/* Seletor de Limite de Seções */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-slate-400 font-semibold">Exibir:</span>
                <select
                  value={limiteSecoes}
                  onChange={(e) => setLimiteSecoes(Number(e.target.value))}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  <option value={6}>Top 6 Seções</option>
                  <option value={10}>Top 10 Seções</option>
                  <option value={15}>Top 15 Seções</option>
                  <option value={50}>Todas as Seções</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
              {/* Gráfico de Barras Horizontais */}
              <div className="lg:col-span-2 h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={(graficos.totalPorSecao || []).slice(0, limiteSecoes)}
                    margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                    <XAxis type="number" tickFormatter={fmtCompacto} stroke="#94a3b8" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                    <YAxis
                      type="category"
                      dataKey="secao"
                      width={120}
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fill: '#e2e8f0' }}
                    />
                    <Tooltip content={<CustomTooltipGrafico />} />
                    <Bar dataKey="total" name="Total Comprado (R$)" fill="#10b981" radius={[0, 6, 6, 0]}>
                      {(graficos.totalPorSecao || []).slice(0, limiteSecoes).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PALETA_CORES[index % PALETA_CORES.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Ranking Lateral com % de Participação */}
              <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex flex-col gap-3 overflow-y-auto max-h-96">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-2">
                  Ranking & Participação (%)
                </h4>
                <div className="flex flex-col gap-2.5">
                  {(graficos.totalPorSecao || []).slice(0, limiteSecoes).map((sec: any, idx: number) => {
                    const totalCompras = kpis.valorTotalComprado || 1;
                    const percentual = (sec.total / totalCompras) * 100;
                    return (
                      <div key={idx} className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200 truncate max-w-[140px] flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: PALETA_CORES[idx % PALETA_CORES.length] }}
                            />
                            {sec.secao}
                          </span>
                          <span className="font-mono font-bold text-slate-100">
                            {fmtCompacto(sec.total)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(percentual, 100)}%`,
                                backgroundColor: PALETA_CORES[idx % PALETA_CORES.length]
                              }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 w-10 text-right">
                            {percentual.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO 3: ANÁLISE CRUZADA COMPRADOR X SEÇÃO */}
          <div className="glass-strong rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold font-serif text-slate-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-400" />
                  Compras do Comprador por Seção
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Analise quais seções cada comprador atende e os valores respectivos.
                </p>
              </div>

              {/* Filtro do Comprador para o Gráfico */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-slate-400 font-semibold">Comprador:</span>
                <select
                  value={filtroCompradorSecao}
                  onChange={(e) => setFiltroCompradorSecao(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  <option value="todos">Todos os Compradores</option>
                  {(graficos.compradores || []).map((comp: string) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conteúdo do Detalhamento Comprador x Seção */}
            <div className="pt-2">
              {filtroCompradorSecao !== 'todos' ? (
                // Visão de um comprador selecionado
                (() => {
                  const compData = (graficos.compradorPorSecao || []).find((c: any) => c.comprador === filtroCompradorSecao);
                  if (!compData) {
                    return (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        Nenhum dado encontrado para este comprador no período.
                      </div>
                    );
                  }
                  // Extrair seções deste comprador e ordenar
                  const secoesDoComprador = Object.entries(compData)
                    .filter(([k]) => k !== 'comprador')
                    .map(([secao, valor]: [string, any]) => ({ secao, total: valor }))
                    .sort((a, b) => b.total - a.total);

                  return (
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={secoesDoComprador}
                          margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                          <XAxis type="number" tickFormatter={fmtCompacto} stroke="#94a3b8" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                          <YAxis
                            type="category"
                            dataKey="secao"
                            width={130}
                            stroke="#94a3b8"
                            tick={{ fontSize: 11, fill: '#e2e8f0' }}
                          />
                          <Tooltip content={<CustomTooltipGrafico />} />
                          <Bar dataKey="total" name="Valor Comprado (R$)" fill="#8b5cf6" radius={[0, 6, 6, 0]}>
                            {secoesDoComprador.map((_: any, idx: number) => (
                              <Cell key={`cell-${idx}`} fill={PALETA_CORES[idx % PALETA_CORES.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()
              ) : (
                // Visão de todos os compradores com tabela/cards de seções
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(graficos.compradorPorSecao || []).map((compRow: any, idx: number) => {
                    const topSecoes = Object.entries(compRow)
                      .filter(([k]) => k !== 'comprador')
                      .map(([sec, val]: [string, any]) => ({ sec, val }))
                      .sort((a, b) => b.val - a.val);

                    const totalComprador = topSecoes.reduce((s, item) => s + item.val, 0);

                    return (
                      <div
                        key={idx}
                        className="bg-black/30 rounded-xl p-4 border border-white/5 flex flex-col justify-between hover:border-purple-500/20 transition"
                      >
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-white/5">
                            <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-purple-400" />
                              {compRow.comprador}
                            </span>
                            <span className="font-mono font-bold text-xs text-indigo-400">
                              {fmtCompacto(totalComprador)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-col gap-1.5">
                            {topSecoes.slice(0, 4).map((item, sIdx) => (
                              <div key={sIdx} className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 truncate max-w-[150px]">{item.sec}</span>
                                <span className="font-mono font-semibold text-slate-200">
                                  {fmtMoeda(item.val)}
                                </span>
                              </div>
                            ))}
                            {topSecoes.length > 4 && (
                              <span className="text-[10px] text-slate-500 pt-1">
                                + {topSecoes.length - 4} outras seções
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => setFiltroCompradorSecao(compRow.comprador)}
                          className="mt-4 w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition text-center"
                        >
                          Ver Gráfico Detalhado
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: ORÇAMENTOS LANÇADOS (CISS) */}
      {activeTab === 'orcamentos' && (
        <div className="glass-strong rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold font-serif text-slate-100">
              Orçamentos de Compras Cadastrados no CISS
            </h3>
            <p className="text-xs text-slate-400">
              Verbas definidas por comprador e filial na tabela DBA.ORCAMENTO_COMPRAS do CISS ERP.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orcamentos.map((orc) => (
              <div
                key={orc.IDORCAMENTO}
                className="bg-black/40 rounded-xl p-4 border border-white/10 flex flex-col justify-between gap-3 hover:border-purple-500/30 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Orçamento #{orc.IDORCAMENTO}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {fmtData(orc.DTINICIAL)} a {fmtData(orc.DTFINAL)}
                    </span>
                  </div>
                  <h4 className="font-serif font-bold text-slate-100 mt-2 text-sm">
                    {orc.DESCRORCAMENTO || 'Sem Descrição'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    Responsável: <strong className="text-slate-200">{orc.COMPRADOR}</strong>
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Valor Total Aprovado:</span>
                    <span className="font-mono font-bold text-purple-400 text-sm">
                      {fmtMoeda(orc.VALOR_TOTAL)}
                    </span>
                  </div>

                  {/* Lojas breakdown */}
                  <div className="bg-black/60 rounded-lg p-2.5 flex flex-wrap gap-2 text-[10px] font-mono">
                    {Object.entries(orc.LOJAS || {}).map(([lojaKey, val]: [string, any]) => (
                      <span key={lojaKey} className="px-2 py-0.5 rounded bg-white/5 text-slate-300">
                        {lojaKey.replace('_', ' ')}: {fmtCompacto(val)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {orcamentos.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500">
                Nenhum orçamento encontrado para o período selecionado no CISS.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: PEDIDOS DETALHADOS COM VALIDAÇÃO POR NF */}
      {activeTab === 'pedidos' && (
        <div className="glass-strong rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-serif text-slate-100">
                Acompanhamento de Pedidos & Notas Fiscais
              </h3>
              <p className="text-xs text-slate-400">
                Verifique se o pedido foi entregue conferindo o número da nota fiscal de entrada no estoque.
              </p>
            </div>

            {/* Filtros da tabela de pedidos */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro Status Entrega */}
              <select
                value={filtroStatus}
                onChange={(e: any) => setFiltroStatus(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
              >
                <option value="todos">Todos os Status</option>
                <option value="entregue">🟢 Somente Entregues (NF)</option>
                <option value="pendente">🟡 Somente Pendentes</option>
              </select>

              {/* Busca por Fornecedor ou Pedido */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar fornecedor ou nº..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary w-48"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3 font-semibold">Nº Pedido</th>
                  <th className="py-3 px-3 font-semibold">Condição / Boleto</th>
                  <th className="py-3 px-3 font-semibold">Loja</th>
                  <th className="py-3 px-3 font-semibold">Data / Hora</th>
                  <th className="py-3 px-3 font-semibold">Comprador</th>
                  <th className="py-3 px-3 font-semibold">Fornecedor</th>
                  <th className="py-3 px-3 font-semibold text-center">Itens</th>
                  <th className="py-3 px-3 font-semibold text-right">Valor Total (R$)</th>
                  <th className="py-3 px-3 font-semibold text-center">Status Entrega</th>
                  <th className="py-3 px-3 font-semibold text-left">Nota Fiscal (Entrada)</th>
                  <th className="py-3 px-3 font-semibold text-left">Conferente</th>
                  <th className="py-3 px-3 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pedidosFiltrados.map((ped) => {
                  const entregue = ped.STATUS === 'Entregue';
                  return (
                    <tr key={`${ped.IDPEDIDO}-${ped.IDEMPRESA}`} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-100">
                        #{ped.IDPEDIDO}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200 text-[11px] truncate max-w-[160px]" title={ped.CONDICAO_PAGTO || 'Não Informado'}>
                            {ped.CONDICAO_PAGTO || 'Não Informado'}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400 font-mono font-medium">
                              <Clock className="w-2.5 h-2.5" />
                              {ped.PRAZO && ped.PRAZO !== '0' ? `${ped.PRAZO}d` : 'À vista'}
                            </span>
                            {ped.DATA_BOLETO && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-cyan-300 font-mono" title={`Data de Vencimento do Boleto: ${ped.DATA_BOLETO}`}>
                                <Calendar className="w-2.5 h-2.5 text-cyan-400" />
                                {ped.DATA_BOLETO}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-300">
                        Loja {ped.IDEMPRESA}
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {fmtData(ped.DATA_PEDIDO)} {ped.HORA_PEDIDO ? ped.HORA_PEDIDO.substring(0, 5) : ''}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        {ped.COMPRADOR}
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-xs truncate" title={ped.FORNECEDOR}>
                        {ped.FORNECEDOR}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-300">
                        {ped.QTD_ITENS}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-400">
                        {fmtMoeda(ped.VALOR_TOTAL)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${entregue ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}
                        >
                          {entregue ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {entregue ? 'Entregue' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {ped.NOTAS_FISCAIS ? (
                          <div className="flex flex-col">
                            <span className="text-emerald-300 font-bold">NF: {ped.NOTAS_FISCAIS}</span>
                            {ped.DATA_ENTRADA_NF && (
                              <span className="text-[10px] text-slate-500">
                                Entrada: {fmtData(ped.DATA_ENTRADA_NF)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Aguardando NF</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {ped.NOME_CONFERENTE ? (
                          <div className="flex flex-col">
                            <span className="text-cyan-300 font-semibold text-[11px]">{ped.NOME_CONFERENTE}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => abrirItensPedido(ped)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[10px] font-semibold transition flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3 h-3 text-primary" />
                          Itens
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {pedidosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-500">
                      Nenhum pedido encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. MODAL DE ITENS DO PEDIDO */}
      {modalItensOpen && selectedPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header Modal */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold font-serif text-slate-100">
                    Detalhes do Pedido #{selectedPedido.IDPEDIDO}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${selectedPedido.STATUS === 'Entregue' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}
                  >
                    {selectedPedido.STATUS}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Fornecedor: <strong className="text-slate-200">{selectedPedido.FORNECEDOR}</strong> | Comprador: <strong className="text-slate-200">{selectedPedido.COMPRADOR}</strong> | Loja {selectedPedido.IDEMPRESA}
                  {selectedPedido.CONDICAO_PAGTO && (
                    <> | Condição: <strong className="text-amber-300">{selectedPedido.CONDICAO_PAGTO} {selectedPedido.PRAZO && selectedPedido.PRAZO !== '0' ? `(${selectedPedido.PRAZO} dias)` : '(À vista)'}</strong></>
                  )}
                  {selectedPedido.DATA_BOLETO && (
                    <> | Vcto Boleto: <strong className="text-cyan-300">{selectedPedido.DATA_BOLETO}</strong></>
                  )}
                  {selectedPedido.NOTAS_FISCAIS && (
                    <> | NF: <strong className="text-emerald-400">{selectedPedido.NOTAS_FISCAIS}</strong></>
                  )}
                  {selectedPedido.NOME_CONFERENTE && (
                    <> | Conferente (Entrada): <strong className="text-cyan-300">{selectedPedido.NOME_CONFERENTE}</strong></>
                  )}
                </p>
              </div>

              <button
                onClick={() => setModalItensOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Itens */}
            <div className="p-5 overflow-y-auto flex-1">
              {loadingItens ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">Carregando itens do pedido...</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px]">
                      <th className="py-2.5 px-3">Cód</th>
                      <th className="py-2.5 px-3">Descrição do Produto</th>
                      <th className="py-2.5 px-3 text-center">Qtd Solicitada</th>
                      <th className="py-2.5 px-3 text-right">Valor Unitário</th>
                      <th className="py-2.5 px-3 text-right">Total (R$)</th>
                      <th className="py-2.5 px-3 text-center">Qtd Atendida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {itensPedido.map((it, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{it.IDSUBPRODUTO}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{it.DESCRICAO}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-100">
                          {it.QTDSOLICITADA}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {fmtMoeda(it.VALUNITARIO)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-400">
                          {fmtMoeda(it.VALOR_TOTAL)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${it.QTDATENDIDA > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500'}`}
                          >
                            {it.QTDATENDIDA || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {itensPedido.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Nenhum item encontrado para este pedido.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Total de itens listados: <strong className="text-slate-200">{itensPedido.length}</strong>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Valor do Pedido:</span>
                <span className="font-mono font-bold text-indigo-400 text-base">
                  {fmtMoeda(selectedPedido.VALOR_TOTAL)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
