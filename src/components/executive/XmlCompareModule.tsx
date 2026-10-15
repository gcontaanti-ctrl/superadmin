import { useState, useEffect } from "react";
import { 
  FileText, Upload, CheckCircle2, AlertTriangle, XCircle, Search, 
  ArrowRight, DollarSign, Package, Calendar, User, Eye, ShieldAlert,
  Loader2, Check, Copy, Clock, Inbox, Maximize2, Minimize2, FileWarning, ShoppingBag,
  Printer
} from "lucide-react";
import { toast } from "sonner";

interface XmlNfeData {
  supplierCnpj: string;
  supplierName: string;
  invoiceNumber: string;
  emissionDate: string;
  items: any[];
}

interface XmlCompareModuleProps {
  isFullscreen?: boolean;
  setIsFullscreen?: (val: boolean) => void;
}

export function XmlCompareModule({ isFullscreen = false, setIsFullscreen }: XmlCompareModuleProps) {
  const [xmlContent, setXmlContent] = useState<string>("");
  const [printData, setPrintData] = useState<{ storeName: string; items: any[] } | null>(null);

  useEffect(() => {
    if (printData) {
      const timer = setTimeout(() => {
        window.print();
        setPrintData(null);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [printData]);

  const [fileName, setFileName] = useState<string>("");
  const [nfeData, setNfeData] = useState<XmlNfeData | null>(null);
  const [idPedido, setIdPedido] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [comparedItems, setComparedItems] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);

  // New States for today's and pending notes
  const [activeTab, setActiveTab] = useState<"compare" | "hoje" | "pendentes" | "sem-preco">("compare");
  const [hojeNotes, setHojeNotes] = useState<any[]>([]);
  const [pendentesNotes, setPendentesNotes] = useState<any[]>([]);
  const [semPrecoNotes, setSemPrecoNotes] = useState<any[]>([]);
  const [loadingHoje, setLoadingHoje] = useState<boolean>(false);
  const [loadingPendentes, setLoadingPendentes] = useState<boolean>(false);
  const [loadingSemPreco, setLoadingSemPreco] = useState<boolean>(false);
  const [buscaSemPreco, setBuscaSemPreco] = useState<string>("");
  const [diasFiltro, setDiasFiltro] = useState<number>(30);
  const [buscaPendentes, setBuscaPendentes] = useState<string>("");
  const [filtroPendentes, setFiltroPendentes] = useState<"todas" | "sem-pedido" | "com-pedido">("todas");
  const [filtroLojaSemPreco, setFiltroLojaSemPreco] = useState<string>("todas");

  // States for viewing order details
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loadingOrderItems, setLoadingOrderItems] = useState<boolean>(false);

  const fetchOrderItems = async (orderId: string) => {
    if (!orderId) return;
    setLoadingOrderItems(true);
    try {
      const res = await fetch(`/api/compras/pedido/${orderId}`);
      const data = await res.json();
      if (!data.error) {
        setOrderItems(data);
      } else {
        setOrderItems([]);
      }
    } catch (err) {
      console.error(err);
      setOrderItems([]);
    } finally {
      setLoadingOrderItems(false);
    }
  };


  const fetchHojeNotes = async () => {
    setLoadingHoje(true);
    try {
      const res = await fetch("/api/compras/notas-hoje");
      const data = await res.json();
      if (!data.error) setHojeNotes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHoje(false);
    }
  };

  const fetchPendentesNotes = async () => {
    setLoadingPendentes(true);
    try {
      const res = await fetch("/api/compras/notas-pendentes");
      const data = await res.json();
      if (!data.error) setPendentesNotes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPendentes(false);
    }
  };

  const handleLoadXmlFromDb = async (params: { idPlanilha?: number; chaveNfe?: string; idPedido?: string }) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (params.idPlanilha) queryParams.set("idPlanilha", String(params.idPlanilha));
      if (params.chaveNfe) queryParams.set("chaveNfe", params.chaveNfe);

      const res = await fetch(`/api/compras/nota-xml?${queryParams.toString()}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const xml = data.xml;
      setXmlContent(xml);
      setFileName(`Nota_${params.idPlanilha || params.chaveNfe || "NFe"}.xml`);

      // Parse XML on backend
      const parseRes = await fetch("/api/compras/compare-xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml })
      });
      const parseData = await parseRes.json();
      if (parseData.error) throw new Error(parseData.error);

      setNfeData(parseData.nfe);
      
      if (params.idPedido) {
        setIdPedido(params.idPedido);
        const compareRes = await fetch("/api/compras/compare-xml", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xml, idPedido: params.idPedido })
        });
        const compareData = await compareRes.json();
        if (!compareData.error) {
          setComparedItems(compareData.comparedItems || []);
          toast.success("XML carregado e comparação realizada com sucesso!");
        } else {
          toast.success("XML carregado! Insira o pedido para comparar.");
        }
      } else {
        toast.success("XML carregado com sucesso!");
        fetchRecentOrders(parseData.nfe.supplierCnpj);
      }

      setActiveTab("compare");
    } catch (err: any) {
      toast.error("Erro ao carregar XML: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSemPrecoNotes = async (dias = diasFiltro) => {
    setLoadingSemPreco(true);
    try {
      const today = new Date();
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - dias);
      
      const startStr = pastDate.toISOString().substring(0, 10);
      const endStr = today.toISOString().substring(0, 10);

      const res = await fetch(`/api/gerencial/notas-sem-preco?startDate=${startStr}&endDate=${endStr}`);
      const data = await res.json();
      if (!data.error) {
        setSemPrecoNotes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSemPreco(false);
    }
  };

  useEffect(() => {
    fetchHojeNotes();
    fetchPendentesNotes();
    fetchSemPrecoNotes(diasFiltro);
  }, []);

  useEffect(() => {
    fetchSemPrecoNotes(diasFiltro);
  }, [diasFiltro]);

  useEffect(() => {
    if (idPedido) {
      fetchOrderItems(idPedido);
    } else {
      setOrderItems([]);
    }
  }, [idPedido]);



  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setXmlContent(content);
      
      // Parse initial metadata on backend
      setLoading(true);
      try {
        const res = await fetch("/api/compras/compare-xml", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xml: content })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setNfeData(data.nfe);
        toast.success("XML carregado e analisado!");
        
        // Fetch recent orders for this CNPJ
        fetchRecentOrders(data.nfe.supplierCnpj);
      } catch (err: any) {
        toast.error("Erro ao analisar XML: " + err.message);
        setNfeData(null);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const fetchRecentOrders = async (cnpj: string) => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/compras/pedidos-fornecedor?cnpj=${encodeURIComponent(cnpj)}`);
      const data = await res.json();
      if (!data.error) {
        setRecentOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCompare = async (orderId: string = idPedido) => {
    if (!orderId) {
      toast.error("Informe o ID do Pedido de Compra para comparar.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/compras/compare-xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml: xmlContent, idPedido: orderId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setComparedItems(data.comparedItems || []);
      toast.success("Comparação realizada com sucesso!");
      
      // Also load order items detail
      fetchOrderItems(orderId);
    } catch (err: any) {
      toast.error("Erro ao comparar pedido: " + err.message);
      setComparedItems([]);
    } finally {
      setLoading(false);
    }
  };


  const fmtCurrency = (v: number) =>
    (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtNum = (v: number) =>
    (v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

  // Summary Metrics
  const totalXmlPrice = comparedItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
  const totalPoPrice = comparedItems.reduce((acc, item) => acc + ((item.poItem?.quantity * item.poItem?.unitPrice) || 0), 0);
  const priceDifference = totalXmlPrice - totalPoPrice;
  const divergentCount = comparedItems.filter(i => i.status === "DIVERGENTE").length;
  const notInOrderCount = comparedItems.filter(i => i.status === "NOT_IN_ORDER").length;
  const missingCount = comparedItems.filter(i => i.status === "MISSING_IN_XML").length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-none mx-auto mt-4 px-4 pb-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <FileText className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-slate-100">Comparação de Nota Fiscal (XML)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Valide divergências de preços e quantidades entre a NF-e do fornecedor e o Pedido de Compra</p>
          </div>
        </div>
        
        {setIsFullscreen && (
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 text-violet-400" />
                <span>Tela Normal</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-violet-400" />
                <span>Tela Cheia</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Upload & Order Selection */}
        {activeTab === "compare" && (
          <div className="flex flex-col gap-6">
          {/* Upload Card */}
          <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">1. Carregar XML do Fornecedor</h3>
            
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-violet-500/50 rounded-xl p-8 cursor-pointer transition-all hover:bg-white/[0.01]">
              <Upload className="w-8 h-8 text-slate-400 mb-3 animate-pulse" />
              <span className="text-sm font-semibold text-slate-200">Selecionar arquivo XML</span>
              <span className="text-xs text-slate-500 mt-1">Clique para procurar no computador</span>
              <input 
                type="file" 
                accept=".xml" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>

            {fileName && (
              <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-lg border border-white/5 text-xs text-slate-300">
                <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="truncate flex-1">{fileName}</span>
              </div>
            )}
          </div>

          {/* NF-e Metadata */}
          {nfeData && (
            <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Dados extraídos da NF-e</h3>
              
              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex flex-col bg-black/20 p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-500">Fornecedor</span>
                  <span className="font-semibold text-slate-200 mt-0.5">{nfeData.supplierName}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">CNPJ: {nfeData.supplierCnpj}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                    <span className="text-slate-500">Número da NF-e</span>
                    <span className="font-mono font-semibold text-slate-200 block mt-0.5">{nfeData.invoiceNumber}</span>
                  </div>
                  <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                    <span className="text-slate-500">Data de Emissão</span>
                    <span className="font-semibold text-slate-200 block mt-0.5">{nfeData.emissionDate}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selecionar Pedido de Compra */}
          <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">2. Selecionar Pedido de Compra</h3>
            
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="ID do Pedido (Ex: 11002)" 
                value={idPedido}
                onChange={e => setIdPedido(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 font-mono"
              />
              <button 
                onClick={() => handleCompare()}
                disabled={loading || !xmlContent}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl transition text-xs flex items-center gap-1.5"
                title={!xmlContent ? "Carregue o XML antes de comparar" : "Iniciar comparação"}
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Comparar
              </button>
            </div>

            {/* Recent Orders for CNPJ */}
            {recentOrders.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Pedidos recentes deste fornecedor</span>
                <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
                  {recentOrders.map(order => (
                    <div 
                      key={order.IDPEDIDO}
                      onClick={() => {
                        setIdPedido(String(order.IDPEDIDO));
                        if (xmlContent) handleCompare(String(order.IDPEDIDO));
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all text-xs cursor-pointer ${
                        idPedido === String(order.IDPEDIDO)
                          ? "bg-violet-500/10 border-violet-500"
                          : "bg-black/20 border-white/5 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">Pedido #{order.IDPEDIDO}</span>
                        <span className="text-[10px] text-slate-500">Data: {new Date(order.DATA).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingOrders && (
              <div className="flex items-center gap-2 text-xs text-slate-500 justify-center py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                Buscando pedidos...
              </div>
            )}
          </div>


          {/* Order Items Detail Card */}
          {idPedido && (
            <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-violet-400" />
                  Itens do Pedido #{idPedido}
                </h3>
                <button
                  onClick={() => fetchOrderItems(idPedido)}
                  disabled={loadingOrderItems}
                  className="bg-violet-600/20 hover:bg-violet-600/35 text-violet-300 font-semibold px-2.5 py-1 rounded-lg border border-violet-500/30 transition text-[10px] flex items-center gap-1"
                >
                  {loadingOrderItems ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                  Carregar
                </button>
              </div>
              
              {loadingOrderItems ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                  Carregando itens...
                </div>
              ) : orderItems.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Clique em Carregar para visualizar os itens deste pedido.</p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto flex flex-col gap-2 pr-1">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="bg-black/25 p-2.5 rounded-lg border border-white/5 text-[11px] flex justify-between items-start">
                      <div className="flex flex-col gap-0.5 max-w-[70%]">
                        <span className="font-semibold text-slate-200 truncate" title={item.PRODUTO}>{item.PRODUTO}</span>
                        <span className="text-[9px] text-slate-500 font-mono">EAN: {item.EAN_PEDIDO || 'Sem EAN'} • Cód: {item.IDSUBPRODUTO}</span>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-mono text-slate-300">{fmtNum(item.QTD_PEDIDA)} un</span>
                        <span className="font-mono text-emerald-400 font-semibold mt-0.5">{fmtCurrency(item.PRECO_PEDIDO)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        )}


        {/* Right Side: Tabbed Panel */}
        <div className={`${activeTab === "compare" ? "lg:col-span-2" : "lg:col-span-3"} flex flex-col gap-6`}>
          {/* Tabs header */}
          <div className="flex gap-2 bg-black/25 p-1 rounded-xl border border-white/5 w-fit">
            <button
              onClick={() => setActiveTab("compare")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "compare"
                  ? "bg-violet-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Comparar XML
            </button>
            <button
              onClick={() => {
                setActiveTab("hoje");
                fetchHojeNotes();
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "hoje"
                  ? "bg-violet-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Notas de Hoje
              {hojeNotes.length > 0 && (
                <span className="bg-white/25 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {hojeNotes.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("pendentes");
                fetchPendentesNotes();
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "pendentes"
                  ? "bg-violet-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Emitidas (Não Recebidas)
              {pendentesNotes.length > 0 && (
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {pendentesNotes.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("sem-preco");
                fetchSemPrecoNotes();
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "sem-preco"
                  ? "bg-violet-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Sem Precificação
              {semPrecoNotes.length > 0 && (
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {semPrecoNotes.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === "compare" && (
            <>
              {/* Stats Bar */}
              {comparedItems.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass-strong rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Preço Total NF-e</span>
                    <span className="text-lg font-bold font-serif text-white">{fmtCurrency(totalXmlPrice)}</span>
                  </div>
                  <div className="glass-strong rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Preço Total Pedido</span>
                    <span className="text-lg font-bold font-serif text-slate-300">{fmtCurrency(totalPoPrice)}</span>
                  </div>
                  <div className="glass-strong rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Diferença Financeira</span>
                    <span className={`text-lg font-bold font-serif ${priceDifference > 0 ? "text-rose-400" : priceDifference < 0 ? "text-emerald-400" : "text-slate-400"}`}>
                      {priceDifference > 0 ? "+" : ""}{fmtCurrency(priceDifference)}
                    </span>
                  </div>
                  <div className="glass-strong rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Divergências</span>
                    <span className="text-lg font-bold font-serif flex items-center gap-1.5">
                      {divergentCount > 0 && <span className="text-amber-400">{divergentCount}</span>}
                      {notInOrderCount > 0 && <span className="text-rose-400" title="Itens adicionais na nota">+{notInOrderCount} extra</span>}
                      {missingCount > 0 && <span className="text-blue-400" title="Itens faltantes no XML">-{missingCount} falt.</span>}
                      {divergentCount === 0 && notInOrderCount === 0 && missingCount === 0 && (
                        <span className="text-emerald-400 flex items-center gap-1 text-sm"><Check className="w-4 h-4" /> 100% Batido</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Table Card */}
              <div className="glass-strong rounded-2xl overflow-hidden flex flex-col border border-white/5">
                <div className="p-5 border-b border-white/5 bg-black/20 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-slate-200">Itens e Divergências</h3>
                  {comparedItems.length > 0 && (
                    <span className="text-xs text-slate-400">{comparedItems.length} itens analisados</span>
                  )}
                </div>

                <div className="overflow-x-auto flex-1 max-h-[500px]">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-black/20 text-slate-400 font-medium text-[10px] uppercase tracking-wider border-b border-white/5">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3 text-right">Qtd NF-e</th>
                        <th className="px-4 py-3 text-right">Qtd Pedido</th>
                        <th className="px-4 py-3 text-right">Custo NF-e</th>
                        <th className="px-4 py-3 text-right">Custo Pedido</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {comparedItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-20 text-center text-slate-500">
                            <Upload className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                            <p className="font-semibold text-slate-400">Aguardando carregamento e comparação</p>
                            <p className="text-[11px] text-slate-500 mt-1">Faça o upload do XML do fornecedor na barra lateral para iniciar.</p>
                          </td>
                        </tr>
                      ) : (
                        comparedItems.map((item, idx) => {
                          const isExtra = item.status === "NOT_IN_ORDER";
                          const isMissing = item.status === "MISSING_IN_XML";
                          const isDivergent = item.status === "DIVERGENTE";
                          const hasPriceDiff = item.priceDiff !== 0;
                          const hasQtyDiff = item.qtyDiff !== 0;

                          return (
                            <tr 
                              key={idx} 
                              className={`hover:bg-white/[0.02] transition-colors ${
                                isExtra ? "bg-rose-500/[0.02]" :
                                isMissing ? "bg-blue-500/[0.02]" :
                                isDivergent ? "bg-amber-500/[0.01]" : ""
                              }`}
                            >
                              <td className="px-4 py-3 font-mono text-slate-500">{item.itemIndex || "—"}</td>
                              <td className="px-4 py-3 max-w-[240px]">
                                <div className="font-semibold text-slate-200 truncate" title={item.description}>{item.description}</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                                  <span>EAN: {item.ean || "Sem EAN"}</span>
                                  <span>•</span>
                                  <span>Cód: {item.code}</span>
                                </div>
                              </td>
                              <td className={`px-4 py-3 text-right font-mono ${isMissing ? "text-slate-600" : "text-slate-200"}`}>{isMissing ? "—" : fmtNum(item.quantity)}</td>
                              <td className={`px-4 py-3 text-right font-mono ${isExtra ? "text-slate-600" : "text-slate-400"}`}>
                                {isExtra ? "—" : fmtNum(item.poItem?.quantity)}
                                {hasQtyDiff && !isExtra && !isMissing && (
                                  <span className={`text-[10px] block font-semibold ${item.qtyDiff > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                    {item.qtyDiff > 0 ? "+" : ""}{fmtNum(item.qtyDiff)}
                                  </span>
                                )}
                              </td>
                              <td className={`px-4 py-3 text-right font-mono ${isMissing ? "text-slate-600" : "text-slate-200"}`}>{isMissing ? "—" : fmtCurrency(item.unitPrice)}</td>
                              <td className={`px-4 py-3 text-right font-mono ${isExtra ? "text-slate-600" : "text-slate-400"}`}>
                                {isExtra ? "—" : fmtCurrency(item.poItem?.unitPrice)}
                                {hasPriceDiff && !isExtra && !isMissing && (
                                  <span className={`text-[10px] block font-semibold ${item.priceDiff > 0 ? "text-rose-400 font-bold" : "text-emerald-400"}`}>
                                    {item.priceDiff > 0 ? "+" : ""}{fmtCurrency(item.priceDiff)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isExtra && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">EXTRA</span>}
                                {isMissing && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">FALTA XML</span>}
                                {isDivergent && (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    {hasPriceDiff && hasQtyDiff ? "DIVERGENTE (VALOR E QTD)" : hasPriceDiff ? "DIVERGENTE (VALOR)" : "DIVERGENTE (QTD)"}
                                  </span>
                                )}
                                {item.status === "OK" && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">OK</span>}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "hoje" && (
            <div className="glass-strong rounded-2xl overflow-hidden flex flex-col border border-white/5">
              <div className="p-5 border-b border-white/5 bg-black/20 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-200">Notas de Fornecedores Geradas Hoje</h3>
                <button 
                  onClick={fetchHojeNotes}
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
                >
                  Atualizar
                </button>
              </div>

              <div className="overflow-x-auto flex-1 max-h-[500px]">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-black/20 text-slate-400 font-medium text-[10px] uppercase tracking-wider border-b border-white/5">
                      <th className="px-4 py-3">Nota Fiscal</th>
                      <th className="px-4 py-3">Série</th>
                      <th className="px-4 py-3">Fornecedor</th>
                      <th className="px-4 py-3">CNPJ</th>
                      <th className="px-4 py-3 text-right">Valor Nota</th>
                      <th className="px-4 py-3">Data Movimento</th>
                      <th className="px-4 py-3 text-center">ID Planilha</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {loadingHoje ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-20 text-center text-slate-500">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-500 mb-3" />
                          <p>Carregando notas de hoje...</p>
                        </td>
                      </tr>
                    ) : hojeNotes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-20 text-center text-slate-500">
                          <Inbox className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                          <p className="font-semibold">Nenhuma nota encontrada hoje</p>
                        </td>
                      </tr>
                    ) : (
                      hojeNotes.map((note, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-200">{note.NOTA_FISCAL}</td>
                          <td className="px-4 py-3 font-mono">{note.SERIE}</td>
                          <td className="px-4 py-3 font-semibold text-slate-100">{note.FORNECEDOR}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{note.CNPJ}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">{fmtCurrency(note.VALOR_NOTA)}</td>
                          <td className="px-4 py-3 text-slate-400">{note.DATA_MOVIMENTO ? String(note.DATA_MOVIMENTO).substring(0, 19) : '—'}</td>
                          <td className="px-4 py-3 text-center font-mono text-slate-500">{note.IDPLANILHA}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleLoadXmlFromDb({ idPlanilha: note.IDPLANILHA })}
                              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-2.5 py-1.2 rounded-lg transition text-[10px] flex items-center gap-1 mx-auto"
                            >
                              <Eye className="w-3 h-3" />
                              Visualizar/Comparar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "pendentes" && (
            <div className="glass-strong rounded-2xl overflow-hidden flex flex-col border border-white/5">
              <div className="p-5 border-b border-white/5 bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Notas Emitidas e Pendentes de Recebimento</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Notas fiscais emitidas por fornecedores mas pendentes de recebimento físico/fiscal.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                    <button
                      onClick={() => setFiltroPendentes("todas")}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                        filtroPendentes === "todas" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setFiltroPendentes("sem-pedido")}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                        filtroPendentes === "sem-pedido" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Sem Pedido
                    </button>
                    <button
                      onClick={() => setFiltroPendentes("com-pedido")}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                        filtroPendentes === "com-pedido" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Com Pedido
                    </button>
                  </div>
                  <input
                    type="text"
                    value={buscaPendentes}
                    onChange={e => setBuscaPendentes(e.target.value)}
                    placeholder="Filtrar nota ou fornecedor..."
                    className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-violet-500 w-44"
                  />
                  <button 
                    onClick={fetchPendentesNotes}
                    className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
                  >
                    Atualizar
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto flex-1 max-h-[500px]">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-black/20 text-slate-400 font-medium text-[10px] uppercase tracking-wider border-b border-white/5">
                      <th className="px-4 py-3">Nota Fiscal</th>
                      <th className="px-4 py-3">Série</th>
                      <th className="px-4 py-3">Fornecedor</th>
                      <th className="px-4 py-3">CNPJ</th>
                      <th className="px-4 py-3 text-right">Valor Total</th>
                      <th className="px-4 py-3 text-center">Pedido Compra</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {loadingPendentes ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-20 text-center text-slate-500">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-500 mb-3" />
                          <p>Carregando notas pendentes...</p>
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const filtered = pendentesNotes.filter(note => {
                          // Search filter
                          const q = buscaPendentes.toLowerCase();
                          const matchesSearch = 
                            String(note.NOTA_FISCAL).includes(q) ||
                            (note.FORNECEDOR || "").toLowerCase().includes(q) ||
                            (note.CNPJ || "").includes(q);
                          
                          if (!matchesSearch) return false;

                          // Order filter
                          const hasOrder = note.PEDIDO_COMPRA && note.PEDIDO_COMPRA > 0;
                          if (filtroPendentes === "sem-pedido") return !hasOrder;
                          if (filtroPendentes === "com-pedido") return hasOrder;
                          return true;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="px-4 py-20 text-center text-slate-500">
                                <Inbox className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                                <p className="font-semibold">Nenhuma nota encontrada com os filtros selecionados</p>
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((note, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-200">{note.NOTA_FISCAL}</td>
                          <td className="px-4 py-3 font-mono">{note.SERIE}</td>
                          <td className="px-4 py-3 font-semibold text-slate-100">{note.FORNECEDOR}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{note.CNPJ}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">{fmtCurrency(note.VALOR_TOTAL)}</td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-slate-300">{note.PEDIDO_COMPRA || 'Sem pedido'}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleLoadXmlFromDb({ chaveNfe: note.CHAVENFE, idPedido: note.PEDIDO_COMPRA ? String(note.PEDIDO_COMPRA) : undefined })}
                                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-2 py-1 rounded-lg transition text-[10px] flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                Visualizar XML
                              </button>
                              {note.PEDIDO_COMPRA > 0 && (
                                <button
                                  onClick={() => handleLoadXmlFromDb({ chaveNfe: note.CHAVENFE, idPedido: String(note.PEDIDO_COMPRA) })}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2 py-1 rounded-lg transition text-[10px]"
                                >
                                  Comparar c/ Pedido #{note.PEDIDO_COMPRA}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        ))
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "sem-preco" && (
            (() => {
              const query = buscaSemPreco.toLowerCase();
              const filtered = semPrecoNotes.filter(nota => {
                const matchesSearch =
                  String(nota.notaFiscal).includes(query) ||
                  (nota.produto || "").toLowerCase().includes(query) ||
                  (nota.fornecedor || "").toLowerCase().includes(query) ||
                  (nota.loja || "").toLowerCase().includes(query);
                if (!matchesSearch) return false;
                if (filtroLojaSemPreco !== "todas" && (nota.loja || "Sem Filial") !== filtroLojaSemPreco) return false;
                return true;
              });

              // Build store list for tab selector
              const storeCountMap = semPrecoNotes.reduce((acc: { [key: string]: number }, nota) => {
                const s = nota.loja || "Sem Filial";
                acc[s] = (acc[s] || 0) + 1;
                return acc;
              }, {});
              const storeNames = Object.keys(storeCountMap).sort();

              return (
                <div className="flex flex-col gap-0">
                  {/* Header bar */}
                  <div className="glass-strong rounded-t-2xl p-5 border border-white/5 border-b-0 bg-black/20 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">Produtos Sem Precificação</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {filtered.length} produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                          {filtroLojaSemPreco !== "todas" ? ` em ${filtroLojaSemPreco}` : ` em ${storeNames.length} filiais`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={diasFiltro}
                          onChange={e => setDiasFiltro(Number(e.target.value))}
                          className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                        >
                          <option value={7}>7 Dias</option>
                          <option value={15}>15 Dias</option>
                          <option value={30}>30 Dias</option>
                          <option value={60}>60 Dias</option>
                          <option value={90}>90 Dias</option>
                        </select>
                        <input
                          type="text"
                          value={buscaSemPreco}
                          onChange={e => setBuscaSemPreco(e.target.value)}
                          placeholder="Buscar produto ou NF..."
                          className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-violet-500 w-40"
                        />
                        <button
                          onClick={() => {
                            const storeName = filtroLojaSemPreco === "todas" ? "Todas as Filiais" : filtroLojaSemPreco;
                            setPrintData({ storeName, items: filtered });
                          }}
                          className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-3 py-1.5 rounded-lg transition text-xs flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimir
                        </button>
                        <button
                          onClick={() => fetchSemPrecoNotes(diasFiltro)}
                          className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
                        >
                          Atualizar
                        </button>
                      </div>
                    </div>

                    {/* Store filter tabs */}
                    {storeNames.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => setFiltroLojaSemPreco("todas")}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                            filtroLojaSemPreco === "todas"
                              ? "bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/20"
                              : "bg-black/30 text-slate-400 border-white/5 hover:text-slate-200 hover:border-white/15"
                          }`}
                        >
                          Todas ({semPrecoNotes.length})
                        </button>
                        {storeNames.map(name => (
                          <button
                            key={name}
                            onClick={() => setFiltroLojaSemPreco(name)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                              filtroLojaSemPreco === name
                                ? "bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/20"
                                : "bg-black/30 text-slate-400 border-white/5 hover:text-slate-200 hover:border-white/15"
                            }`}
                          >
                            {name} ({storeCountMap[name]})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Table */}
                  <div className="glass-strong rounded-b-2xl border border-white/5 border-t-0 overflow-hidden">
                    {loadingSemPreco ? (
                      <div className="p-20 text-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-500 mb-3" />
                        <p>Carregando...</p>
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="p-20 text-center text-slate-500">
                        <Inbox className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                        <p className="font-semibold">Nenhum produto encontrado</p>
                      </div>
                    ) : (
                      <div>
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-900/95 backdrop-blur text-slate-400 font-medium text-[10px] uppercase tracking-wider border-b border-white/10">
                              <th className="px-4 py-3 w-10">#</th>
                              <th className="px-4 py-3">Nota Fiscal</th>
                              {filtroLojaSemPreco === "todas" && <th className="px-4 py-3">Loja</th>}
                              <th className="px-4 py-3">Fornecedor</th>
                              <th className="px-4 py-3">Produto</th>
                              <th className="px-4 py-3 text-right">Qtd</th>
                              <th className="px-4 py-3 text-right">Custo Unit.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-slate-300">
                            {filtered.map((nota, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-2.5 text-slate-500 font-mono text-[10px]">{idx + 1}</td>
                                <td className="px-4 py-2.5">
                                  <span className="font-semibold text-slate-200">#{nota.notaFiscal}</span>
                                  <span className="text-[9px] text-slate-500 font-mono ml-2">
                                    {nota.dataEntrada ? new Date(nota.dataEntrada + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                                  </span>
                                </td>
                                {filtroLojaSemPreco === "todas" && (
                                  <td className="px-4 py-2.5 text-slate-400 text-[11px] font-medium">{nota.loja || 'Sem Filial'}</td>
                                )}
                                <td className="px-4 py-2.5 text-slate-300 max-w-[140px] truncate text-[11px]" title={nota.fornecedor}>
                                  {nota.fornecedor}
                                </td>
                                <td className="px-4 py-2.5 max-w-[220px]">
                                  <div className="font-semibold text-slate-200 truncate text-[11px]" title={nota.produto}>{nota.produto}</div>
                                  <div className="text-[9px] text-slate-500 font-mono">Cód: {nota.idProduto}{nota.marca ? ` • ${nota.marca}` : ''}</div>
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono text-slate-300 text-[11px]">
                                  {nota.qtdEntrada ? parseFloat(nota.qtdEntrada).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : '0'}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono text-amber-400 font-bold text-[11px]">
                                  {fmtCurrency(nota.custoUnitario)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Printable Report Area */}
      {printData && (
        <div id="print-receipt" className="hidden print:block bg-white text-black p-6 font-sans w-full">
          <div className="text-center font-bold border-b-2 border-black pb-4 mb-4">
            <h2 className="text-xl uppercase font-black">{printData.storeName}</h2>
            <div className="text-sm font-bold mt-1 text-gray-700">RELATÓRIO DE PRODUTOS SEM PRECIFICAÇÃO</div>
            <div className="text-xs font-normal mt-1 text-gray-500">Data de emissão: {new Date().toLocaleString("pt-BR")}</div>
          </div>
          
          <table className="w-full text-left text-xs border-collapse mt-4">
            <thead>
              <tr className="border-b-2 border-black font-bold uppercase text-[10px] text-gray-800">
                <th className="py-2 pr-2 text-center w-10">#</th>
                <th className="py-2 pr-2 w-28">Nota Fiscal</th>
                <th className="py-2 pr-2">Fornecedor</th>
                <th className="py-2 pr-2">Produto / Cód</th>
                <th className="py-2 pr-2 text-right w-24">Qtd Entrada</th>
                <th className="py-2 text-right w-32">Custo Unitário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {printData.items.map((item, idx) => (
                <tr key={idx} className="py-2">
                  <td className="py-2 pr-2 text-center font-mono">{idx + 1}</td>
                  <td className="py-2 pr-2 font-mono font-semibold">#{item.notaFiscal}</td>
                  <td className="py-2 pr-2 truncate max-w-[150px]">{item.fornecedor}</td>
                  <td className="py-2 pr-2">
                    <div className="font-bold">{item.produto}</div>
                    <div className="text-[10px] text-gray-500">Cód: {item.idProduto}</div>
                  </td>
                  <td className="py-2 pr-2 text-right font-mono">
                    {parseFloat(item.qtdEntrada || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 text-right font-mono font-bold">
                    {item.custoUnitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="text-right border-t border-black pt-4 mt-6 text-sm font-bold">
            Total de Itens: {printData.items.length}
          </div>
          <div className="text-center text-[10px] mt-10 text-gray-500 border-t border-dotted border-gray-300 pt-4">
            Gerado via IA Executiva - Plataforma ERP
          </div>
        </div>
      )}

      {/* Print styles override */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-receipt, #print-receipt * {
            visibility: visible !important;
          }
          #print-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 20px !important;
            display: block !important;
          }
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
}
