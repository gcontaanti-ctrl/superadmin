import React, { useEffect, useState } from 'react';
import { 
    AlertTriangle, TrendingUp, Package, ShieldAlert, DollarSign, RefreshCw, 
    Search, Filter, Download, ArrowUpRight, ArrowDownRight, CheckCircle2, 
    Clock, ShoppingBag, PlusCircle, Building2, Store, Truck, FileSpreadsheet, FileText, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    LineChart, Line, CartesianGrid, Legend, Cell, PieChart, Pie 
} from 'recharts';
import { toast } from 'sonner';

interface RupturaItem {
    codigo_produto: string;
    codigo_barras: string;
    descricao: string;
    categoria: string;
    marca: string;
    fornecedor: string;
    tempo_entrega_dias: number;
    loja: string;
    id_loja: string;
    estoque_atual: number;
    estoque_minimo: number;
    estoque_seguranca: number;
    estoque_maximo: number;
    custo: number;
    preco_venda: number;
    consumo_medio_diario: number;
    dias_estoque: number;
    score_risco: 'Verde' | 'Amarelo' | 'Laranja' | 'Vermelho';
    score_color: string;
    score_level: number;
    quantidade_sugerida: number;
    valor_sugerido: number;
    previsao_termino: string | null;
    data_ideal_compra: string | null;
    vendas: {
        ultimos_7d: number;
        ultimos_15d: number;
        ultimos_30d: number;
        ultimos_60d: number;
        ultimos_90d: number;
        ano_anterior: number;
    };
    insights: Array<{ tipo: string; titulo: string; descricao: string }>;
}

interface DashboardData {
    kpis: {
        totalProdutosEmRisco: number;
        totalProdutosCriticos: number;
        totalProdutosSemMovimentacao: number;
        valorFinanceiroRupturas: number;
    };
    graficos: {
        rupturaPorCategoria: Array<{ categoria: string; total_produtos: number; em_risco: number; valor_risco: number }>;
        consumoDiario: Array<{ categoria: string; consumo_diario: number }>;
    };
    rankings: {
        top100MaiorRisco: RupturaItem[];
        rankingLojas: Array<{ id_loja: string; loja: string; em_risco: number; valor_sugerido: number; total_itens: number }>;
        rankingFornecedores: Array<{ fornecedor: string; em_risco: number; valor_sugerido: number; lead_time_dias: number }>;
    };
}

export function RupturasModule() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'sugestoes' | 'estoque' | 'cadastros'>('dashboard');
    const [selectedEmpresa, setSelectedEmpresa] = useState('1');
    const [selectedLoja, setSelectedLoja] = useState('todas');
    const [filterRisco, setFilterRisco] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [estoqueCompleto, setEstoqueCompleto] = useState<RupturaItem[]>([]);
    
    // Form Modal states
    const [modalCadastro, setModalCadastro] = useState<'produto' | 'loja' | 'fornecedor' | 'estoque' | null>(null);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [selectedEmpresa, selectedLoja, searchTerm, filterRisco]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams({
                idEmpresa: selectedEmpresa,
                idLoja: selectedLoja,
                search: searchTerm,
                filterRisco
            });

            const [dashRes, estRes] = await Promise.all([
                fetch(`/api/rupturas/dashboard?${queryParams}`),
                fetch(`/api/rupturas/estoque?${queryParams}`)
            ]);

            if (!dashRes.ok || !estRes.ok) {
                throw new Error(`API retornou erro: ${dashRes.status} / ${estRes.status}. Verifique se o backend está rodando.`);
            }

            const dash = await dashRes.json();
            const est = await estRes.json();

            if (dash && !dash.error) setDashboardData(dash);
            if (Array.isArray(est)) setEstoqueCompleto(est);
        } catch (err: any) {
            console.error('Erro ao carregar dados de rupturas:', err);
            setError(err.message || 'Erro desconhecido ao carregar dados.');
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = (data: any[], filename: string) => {
        if (!data || !data.length) return;
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(',')).join('\n');
        const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        toast.success(`Relatório ${filename}.csv exportado com sucesso!`);
    };

    const getScoreBadge = (score: string) => {
        switch (score) {
            case 'Vermelho':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">🔴 Vermelho (&lt;4 dias)</span>;
            case 'Laranja':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">🟠 Laranja (4-7 dias)</span>;
            case 'Amarelo':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">🟡 Amarelo (8-15 dias)</span>;
            default:
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🟢 Verde (&gt;15 dias)</span>;
        }
    };

    // Filter & Paginate items
    const paginatedItems = estoqueCompleto.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const totalPages = Math.ceil(estoqueCompleto.length / pageSize) || 1;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <div className="size-16 rounded-2xl bg-red-500/10 border border-red-500/30 grid place-items-center">
                    <ShieldAlert className="size-8 text-red-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-red-400">Erro ao carregar o módulo de Rupturas</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">{error}</p>
                    <p className="text-xs text-muted-foreground mt-2">Certifique-se de que o backend está rodando em <code className="text-cyan-400">localhost:3001</code> e reinicie o servidor.</p>
                </div>
                <button
                    onClick={fetchData}
                    className="mt-2 px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl text-sm font-semibold hover:bg-primary/30 transition flex items-center gap-2"
                >
                    <RefreshCw className="size-4" /> Tentar novamente
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* TOP BAR / TITLE & FILTERS */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 glass-card p-5 rounded-2xl border border-white/10 shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 grid place-items-center text-red-400 shadow-lg">
                        <ShieldAlert className="size-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                            Prevenção de Rupturas & Estoque Inteligente
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Gestão preditiva de risco, giro diário e automação de pedidos de compra
                        </p>
                    </div>
                </div>

                {/* Controles de Empresa, Loja e Atualização */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                        <Building2 className="size-4 text-cyan-400" />
                        <select
                            value={selectedEmpresa}
                            onChange={(e) => setSelectedEmpresa(e.target.value)}
                            className="bg-transparent text-xs text-foreground font-medium outline-none cursor-pointer"
                        >
                            <option value="1" className="bg-slate-900 text-white">Empresa 1 - Matriz</option>
                            <option value="2" className="bg-slate-900 text-white">Empresa 2 - Supermercados</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                        <Store className="size-4 text-cyan-400" />
                        <select
                            value={selectedLoja}
                            onChange={(e) => setSelectedLoja(e.target.value)}
                            className="bg-transparent text-xs text-foreground font-medium outline-none cursor-pointer"
                        >
                            <option value="todas" className="bg-slate-900 text-white">Todas as Lojas</option>
                            <option value="L01" className="bg-slate-900 text-white">Loja Centro</option>
                            <option value="L02" className="bg-slate-900 text-white">Loja Jardins</option>
                            <option value="L03" className="bg-slate-900 text-white">Filial Campinas</option>
                            <option value="L04" className="bg-slate-900 text-white">Filial Santos</option>
                        </select>
                    </div>

                    <button
                        onClick={fetchData}
                        className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 transition flex items-center gap-1.5 text-xs font-semibold"
                    >
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Atualizar</span>
                    </button>
                </div>
            </div>

            {/* NAV TABS */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-2 ${
                        activeTab === 'dashboard'
                            ? 'bg-primary text-primary-foreground shadow-lg glow'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                >
                    <ShieldAlert className="size-4" />
                    <span>Painel Moderno</span>
                </button>

                <button
                    onClick={() => setActiveTab('sugestoes')}
                    className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-2 ${
                        activeTab === 'sugestoes'
                            ? 'bg-primary text-primary-foreground shadow-lg glow'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                >
                    <ShoppingBag className="size-4" />
                    <span>Sugestão de Compra</span>
                </button>

                <button
                    onClick={() => setActiveTab('estoque')}
                    className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-2 ${
                        activeTab === 'estoque'
                            ? 'bg-primary text-primary-foreground shadow-lg glow'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                >
                    <Package className="size-4" />
                    <span>Ranking &amp; Consulta 100+</span>
                </button>

                <button
                    onClick={() => setModalCadastro('produto')}
                    className="ml-auto px-4 py-2.5 rounded-xl font-semibold text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition flex items-center gap-2"
                >
                    <PlusCircle className="size-4" />
                    <span>Novo Cadastro</span>
                </button>
            </div>

            {/* KPIS HEADER SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Produtos em Risco</p>
                        <h3 className="text-2xl font-black text-red-400 mt-1">
                            {dashboardData?.kpis.totalProdutosEmRisco || 0}
                        </h3>
                        <p className="text-[10px] text-red-400/80 mt-0.5">Score Vermelho ou Laranja</p>
                    </div>
                    <div className="size-11 rounded-lg bg-red-500/20 text-red-400 grid place-items-center">
                        <AlertTriangle className="size-6" />
                    </div>
                </div>

                <div className="glass-card p-4 rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Produtos Críticos</p>
                        <h3 className="text-2xl font-black text-orange-400 mt-1">
                            {dashboardData?.kpis.totalProdutosCriticos || 0}
                        </h3>
                        <p className="text-[10px] text-orange-400/80 mt-0.5">Sem estoque ou término iminente</p>
                    </div>
                    <div className="size-11 rounded-lg bg-orange-500/20 text-orange-400 grid place-items-center">
                        <Clock className="size-6" />
                    </div>
                </div>

                <div className="glass-card p-4 rounded-xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-transparent flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Produtos sem Movimentação</p>
                        <h3 className="text-2xl font-black text-yellow-400 mt-1">
                            {dashboardData?.kpis.totalProdutosSemMovimentacao || 0}
                        </h3>
                        <p className="text-[10px] text-yellow-400/80 mt-0.5">0 vendas em 30 dias com estoque</p>
                    </div>
                    <div className="size-11 rounded-lg bg-yellow-500/20 text-yellow-400 grid place-items-center">
                        <Package className="size-6" />
                    </div>
                </div>

                <div className="glass-card p-4 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Valor das Rupturas Previstas</p>
                        <h3 className="text-2xl font-black text-emerald-400 mt-1">
                            R$ {(dashboardData?.kpis.valorFinanceiroRupturas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <p className="text-[10px] text-emerald-400/80 mt-0.5">Custo estimado para reposição</p>
                    </div>
                    <div className="size-11 rounded-lg bg-emerald-500/20 text-emerald-400 grid place-items-center">
                        <DollarSign className="size-6" />
                    </div>
                </div>
            </div>

            {/* TAB CONTENT: DASHBOARD */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {/* CHARTS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Ruptura por Categoria */}
                        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <TrendingUp className="size-4 text-cyan-400" />
                                Rupturas em Risco por Categoria
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dashboardData?.graficos.rupturaPorCategoria || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                        <XAxis dataKey="categoria" stroke="#888888" fontSize={11} />
                                        <YAxis stroke="#888888" fontSize={11} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                        />
                                        <Bar dataKey="em_risco" name="Produtos em Risco" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="total_produtos" name="Total Produtos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Consumo Diário */}
                        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Clock className="size-4 text-emerald-400" />
                                Consumo Médio Diário Agregado (Unidades/Dia)
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dashboardData?.graficos.consumoDiario || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                        <XAxis dataKey="categoria" stroke="#888888" fontSize={11} />
                                        <YAxis stroke="#888888" fontSize={11} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                        />
                                        <Line type="monotone" dataKey="consumo_diario" name="CMD" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* RANKINGS GRID: LOJA & FORNECEDOR */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Ranking por Loja */}
                        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Store className="size-4 text-orange-400" />
                                Ranking de Ruptura por Loja
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-black/30 text-muted-foreground uppercase text-[10px]">
                                        <tr>
                                            <th className="p-2.5">Loja</th>
                                            <th className="p-2.5">Itens em Risco</th>
                                            <th className="p-2.5">Valor Sugerido</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {dashboardData?.rankings.rankingLojas.map((l, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition">
                                                <td className="p-2.5 font-medium text-foreground">{l.loja}</td>
                                                <td className="p-2.5 font-bold text-red-400">{l.em_risco} de {l.total_itens}</td>
                                                <td className="p-2.5 font-semibold text-emerald-400">
                                                    R$ {l.valor_sugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Ranking por Fornecedor */}
                        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Truck className="size-4 text-cyan-400" />
                                Ranking de Ruptura por Fornecedor
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-black/30 text-muted-foreground uppercase text-[10px]">
                                        <tr>
                                            <th className="p-2.5">Fornecedor</th>
                                            <th className="p-2.5">Lead Time</th>
                                            <th className="p-2.5">Produtos em Risco</th>
                                            <th className="p-2.5">Valor Estimado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {dashboardData?.rankings.rankingFornecedores.map((f, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition">
                                                <td className="p-2.5 font-medium text-foreground">{f.fornecedor}</td>
                                                <td className="p-2.5 text-muted-foreground">{f.lead_time_dias} dias</td>
                                                <td className="p-2.5 font-bold text-red-400">{f.em_risco}</td>
                                                <td className="p-2.5 font-semibold text-emerald-400">
                                                    R$ {f.valor_sugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: SUGESTÕES DE COMPRA */}
            {activeTab === 'sugestoes' && (
                <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2">
                        <div>
                            <h3 className="text-base font-bold text-foreground">Lista Automatizada de Sugestão de Compras</h3>
                            <p className="text-xs text-muted-foreground">Calculado com base no Consumo Médio Diário, Lead Time e Estoque de Segurança</p>
                        </div>
                        <button
                            onClick={() => exportToCSV(
                                estoqueCompleto.filter(i => i.quantidade_sugerida > 0).map(i => ({
                                    Produto: i.descricao,
                                    Fornecedor: i.fornecedor,
                                    QtdSugerida: i.quantidade_sugerida,
                                    ValorEstimado: i.valor_sugerido,
                                    DataIdealCompra: i.data_ideal_compra,
                                    PrevisaoTerminoEstoque: i.previsao_termino
                                })),
                                'Sugestao_De_Compras'
                            )}
                            className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition text-xs font-semibold flex items-center gap-1.5"
                        >
                            <FileSpreadsheet className="size-4" />
                            <span>Exportar Excel</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-black/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="p-3">Produto</th>
                                    <th className="p-3">Fornecedor</th>
                                    <th className="p-3">Estoque Atual</th>
                                    <th className="p-3">CMD (Dia)</th>
                                    <th className="p-3">Qtd Sugerida</th>
                                    <th className="p-3">Valor Estimado</th>
                                    <th className="p-3">Data Ideal Compra</th>
                                    <th className="p-3">Previsão Término</th>
                                    <th className="p-3">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-sans">
                                {estoqueCompleto.filter(i => i.quantidade_sugerida > 0).map((item, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition">
                                        <td className="p-3 font-semibold text-foreground">
                                            {item.descricao}
                                            <div className="text-[10px] text-muted-foreground font-mono">{item.codigo_produto}</div>
                                        </td>
                                        <td className="p-3 text-cyan-300 font-medium">{item.fornecedor}</td>
                                        <td className="p-3 font-bold">{item.estoque_atual} un</td>
                                        <td className="p-3 text-emerald-400">{item.consumo_medio_diario.toFixed(2)}</td>
                                        <td className="p-3 font-black text-cyan-400 text-sm">{item.quantidade_sugerida} un</td>
                                        <td className="p-3 font-bold text-emerald-400">
                                            R$ {item.valor_sugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 font-medium text-orange-300">{item.data_ideal_compra || 'Imediata'}</td>
                                        <td className="p-3 text-red-400">{item.previsao_termino || 'Esgotado'}</td>
                                        <td className="p-3">{getScoreBadge(item.score_risco)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ESTOQUE COMPLETO & RANKING 100 */}
            {(activeTab === 'estoque' || activeTab === 'dashboard') && (
                <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <h3 className="text-base font-bold text-foreground">Ranking dos 100 Produtos com Maior Risco de Ruptura</h3>

                        {/* BUSCA E FILTRO POR RISCO */}
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar por nome, código, categoria..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:border-cyan-500 transition"
                                />
                            </div>

                            <select
                                value={filterRisco}
                                onChange={(e) => setFilterRisco(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer"
                            >
                                <option value="" className="bg-slate-900">Todos os Scores</option>
                                <option value="Vermelho" className="bg-slate-900">🔴 Vermelho (&lt;4 dias)</option>
                                <option value="Laranja" className="bg-slate-900">🟠 Laranja (4-7 dias)</option>
                                <option value="Amarelo" className="bg-slate-900">🟡 Amarelo (8-15 dias)</option>
                                <option value="Verde" className="bg-slate-900">🟢 Verde (&gt;15 dias)</option>
                            </select>

                            <button
                                onClick={() => exportToCSV(estoqueCompleto, 'Relatorio_Rupturas_Completo')}
                                className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition text-xs font-semibold flex items-center gap-1"
                            >
                                <FileSpreadsheet className="size-4" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-black/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="p-3">Código</th>
                                    <th className="p-3">Descrição / Marca</th>
                                    <th className="p-3">Categoria</th>
                                    <th className="p-3">Loja</th>
                                    <th className="p-3">Estoque</th>
                                    <th className="p-3">CMD</th>
                                    <th className="p-3">Dias Estoque</th>
                                    <th className="p-3">Score</th>
                                    <th className="p-3">Inteligência</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-sans">
                                {paginatedItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition">
                                        <td className="p-3 font-mono text-cyan-400 font-bold">{item.codigo_produto}</td>
                                        <td className="p-3">
                                            <div className="font-semibold text-foreground">{item.descricao}</div>
                                            <div className="text-[10px] text-muted-foreground">{item.marca} | Forn: {item.fornecedor}</div>
                                        </td>
                                        <td className="p-3 text-muted-foreground">{item.categoria}</td>
                                        <td className="p-3 font-medium text-blue-300">{item.loja}</td>
                                        <td className="p-3 font-bold">{item.estoque_atual} un</td>
                                        <td className="p-3 text-emerald-400">{item.consumo_medio_diario.toFixed(2)}</td>
                                        <td className="p-3 font-black text-sm">{item.dias_estoque.toFixed(1)} dias</td>
                                        <td className="p-3">{getScoreBadge(item.score_risco)}</td>
                                        <td className="p-3 space-y-1">
                                            {item.insights.map((ins, i) => (
                                                <span 
                                                    key={i} 
                                                    title={ins.descricao}
                                                    className="inline-block mr-1 px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 border border-white/10 text-cyan-200 cursor-help"
                                                >
                                                    ⚡ {ins.titulo}
                                                </span>
                                            ))}
                                            {item.insights.length === 0 && <span className="text-muted-foreground text-[10px]">-</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINAÇÃO */}
                    <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground border-t border-white/10">
                        <div>Exibindo {paginatedItems.length} de {estoqueCompleto.length} produtos</div>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="p-1.5 rounded-lg bg-black/40 border border-white/10 disabled:opacity-30 hover:bg-white/5"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            <span className="font-bold text-foreground">{currentPage} / {totalPages}</span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="p-1.5 rounded-lg bg-black/40 border border-white/10 disabled:opacity-30 hover:bg-white/5"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
