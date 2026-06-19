import React, { useEffect, useState } from "react";
import { 
  Tag, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Calendar,
  AlertTriangle,
  RefreshCw,
  Percent
} from "lucide-react";
import { toast } from "sonner";

interface PromocoesModuleProps {
  selectedStore: string;
  globalStartDate: string;
  globalEndDate: string;
}

interface PromoResumo {
  receita: number;
  custo: number;
  lucro: number;
  margem: number;
  qtdTotal: number;
}

interface PromoItem {
  idProduto: number;
  produto: string;
  secao: string;
  receita: number;
  custo: number;
  lucro: number;
  margem: number;
  qtd: number;
}

interface PromoListaItem {
  idPromocao: number;
  nome: string;
  dtInicio: string;
  dtFim: string;
  receita: number;
  custo: number;
  lucro: number;
  margem: number;
  qtd: number;
}

const fmtCurrency = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtNum = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const fmtDate = (d: string) => {
  if (!d) return "—";
  try {
    const dateStr = d.length === 10 ? d + "T00:00:00" : d;
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return "Data Inválida";
    return dt.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  } catch (e) {
    return "Data Erro";
  }
};

export function PromocoesModule({ selectedStore, globalStartDate, globalEndDate }: PromocoesModuleProps) {
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<PromoResumo | null>(null);
  const [lista, setLista] = useState<PromoListaItem[]>([]);
  const [expandedPromo, setExpandedPromo] = useState<number | null>(null);
  const [promoItensCache, setPromoItensCache] = useState<Record<number, PromoItem[]>>({});
  const [loadingItens, setLoadingItens] = useState<Record<number, boolean>>({});

  const fetchPromocoes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStore && selectedStore !== "todas") params.set("idEmpresa", selectedStore);
      if (globalStartDate) params.set("startDate", globalStartDate);
      if (globalEndDate) params.set("endDate", globalEndDate);

      // Resumo
      const resResumo = await fetch(`/api/promocoes/resumo?${params}`);
      const jsonResumo = await resResumo.json();
      if (jsonResumo.error) throw new Error(jsonResumo.error);
      setResumo(jsonResumo);

      // Lista de Promocoes
      const resLista = await fetch(`/api/promocoes/lista?${params}`);
      const jsonLista = await resLista.json();
      if (jsonLista.error) throw new Error(jsonLista.error);
      setLista(jsonLista);

    } catch (e: any) {
      toast.error(`Erro ao carregar promoções: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandPromo = async (idPromocao: number) => {
    if (expandedPromo === idPromocao) {
      setExpandedPromo(null);
      return;
    }
    setExpandedPromo(idPromocao);
    
    // Se já temos os itens no cache, não busca de novo
    if (promoItensCache[idPromocao]) return;

    setLoadingItens(prev => ({ ...prev, [idPromocao]: true }));
    try {
      const params = new URLSearchParams();
      params.set("idPromocao", idPromocao.toString());
      if (selectedStore && selectedStore !== "todas") params.set("idEmpresa", selectedStore);
      if (globalStartDate) params.set("startDate", globalStartDate);
      if (globalEndDate) params.set("endDate", globalEndDate);

      const resItens = await fetch(`/api/promocoes/itens?${params}`);
      const jsonItens = await resItens.json();
      if (jsonItens.error) throw new Error(jsonItens.error);
      
      setPromoItensCache(prev => ({ ...prev, [idPromocao]: jsonItens }));
    } catch (e: any) {
      toast.error(`Erro ao carregar itens da promoção ${idPromocao}: ${e.message}`);
    } finally {
      setLoadingItens(prev => ({ ...prev, [idPromocao]: false }));
    }
  };

  useEffect(() => {
    fetchPromocoes();
  }, [selectedStore, globalStartDate, globalEndDate]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto mt-4 px-4 pb-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="glass-strong rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Tag className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-slate-100">Desempenho de Promoções</h2>
            <p className="text-xs text-slate-400 mt-0.5">Análise de margem, lucro e volume de itens em oferta</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchPromocoes(); toast.success("Dados de promoções atualizados!"); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-xs font-semibold transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
            <Calendar className="w-3.5 h-3.5 text-orange-400" />
            {globalStartDate && globalEndDate
              ? `${fmtDate(globalStartDate)} → ${fmtDate(globalEndDate)}`
              : "Últimos 30 dias"}
          </div>
        </div>
      </div>

      {loading && (!lista || lista.length === 0) ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className={loading ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
          {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Arrecadado */}
            <div className="glass-strong rounded-2xl p-5 flex flex-col gap-2 border border-blue-500/10 hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-executive text-slate-400 uppercase">Total Arrecadado</span>
                <DollarSign className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold font-serif text-blue-400 tabular-nums">
                {fmtCurrency(resumo?.receita || 0)}
              </p>
              <p className="text-[10px] text-slate-500">faturamento bruto das ofertas</p>
            </div>

            {/* Lucro */}
            <div className="glass-strong rounded-2xl p-5 flex flex-col gap-2 border border-emerald-500/10 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-executive text-slate-400 uppercase">Lucro da Promoção</span>
                {(resumo?.lucro || 0) >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
              <p className={`text-2xl font-bold font-serif tabular-nums ${
                (resumo?.lucro || 0) >= 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                {fmtCurrency(resumo?.lucro || 0)}
              </p>
              <p className="text-[10px] text-slate-500">receita deduzida do custo</p>
            </div>

            {/* Margem */}
            <div className="glass-strong rounded-2xl p-5 flex flex-col gap-2 border border-orange-500/10 hover:border-orange-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-executive text-slate-400 uppercase">Margem Média</span>
                <Percent className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-2xl font-bold font-serif text-orange-400 tabular-nums">
                {(resumo?.margem || 0).toFixed(2)}%
              </p>
              <p className="text-[10px] text-slate-500">lucratividade global</p>
            </div>

            {/* Qtd Vendida */}
            <div className="glass-strong rounded-2xl p-5 flex flex-col gap-2 border border-purple-500/10 hover:border-purple-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-executive text-slate-400 uppercase">Volume de Itens</span>
                <Package className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold font-serif text-purple-400 tabular-nums">
                {fmtNum(resumo?.qtdTotal || 0)}
              </p>
              <p className="text-[10px] text-slate-500">unidades vendidas em promoção</p>
            </div>
          </div>

          {/* ── Tabela de Campanhas ────────────────────────────────────────────── */}
          <div className="glass-strong rounded-2xl p-6 flex flex-col gap-5">
            <div className="border-b border-white/10 pb-4 flex justify-between items-end">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-orange-400" />
                  Campanhas Ativas
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Clique em uma campanha para ver os produtos nela vendidos</p>
              </div>
            </div>

            {lista.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                Nenhuma campanha de promoção ativa com vendas no período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-3 text-left">Campanha / Promoção</th>
                      <th className="py-3 px-3 text-left hidden md:table-cell">Período</th>
                      <th className="py-3 px-3 text-right">Qtd Itens</th>
                      <th className="py-3 px-3 text-right">Arrecadado</th>
                      <th className="py-3 px-3 text-right">Custo</th>
                      <th className="py-3 px-3 text-right">Lucro</th>
                      <th className="py-3 px-3 text-right">Margem %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((promo, i) => (
                      <React.Fragment key={`${promo.idPromocao}-${i}`}>
                        <tr 
                          className={`border-b border-white/5 cursor-pointer transition-colors ${expandedPromo === promo.idPromocao ? 'bg-orange-500/10' : 'hover:bg-white/[0.04]'}`}
                          onClick={() => handleExpandPromo(promo.idPromocao)}
                        >
                          <td className="py-4 px-3">
                            <div className="font-semibold text-slate-200">{promo.nome}</div>
                            <div className="text-[10px] text-slate-500">ID: {promo.idPromocao}</div>
                          </td>
                          <td className="py-4 px-3 text-slate-500 hidden md:table-cell">
                            {fmtDate(promo.dtInicio)} a {fmtDate(promo.dtFim)}
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-bold text-slate-300">
                            {fmtNum(promo.qtd)}
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-bold text-blue-400">
                            {fmtCurrency(promo.receita)}
                          </td>
                          <td className="py-4 px-3 text-right font-mono text-slate-400">
                            {fmtCurrency(promo.custo)}
                          </td>
                          <td className="py-4 px-3 text-right">
                            <span className={`font-mono font-bold ${promo.lucro >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {promo.lucro >= 0 ? "+" : ""}{fmtCurrency(promo.lucro)}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-right">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                              promo.margem < 10 ? 'bg-red-500/20 text-red-400' : 
                              promo.margem < 20 ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {promo.margem.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                        {/* Expandable Row para os Itens da Campanha */}
                        {expandedPromo === promo.idPromocao && (
                          <tr className="bg-black/20 border-b border-white/5">
                            <td colSpan={7} className="p-0">
                              <div className="p-4 pl-8 border-l-2 border-orange-500/50">
                                {loadingItens[promo.idPromocao] ? (
                                  <div className="text-slate-400 flex items-center gap-2 py-4">
                                    <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                    Carregando itens vendidos...
                                  </div>
                                ) : (
                                  <div>
                                    <h4 className="text-slate-300 font-bold mb-3 flex items-center gap-2 text-sm">
                                      <Package className="w-4 h-4 text-orange-400" />
                                      Itens Vendidos nesta Campanha
                                      <span className="text-[10px] text-slate-500 ml-2 font-normal">(clique para rastrear)</span>
                                    </h4>
                                    
                                    {!promoItensCache[promo.idPromocao] || promoItensCache[promo.idPromocao].length === 0 ? (
                                      <div className="text-slate-500 text-xs py-2">Nenhum item detalhado encontrado para esta promoção.</div>
                                    ) : (
                                      <table className="w-full text-xs border-collapse bg-white/5 rounded-lg overflow-hidden">
                                        <thead>
                                          <tr className="border-b border-white/10 text-slate-400 text-[9px] uppercase tracking-wider bg-black/40">
                                            <th className="py-2 px-3 text-left">Produto</th>
                                            <th className="py-2 px-3 text-right">Qtd</th>
                                            <th className="py-2 px-3 text-right">Arrecadado</th>
                                            <th className="py-2 px-3 text-right">Lucro</th>
                                            <th className="py-2 px-3 text-right">Margem %</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {promoItensCache[promo.idPromocao].map((item, idx) => (
                                            <tr 
                                              key={`item-${item.idProduto}-${idx}`}
                                              className="border-b border-white/5 hover:bg-white/[0.08] cursor-pointer transition-colors"
                                              onClick={() => {
                                                window.dispatchEvent(new CustomEvent('openRastreamento', { detail: { idProduto: item.idProduto }}));
                                                toast.success(`Redirecionando para rastreamento do produto ${item.idProduto}`);
                                              }}
                                            >
                                              <td className="py-2 px-3 text-slate-300">
                                                {item.produto} <span className="text-slate-600 ml-1">#{item.idProduto}</span>
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono text-slate-400">
                                                {fmtNum(item.qtd)}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono text-blue-400/80">
                                                {fmtCurrency(item.receita)}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono">
                                                <span className={item.lucro >= 0 ? "text-emerald-400/80" : "text-red-400/80"}>
                                                  {item.lucro >= 0 ? "+" : ""}{fmtCurrency(item.lucro)}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3 text-right">
                                                <span className={`text-[10px] ${
                                                  item.margem < 10 ? 'text-red-400' : 
                                                  item.margem < 20 ? 'text-orange-400' : 'text-emerald-400'
                                                }`}>
                                                  {item.margem.toFixed(1)}%
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
