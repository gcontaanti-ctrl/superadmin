import { useEffect, useState } from "react";
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  FileText, 
  Package,
  Calendar,
  Building,
  User,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";

interface PurchasesModuleProps {
  selectedStore: string;
  globalStartDate: string;
  globalEndDate: string;
}

export function PurchasesModule({ selectedStore, globalStartDate, globalEndDate }: PurchasesModuleProps) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [startDate, setStartDate] = useState(globalStartDate || "");
  const [endDate, setEndDate] = useState(globalEndDate || "");

  useEffect(() => {
    if (globalStartDate) setStartDate(globalStartDate);
  }, [globalStartDate]);

  useEffect(() => {
    if (globalEndDate) setEndDate(globalEndDate);
  }, [globalEndDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/pedidos-compra-itens?`;
      const params: string[] = [];
      if (startDate && endDate) {
        params.push(`startDate=${startDate}`);
        params.push(`endDate=${endDate}`);
      }
      url += params.join("&");

      const res = await fetch(url);
      const json = await res.json();
      
      if (json.error) {
        toast.error(`Erro ao carregar compras: ${json.error}`);
        setPedidos([]);
      } else {
        setPedidos(Array.isArray(json) ? json : []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao conectar com as APIs de Compras.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStore, startDate, endDate]);

  const handleApplyFilters = () => {
    fetchData();
    toast.success("Filtros aplicados!");
  };

  const fmtCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const fmtDate = (dStr: string) => {
    if (!dStr) return "S/ Data";
    const date = new Date(dStr);
    return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  };

  // KPI calculations
  const totalGasto = pedidos.reduce((acc, p) => acc + ((p.QTDSOLICITADA || 0) * (p.VALUNITARIO || 0)), 0);
  const totalItens = pedidos.reduce((acc, p) => acc + (p.QTDSOLICITADA || 0), 0);
  const uniquePedidos = new Set(pedidos.map(p => p.IDPEDIDO)).size;

  const filteredPedidos = pedidos.filter(p => {
    if (!busca) return true;
    const term = busca.toLowerCase();
    return (
      String(p.IDPEDIDO).includes(term) ||
      (p.FORNECEDOR && p.FORNECEDOR.toLowerCase().includes(term)) ||
      (p.PRODUTO && p.PRODUTO.toLowerCase().includes(term)) ||
      (p.COMPRADOR && p.COMPRADOR.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto mt-4 px-4">
      {/* Header and KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[120px] hover:border-blue-500/20 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] tracking-executive text-slate-400 block">TOTAL EM COMPRAS</span>
              <h2 className="text-2xl font-bold font-serif text-blue-400 mt-1 tabular-nums">
                {fmtCurrency(totalGasto)}
              </h2>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[120px] hover:border-purple-500/20 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] tracking-executive text-slate-400 block">PEDIDOS EMITIDOS</span>
              <h2 className="text-2xl font-bold font-serif text-purple-400 mt-1 tabular-nums">
                {uniquePedidos}
              </h2>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[120px] hover:border-emerald-500/20 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] tracking-executive text-slate-400 block">ITENS SOLICITADOS</span>
              <h2 className="text-2xl font-bold font-serif text-emerald-400 mt-1 tabular-nums">
                {totalItens} un
              </h2>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-6 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-200">
              Relatório de Pedidos de Compra (Itens)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulte os produtos solicitados em cada pedido
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary font-mono self-start md:self-auto">
            {filteredPedidos.length} itens listados
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Buscar por Fornecedor, Produto, Comprador ou ID..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-primary text-slate-200 text-xs"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPedidos.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center gap-2">
            <FileText className="w-10 h-10 text-slate-500" />
            <span>Nenhum pedido localizado.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Pedido / Data</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Comprador</th>
                  <th className="py-3 px-4 text-center">Qtd</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredPedidos.map((p, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-200">#{p.IDPEDIDO}</div>
                      <div className="text-[10px] text-slate-400">{fmtDate(p.DATA_REGISTRO_PEDIDO)}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-300 max-w-[150px] truncate">{p.FORNECEDOR}</td>
                    <td className="py-3 px-4 text-slate-200 max-w-[200px] truncate">{p.PRODUTO}</td>
                    <td className="py-3 px-4 text-slate-400">{p.COMPRADOR}</td>
                    <td className="py-3 px-4 text-center font-mono">{p.QTDSOLICITADA}</td>
                    <td className="py-3 px-4 text-right font-bold text-sm text-primary tabular-nums">
                      {fmtCurrency((p.QTDSOLICITADA || 0) * (p.VALUNITARIO || 0))}
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
}

