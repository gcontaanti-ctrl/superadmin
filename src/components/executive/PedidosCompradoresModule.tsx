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
  PieChart as PieChartIcon,
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  Zap,
  Layers,
  Tag,
  SlidersHorizontal
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

interface BatteryBudgetGaugeProps {
  compradorNome: string;
  idUsuario: number;
  orcado: number;
  comprado: number;
  saldo: number;
  totalPedidos?: number;
  onVerPedidos?: () => void;
  selected?: boolean;
}

function BatteryBudgetGauge({
  compradorNome,
  idUsuario,
  orcado,
  comprado,
  saldo,
  totalPedidos = 0,
  onVerPedidos,
  selected = false
}: BatteryBudgetGaugeProps) {
  // Carga restante da bateria (% que resta para acabar a verba)
  const percRestante = orcado > 0 ? Math.max(0, (saldo / orcado) * 100) : 0;
  // % de consumo já gasto
  const percGasto = orcado > 0 ? (comprado / orcado) * 100 : 0;
  const isEstourado = orcado > 0 && saldo < 0;

  // Cor e gradiente da bateria de acordo com a carga restante
  let batteryGrad = "from-emerald-500 via-emerald-400 to-green-300";
  let batteryBorder = "border-emerald-500/50";
  let badgeClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  let statusText = "Saldo Confortável";
  let StatusIcon = BatteryFull;

  if (isEstourado) {
    batteryGrad = "from-rose-600 to-red-600";
    batteryBorder = "border-rose-500/70 shadow-[0_0_15px_rgba(244,63,94,0.3)]";
    badgeClass = "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse";
    statusText = "Orçamento Estourado";
    StatusIcon = BatteryWarning;
  } else if (percRestante < 20) {
    batteryGrad = "from-rose-500 via-red-500 to-orange-400";
    batteryBorder = "border-rose-500/50";
    badgeClass = "bg-rose-500/15 text-rose-400 border-rose-500/30";
    statusText = "Saldo Baixo (<20%)";
    StatusIcon = BatteryLow;
  } else if (percRestante <= 45) {
    batteryGrad = "from-amber-400 via-yellow-400 to-amber-300";
    batteryBorder = "border-amber-500/50";
    badgeClass = "bg-amber-500/15 text-amber-400 border-amber-500/30";
    statusText = "Atenção ao Teto";
    StatusIcon = BatteryMedium;
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <div
      className={`p-4 rounded-2xl bg-slate-900/90 border transition-all duration-300 flex flex-col gap-3 group relative overflow-hidden ${
        selected ? 'border-primary ring-2 ring-primary/20 bg-slate-900 shadow-xl' : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Topo do Card */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-2 rounded-xl border ${badgeClass} shrink-0`}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-white truncate group-hover:text-primary transition-colors">
              {compradorNome}
            </h4>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="font-mono">ID {idUsuario}</span>
              <span>•</span>
              <span>{totalPedidos} pedidos</span>
            </div>
          </div>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeClass}`}>
          {statusText}
        </span>
      </div>

      {/* Barra Executiva de Consumo de Orçamento */}
      <div className="flex flex-col gap-1.5 mt-0.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            Disponível:
          </span>
          <span className={`font-mono font-bold ${isEstourado ? 'text-rose-400' : 'text-slate-200'}`}>
            {isEstourado ? `+${(percGasto - 100).toFixed(1)}% acima do teto` : `${percRestante.toFixed(1)}% livre (${percGasto.toFixed(0)}% usado)`}
          </span>
        </div>

        <div className={`relative w-full h-3 bg-slate-950/90 rounded-full border overflow-hidden ${batteryBorder}`}>
          <div
            className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${batteryGrad}`}
            style={{ width: `${Math.max(0, Math.min(100, percRestante))}%` }}
          />
        </div>
      </div>

      {/* Valores Detalhados: Orçado, Comprado e Falta para Acabar */}
      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/5 text-[10px]">
        <div>
          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Orçamento</span>
          <span className="font-bold text-purple-400 font-mono text-[11px] truncate block mt-0.5">
            {orcado > 0 ? fmt(orcado) : '-'}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Já Comprado</span>
          <span className="font-bold text-indigo-400 font-mono text-[11px] truncate block mt-0.5">
            {fmt(comprado)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Falta p/ Acabar</span>
          <span className={`font-bold font-mono text-[11px] truncate block mt-0.5 ${saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {orcado > 0 ? fmt(saldo) : '-'}
          </span>
        </div>
      </div>

      {/* Ação rápida */}
      {onVerPedidos && (
        <button
          onClick={onVerPedidos}
          className="w-full mt-0.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
        >
          Filtrar Pedidos deste Comprador
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<'compradores' | 'baterias' | 'graficos' | 'orcamentos' | 'pedidos'>('compradores');
  const [periodoPreset, setPeriodoPreset] = useState<'mes_atual' | '7d' | '15d' | '30d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filtroLoja, setFiltroLoja] = useState<string>(selectedStore);
  const [filtroComprador, setFiltroComprador] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'entregue' | 'pendente'>('todos');
  const [filtroSecao, setFiltroSecao] = useState<string>('todas');
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [filtrosExpanded, setFiltrosExpanded] = useState(false);

  // Estados dos Gráficos
  const [graficoModoLoja, setGraficoModoLoja] = useState<'total' | 'empilhado'>('total');
  const [limiteSecoes, setLimiteSecoes] = useState<number>(10);
  const [filtroCompradorSecao, setFiltroCompradorSecao] = useState<string>('todos');

  // Dados das APIs
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [secoesFiltro, setSecoesFiltro] = useState<any[]>([]);
  const [departamentosFiltro, setDepartamentosFiltro] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFiltros, setLoadingFiltros] = useState(false);
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

  // Sincronizar datas com o filtro global do cabeçalho (padrão: mês atual)
  useEffect(() => {
    if (globalStartDate && globalEndDate) {
      setStartDate(globalStartDate);
      setEndDate(globalEndDate);
    } else {
      const today = new Date();
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setStartDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`);
      setEndDate(fmt(today));
    }
  }, [globalStartDate, globalEndDate]);

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

  // Carregar seções e departamentos disponíveis para filtro (com fallback para /api/secoes)
  const carregarFiltrosMetadata = async () => {
    if (!startDate || !endDate) return;
    setLoadingFiltros(true);
    try {
      let url = `/api/pedidos-compradores/filtros?startDate=${startDate}&endDate=${endDate}`;
      if (filtroLoja && filtroLoja !== 'todas') url += `&idEmpresa=${filtroLoja}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.secoes) setSecoesFiltro(json.secoes);
        if (json.departamentos) setDepartamentosFiltro(json.departamentos);
      } else {
        const resSec = await fetch('/api/secoes');
        if (resSec.ok) {
          const secs = await resSec.json();
          if (Array.isArray(secs)) {
            setSecoesFiltro(secs.map((s: any) => ({ id: s.IDSECAO, IDSECAO: s.IDSECAO, nome: String(s.DESCRSECAO || '').trim(), DESCRSECAO: String(s.DESCRSECAO || '').trim() })));
          }
        }
      }
    } catch (e) {
      console.error('Erro ao carregar metadados de filtros:', e);
    } finally {
      setLoadingFiltros(false);
    }
  };

  // Recarregar seções/departamentos quando loja ou datas mudam
  useEffect(() => {
    if (startDate && endDate) {
      carregarFiltrosMetadata();
    }
  }, [startDate, endDate, filtroLoja]);

  // Carregar dados principais (com enriquecimento automático de todos os compradores que lançaram pedidos)
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

      // 2. Orçamentos Lançados (busca desde 60 dias antes para não perder orçamentos de outubro quando novembro só tiver orçamento de teste)
      const d60 = new Date(new Date(startDate).getTime() - 45 * 24 * 3600 * 1000).toISOString().split('T')[0];
      let urlOrc = `/api/pedidos-compradores/orcamentos?startDate=${d60}&endDate=${endDate}`;
      if (filtroLoja && filtroLoja !== 'todas') urlOrc += `&idEmpresa=${filtroLoja}`;
      if (filtroComprador && filtroComprador !== 'todos') urlOrc += `&compradorId=${filtroComprador}`;

      const resOrc = await fetch(urlOrc);
      const jsonOrc = await resOrc.json();
      const listaOrc = Array.isArray(jsonOrc.orcamentos)
        ? jsonOrc.orcamentos.filter((o: any) => Number(o.VALOR_TOTAL) >= 1000 && !String(o.DESCRORCAMENTO || '').toUpperCase().includes('TESTE'))
        : [];
      setOrcamentos(listaOrc);

      // Mapear orçamento por comprador (incluindo mapeamento pelo título do orçamento quando IDCOMPRADOR vier nulo no CISS)
      const orcPorCompradorId: Record<number, number> = {};
      for (const o of listaOrc) {
        let idC = o.IDCOMPRADOR ? Number(o.IDCOMPRADOR) : 0;
        const desc = String(o.DESCRORCAMENTO || '').toUpperCase();
        if (!idC) {
          if (desc.includes('YASMIM')) idC = 121;
          else if (desc.includes('BRUNO')) idC = 671;
          else if (desc.includes('RIVIANE')) idC = 268;
          else if (desc.includes('ROMILDA')) idC = 647;
          else if (desc.includes('SILVIO')) idC = 321;
          else if (desc.includes('NATHALIA')) idC = 129;
          else if (desc.includes('ANA JULIA')) idC = 649;
          else if (desc.includes('CLARA')) idC = 102;
        }
        if (idC > 0) {
          orcPorCompradorId[idC] = (orcPorCompradorId[idC] || 0) + (Number(o.VALOR_TOTAL) || 0);
        }
      }

      let compList: any[] = Array.isArray(jsonResumo.compradores) ? [...jsonResumo.compradores] : [];

      // Verificar se o backend remoto omitiu compradores que lançaram pedidos (ex.: backend antigo filtrando só o orçamento de 03/11)
      try {
        let urlCom = `/api/comercial/compras-por-comprador?startDate=${startDate}&endDate=${endDate}`;
        if (filtroLoja && filtroLoja !== 'todas') urlCom += `&idEmpresa=${filtroLoja}`;
        const resCom = await fetch(urlCom);
        if (resCom.ok) {
          const jsonCom = await resCom.json();
          const todosCom = (jsonCom.lista || []).filter((c: any) => c.idComprador && c.idComprador < 9000 && Number(c.GASTO) > 0);
          const idsJaPresentes = new Set(compList.map((c: any) => Number(c.IDUSUARIO)));
          const faltantes = todosCom.filter((c: any) => !idsJaPresentes.has(Number(c.idComprador)));

          if (faltantes.length > 0) {
            const detalhesFaltantes = await Promise.all(
              faltantes.map(async (f: any) => {
                try {
                  const rPed = await fetch(`/api/comercial/comprador-compras?compradorId=${f.idComprador}&startDate=${startDate}&endDate=${endDate}`);
                  const jPed = await rPed.json();
                  const peds = Array.isArray(jPed.lista) ? jPed.lista : [];
                  // Deduplicar por IDPEDIDO + DATA_PEDIDO + FORNECEDOR e dividir pelo fator caso o backend antigo não tenha JOIN por IDEMPRESA
                  let totalPedidos = peds.length;
                  let pedidosEntregues = 0;
                  let valorTotal = 0;
                  let valorEntregue = 0;
                  for (const p of peds) {
                    const v = Number(p.VALOR_TOTAL) || 0;
                    valorTotal += v;
                    if (p.STATUS === 'Entregue') {
                      pedidosEntregues++;
                      valorEntregue += v;
                    }
                  }
                  const pedidosPendentes = totalPedidos - pedidosEntregues;
                  const valorPendente = Math.max(0, valorTotal - valorEntregue);
                  const orcado = orcPorCompradorId[Number(f.idComprador)] || 0;
                  return {
                    IDUSUARIO: Number(f.idComprador),
                    COMPRADOR: String(f.COMPRADOR || '').trim(),
                    TOTAL_PEDIDOS: totalPedidos,
                    PEDIDOS_ENTREGUES: pedidosEntregues,
                    PEDIDOS_PENDENTES: pedidosPendentes,
                    VALOR_TOTAL_COMPRADO: valorTotal,
                    VALOR_ENTREGUE: valorEntregue,
                    VALOR_PENDENTE: valorPendente,
                    ORCADO: orcado,
                    SALDO_ORCAMENTO: orcado > 0 ? orcado - valorTotal : 0,
                    PERC_ORCADO: orcado > 0 ? (valorTotal / orcado) * 100 : 0,
                    TICKET_MEDIO: totalPedidos > 0 ? valorTotal / totalPedidos : 0,
                    PERC_ENTREGUE: totalPedidos > 0 ? (pedidosEntregues / totalPedidos) * 100 : 0
                  };
                } catch {
                  return null;
                }
              })
            );

            for (const df of detalhesFaltantes) {
              if (df && df.TOTAL_PEDIDOS > 0) {
                compList.push(df);
              }
            }
          }
        }
      } catch (_) {}

      // Garantir que todos os compradores tenham o orçamento preenchido se estiver em orcPorCompradorId
      compList = compList.map((c: any) => {
        const orcado = Number(c.ORCADO) > 0 ? Number(c.ORCADO) : (orcPorCompradorId[Number(c.IDUSUARIO)] || 0);
        const comprado = Number(c.VALOR_TOTAL_COMPRADO) || 0;
        return {
          ...c,
          ORCADO: orcado,
          SALDO_ORCAMENTO: orcado > 0 ? orcado - comprado : 0,
          PERC_ORCADO: orcado > 0 ? (comprado / orcado) * 100 : 0
        };
      }).sort((a: any, b: any) => (Number(b.VALOR_TOTAL_COMPRADO) || 0) - (Number(a.VALOR_TOTAL_COMPRADO) || 0));

      if (filtroComprador && filtroComprador !== 'todos') {
        compList = compList.filter((c: any) => String(c.IDUSUARIO) === String(filtroComprador));
      }

      setCompradores(compList);

      // Recalcular KPIs consolidados com todos os compradores
      if (compList.length > 0) {
        const totalPedidos = compList.reduce((s, c) => s + (Number(c.TOTAL_PEDIDOS) || 0), 0);
        const pedidosEntregues = compList.reduce((s, c) => s + (Number(c.PEDIDOS_ENTREGUES) || 0), 0);
        const pedidosPendentes = compList.reduce((s, c) => s + (Number(c.PEDIDOS_PENDENTES) || 0), 0);
        const valorTotalComprado = compList.reduce((s, c) => s + (Number(c.VALOR_TOTAL_COMPRADO) || 0), 0);
        const valorEntregue = compList.reduce((s, c) => s + (Number(c.VALOR_ENTREGUE) || 0), 0);
        const valorPendente = compList.reduce((s, c) => s + (Number(c.VALOR_PENDENTE) || 0), 0);
        const totalOrcado = compList.reduce((s, c) => s + (Number(c.ORCADO) || 0), 0);
        setKpis({
          totalPedidos,
          pedidosEntregues,
          pedidosPendentes,
          taxaEntrega: totalPedidos > 0 ? (pedidosEntregues / totalPedidos) * 100 : 0,
          valorTotalComprado,
          valorEntregue,
          valorPendente,
          totalOrcado,
          saldoOrcamento: totalOrcado - valorTotalComprado,
          atingimentoOrcamento: totalOrcado > 0 ? (valorTotalComprado / totalOrcado) * 100 : 0
        });
      } else if (jsonResumo.kpis) {
        setKpis(jsonResumo.kpis);
      }

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
      if (filtroSecao && filtroSecao !== 'todas') urlPed += `&secao=${filtroSecao}`;
      if (filtroDepartamento && filtroDepartamento !== 'todos') urlPed += `&departamento=${filtroDepartamento}`;
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
  }, [filtroStatus, busca, filtroSecao, filtroDepartamento]);

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
    <div className="flex flex-col gap-4 w-full animate-fade-in text-slate-100">
      {/* 1. CABEÇALHO COMPACTO + ATUALIZAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 glass-strong px-5 py-3.5 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-400/25 shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl font-bold font-serif text-slate-100 tracking-tight">
                Gestão de Pedidos & Orçamentos
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase">
                CISS ERP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Valores, saldo de verba por comprador e validação de entregas por NF
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {filtroComprador !== 'todos' && (
            <button
              type="button"
              onClick={() => setFiltroComprador('todos')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/25 transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>
                {compradores.find((c) => String(c.IDUSUARIO) === String(filtroComprador))?.COMPRADOR || 'Comprador'}
              </span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={carregarDados}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar CISS
          </button>
        </div>
      </div>

      {/* 2. CARDS DE KPIS EXECUTIVOS COMPACTOS (Padrão Horus) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Pedidos Digitados */}
        <div className="rounded-xl p-3.5 border border-cyan-400/30 bg-gradient-to-br from-cyan-600/20 via-[#071c36] to-[#051022] shadow-md flex flex-col justify-between transition group">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-300 block truncate">
                Pedidos Digitados
              </span>
              <h2 className="text-xl font-bold font-serif text-white mt-0.5 tabular-nums">
                {kpis.totalPedidos.toLocaleString('pt-BR')}
              </h2>
            </div>
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shrink-0">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] pt-2 mt-2 border-t border-white/10 text-slate-300">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              {kpis.pedidosEntregues} Entregues
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Clock className="w-3 h-3" />
              {kpis.pedidosPendentes} Pendentes
            </span>
          </div>
        </div>

        {/* Total Comprado (R$) */}
        <div className="rounded-xl p-3.5 border border-blue-400/30 bg-gradient-to-br from-blue-600/20 via-[#071838] to-[#051022] shadow-md flex flex-col justify-between transition group">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-300 block truncate">
                Total Comprado
              </span>
              <h2 className="text-xl font-bold font-serif text-white mt-0.5 tabular-nums">
                {fmtCompacto(kpis.valorTotalComprado)}
              </h2>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[10px] pt-2 mt-2 border-t border-white/10 text-slate-300 flex justify-between">
            <span>Ticket Médio:</span>
            <span className="font-semibold text-white">
              {fmtMoeda(kpis.totalPedidos > 0 ? kpis.valorTotalComprado / kpis.totalPedidos : 0)}
            </span>
          </div>
        </div>

        {/* Mercadorias Entregues vs Pendentes */}
        <div className="rounded-xl p-3.5 border border-emerald-400/30 bg-gradient-to-br from-emerald-600/20 via-[#062420] to-[#051415] shadow-md flex flex-col justify-between transition group">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-300 block truncate">
                Entregue com NF
              </span>
              <h2 className="text-xl font-bold font-serif text-emerald-300 mt-0.5 tabular-nums">
                {fmtCompacto(kpis.valorEntregue)}
              </h2>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] pt-2 mt-2 border-t border-white/10 text-slate-300">
            <span>Pendente:</span>
            <span className="text-amber-300 font-bold tabular-nums">
              {fmtCompacto(kpis.valorPendente)}
            </span>
          </div>
        </div>

        {/* Orçamento CISS vs Saldo */}
        <div className="rounded-xl p-3.5 border border-violet-400/30 bg-gradient-to-br from-violet-600/20 via-[#181238] to-[#0b0a22] shadow-md flex flex-col justify-between transition group">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-300 block truncate">
                Orçamento (CISS)
              </span>
              <h2 className="text-xl font-bold font-serif text-violet-300 mt-0.5 tabular-nums">
                {fmtCompacto(kpis.totalOrcado)}
              </h2>
            </div>
            <div className="p-2 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-400/30 shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] pt-2 mt-2 border-t border-white/10 text-slate-300">
            <span>Saldo Verba:</span>
            <span className={`font-bold tabular-nums ${kpis.saldoOrcamento >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {fmtCompacto(kpis.saldoOrcamento)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. SELETOR DE ABAS DO MÓDULO */}
      <div className="inline-flex items-center gap-1.5 bg-white/[0.04] p-1.5 rounded-2xl border border-white/10 flex-wrap self-start">
        <button
          onClick={() => setActiveTab('compradores')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition ${activeTab === 'compradores' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`}
        >
          <User className="w-3.5 h-3.5" />
          Compradores & Verba
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'compradores' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'}`}>
            {compradores.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pedidos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition ${activeTab === 'pedidos' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Pedidos & Validação NF
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'pedidos' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'}`}>
            {pedidosFiltrados.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('orcamentos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition ${activeTab === 'orcamentos' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Orçamentos CISS
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'orcamentos' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'}`}>
            {orcamentos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('graficos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition ${activeTab === 'graficos' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Gráficos & Análises
        </button>
      </div>

      {/* 5. CONTEÚDO DAS ABAS */}

      {/* ABA 1: COMPRADORES & ORÇAMENTO (VISÃO EXECUTIVA COMPLETA) */}
      {activeTab === 'compradores' && (
        <div className="flex flex-col gap-4">
          {/* Gráfico em Destaque no Topo: Compras por Seção */}
          <div className="glass-strong rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold font-serif text-slate-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  Compras por Seção (Valor & Participação)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Total comprado por seção no período e loja selecionados
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">Exibir:</span>
                <select
                  value={limiteSecoes}
                  onChange={(e) => setLimiteSecoes(Number(e.target.value))}
                  className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-primary"
                >
                  <option value={6}>Top 6 Seções</option>
                  <option value={10}>Top 10 Seções</option>
                  <option value={15}>Top 15 Seções</option>
                  <option value={50}>Todas</option>
                </select>
              </div>
            </div>

            {(graficos.totalPorSecao || []).length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-slate-500 italic">
                Sem dados de compras por seção para o filtro selecionado.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-8 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={(graficos.totalPorSecao || []).slice(0, limiteSecoes)}
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                      <XAxis type="number" tickFormatter={fmtCompacto} stroke="#94a3b8" tick={{ fontSize: 10, fill: '#cbd5e1' }} />
                      <YAxis
                        type="category"
                        dataKey="secao"
                        width={115}
                        stroke="#94a3b8"
                        tick={{ fontSize: 10, fill: '#e2e8f0' }}
                      />
                      <Tooltip content={<CustomTooltipGrafico />} />
                      <Bar dataKey="total" name="Total Comprado (R$)" fill="#10b981" radius={[0, 6, 6, 0]}>
                        {(graficos.totalPorSecao || []).slice(0, limiteSecoes).map((_: any, index: number) => (
                          <Cell key={`top-sec-cell-${index}`} fill={PALETA_CORES[index % PALETA_CORES.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="lg:col-span-4 bg-black/30 rounded-xl p-3.5 border border-white/5 flex flex-col gap-2.5 overflow-y-auto max-h-64">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-1.5">
                    Ranking por Seção (%)
                  </h4>
                  {(graficos.totalPorSecao || []).slice(0, limiteSecoes).map((sec: any, idx: number) => {
                    const totalCompras = kpis.valorTotalComprado || 1;
                    const percentual = (sec.total / totalCompras) * 100;
                    return (
                      <div key={idx} className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-200 truncate flex items-center gap-1.5 text-[11px]">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: PALETA_CORES[idx % PALETA_CORES.length] }}
                            />
                            {sec.secao}
                          </span>
                          <span className="font-mono font-bold text-slate-100 text-[11px] shrink-0">
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
                          <span className="font-mono text-[10px] text-slate-400 w-10 text-right shrink-0">
                            {percentual.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Faixa Resumo Horizontal: Orçamento Geral da Rede */}
          {kpis.totalOrcado > 0 && (() => {
            const pctUsadoRede = Math.min(100, (kpis.valorTotalComprado / kpis.totalOrcado) * 100);
            const pctLivreRede = Math.max(0, 100 - pctUsadoRede);
            const estourado = kpis.saldoOrcamento < 0;
            return (
              <div className="glass-strong rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${estourado ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Orçamento Consolidado da Rede</div>
                    <div className="text-[11px] text-slate-400">
                      {estourado ? 'Teto ultrapassado' : `${pctLivreRede.toFixed(1)}% disponível (${pctUsadoRede.toFixed(1)}% utilizado)`}
                    </div>
                  </div>
                </div>

                <div className="flex-1 max-w-md w-full">
                  <div className="h-2.5 w-full rounded-full bg-slate-950/90 border border-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${estourado ? 'bg-rose-500' : pctLivreRede < 20 ? 'bg-amber-400' : 'bg-gradient-to-r from-emerald-500 to-cyan-400'}`}
                      style={{ width: `${Math.max(4, pctUsadoRede)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-5 text-xs shrink-0 flex-wrap">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Orçado</span>
                    <span className="font-mono font-bold text-violet-300">{fmtMoeda(kpis.totalOrcado)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Comprado</span>
                    <span className="font-mono font-bold text-blue-300">{fmtMoeda(kpis.valorTotalComprado)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Saldo Verba</span>
                    <span className={`font-mono font-bold ${estourado ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {fmtMoeda(kpis.saldoOrcamento)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Tabela Executiva de Compradores (Largura Total) */}
          <div className="glass-strong rounded-2xl p-5 border border-white/10 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold font-serif text-slate-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Desempenho & Verba por Comprador
                </h3>
                <p className="text-[11px] text-slate-400">
                  Clique em um comprador para filtrar ou abra diretamente seus pedidos.
                </p>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10">
                {compradores.length} compradores ativos
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 font-semibold">Comprador</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Pedidos / Entregues</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Orçado (CISS)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Comprado (R$)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Saldo Verba</th>
                    <th className="py-2.5 px-3 font-semibold w-44">Consumo da Verba</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {compradores.map((comp, idx) => {
                    const percEnt = comp.TOTAL_PEDIDOS > 0 ? (comp.PEDIDOS_ENTREGUES / comp.TOTAL_PEDIDOS) * 100 : 0;
                    const saldo = comp.ORCADO > 0 ? comp.ORCADO - comp.VALOR_TOTAL_COMPRADO : 0;
                    const percUsado = comp.ORCADO > 0 ? (comp.VALOR_TOTAL_COMPRADO / comp.ORCADO) * 100 : 0;
                    const isEstourado = comp.ORCADO > 0 && saldo < 0;
                    const isFiltroAtivo = String(filtroComprador) === String(comp.IDUSUARIO);

                    return (
                      <tr
                        key={comp.IDUSUARIO || idx}
                        className={`hover:bg-white/[0.04] transition cursor-pointer ${isFiltroAtivo ? 'bg-primary/10 border-l-2 border-primary' : ''}`}
                        onClick={() => setFiltroComprador(isFiltroAtivo ? 'todos' : String(comp.IDUSUARIO))}
                      >
                        <td className="py-3 px-3 font-semibold text-slate-100">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cores[idx % cores.length] }}
                            />
                            <div>
                              <span className="block">{comp.COMPRADOR}</span>
                              <span className="block text-[10px] text-slate-500 font-mono">ID {comp.IDUSUARIO}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="font-mono font-bold text-slate-100">
                            {comp.TOTAL_PEDIDOS} <span className="text-slate-500 font-normal">/</span> <span className="text-emerald-400">{comp.PEDIDOS_ENTREGUES} NF</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{percEnt.toFixed(0)}% entregue</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-violet-300">
                          {comp.ORCADO > 0 ? fmtMoeda(comp.ORCADO) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-blue-300">
                          {fmtMoeda(comp.VALOR_TOTAL_COMPRADO)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {comp.ORCADO > 0 ? (
                            <span className={`px-2 py-0.5 rounded-md ${isEstourado ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {fmtMoeda(saldo)}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {comp.ORCADO > 0 ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className={isEstourado ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                                  {percUsado.toFixed(0)}% usado
                                </span>
                                <span className="text-slate-400">
                                  {isEstourado ? 'Estourado' : `${Math.max(0, 100 - percUsado).toFixed(0)}% livre`}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isEstourado ? 'bg-rose-500' : percUsado > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                  style={{ width: `${Math.min(100, Math.max(3, percUsado))}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500">Sem orçamento CISS</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFiltroComprador(String(comp.IDUSUARIO));
                              setActiveTab('pedidos');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/25 text-[11px] font-semibold transition"
                          >
                            Ver Pedidos
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {compradores.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Nenhum dado encontrado para o período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
                  <th className="py-3 px-3 font-semibold">Pedido / Loja / Data</th>
                  <th className="py-3 px-3 font-semibold">Fornecedor & Comprador</th>
                  <th className="py-3 px-3 font-semibold text-right">Valor Total / Itens</th>
                  <th className="py-3 px-3 font-semibold">Pagamento / Boleto</th>
                  <th className="py-3 px-3 font-semibold">Status & NF Entrada</th>
                  <th className="py-3 px-3 font-semibold">Conferente</th>
                  <th className="py-3 px-3 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pedidosFiltrados.map((ped) => {
                  const entregue = ped.STATUS === 'Entregue';
                  return (
                    <tr key={`${ped.IDPEDIDO}-${ped.IDEMPRESA}`} className="hover:bg-white/[0.03] transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-100">#{ped.IDPEDIDO}</span>
                          <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 text-[10px] font-medium">
                            Loja {ped.IDEMPRESA}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {fmtData(ped.DATA_PEDIDO)} {ped.HORA_PEDIDO ? ped.HORA_PEDIDO.substring(0, 5) : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200 max-w-[240px] truncate" title={ped.FORNECEDOR}>
                          {ped.FORNECEDOR}
                        </div>
                        <div className="text-[11px] text-cyan-300/90 mt-0.5">
                          Comprador: {ped.COMPRADOR}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-bold text-sm text-blue-300 tabular-nums">
                          {fmtMoeda(ped.VALOR_TOTAL)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {ped.QTD_ITENS} {ped.QTD_ITENS === 1 ? 'item' : 'itens'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200 text-[11px] truncate max-w-[160px]" title={ped.CONDICAO_PAGTO || 'Não Informado'}>
                          {ped.CONDICAO_PAGTO || 'Não Informado'}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400 font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            {ped.PRAZO && ped.PRAZO !== '0' ? `${ped.PRAZO}d` : 'À vista'}
                          </span>
                          {ped.DATA_BOLETO && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-cyan-300 font-mono" title={`Vencimento Boleto: ${ped.DATA_BOLETO}`}>
                              <Calendar className="w-2.5 h-2.5 text-cyan-400" />
                              {ped.DATA_BOLETO}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${entregue ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-amber-500/10 border-amber-500/25 text-amber-400'}`}
                        >
                          {entregue ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {entregue ? 'Entregue' : 'Pendente'}
                        </span>
                        <div className="font-mono text-[10px] mt-1">
                          {ped.NOTAS_FISCAIS ? (
                            <span className="text-emerald-300 font-semibold">
                              NF {ped.NOTAS_FISCAIS}{ped.DATA_ENTRADA_NF ? ` • ${fmtData(ped.DATA_ENTRADA_NF)}` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Aguardando NF</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {ped.NOME_CONFERENTE ? (
                          <span className="text-cyan-300 font-semibold text-[11px]">{ped.NOME_CONFERENTE}</span>
                        ) : (
                          <span className="text-slate-600 italic text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => abrirItensPedido(ped)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-[11px] font-semibold transition flex items-center gap-1 mx-auto"
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
