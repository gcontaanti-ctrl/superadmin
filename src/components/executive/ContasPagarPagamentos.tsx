import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, Calendar, Building2, Search, ArrowRight, ArrowLeft, 
  RotateCcw, Clock, Truck, Zap, Droplets, Home, Phone, Receipt, 
  UserCheck, CalendarCheck, HelpCircle, Copy, Check, ChevronDown, 
  ChevronRight, Store, User, FileText, QrCode, Table as TableIcon, 
  LayoutGrid, List, Download, Printer, Filter, DollarSign, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';

interface ContasPagarPagamentosProps {
  selectedStore?: string;
}

interface BoletoItem {
  LOJA: number;
  NUMERO_TITULO: number;
  IDCLIFOR: number;
  FAVORECIDO: string;
  VENCIMENTO: string;
  DATA_EMISSAO?: string;
  DATA_MOVIMENTO?: string;
  DATA_PAGAMENTO?: string;
  VALOR: number;
  VALOR_PAGO?: number;
  VALOR_EFETIVO?: number;
  STATUS_BAIXADA: string;
  OBSERVACAO: string;
  ORIGEM: string;
  SERIE_NOTA?: string;
  NRO_DOCUMENTO?: string;
  BOLETO: string;
  CODIGO_BARRAS: string;
  CHAVE_PIX?: string;
  IDUSUARIO?: number;
  USUARIO_LANCAMENTO?: string;
  categoria: string;
  grupo: 'FORNECEDOR' | 'OUTROS';
  icone: string;
  corBadge: string;
}

export function ContasPagarPagamentos({ selectedStore = 'todas' }: ContasPagarPagamentosProps) {
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getCurrentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Modo de filtro de data: 'dia' ou 'mes'
  const [tipoFiltroData, setTipoFiltroData] = useState<'dia' | 'mes'>('mes');
  const [dataDia, setDataDia] = useState<string>(getTodayStr());
  const [mesAno, setMesAno] = useState<string>(getCurrentMonthStr());
  const [lojaSelecionada, setLojaSelecionada] = useState<string>(selectedStore || 'todas');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODAS');
  const [busca, setBusca] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modo de visualização: 'lista' | 'cards' | 'tabela'
  const [modoVisualizacao, setModoVisualizacao] = useState<'lista' | 'cards' | 'tabela'>('lista');
  const [itensExpandidos, setItensExpandidos] = useState<Set<string>>(new Set());

  // Dados carregados
  const [itens, setItens] = useState<BoletoItem[]>([]);
  const [totaisLoja, setTotaisLoja] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });

  const toggleItemExpandido = (key: string) => {
    setItensExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandirTodos = () => {
    const keys = itensFiltrados.map(i => `${i.LOJA}-${i.NUMERO_TITULO}`);
    setItensExpandidos(new Set(keys));
  };

  const recolherTodos = () => {
    setItensExpandidos(new Set());
  };

  // Carregar dados de pagamentos
  const carregarPagamentos = async () => {
    setLoading(true);
    try {
      let url = '';
      if (tipoFiltroData === 'mes') {
        url = `/api/financeiro/contas-pagar-mes?mesAno=${mesAno}&loja=${lojaSelecionada}&status=T`;
      } else {
        url = `/api/financeiro/contas-pagar?dataBase=${dataDia}&loja=${lojaSelecionada}&status=T`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao consultar pagamentos');
      const data = await res.json();

      let lista: BoletoItem[] = [];
      if (tipoFiltroData === 'mes') {
        lista = data.itens || [];
      } else {
        // diaAtual.todos
        lista = (data.diaAtual && data.diaAtual.todos) ? data.diaAtual.todos : [];
      }

      setItens(lista);

      // Calcular totais por loja
      const tLoja: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
      lista.forEach(i => {
        const val = i.VALOR_PAGO && i.VALOR_PAGO > 0 ? i.VALOR_PAGO : i.VALOR;
        tLoja[i.LOJA] = (tLoja[i.LOJA] || 0) + val;
      });
      setTotaisLoja(tLoja);

    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarPagamentos();
  }, [tipoFiltroData, dataDia, mesAno, lojaSelecionada]);

  // Formatações
  const fmtMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const fmtData = (dt?: string) => {
    if (!dt) return '—';
    const parts = dt.trim().split('-');
    if (parts.length < 3) return dt;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const copiarTexto = (txt: string, id: number) => {
    if (!txt) {
      toast.info('Código/Chave não informado');
      return;
    }
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtragem dos itens por busca e categoria
  const itensFiltrados = useMemo(() => {
    return itens.filter(item => {
      // Categoria
      if (categoriaFiltro !== 'TODAS' && item.categoria !== categoriaFiltro) {
        return false;
      }

      // Busca
      if (busca.trim()) {
        const q = busca.toLowerCase().trim();
        const fav = (item.FAVORECIDO || '').toLowerCase();
        const num = String(item.NUMERO_TITULO || '');
        const doc = (item.NRO_DOCUMENTO || '').toLowerCase();
        const obs = (item.OBSERVACAO || '').toLowerCase();
        const user = (item.USUARIO_LANCAMENTO || '').toLowerCase();
        const bol = (item.BOLETO || '').toLowerCase();
        const barras = (item.CODIGO_BARRAS || '').toLowerCase();
        const pix = (item.CHAVE_PIX || '').toLowerCase();
        const valStr = String(item.VALOR || '');
        const valPagoStr = String(item.VALOR_PAGO || '');

        return fav.includes(q) || num.includes(q) || doc.includes(q) || 
               obs.includes(q) || user.includes(q) || bol.includes(q) || 
               barras.includes(q) || pix.includes(q) || valStr.includes(q) || valPagoStr.includes(q);
      }

      return true;
    });
  }, [itens, categoriaFiltro, busca]);

  // Totais consolidados dos itens filtrados
  const totalPagoFiltrado = useMemo(() => {
    return itensFiltrados.reduce((acc, i) => acc + (i.VALOR_PAGO && i.VALOR_PAGO > 0 ? i.VALOR_PAGO : i.VALOR), 0);
  }, [itensFiltrados]);

  // Categorias disponíveis na lista carregada
  const categoriasDisponiveis = useMemo(() => {
    const setCat = new Set<string>();
    itens.forEach(i => {
      if (i.categoria) setCat.add(i.categoria);
    });
    return Array.from(setCat).sort();
  }, [itens]);

  const imprimirRelatorio = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Filtros e Controles */}
      <div className="glass-strong rounded-2xl p-4 md:p-5 border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-black/60 shadow-xl flex flex-col gap-4">
        
        {/* Cabeçalho da Aba */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 grid place-items-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20 shrink-0">
              <CheckCircle2 className="size-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-bold font-serif text-white">
                  Pagamentos Realizados & Baixas
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Títulos Baixados
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Histórico e conferência de todas as contas que já foram quitadas
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={carregarPagamentos}
              disabled={loading}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-colors"
              title="Atualizar lista"
            >
              <RotateCcw className={`size-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={imprimirRelatorio}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 transition-colors"
            >
              <Printer className="size-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Linha de Filtros Principais */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Seletor de Período: Mês Inteiro vs Dia Específico */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setTipoFiltroData('mes')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  tipoFiltroData === 'mes'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Visão por Mês
              </button>
              <button
                onClick={() => setTipoFiltroData('dia')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  tipoFiltroData === 'dia'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dia Específico
              </button>
            </div>

            {/* Input de Data ou Mês */}
            {tipoFiltroData === 'mes' ? (
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                <Calendar className="size-4 text-emerald-400" />
                <input
                  type="month"
                  value={mesAno}
                  onChange={(e) => setMesAno(e.target.value)}
                  className="bg-transparent border-none text-slate-100 text-xs font-bold focus:outline-none cursor-pointer [color-scheme:dark]"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                <Calendar className="size-4 text-emerald-400" />
                <input
                  type="date"
                  value={dataDia}
                  onChange={(e) => setDataDia(e.target.value)}
                  className="bg-transparent border-none text-slate-100 text-xs font-bold focus:outline-none cursor-pointer [color-scheme:dark]"
                />
              </div>
            )}

            {/* Filtro por Loja */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-semibold">
              <button
                onClick={() => setLojaSelecionada('todas')}
                className={`px-2.5 py-1 rounded-lg transition-all ${lojaSelecionada === 'todas' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Todas Lojas
              </button>
              <button
                onClick={() => setLojaSelecionada('1')}
                className={`px-2.5 py-1 rounded-lg transition-all ${lojaSelecionada === '1' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Loja 01
              </button>
              <button
                onClick={() => setLojaSelecionada('2')}
                className={`px-2.5 py-1 rounded-lg transition-all ${lojaSelecionada === '2' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Loja 02
              </button>
              <button
                onClick={() => setLojaSelecionada('3')}
                className={`px-2.5 py-1 rounded-lg transition-all ${lojaSelecionada === '3' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Loja 03
              </button>
            </div>
          </div>

          {/* Alternador de Modo de Exibição */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setModoVisualizacao('lista')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                modoVisualizacao === 'lista'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Lista compacta com clique para expandir detalhes"
            >
              <List className="size-3.5" />
              <span>Lista</span>
            </button>
            <button
              onClick={() => setModoVisualizacao('cards')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                modoVisualizacao === 'cards'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Visualizar em cartões"
            >
              <LayoutGrid className="size-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setModoVisualizacao('tabela')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                modoVisualizacao === 'tabela'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tabela de auditoria"
            >
              <TableIcon className="size-3.5" />
              <span>Tabela</span>
            </button>
          </div>
        </div>

        {/* Campo de Busca & Filtro de Categorias */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por favorecido, documento, título, PIX, código ou lançador..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-20 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {busca && (
              <button 
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 hover:text-white bg-white/10 px-2 py-0.5 rounded"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Select de Categoria */}
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-slate-400 shrink-0" />
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="TODAS">Todas as Categorias</option>
              {categoriasDisponiveis.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Card Total Geral Pago */}
          <div className="bg-black/40 p-3.5 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400" /> Total Pago no Período
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                {itensFiltrados.length} baixas
              </span>
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 mt-1">
              {fmtMoeda(totalPagoFiltrado)}
            </div>
          </div>

          {/* Card Loja 1 */}
          <div className="bg-black/40 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
            <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
              <Store className="size-3.5 text-cyan-400" /> Loja 01 (Matriz)
            </div>
            <div className="text-lg md:text-xl font-bold text-white mt-1">
              {fmtMoeda(totaisLoja[1] || 0)}
            </div>
          </div>

          {/* Card Loja 2 */}
          <div className="bg-black/40 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
            <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
              <Store className="size-3.5 text-cyan-400" /> Loja 02 (Filial)
            </div>
            <div className="text-lg md:text-xl font-bold text-white mt-1">
              {fmtMoeda(totaisLoja[2] || 0)}
            </div>
          </div>

          {/* Card Loja 3 */}
          <div className="bg-black/40 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
            <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
              <Store className="size-3.5 text-cyan-400" /> Loja 03 (Filial)
            </div>
            <div className="text-lg md:text-xl font-bold text-white mt-1">
              {fmtMoeda(totaisLoja[3] || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Lista / Tabela de Pagamentos */}
      <div className="glass-strong rounded-2xl p-4 md:p-5 border border-white/10 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
          <div className="text-slate-300 font-semibold">
            Exibindo <strong className="text-emerald-400">{itensFiltrados.length}</strong> pagamentos realizados
          </div>

          {modoVisualizacao === 'lista' && (
            <div className="flex items-center gap-1 text-[11px]">
              <button
                onClick={expandirTodos}
                className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold transition-colors"
              >
                Abrir Todos Detalhes
              </button>
              <button
                onClick={recolherTodos}
                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 font-semibold transition-colors"
              >
                Recolher Todos
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RotateCcw className="size-8 animate-spin text-emerald-400" />
            <p className="text-xs font-semibold">Carregando pagamentos e comprovantes...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && itensFiltrados.length === 0 && (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="size-10 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">Nenhum pagamento encontrado com os filtros selecionados.</p>
            <p className="text-xs text-slate-500">Tente alterar o período, a loja ou limpar o campo de busca.</p>
          </div>
        )}

        {/* Modo 1: LISTA CLEAN INTERATIVA COM CLIQUE */}
        {!loading && modoVisualizacao === 'lista' && itensFiltrados.length > 0 && (
          <div className="flex flex-col gap-2">
            {itensFiltrados.map((item, idx) => {
              const itemKey = `${item.LOJA}-${item.NUMERO_TITULO}`;
              const expandido = itensExpandidos.has(itemKey);
              const valorEfetivo = item.VALOR_PAGO && item.VALOR_PAGO > 0 ? item.VALOR_PAGO : item.VALOR;

              return (
                <div 
                  key={`${itemKey}-${idx}`}
                  className="bg-slate-950/60 hover:bg-slate-900/80 border border-white/5 hover:border-emerald-500/30 rounded-xl transition-all shadow-sm overflow-hidden"
                >
                  {/* Linha Resumo Clicável */}
                  <div
                    onClick={() => toggleItemExpandido(itemKey)}
                    className="p-3 md:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button className="text-slate-400 hover:text-white transition-colors shrink-0">
                        {expandido ? <ChevronDown className="size-4 text-emerald-400" /> : <ChevronRight className="size-4" />}
                      </button>

                      <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
                        <CheckCircle2 className="size-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs md:text-sm text-slate-100 truncate">
                            {item.FAVORECIDO}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                            Loja 0{item.LOJA}
                          </span>
                          {item.categoria && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5 shrink-0">
                              {item.categoria}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                          <span>Pago em: <strong className="text-emerald-300">{fmtData(item.DATA_PAGAMENTO || item.VENCIMENTO)}</strong></span>
                          <span>Vencimento original: {fmtData(item.VENCIMENTO)}</span>
                          <span>Título: #{item.NUMERO_TITULO}</span>
                        </div>
                      </div>
                    </div>

                    {/* Valor e Ações Rápidas */}
                    <div className="text-right shrink-0">
                      <div className="text-sm md:text-base font-extrabold text-emerald-400">
                        {fmtMoeda(valorEfetivo)}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                        ✓ Quitado
                      </span>
                    </div>
                  </div>

                  {/* Detalhes Expandidos */}
                  {expandido && (
                    <div className="px-4 pb-4 pt-1 border-t border-white/5 bg-black/40 flex flex-col gap-3 text-xs animate-in fade-in duration-200">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
                        <div className="bg-white/5 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Documento / NF</span>
                          <span className="font-bold text-white">{item.NRO_DOCUMENTO || '—'}</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Data Emissão</span>
                          <span className="font-bold text-white">{fmtData(item.DATA_EMISSAO)}</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Valor Original</span>
                          <span className="font-bold text-white">{fmtMoeda(item.VALOR)}</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Usuário Lançador</span>
                          <span className="font-bold text-white">{item.USUARIO_LANCAMENTO || '—'}</span>
                        </div>
                      </div>

                      {item.OBSERVACAO && (
                        <div className="bg-white/5 p-2.5 rounded-lg text-slate-300 text-xs">
                          <strong className="text-slate-400 block text-[10px] mb-0.5">Observação do Lançamento:</strong>
                          {item.OBSERVACAO}
                        </div>
                      )}

                      {/* Código de Barras / Boleto / PIX */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {item.CODIGO_BARRAS && (
                          <button
                            onClick={() => copiarTexto(item.CODIGO_BARRAS, item.NUMERO_TITULO)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold transition-colors"
                          >
                            {copiedId === item.NUMERO_TITULO ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                            <span>Copiar Código de Barras</span>
                          </button>
                        )}
                        {item.CHAVE_PIX && (
                          <button
                            onClick={() => copiarTexto(item.CHAVE_PIX || '', item.NUMERO_TITULO)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-[11px] font-semibold transition-colors"
                          >
                            <QrCode className="size-3.5" />
                            <span>Copiar Chave PIX</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modo 2: CARDS DETALHADOS */}
        {!loading && modoVisualizacao === 'cards' && itensFiltrados.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {itensFiltrados.map((item, idx) => {
              const valorEfetivo = item.VALOR_PAGO && item.VALOR_PAGO > 0 ? item.VALOR_PAGO : item.VALOR;

              return (
                <div
                  key={`${item.LOJA}-${item.NUMERO_TITULO}-${idx}`}
                  className="bg-slate-950/60 border border-white/10 hover:border-emerald-500/40 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm hover:shadow-emerald-500/5 transition-all"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Loja 0{item.LOJA}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          #{item.NUMERO_TITULO}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> PAGO
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-100 line-clamp-1" title={item.FAVORECIDO}>
                      {item.FAVORECIDO}
                    </h4>

                    <div className="text-xl font-black text-emerald-400">
                      {fmtMoeda(valorEfetivo)}
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400 bg-black/40 p-2 rounded-lg">
                      <div>
                        <span className="block text-[9px] uppercase">Data Pagamento</span>
                        <strong className="text-emerald-300">{fmtData(item.DATA_PAGAMENTO || item.VENCIMENTO)}</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase">Venc. Original</span>
                        <strong className="text-slate-300">{fmtData(item.VENCIMENTO)}</strong>
                      </div>
                    </div>

                    {item.OBSERVACAO && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 bg-white/5 p-1.5 rounded">
                        {item.OBSERVACAO}
                      </p>
                    )}
                  </div>

                  {item.CODIGO_BARRAS && (
                    <button
                      onClick={() => copiarTexto(item.CODIGO_BARRAS, item.NUMERO_TITULO)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-300 border border-white/5 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Copy className="size-3" />
                      <span>Copiar Código</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modo 3: TABELA DE AUDITORIA */}
        {!loading && modoVisualizacao === 'tabela' && itensFiltrados.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-black/60 border-b border-white/10 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Loja</th>
                  <th className="py-2.5 px-3">Título / NF</th>
                  <th className="py-2.5 px-3">Favorecido / Fornecedor</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Data Pgto</th>
                  <th className="py-2.5 px-3">Venc. Original</th>
                  <th className="py-2.5 px-3 text-right">Valor Pago</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {itensFiltrados.map((item, idx) => {
                  const valorEfetivo = item.VALOR_PAGO && item.VALOR_PAGO > 0 ? item.VALOR_PAGO : item.VALOR;

                  return (
                    <tr key={`${item.LOJA}-${item.NUMERO_TITULO}-${idx}`} className="hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3">
                        <span className="font-bold text-cyan-400">Loja 0{item.LOJA}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-mono text-slate-300">#{item.NUMERO_TITULO}</div>
                        {item.NRO_DOCUMENTO && <div className="text-[10px] text-slate-500">Doc: {item.NRO_DOCUMENTO}</div>}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-200">
                        {item.FAVORECIDO}
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {item.categoria || '—'}
                      </td>
                      <td className="py-2 px-3 font-bold text-emerald-400">
                        {fmtData(item.DATA_PAGAMENTO || item.VENCIMENTO)}
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {fmtData(item.VENCIMENTO)}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-emerald-400 text-sm">
                        {fmtMoeda(valorEfetivo)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          BAIXADO
                        </span>
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
  );
}
