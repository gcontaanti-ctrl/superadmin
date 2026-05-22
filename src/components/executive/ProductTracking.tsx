import { useState, useEffect } from "react";
import { Search, ShoppingCart, Package, DollarSign, Calendar, User, FileText, Barcode, Check, ListFilter, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export function ProductTracking({ selectedStore }: { selectedStore: string }) {
  const [activeTab, setActiveTab] = useState<"individual" | "geral">("individual");

  // --- Estados do Rastreamento Individual ---
  const [query, setQuery] = useState("506095");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [compradorId, setCompradorId] = useState("");
  const [compradores, setCompradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [trackingData, setTrackingData] = useState<any>(null);

  // --- Estados do Relatório Geral de Pedidos ---
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [secoes, setSecoes] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [subgrupos, setSubgrupos] = useState<any[]>([]);

  // Filtros selecionados para Relatório Geral
  const [filterComprador, setFilterComprador] = useState("");
  const [filterFornecedor, setFilterFornecedor] = useState("");
  const [filterMarca, setFilterMarca] = useState("");
  const [filterSecao, setFilterSecao] = useState("");
  const [filterGrupo, setFilterGrupo] = useState("");
  const [filterSubgrupo, setFilterSubgrupo] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  const [pedidosItens, setPedidosItens] = useState<any[]>([]);
  const [loadingGeral, setLoadingGeral] = useState(false);

  // Carregar dados auxiliares ao iniciar
  useEffect(() => {
    // Compradores
    fetch("/api/compradores")
      .then(res => res.json())
      .then(data => {
        if (!data.error) setCompradores(data);
      })
      .catch(() => console.error("Erro ao carregar compradores"));

    // Fornecedores
    fetch("/api/fornecedores")
      .then(res => res.json())
      .then(data => {
        if (!data.error) setFornecedores(data);
      })
      .catch(() => console.error("Erro ao carregar fornecedores"));

    // Marcas
    fetch("/api/marcas")
      .then(res => res.json())
      .then(data => {
        if (!data.error) setMarcas(data);
      })
      .catch(() => console.error("Erro ao carregar marcas"));

    // Seções
    fetch("/api/secoes")
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSecoes(data);
      })
      .catch(() => console.error("Erro ao carregar seções"));
  }, []);

  // Carregar Grupos quando Seção mudar
  useEffect(() => {
    if (!filterSecao) {
      setGrupos([]);
      setFilterGrupo("");
      return;
    }
    fetch(`/api/grupos?secaoId=${filterSecao}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setGrupos(data);
      })
      .catch(() => console.error("Erro ao carregar grupos"));
  }, [filterSecao]);

  // Carregar Subgrupos quando Grupo mudar
  useEffect(() => {
    if (!filterGrupo) {
      setSubgrupos([]);
      setFilterSubgrupo("");
      return;
    }
    fetch(`/api/subgrupos?grupoId=${filterGrupo}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSubgrupos(data);
      })
      .catch(() => console.error("Erro ao carregar subgrupos"));
  }, [filterGrupo]);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setSearchResults(null);
    setTrackingData(null);
    try {
      const res = await fetch(`/api/rastreamento-busca?query=${query}`);
      if (!res.ok) {
        throw new Error("Termo não encontrado");
      }
      const json = await res.json();
      
      if (json.type === 'produto') {
        fetchTracking(json.idProduto);
      } else {
        setSearchResults(json);
        let msg = `${json.produtos.length} produtos encontrados. Escolha um para rastrear.`;
        if (json.type === 'pedido') msg = `${json.produtos.length} produtos encontrados no Pedido. Escolha um para rastrear.`;
        else if (json.type === 'nota') msg = `${json.produtos.length} produtos encontrados na Nota. Escolha um para rastrear.`;
        toast.info(msg);
      }
    } catch (error: any) {
      toast.error("Busca falhou: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTracking = async (idProduto: number) => {
    setLoading(true);
    try {
      let url = `/api/rastreamento-produto?idProduto=${idProduto}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (compradorId) url += `&compradorId=${compradorId}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.error) {
        toast.error("Erro no rastreamento: " + json.error);
      } else {
        setTrackingData(json);
        toast.success(`Rastreando: ${json.nomeProduto}`);
      }
    } catch (error) {
      toast.error("Erro de conexão ao banco.");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchGeral = async () => {
    setLoadingGeral(true);
    try {
      let url = `/api/pedidos-compra-itens?1=1`;
      if (filterComprador) url += `&compradorId=${filterComprador}`;
      if (filterFornecedor) url += `&fornecedorId=${filterFornecedor}`;
      if (filterMarca) url += `&marca=${encodeURIComponent(filterMarca)}`;
      if (filterSecao) url += `&secaoId=${filterSecao}`;
      if (filterGrupo) url += `&grupoId=${filterGrupo}`;
      if (filterSubgrupo) url += `&subgrupoId=${filterSubgrupo}`;
      if (filterStart) url += `&startDate=${filterStart}`;
      if (filterEnd) url += `&endDate=${filterEnd}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.error) {
        toast.error("Erro ao buscar relatório: " + json.error);
      } else {
        setPedidosItens(json);
        toast.success(`${json.length} registros encontrados.`);
      }
    } catch (error) {
      toast.error("Erro de rede.");
    } finally {
      setLoadingGeral(false);
    }
  };

  const fmtCurrency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (d: string) => {
    if (!d) return "N/A";
    const date = new Date(d);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto mt-4 px-4">
      {/* Abas de Navegação */}
      <div className="flex border-b border-white/10 gap-4 mb-2">
        <button 
          onClick={() => setActiveTab("individual")}
          className={`pb-3 font-serif font-bold text-lg border-b-2 transition ${activeTab === "individual" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Linha do Tempo (Produto)
        </button>
        <button 
          onClick={() => setActiveTab("geral")}
          className={`pb-3 font-serif font-bold text-lg border-b-2 transition ${activeTab === "geral" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Painel Geral de Pedidos
        </button>
      </div>

      {activeTab === "individual" ? (
        <>
          {/* TAB 1: RASTREAMENTO INDIVIDUAL */}
          <div className="glass-strong rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
                <Search className="text-primary w-6 h-6" /> Rastreamento Completo de Produto
              </h2>
              <p className="text-sm text-slate-400">
                Busque por ID, Código de Barras, Número do Pedido ou Número da Nota. Use os filtros para refinar os resultados.
              </p>
            </div>

            {/* Linha de Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              {/* Campo de Busca */}
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Termo de Busca</label>
                <input 
                  type="text" 
                  placeholder="ID, Código de Barras, Nota ou Pedido..." 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary font-mono text-slate-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              {/* Filtro Comprador */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Comprador</label>
                <select
                  value={compradorId}
                  onChange={(e) => setCompradorId(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary text-slate-300"
                >
                  <option value="">Todos os Compradores</option>
                  {compradores.map((c: any) => (
                    <option key={c.IDUSUARIO} value={c.IDUSUARIO}>{c.NOMEUSUARIO}</option>
                  ))}
                </select>
              </div>

              {/* Botão de Pesquisa */}
              <div className="flex items-end">
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-xl transition hover:opacity-90 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {loading ? "Processando..." : "Buscar no DB2"}
                </button>
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border-t border-white/5 pt-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Data Inicial</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary text-slate-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Data Final</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary text-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Resultados de Busca Multi-produtos (Se buscou Nota ou Pedido) */}
          {searchResults && (
            <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-200">
                    {searchResults.type === 'pedido' 
                      ? `Produtos no Pedido #${searchResults.idPedido}` 
                      : searchResults.type === 'nota' 
                      ? `Produtos na Nota Fiscal #${searchResults.numeroNota}`
                      : `Produtos encontrados para "${searchResults.termoBusca}"`}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Selecione um produto para iniciar o rastreamento completo
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary font-mono">
                  {Array.from(new Set(searchResults.produtos.map((p: any) => p.IDSUBPRODUTO))).length} itens únicos
                </span>
              </div>
              
              <div className="flex flex-col divide-y divide-white/5 max-h-[350px] overflow-y-auto pr-1">
                {Array.from(new Map(searchResults.produtos.map((p: any) => [p.IDSUBPRODUTO, p])).values()).map((p: any) => (
                  <button
                    key={p.IDSUBPRODUTO}
                    onClick={() => fetchTracking(p.IDSUBPRODUTO)}
                    className="group w-full flex items-center justify-between py-3 px-2 rounded-lg hover:bg-white/[0.02] text-left transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-xs font-mono text-slate-400 bg-white/5 group-hover:bg-primary/10 group-hover:text-primary px-2.5 py-1 rounded transition-colors">
                        ID: {p.IDSUBPRODUTO}
                      </span>
                      <span className="font-medium text-sm text-slate-200 truncate group-hover:text-white transition-colors">
                        {p.DESCRICAO}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 group-hover:text-primary transition-all duration-200 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
                      Rastrear <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exibição da Timeline de Rastreamento */}
          {trackingData && (
            <div className="flex flex-col gap-8 relative mt-4">
              <div className="absolute top-10 bottom-10 left-8 w-1 bg-white/10 rounded-full z-0" />

              {/* Nome do Produto Atual */}
              <div className="glass-strong rounded-xl p-4 ml-14 text-slate-200 border-l-4 border-primary">
                <span className="text-xs text-slate-400 block font-mono">Produto Selecionado</span>
                <span className="font-serif text-lg font-bold">{trackingData.nomeProduto}</span>
              </div>

              {/* Pedido de Compra */}
              <div className="relative z-10 flex gap-6 items-start">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <ShoppingCart className="w-6 h-6 text-blue-400" />
                </div>
                <div className="glass-strong rounded-xl p-5 flex-1 hover:bg-white/[0.03] transition">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold font-serif text-blue-400">1. Pedido de Compra</h3>
                    <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded font-mono">
                      {trackingData.compra?.data ? fmtDate(trackingData.compra.data) : "Sem Data"}
                    </span>
                  </div>
                  {trackingData.compra ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Cód. Pedido</div>
                        <div className="font-semibold font-mono">{trackingData.compra.idPedido}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Qtd Solicitada</div>
                        <div className="font-semibold">{trackingData.compra.qtdSolicitada} un</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Custo Unitário</div>
                        <div className="font-semibold">{fmtCurrency(trackingData.compra.custoUnitario)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><User className="w-3 h-3"/> Comprador</div>
                        <div className="font-semibold text-emerald-400">{trackingData.compra.usuario}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 mt-2">Nenhum pedido de compra encontrado para este período/filtros.</div>
                  )}
                </div>
              </div>

              {/* Entrada de Notas Fiscais (Múltiplas por Loja) */}
              <div className="relative z-10 flex gap-6 items-start">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <Package className="w-6 h-6 text-amber-400" />
                </div>
                <div className="glass-strong rounded-xl p-5 flex-1 hover:bg-white/[0.03] transition">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold font-serif text-amber-400">2. Entradas por Loja (Nota Fiscal)</h3>
                    <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded">
                      {trackingData.entradasPorLoja?.length || 0} Registradas
                    </span>
                  </div>
                  
                  {/* Cálculo de atendimento do pedido */}
                  {(() => {
                    if (!trackingData.compra || !trackingData.entradasPorLoja) return null;
                    const totalSolicitada = trackingData.compra.qtdSolicitada || 0;
                    const totalEntregue = trackingData.entradasPorLoja.reduce((acc: number, cur: any) => acc + (parseFloat(cur.QTDPRODUTO) || 0), 0);
                    const pctFulfillment = totalSolicitada > 0 ? (totalEntregue / totalSolicitada) * 100 : 0;
                    
                    let statusLabel = "";
                    let badgeColor = "";
                    if (totalEntregue === totalSolicitada) {
                      statusLabel = "✅ Qtd Atendida Integralmente";
                      badgeColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                    } else if (totalEntregue < totalSolicitada) {
                      statusLabel = `⚠️ Parcial (Faltando ${totalSolicitada - totalEntregue} un)`;
                      badgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                    } else {
                      statusLabel = `⚠️ Excesso (+${totalEntregue - totalSolicitada} un entregues)`;
                      badgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                    }

                    return (
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mt-3 mb-5">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">RESUMO DE CONFORMIDADE DE QUANTIDADE</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${badgeColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                          <span>Total Solicitada no Pedido: <strong>{totalSolicitada} un</strong></span>
                          <span>Total Recebida nas Notas: <strong>{totalEntregue} un</strong></span>
                        </div>
                        
                        {/* Barra de progresso */}
                        <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/5">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              pctFulfillment === 100 
                                ? "bg-emerald-500" 
                                : pctFulfillment > 100 
                                ? "bg-rose-500" 
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(100, pctFulfillment)}%` }}
                          />
                        </div>
                        <div className="text-right text-[10px] text-slate-400 mt-1 font-mono">
                          {pctFulfillment.toFixed(1)}% do pedido atendido
                        </div>
                      </div>
                    );
                  })()}

                  {trackingData.entradasPorLoja && trackingData.entradasPorLoja.length > 0 ? (
                    <div className="flex flex-col gap-4 mt-4">
                      {trackingData.entradasPorLoja.map((nota: any, i: number) => {
                        const precoPedido = parseFloat(trackingData.compra?.custoUnitario) || 0;
                        const precoNota = parseFloat(nota.VALUNITARIO) || 0;
                        const difPreco = precoNota - precoPedido;
                        const pctPreco = precoPedido > 0 ? (difPreco / precoPedido) * 100 : 0;

                        return (
                          <div key={i} className="bg-black/30 border border-white/5 rounded-lg p-4 flex flex-col gap-3 text-sm">
                            
                            {/* Linha Principal da Nota */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="col-span-2 md:col-span-1">
                                <div className="text-xs text-slate-400">Loja</div>
                                <div className="font-bold text-amber-400">{nota.LOJA || `ID: ${nota.IDEMPRESA}`}</div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-400">Nota Fiscal</div>
                                <div className="font-semibold font-mono text-xs" title={`Planilha ID: ${nota.IDPLANILHA}`}>
                                  #{nota.NOTA_FISCAL || nota.IDPLANILHA}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-400">Entrada (Data/Hora)</div>
                                <div className="font-semibold text-xs">{fmtDate(nota.DATA_ENTRADA)} {nota.HREMISSAO || ""}</div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-400">Usuário Entrada</div>
                                <div className="font-semibold text-xs text-slate-300 truncate" title={nota.USUARIO_ENTRADA}>
                                  {nota.USUARIO_ENTRADA || `ID: ${nota.IDAUTORIZADO}`}
                                </div>
                              </div>
                            </div>

                            {/* Seção Comparativa (Se houver Pedido de Compra) */}
                            {trackingData.compra && (
                              <div className="border-t border-white/5 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/[0.01] -mx-4 -mb-4 p-4 rounded-b-lg">
                                {/* Comparativo de Quantidade da Nota */}
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">COMPARAÇÃO DE QUANTIDADE (LOJA)</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="font-mono text-xs font-semibold bg-black/40 px-2 py-0.5 rounded border border-white/5 text-slate-300">
                                      Pedido: {trackingData.compra.qtdSolicitada} un
                                    </span>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-mono text-xs font-semibold bg-black/40 px-2 py-0.5 rounded border border-white/5 text-amber-400">
                                      Chegou: {parseFloat(nota.QTDPRODUTO)} un
                                    </span>
                                  </div>
                                </div>

                                {/* Comparativo de Preço da Nota */}
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">COMPARAÇÃO DE PREÇO (CUSTO UNITÁRIO)</span>
                                  <div className="flex items-center flex-wrap gap-2 mt-1">
                                    <span className="font-mono text-xs bg-black/40 px-2 py-0.5 rounded border border-white/5 text-slate-300">
                                      Ped: {fmtCurrency(precoPedido)}
                                    </span>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-mono text-xs bg-black/40 px-2 py-0.5 rounded border border-white/5 text-amber-400">
                                      Nota: {fmtCurrency(precoNota)}
                                    </span>
                                    
                                    {/* Indicador de divergência de preço */}
                                    {precoNota === precoPedido ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        Preço Correto
                                      </span>
                                    ) : difPreco > 0 ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20" title={`Preço na Nota está ${difPreco.toFixed(2)} maior`}>
                                        ❌ +{fmtCurrency(difPreco)} (+{pctPreco.toFixed(1)}%)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title={`Preço na Nota está ${Math.abs(difPreco).toFixed(2)} menor`}>
                                        📉 -{fmtCurrency(Math.abs(difPreco))} (-{Math.abs(pctPreco).toFixed(1)}%)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 mt-2">Nenhuma nota de entrada vinculada encontrada para este período.</div>
                  )}
                </div>
              </div>

              {/* Vendas Finais e Margem */}
              <div className="relative z-10 flex gap-6 items-start">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="glass-strong rounded-xl p-5 flex-1 hover:bg-white/[0.03] transition">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold font-serif text-emerald-400">3. Vendas Finais & Margem de Lucro</h3>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">
                      Período Filtrado
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div className="bg-white/5 p-3 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">Qtd Total Vendida</div>
                      <div className="font-semibold text-lg">{trackingData.vendas.qtdVendida} un</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">Receita Gerada</div>
                      <div className="font-semibold text-lg text-primary">{fmtCurrency(trackingData.vendas.receitaTotal)}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">Margem (R$)</div>
                      <div className={`font-semibold text-lg ${trackingData.vendas.margemReais > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmtCurrency(trackingData.vendas.margemReais)}
                      </div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">Margem (%)</div>
                      <div className={`font-semibold text-lg ${trackingData.vendas.margemPercentual > 20 ? 'text-emerald-400' : trackingData.vendas.margemPercentual > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                        {trackingData.vendas.margemPercentual.toFixed(2)}%
                  </div>
                    </div>
                  </div>
                  
                  {trackingData.vendas.porLoja && trackingData.vendas.porLoja.length > 0 && (
                    <div className="mt-6 border-t border-white/10 pt-4">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Distribuição de Vendas por Loja</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {trackingData.vendas.porLoja.map((loja: any, i: number) => (
                          <div key={i} className="flex justify-between items-center bg-black/20 p-2 rounded text-sm">
                            <span className="truncate pr-2 text-slate-300" title={loja.LOJA}>{loja.LOJA || `Loja ${loja.IDEMPRESA}`}</span>
                            <span className="font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">{loja.QTD} un</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* TAB 2: RELATÓRIO GERAL DE PEDIDOS */
        <div className="flex flex-col gap-6">
          <div className="glass-strong rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
                <ListFilter className="text-primary w-6 h-6" /> Relatório Geral de Compras e Notas
              </h2>
              <p className="text-sm text-slate-400">
                Filtre os pedidos por comprador, fornecedor, marcas, hierarquias de seções e veja as notas vinculadas.
              </p>
            </div>

            {/* Linha de Filtros Principais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              {/* Comprador */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Comprador</label>
                <select
                  value={filterComprador}
                  onChange={(e) => setFilterComprador(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary text-slate-300"
                >
                  <option value="">Todos</option>
                  {compradores.map((c: any) => (
                    <option key={c.IDUSUARIO} value={c.IDUSUARIO}>{c.NOMEUSUARIO}</option>
                  ))}
                </select>
              </div>

              {/* Fornecedor */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Fornecedor</label>
                <select
                  value={filterFornecedor}
                  onChange={(e) => setFilterFornecedor(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary text-slate-300 truncate"
                >
                  <option value="">Todos</option>
                  {fornecedores.map((f: any) => (
                    <option key={f.IDCLIFOR} value={f.IDCLIFOR}>{f.NOME}</option>
                  ))}
                </select>
              </div>

              {/* Marca */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Marca</label>
                <select
                  value={filterMarca}
                  onChange={(e) => setFilterMarca(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary text-slate-300"
                >
                  <option value="">Todas</option>
                  {marcas.map((m: string) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Data Inicial */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Data Registro Pedido (De)</label>
                <input 
                  type="date" 
                  value={filterStart}
                  onChange={(e) => setFilterStart(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary text-slate-300"
                />
              </div>
            </div>

            {/* Hierarquia de Produtos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm border-t border-white/5 pt-3">
              {/* Seção */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Seção</label>
                <select
                  value={filterSecao}
                  onChange={(e) => setFilterSecao(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary text-slate-300"
                >
                  <option value="">Todas</option>
                  {secoes.map((s: any) => (
                    <option key={s.IDSECAO} value={s.IDSECAO}>{s.DESCRSECAO}</option>
                  ))}
                </select>
              </div>

              {/* Grupo */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Grupo</label>
                <select
                  value={filterGrupo}
                  onChange={(e) => setFilterGrupo(e.target.value)}
                  disabled={!filterSecao}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary text-slate-300 disabled:opacity-50"
                >
                  <option value="">Todos</option>
                  {grupos.map((g: any) => (
                    <option key={g.IDGRUPO} value={g.IDGRUPO}>{g.DESCRGRUPO}</option>
                  ))}
                </select>
              </div>

              {/* Subgrupo */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Subgrupo</label>
                <select
                  value={filterSubgrupo}
                  onChange={(e) => setFilterSubgrupo(e.target.value)}
                  disabled={!filterGrupo}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary text-slate-300 disabled:opacity-50"
                >
                  <option value="">Todos</option>
                  {subgrupos.map((sg: any) => (
                    <option key={sg.IDSUBGRUPO} value={sg.IDSUBGRUPO}>{sg.DESCRSUBGRUPO}</option>
                  ))}
                </select>
              </div>

              {/* Data Final e Botão de Filtro */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Data Registro Pedido (Até)</label>
                <input 
                  type="date" 
                  value={filterEnd}
                  onChange={(e) => setFilterEnd(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary text-slate-300"
                />
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <button 
                onClick={handleFetchGeral}
                disabled={loadingGeral}
                className="bg-primary text-primary-foreground font-semibold px-8 py-2.5 rounded-xl transition hover:opacity-90 shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
              >
                {loadingGeral ? "Buscando..." : "Filtrar Pedidos"}
              </button>
            </div>
          </div>

          {/* Tabela de Resultados */}
          <div className="glass-strong rounded-2xl p-6 overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/15 text-slate-400 font-semibold">
                  <th className="py-3 px-2">Pedido / Registro</th>
                  <th className="py-3 px-2">Comprador</th>
                  <th className="py-3 px-2">Fornecedor</th>
                  <th className="py-3 px-2">Produto / Marca</th>
                  <th className="py-3 px-2">Hierarquia</th>
                  <th className="py-3 px-2 text-right">Qtd / Unitário</th>
                  <th className="py-3 px-2">Nota de Entrada Vinculada</th>
                  <th className="py-3 px-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {pedidosItens.length > 0 ? (
                  pedidosItens.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-2">
                        <span className="font-bold text-blue-400 font-mono block">#{item.IDPEDIDO}</span>
                        <span className="text-xs text-slate-400">{fmtDate(item.DATA_REGISTRO_PEDIDO)} {item.HORA_REGISTRO_PEDIDO}</span>
                      </td>
                      <td className="py-3 px-2 font-medium text-emerald-400">{item.COMPRADOR}</td>
                      <td className="py-3 px-2 max-w-[180px] truncate" title={item.FORNECEDOR}>{item.FORNECEDOR}</td>
                      <td className="py-3 px-2 max-w-[200px]">
                        <span className="block truncate font-medium text-slate-100" title={item.PRODUTO}>{item.PRODUTO}</span>
                        <span className="text-xs text-slate-400 block font-mono">EAN: {item.IDSUBPRODUTO} | Marca: {item.MARCA || "N/A"}</span>
                      </td>
                      <td className="py-3 px-2 text-xs text-slate-400">
                        <span className="block">{item.SECAO}</span>
                        <span className="block text-[10px] text-slate-500">{item.GRUPO} &gt; {item.SUBGRUPO}</span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="font-semibold block">{parseFloat(item.QTDSOLICITADA)} un</span>
                        <span className="text-xs text-slate-400 block">{fmtCurrency(parseFloat(item.VALUNITARIO))}</span>
                      </td>
                      <td className="py-3 px-2">
                        {item.NOTA_FISCAL ? (
                          <div className="text-xs">
                            <span className="font-bold text-amber-400 block">Nota: #{item.NOTA_FISCAL}</span>
                            <span className="text-slate-400 block">{fmtDate(item.DATA_ENTRADA_NOTA)} {item.HORA_ENTRADA_NOTA}</span>
                            <span className="text-slate-500 text-[10px] block">Por: {item.USUARIO_ENTRADA_NOTA}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Sem Nota Vinculada</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <button 
                          onClick={() => {
                            setQuery(item.IDSUBPRODUTO.toString());
                            fetchTracking(item.IDSUBPRODUTO);
                            setActiveTab("individual");
                          }}
                          className="bg-primary/20 text-primary-foreground text-xs hover:bg-primary/30 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                        >
                          Ver Linha do Tempo <ArrowRight className="w-3 h-3"/>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                      Nenhum item de pedido encontrado. Ajuste os filtros acima e clique em "Filtrar Pedidos".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

