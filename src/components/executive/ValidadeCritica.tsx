import React, { useState, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, Clock, Search, ShieldAlert, Store, User, Filter, PackageSearch, RefreshCw, Printer, AlertOctagon, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ValidadeItem {
  idProduto?: number;
  loja: string;
  produto: string;
  notaFiscal: string;
  usuarioEntrada: string;
  usuarioLiberou: string;
  dataEntrada: string;
  horaEntrada: string;
  qtdRecebida: number;
  dataValidade: string;
  diasRestantes: number;
  custoUnitario?: number;
  valorTotal?: number;
}

interface ResumoValidade {
  critico: number;
  criticoValor?: number;
  alerta: number;
  alertaValor?: number;
  atencao: number;
  atencaoValor?: number;
  aviso: number;
  avisoValor?: number;
  total: number;
  totalProdutos: number;
  totalValor?: number;
}

interface AvariaItem {
  id: number;
  loja: string;
  produto: string;
  codigo_interno?: string;
  quantidade: number;
  valor_unitario: number;
  data: string;
  local_origem: number;
  observacao: string;
}

interface RemessaItem {
  id: number;
  loja: string;
  data: string;
  descricao: string;
  status: string;
  tipo?: string;
  fornecedor?: string;
}

export function ValidadeCritica({ selectedStore }: { selectedStore?: string }) {
  const [activeTab, setActiveTab] = useState<'vencimentos'|'avarias'|'remessas'>('vencimentos');

  // Vencimentos States
  const [searchTerm, setSearchTerm] = useState("");
  const [minDias, setMinDias] = useState("0");
  const [maxDias, setMaxDias] = useState("20");

  // Avarias States
  const [avariaSearchTerm, setAvariaSearchTerm] = useState("");
  const [avariaStartDate, setAvariaStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [avariaEndDate, setAvariaEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [avariaSecao, setAvariaSecao] = useState("");
  const [expandedStores, setExpandedStores] = useState<Record<string, boolean>>({});

  const toggleStore = (storeName: string) => {
    setExpandedStores(prev => ({ ...prev, [storeName]: !prev[storeName] }));
  };

  const apiUrl = import.meta.env.VITE_API_URL || '';

  // VENCIMENTOS QUERIES
  const { data: resumo, isLoading: isLoadingResumo } = useQuery<ResumoValidade>({
    queryKey: ['validade-resumo', selectedStore],
    queryFn: async () => {
      const url = new URL(`${apiUrl}/api/validade-critica/resumo`, window.location.origin);
      if (selectedStore && selectedStore !== 'todas') url.searchParams.append('idEmpresa', selectedStore);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Falha ao buscar resumo de validade');
      return res.json();
    },
    refetchInterval: 300000,
    placeholderData: keepPreviousData,
    enabled: activeTab === 'vencimentos'
  });

  const { data: itens, isLoading, error, refetch } = useQuery<ValidadeItem[]>({
    queryKey: ['validade-critica', selectedStore, minDias, maxDias],
    queryFn: async () => {
      const url = new URL(`${apiUrl}/api/validade-critica`, window.location.origin);
      if (selectedStore && selectedStore !== 'todas') url.searchParams.append('idEmpresa', selectedStore);
      if (maxDias !== 'todos') url.searchParams.append('dias_max', maxDias);
      url.searchParams.append('dias_min', minDias);
      const res = await fetch(url.toString());
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao buscar dados de validade');
      }
      return res.json();
    },
    placeholderData: keepPreviousData,
    enabled: activeTab === 'vencimentos'
  });

  // AVARIAS QUERIES
  const { data: avarias, isLoading: isLoadingAvarias, error: errorAvarias, refetch: refetchAvarias, dataUpdatedAt: avariasUpdatedAt, isFetching: isFetchingAvarias } = useQuery<AvariaItem[]>({
    queryKey: ['avarias', selectedStore, avariaStartDate, avariaEndDate, avariaSecao],
    queryFn: async () => {
      const url = new URL(`${apiUrl}/api/avarias`, window.location.origin);
      if (selectedStore && selectedStore !== 'todas') url.searchParams.append('idEmpresa', selectedStore);
      if (avariaStartDate) url.searchParams.append('startDate', avariaStartDate);
      if (avariaEndDate) url.searchParams.append('endDate', avariaEndDate);
      if (avariaSecao) url.searchParams.append('secao', avariaSecao);
      const res = await fetch(url.toString());
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao buscar dados de avarias');
      }
      return res.json();
    },
    enabled: activeTab === 'avarias',
    refetchInterval: 300000,
    placeholderData: keepPreviousData
  });

  // REMESSAS PENDENTES QUERIES
  const { data: remessas, isLoading: isLoadingRemessas, error: errorRemessas, refetch: refetchRemessas, dataUpdatedAt: remessasUpdatedAt, isFetching: isFetchingRemessas } = useQuery<RemessaItem[]>({
    queryKey: ['remessas-pendentes', selectedStore, avariaStartDate, avariaEndDate],
    queryFn: async () => {
      const url = new URL(`${apiUrl}/api/avaria-remessas-pendentes`, window.location.origin);
      if (selectedStore && selectedStore !== 'todas') url.searchParams.append('empresa', selectedStore);
      if (avariaStartDate) url.searchParams.append('data_inicio', avariaStartDate);
      if (avariaEndDate) url.searchParams.append('data_fim', avariaEndDate);
      const res = await fetch(url.toString());
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao buscar remessas pendentes');
      }
      return res.json();
    },
    enabled: activeTab === 'remessas',
    refetchInterval: 300000,
    placeholderData: keepPreviousData
  });

  // VENCIMENTOS MEMO
  const filteredItems = useMemo(() => {
    if (!itens) return [];
    if (!searchTerm) return itens;
    const term = searchTerm.toLowerCase().trim();
    return itens.filter(item => 
      (item.produto && item.produto.toLowerCase().includes(term)) || 
      (item.notaFiscal && item.notaFiscal.toLowerCase().includes(term)) ||
      (item.loja && item.loja.toLowerCase().includes(term)) ||
      String(item.idProduto || '').includes(term) ||
      (item.usuarioEntrada && item.usuarioEntrada.toLowerCase().includes(term)) ||
      (item.usuarioLiberou && item.usuarioLiberou.toLowerCase().includes(term)) ||
      (item.dataValidade && String(item.dataValidade).includes(term)) ||
      String(item.diasRestantes).includes(term)
    );
  }, [itens, searchTerm]);

  const groupedItems = useMemo(() => {
    if (!filteredItems) return [];
    const groups: Record<string, ValidadeItem[]> = {};
    filteredItems.forEach(item => {
      const storeName = item.loja || 'Desconhecida';
      if (!groups[storeName]) groups[storeName] = [];
      groups[storeName].push(item);
    });
    return Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]));
  }, [filteredItems]);

  // AVARIAS MEMO
  const filteredAvarias = useMemo(() => {
    if (!avarias) return [];
    if (!avariaSearchTerm) return avarias;
    const term = avariaSearchTerm.toLowerCase();
    return avarias.filter(item => 
      (item.produto && item.produto.toLowerCase().includes(term)) || 
      (item.observacao && item.observacao.toLowerCase().includes(term)) ||
      (item.loja && item.loja.toLowerCase().includes(term))
    );
  }, [avarias, avariaSearchTerm]);

  const groupedAvarias = useMemo(() => {
    if (!filteredAvarias) return [];
    const groups: Record<string, AvariaItem[]> = {};
    filteredAvarias.forEach(item => {
      const storeName = item.loja || 'Desconhecida';
      if (!groups[storeName]) groups[storeName] = [];
      groups[storeName].push(item);
    });
    return Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]));
  }, [filteredAvarias]);

  const groupedRemessas = useMemo(() => {
    if (!remessas) return [];
    const groups: Record<string, RemessaItem[]> = {};
    remessas.forEach(item => {
      const storeName = item.loja || 'Desconhecida';
      if (!groups[storeName]) groups[storeName] = [];
      groups[storeName].push(item);
    });
    return Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]));
  }, [remessas]);

  const handlePrint = () => {
    window.print();
  };

  const exportStoreToTxt = (storeName: string, items: AvariaItem[]) => {
    let txtContent = "";
    items.forEach(item => {
      // 1-13: Código
      const codeRaw = (item.codigo_interno || String(item.id)).trim();
      const codeStr = codeRaw.substring(0, 13).padEnd(13, ' ');
      
      // 14-20: Quantidade (3 casas decimais = x 1000)
      const qtdRaw = Math.round(item.quantidade * 1000).toString();
      const qtdStr = qtdRaw.substring(0, 7).padEnd(7, ' ');
      
      // 21-24: Local de Estoque
      const localRaw = (item.local_origem ? String(item.local_origem) : "").trim();
      const localStr = localRaw.substring(0, 4).padEnd(4, ' ');
      
      txtContent += `${codeStr}${qtdStr}${localStr}\r\n`;
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeStoreName = storeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `importacao_coletor_${safeStoreName}_${format(new Date(), 'ddMMyyyy')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Arquivo TXT gerado para ${storeName}`);
  };

  return (
    <div className="space-y-6 p-2 pb-16 animate-in fade-in duration-500">
      
      {/* Floating Sync Indicator */}
      {(activeTab === 'avarias' || activeTab === 'remessas') && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10 shadow-2xl shadow-black/50 animate-in slide-in-from-top-4">
          <Clock className="w-4 h-4 text-emerald-500" />
          <span className="hidden sm:inline">Sincronização Automática (5 min)</span>
          <span className="text-white/20 mx-2 hidden sm:inline">|</span>
          {activeTab === 'avarias' ? (
            <span>Última: {avariasUpdatedAt ? format(avariasUpdatedAt, "HH:mm:ss") : 'Aguardando...'} {isFetchingAvarias && <RefreshCw className="w-3 h-3 inline animate-spin ml-1 text-emerald-400" />}</span>
          ) : (
            <span>Última: {remessasUpdatedAt ? format(remessasUpdatedAt, "HH:mm:ss") : 'Aguardando...'} {isFetchingRemessas && <RefreshCw className="w-3 h-3 inline animate-spin ml-1 text-emerald-400" />}</span>
          )}
        </div>
      )}
      
      {/* Visualização de Tela Interativa (Ocultada na Impressão) */}
      <div className="print-hidden space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-strong p-6 rounded-2xl border border-white/5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                {activeTab === 'vencimentos' ? <ShieldAlert className="w-6 h-6 text-rose-500" /> : <AlertOctagon className="w-6 h-6 text-rose-500" />}
              </div>
              {activeTab === 'vencimentos' ? 'Central de Validade Crítica' : 'Controle de Avarias e Trocas'}
            </h2>
            <p className="text-slate-400 mt-2 text-sm max-w-2xl">
              {activeTab === 'vencimentos' 
                ? 'Monitoramento de produtos recebidos com vencimento próximo. Antecipe perdas e tome ações rápidas.'
                : 'Visualização de lançamentos de avarias da sessão e área de troca. Restrito para lançamentos a partir de Abril/2026.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => activeTab === 'vencimentos' ? refetch() : refetchAvarias()} 
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>

            {/* Botão de Impressão de Relatório */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              title="Imprimir relatório executivo com os produtos em lista e informações de validade ao lado"
            >
              <Printer className="w-4 h-4" /> Imprimir Relatório
            </button>
          </div>
        </div>



      {activeTab === 'vencimentos' && (
        <>
          {/* KPIs Vencimentos */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div 
              onClick={() => { setMinDias("0"); setMaxDias("60"); }}
              className={`glass-strong rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] ${maxDias === "60" ? 'border-2 border-violet-500/60 ring-2 ring-violet-500/20 shadow-lg shadow-violet-500/10' : 'border border-white/5'}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between">
                <h3 className="text-slate-400 text-sm font-medium">Produtos Distintos</h3>
                <div className="p-1.5 bg-violet-500/10 rounded-lg">
                  <PackageSearch className="w-4 h-4 text-violet-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white tracking-tight">
                {isLoadingResumo ? '-' : resumo?.totalProdutos || 0}
              </div>
              <p className="text-xs text-violet-400 font-semibold font-mono">
                {resumo?.totalValor ? resumo.totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
              </p>
            </div>

            <div 
              onClick={() => { setMinDias("0"); setMaxDias("5"); }}
              className={`glass-strong rounded-2xl p-5 bg-rose-500/[0.02] flex flex-col gap-3 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] ${maxDias === "5" ? 'border-2 border-rose-500/60 ring-2 ring-rose-500/20 shadow-lg shadow-rose-500/10' : 'border border-rose-500/20'}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between">
                <h3 className="text-rose-400 text-sm font-medium">Risco Crítico</h3>
                <div className="p-1.5 bg-rose-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white tracking-tight">
                {isLoadingResumo ? '-' : resumo?.critico || 0}
              </div>
              <p className="text-xs text-rose-400 font-semibold font-mono">
                {resumo?.criticoValor ? resumo.criticoValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
              </p>
              <p className="text-[10px] text-rose-500/70">{maxDias === "5" && minDias === "0" ? '✓ 0 a 5 dias' : 'Clique: 0 a 5 dias'}</p>
            </div>

            <div 
              onClick={() => { setMinDias("6"); setMaxDias("10"); }}
              className={`glass-strong rounded-2xl p-5 bg-orange-500/[0.02] flex flex-col gap-3 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] ${maxDias === "10" && minDias === "6" ? 'border-2 border-orange-500/60 ring-2 ring-orange-500/20 shadow-lg shadow-orange-500/10' : 'border border-orange-500/20'}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between">
                <h3 className="text-orange-400 text-sm font-medium">Alerta</h3>
                <div className="p-1.5 bg-orange-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white tracking-tight">
                {isLoadingResumo ? '-' : resumo?.alerta || 0}
              </div>
              <p className="text-xs text-orange-400 font-semibold font-mono">
                {resumo?.alertaValor ? resumo.alertaValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
              </p>
              <p className="text-[10px] text-orange-500/70">{maxDias === "10" && minDias === "6" ? '✓ 6 a 10 dias' : 'Clique: 6 a 10 dias'}</p>
            </div>

            <div 
              onClick={() => { setMinDias("11"); setMaxDias("15"); }}
              className={`glass-strong rounded-2xl p-5 bg-amber-500/[0.02] flex flex-col gap-3 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] ${maxDias === "15" && minDias === "11" ? 'border-2 border-amber-500/60 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/10' : 'border border-amber-500/20'}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between">
                <h3 className="text-amber-400 text-sm font-medium">Atenção</h3>
                <div className="p-1.5 bg-amber-500/20 rounded-lg">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white tracking-tight">
                {isLoadingResumo ? '-' : resumo?.atencao || 0}
              </div>
              <p className="text-xs text-amber-400 font-semibold font-mono">
                {resumo?.atencaoValor ? resumo.atencaoValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
              </p>
              <p className="text-[10px] text-amber-500/70">{maxDias === "15" && minDias === "11" ? '✓ 11 a 15 dias' : 'Clique: 11 a 15 dias'}</p>
            </div>

            <div 
              onClick={() => { setMinDias("20"); setMaxDias("20"); }}
              className={`glass-strong rounded-2xl p-5 bg-cyan-500/[0.02] flex flex-col gap-3 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] ${maxDias === "20" && minDias === "20" ? 'border-2 border-cyan-500/60 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-500/10' : 'border border-cyan-500/20'}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between">
                <h3 className="text-cyan-400 text-sm font-medium">Observação</h3>
                <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-cyan-500" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white tracking-tight">
                {isLoadingResumo ? '-' : resumo?.aviso || 0}
              </div>
              <p className="text-xs text-cyan-400 font-semibold font-mono">
                {resumo?.avisoValor ? resumo.avisoValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
              </p>
              <p className="text-[10px] text-cyan-500/70">{maxDias === "20" && minDias === "20" ? '✓ Exatos 20 dias' : 'Clique: exatos 20 dias'}</p>
            </div>
          </div>

          <div className="glass-strong rounded-2xl p-0 border border-white/5 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between bg-black/20">
              <h3 className="text-sm font-semibold text-slate-200">Listagem de Produtos</h3>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar produto, NF ou loja..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                
                <div className="relative">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <select 
                    value={`${minDias}-${maxDias}`}
                    onChange={(e) => {
                      const [min, max] = e.target.value.split('-');
                      setMinDias(min);
                      setMaxDias(max);
                    }}
                    className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                  >
                    <option value="0-5" className="text-slate-100 bg-slate-950">≤ 5 dias (Crítico)</option>
                    <option value="10-10" className="text-slate-100 bg-slate-950">Exatamente 10 dias (Alerta)</option>
                    <option value="15-15" className="text-slate-100 bg-slate-950">Exatamente 15 dias (Atenção)</option>
                    <option value="20-20" className="text-slate-100 bg-slate-950">Exatamente 20 dias (Observação)</option>
                    <option value="0-30" className="text-slate-100 bg-slate-950">≤ 30 dias</option>
                    <option value="0-60" className="text-slate-100 bg-slate-950">≤ 60 dias</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-black/20 text-slate-400 font-medium text-xs uppercase tracking-wider border-b border-white/5">
                    <th className="px-5 py-4">Produto</th>
                    <th className="px-5 py-4">Local / NF</th>
                    <th className="px-5 py-4 text-center">Validade Digitada</th>
                    <th className="px-5 py-4 text-center">Dias Restantes</th>
                    <th className="px-5 py-4 text-right">Qtd</th>
                    <th className="px-5 py-4 text-right">Custo Unit.</th>
                    <th className="px-5 py-4 text-right">Custo Total</th>
                    <th className="px-5 py-4">Responsáveis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-500">Carregando...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={8} className="px-5 py-8 text-center text-rose-500 bg-rose-500/5">Falha ao carregar dados</td></tr>
                  ) : groupedItems.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">Nenhum produto encontrado.</td></tr>
                  ) : (
                    groupedItems.map(([storeName, items]) => (
                      <React.Fragment key={storeName}>
                        <tr className="bg-white/[0.03]">
                          <td colSpan={8} className="px-5 py-3 font-semibold text-slate-300 border-t border-white/5">
                            <Store className="w-4 h-4 inline-block mr-2 text-slate-400" /> {storeName} <span className="text-xs font-normal text-slate-500 ml-2">({items.length} itens)</span>
                          </td>
                        </tr>
                        {items.map((item, idx) => {
                          const isCritico = item.diasRestantes <= 5;
                          const isAlerta = item.diasRestantes > 5 && item.diasRestantes <= 10;
                          const isAtencao = item.diasRestantes > 10 && item.diasRestantes <= 15;
                          const isAviso = item.diasRestantes > 15 && item.diasRestantes <= 20;
                          const valDataFormatada = item.dataValidade 
                            ? String(item.dataValidade).split('T')[0].split('-').reverse().join('/') 
                            : '-';

                          return (
                          <tr key={`${storeName}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-4 pl-10">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full shadow-sm shrink-0 ${isCritico ? 'bg-rose-500 shadow-rose-500/50 animate-pulse' : isAlerta ? 'bg-orange-500' : isAtencao ? 'bg-amber-500' : isAviso ? 'bg-cyan-500' : 'bg-slate-500'}`}></div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-200">{item.produto}</span>
                                  {item.idProduto && (
                                    <span className="text-[11px] font-mono text-cyan-400 font-bold mt-0.5">
                                      Cód. Interno: {item.idProduto}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-emerald-400 font-mono font-bold">NF: #{item.notaFiscal}</span>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                                  <span>{item.dataEntrada ? String(item.dataEntrada).split('T')[0].split('-').reverse().join('/') : '-'}</span>
                                  {item.horaEntrada && (
                                    <span className="text-cyan-400 bg-cyan-500/10 px-1 rounded border border-cyan-500/20">
                                      {item.horaEntrada}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 font-mono font-bold text-xs px-2.5 py-1 rounded-lg border shadow-sm ${
                                isCritico ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                                isAlerta ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                                isAtencao ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                              }`}>
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                {valDataFormatada}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="font-mono text-xs text-slate-300">
                                {item.diasRestantes} dias
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              {item.qtdRecebida} un
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-slate-300">
                              {item.custoUnitario ? item.custoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-rose-400 font-semibold">
                              {item.valorTotal ? item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                                  <User className="w-3 h-3 text-emerald-500/70" /> 
                                  <span className="truncate max-w-[120px]" title="Entrada">Ent: {item.usuarioEntrada}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                  <User className="w-3 h-3 text-blue-500/70" /> 
                                  <span className="truncate max-w-[120px]" title="Liberação">Lib: {item.usuarioLiberou}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'avarias' && (
        <div className="glass-strong rounded-2xl p-0 border border-white/5 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-white/5 flex flex-col lg:flex-row gap-4 items-center justify-between bg-black/20">
            <h3 className="text-sm font-semibold text-slate-200">Lançamentos de Avarias / Troca</h3>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Buscar produto ou obs..." 
                  value={avariaSearchTerm}
                  onChange={(e) => setAvariaSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="date"
                  value={avariaStartDate}
                  onChange={e => setAvariaStartDate(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200"
                />
                <span className="text-slate-500">até</span>
                <input 
                  type="date"
                  value={avariaEndDate}
                  onChange={e => setAvariaEndDate(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200"
                />
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Seção (ex: Mercearia)" 
                  value={avariaSecao}
                  onChange={(e) => setAvariaSecao(e.target.value)}
                  className="w-32 sm:w-48 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-black/20 text-slate-400 font-medium text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="px-5 py-4">Data/Hora</th>
                  <th className="px-5 py-4">Cód. Interno</th>
                  <th className="px-5 py-4">Produto</th>
                  <th className="px-5 py-4 text-center">Origem</th>
                  <th className="px-5 py-4 text-right">Qtd</th>
                  <th className="px-5 py-4 text-right">V. Unitário</th>
                  <th className="px-5 py-4 text-right">Total</th>
                  <th className="px-5 py-4">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoadingAvarias ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">Carregando avarias...</td></tr>
                ) : errorAvarias ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-rose-500 bg-rose-500/5">Falha ao carregar avarias</td></tr>
                ) : groupedAvarias.length > 0 ? (
                  groupedAvarias.map(([storeName, items]) => {
                    const isExpanded = expandedStores[storeName];
                    return (
                      <React.Fragment key={storeName}>
                        <tr 
                          className="bg-white/[0.03] hover:bg-white/[0.05] cursor-pointer transition-colors"
                          onClick={() => toggleStore(storeName)}
                        >
                          <td colSpan={8} className="px-5 py-4 border-t border-white/5">
                            <div className="flex justify-between items-center w-full">
                              <div className="font-semibold text-slate-300 flex items-center gap-2">
                                <Store className="w-4 h-4 text-slate-400" /> 
                                {storeName} 
                                <span className="text-xs font-normal text-slate-500">({items.length} lançamentos)</span>
                                <span className="text-[10px] font-medium text-slate-400/70 ml-3 bg-white/5 px-2 py-1 rounded-full border border-white/5">
                                  {isExpanded ? 'Ocultar Lista' : 'Ver Lista Completa'}
                                </span>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation(); // prevent toggling accordion
                                  exportStoreToTxt(storeName, items);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs rounded-lg transition-colors border border-blue-500/30"
                                title="Baixar arquivo no padrão do Coletor"
                              >
                                <Download className="w-3.5 h-3.5" /> Baixar TXT Coletor
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && items.map((item, idx) => {
                          const total = item.quantidade * item.valor_unitario;
                          return (
                          <tr key={`${storeName}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-4 font-mono text-xs text-slate-400 pl-10">
                              {item.data ? format(new Date(item.data), 'dd/MM/yyyy HH:mm') : '-'}
                            </td>
                            <td className="px-5 py-4 font-mono text-xs text-blue-400">
                              {item.codigo_interno || '-'}
                            </td>
                            <td className="px-5 py-4 font-medium text-slate-200">
                              {item.produto || `ID: ${item.id}`}
                            </td>
                            <td className="px-5 py-4 text-center text-slate-400 text-xs">
                              {item.local_origem || '-'}
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-rose-400">
                              {item.quantidade}
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-slate-300">
                              R$ {item.valor_unitario.toFixed(2)}
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-rose-400 font-bold">
                              R$ {total.toFixed(2)}
                            </td>
                            <td className="px-5 py-4 text-slate-400 text-xs truncate max-w-[200px]" title={item.observacao}>
                              {item.observacao || '-'}
                            </td>
                          </tr>
                        );
                      })}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Nenhuma avaria encontrada para os filtros aplicados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'remessas' && (
        <div className="glass-strong rounded-2xl p-0 border border-white/5 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-white/5 flex flex-col lg:flex-row gap-4 items-center justify-between bg-black/20">
            <h3 className="text-sm font-semibold text-slate-200">Remessas Geradas (Sem Notas Fiscais)</h3>
            
            <div className="flex flex-wrap items-center gap-3">
              <input 
                type="date" 
                value={avariaStartDate}
                onChange={(e) => setAvariaStartDate(e.target.value)}
                className="bg-white/5 border border-white/10 text-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-rose-500/50"
              />
              <span className="text-slate-500 text-sm">até</span>
              <input 
                type="date" 
                value={avariaEndDate}
                onChange={(e) => setAvariaEndDate(e.target.value)}
                className="bg-white/5 border border-white/10 text-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-rose-500/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-black/20 text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  <th className="px-5 py-4 w-32">DATA MOVIMENTO</th>
                  <th className="px-5 py-4 w-32">ID REMESSA</th>
                  <th className="px-5 py-4 w-48">FORNECEDOR</th>
                  <th className="px-5 py-4">DESCRIÇÃO</th>
                  <th className="px-5 py-4 w-48">TIPO</th>
                  <th className="px-5 py-4 w-24 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoadingRemessas ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">Carregando remessas...</td></tr>
                ) : errorRemessas ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-rose-500 bg-rose-500/5">Falha ao carregar remessas</td></tr>
                ) : groupedRemessas.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Nenhuma remessa sem nota encontrada.</td></tr>
                ) : (
                  groupedRemessas.map(([storeName, items]) => {
                    const isExpanded = expandedStores[storeName];
                    return (
                      <React.Fragment key={`remessa-${storeName}`}>
                        <tr 
                          onClick={() => toggleStore(storeName)}
                          className="bg-black/40 hover:bg-black/60 transition-colors cursor-pointer border-y border-white/5 group"
                        >
                          <td colSpan={6} className="px-5 py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Store className="w-5 h-5 text-rose-500/70" />
                                <div>
                                  <span className="font-semibold text-slate-200">{storeName}</span>
                                  <span className="ml-3 text-xs text-slate-500 font-medium bg-white/5 px-2 py-0.5 rounded-full">
                                    {items.length} pendências
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && items.map((r, idx) => (
                          <tr key={`${r.id}-${idx}`} className="bg-black/20 hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-3 font-mono text-xs text-slate-400 pl-14">
                              {r.data ? format(new Date(r.data), 'dd/MM/yyyy') : '-'}
                            </td>
                            <td className="px-5 py-3 font-mono text-xs text-blue-400">
                              #{r.id}
                            </td>
                            <td className="px-5 py-3 text-xs font-medium text-slate-300">
                              {r.fornecedor}
                            </td>
                            <td className="px-5 py-3 text-sm text-slate-300">
                              {r.descricao}
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-400">
                              {r.tipo}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold border tracking-wider ${r.status === 'L' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </div>

      {/* ========================================================================= */}
      {/* RELATÓRIO EXECUTIVO EXCLUSIVO PARA IMPRESSÃO DE VALIDADE (print-only)     */}
      {/* ========================================================================= */}
      <div className="print-only text-black bg-white p-6 font-sans">
        {/* Cabeçalho do Relatório */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight uppercase text-slate-900">
                HORUS ANALYTICS
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-bold border border-slate-300 text-slate-700">
                PREVENÇÃO DE PERDAS
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-1">
              RELATÓRIO DE PRODUTOS COM VALIDADE CRÍTICA
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Unidade / Loja: <strong>{selectedStore && selectedStore !== 'todas' ? `Loja 0${selectedStore}` : 'Todas as Lojas (Consolidado)'}</strong>
              {' | '}Faixa de Vencimento: <strong>{minDias} a {maxDias === 'todos' ? 'Todos os dias' : `${maxDias} dias restantes`}</strong>
              {searchTerm.trim() && <> | Filtro: <strong>"{searchTerm}"</strong></>}
            </p>
          </div>

          <div className="text-right text-[11px] text-slate-500">
            <div>Emissão: <strong>{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</strong></div>
            <div>Total de Itens: <strong>{filteredItems.length} produtos</strong></div>
            <div>Situação: <strong className="text-rose-700 font-bold">Atenção Imediata</strong></div>
          </div>
        </div>

        {/* Resumo Financeiro em Cards Compactos */}
        <div className="grid grid-cols-4 gap-3 mb-5 text-center text-xs">
          <div className="border border-slate-300 rounded p-2 bg-slate-50">
            <div className="text-slate-500 font-medium text-[10px] uppercase">Total de Itens</div>
            <div className="text-base font-bold text-slate-900">{filteredItems.length}</div>
          </div>
          <div className="border border-slate-300 rounded p-2 bg-rose-50 border-rose-200">
            <div className="text-rose-700 font-medium text-[10px] uppercase">Risco Crítico (≤ 5 dias)</div>
            <div className="text-base font-bold text-rose-800">
              {filteredItems.filter(i => i.diasRestantes <= 5).length}
            </div>
          </div>
          <div className="border border-slate-300 rounded p-2 bg-orange-50 border-orange-200">
            <div className="text-orange-700 font-medium text-[10px] uppercase">Alerta (6 a 10 dias)</div>
            <div className="text-base font-bold text-orange-800">
              {filteredItems.filter(i => i.diasRestantes > 5 && i.diasRestantes <= 10).length}
            </div>
          </div>
          <div className="border-2 border-slate-900 rounded p-2 bg-slate-100">
            <div className="text-slate-700 font-bold text-[10px] uppercase">CUSTO TOTAL EM RISCO</div>
            <div className="text-base font-extrabold text-slate-950">
              {filteredItems.reduce((acc, i) => acc + (i.valorTotal || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
        </div>

        {/* Tabela de Produtos Formatada em Lista com Informações ao Lado */}
        <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold uppercase border-b border-slate-300 text-[9px]">
              <th className="p-1.5 border border-slate-300 text-center w-16">Cód. Interno</th>
              <th className="p-1.5 border border-slate-300">Descrição do Produto</th>
              <th className="p-1.5 border border-slate-300 w-24">Loja</th>
              <th className="p-1.5 border border-slate-300 w-28">NF / Entrada</th>
              <th className="p-1.5 border border-slate-300 text-center w-24">Validade Digitada</th>
              <th className="p-1.5 border border-slate-300 text-center w-20">Dias Restantes</th>
              <th className="p-1.5 border border-slate-300 text-right w-16">Qtd</th>
              <th className="p-1.5 border border-slate-300 text-right w-20">Custo Unit.</th>
              <th className="p-1.5 border border-slate-300 text-right w-24">Custo Total (R$)</th>
              <th className="p-1.5 border border-slate-300 w-32">Responsáveis</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-4 text-center text-slate-500 italic">
                  Nenhum produto encontrado nos filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                const valFormatada = item.dataValidade 
                  ? String(item.dataValidade).split('T')[0].split('-').reverse().join('/') 
                  : '-';
                const isCritico = item.diasRestantes <= 5;

                return (
                  <tr key={`print-val-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-slate-900">
                      {item.idProduto || '—'}
                    </td>
                    <td className="p-1.5 border border-slate-300 font-semibold text-slate-900">
                      <div>{item.produto}</div>
                    </td>
                    <td className="p-1.5 border border-slate-300 text-slate-700">
                      {item.loja}
                    </td>
                    <td className="p-1.5 border border-slate-300 font-mono text-[9px]">
                      <div className="font-bold text-slate-900">NF: #{item.notaFiscal}</div>
                      <div className="text-slate-500">
                        {item.dataEntrada ? String(item.dataEntrada).split('T')[0].split('-').reverse().join('/') : '-'}
                        {item.horaEntrada ? ` às ${item.horaEntrada}` : ''}
                      </div>
                    </td>
                    <td className="p-1.5 border border-slate-300 text-center font-mono font-bold">
                      {valFormatada}
                    </td>
                    <td className={`p-1.5 border border-slate-300 text-center font-bold text-[9px] ${isCritico ? 'text-rose-700 font-extrabold' : 'text-slate-800'}`}>
                      {item.diasRestantes} dias {isCritico ? '(CRÍTICO)' : ''}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-right font-mono">
                      {item.qtdRecebida} un
                    </td>
                    <td className="p-1.5 border border-slate-300 text-right font-mono text-slate-700">
                      {item.custoUnitario ? item.custoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                      {item.valorTotal ? item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-[9px] text-slate-600">
                      <div>Entrada: <strong className="text-slate-800">{item.usuarioEntrada || '—'}</strong></div>
                      {item.usuarioLiberou && (
                        <div>Liberou: <strong className="text-slate-800">{item.usuarioLiberou}</strong></div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredItems.length > 0 && (
            <tfoot>
              <tr className="bg-slate-200 font-bold border-t-2 border-slate-900 text-slate-900">
                <td colSpan={8} className="p-2 border border-slate-300 text-right uppercase">
                  Custo Total Consolidado em Risco:
                </td>
                <td className="p-2 border border-slate-300 text-right font-mono text-xs font-extrabold whitespace-nowrap">
                  {filteredItems.reduce((acc, i) => acc + (i.valorTotal || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="p-2 border border-slate-300"></td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Rodapé do Relatório */}
        <div className="mt-4 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
          <div>Horus Analytics — Relatório Gerencial de Prevenção e Auditoria de Validade</div>
          <div>Página 1 de 1</div>
        </div>
      </div>

    </div>
  );
}
