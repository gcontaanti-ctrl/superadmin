import React, { useState, useEffect } from "react";
import { 
  CreditCard, Banknote, Zap, Users, ChevronDown, ChevronUp, 
  ArrowUpRight, Wallet, PieChart, Layers, Store, Building2, BarChart2
} from "lucide-react";
import { ConveniosDetailsModal } from "./ConveniosDetailsModal";

interface PaymentSummary {
  id: string;
  nome: string;
  valor: number;
  valorBruto?: number;
  troco?: number;
  qtd: number;
  percentual: number;
  cor: string;
}

interface PaymentDetail {
  idLoja?: number;
  nomeLoja?: string;
  id: number;
  forma: string;
  valor: number;
  qtd: number;
}

interface StorePayment {
  id: number;
  nome: string;
  totalGeral: number;
  dinheiro: number;
  dinheiroBruto: number;
  troco: number;
  pix: number;
  debito: number;
  credito: number;
  convenios: number;
  qtdTotal: number;
  percentualTotal: number;
  resumo: PaymentSummary[];
  formas: PaymentDetail[];
}

interface PaymentMethodsCardProps {
  selectedStore: string;
  startDate?: string;
  endDate?: string;
}

export function PaymentMethodsCard({ selectedStore: initialStore, startDate, endDate }: PaymentMethodsCardProps) {
  const [data, setData] = useState<{
    totalGeral: number;
    resumo: PaymentSummary[];
    porLoja: StorePayment[];
    detalhes: PaymentDetail[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedLojaTab, setSelectedLojaTab] = useState<string>("todas");
  const [isConvenioModalOpen, setIsConvenioModalOpen] = useState(false);

  useEffect(() => {
    // Sincroniza com o filtro global se mudar
    if (initialStore) {
      setSelectedLojaTab(initialStore);
    }
  }, [initialStore]);

  useEffect(() => {
    setLoading(true);
    let url = `/api/vendas/formas-pagamento?idEmpresa=${selectedLojaTab}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) setData(json);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedLojaTab, startDate, endDate]);

  const formatBRL = (val: number) => {
    return (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getIcon = (id: string) => {
    switch (id) {
      case "pix":
        return <Zap className="w-5 h-5 text-cyan-400" />;
      case "dinheiro":
        return <Banknote className="w-5 h-5 text-emerald-400" />;
      case "credito":
        return <CreditCard className="w-5 h-5 text-purple-400" />;
      case "debito":
        return <CreditCard className="w-5 h-5 text-blue-400" />;
      default:
        return <Users className="w-5 h-5 text-amber-400" />;
    }
  };

  const getGradient = (id: string) => {
    switch (id) {
      case "dinheiro":
        return "from-emerald-500/20 to-green-600/5 border-emerald-500/30 text-emerald-400";
      case "pix":
        return "from-cyan-500/20 to-teal-600/5 border-cyan-500/30 text-cyan-400";
      case "debito":
        return "from-blue-500/20 to-indigo-600/5 border-blue-500/30 text-blue-400";
      case "credito":
        return "from-purple-500/20 to-violet-600/5 border-purple-500/30 text-purple-400";
      default:
        return "from-amber-500/20 to-orange-600/5 border-amber-500/30 text-amber-400";
    }
  };

  const getBarColor = (id: string) => {
    switch (id) {
      case "dinheiro":
        return "bg-gradient-to-r from-emerald-500 to-green-400";
      case "pix":
        return "bg-gradient-to-r from-cyan-400 to-teal-400";
      case "debito":
        return "bg-gradient-to-r from-blue-500 to-indigo-500";
      case "credito":
        return "bg-gradient-to-r from-purple-500 to-violet-500";
      default:
        return "bg-gradient-to-r from-amber-400 to-orange-400";
    }
  };

  const getCardThemeClass = (id: string) => {
    switch (id) {
      case "dinheiro":
        return "payment-card-dinheiro";
      case "pix":
        return "payment-card-pix";
      case "debito":
        return "payment-card-debito";
      case "credito":
        return "payment-card-credito";
      default:
        return "payment-card-convenio";
    }
  };

  const totalGeral = data?.totalGeral || 0;
  const resumo = data?.resumo || [];
  const porLoja = data?.porLoja || [];
  const detalhes = data?.detalhes || [];

  return (
    <div className={`glass-strong rounded-2xl p-5 border border-white/5 bg-black/25 flex flex-col gap-5 transition-opacity duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 grid place-items-center shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Wallet className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-serif text-slate-100">
                Vendas por Forma de Pagamento
              </h3>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <ArrowUpRight className="w-2.5 h-2.5" /> DB2 REAL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Valores reais recebidos no caixa (PIX, Cartões e Dinheiro líquido) por filial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-black/40 border border-white/10 px-3.5 py-1.5 rounded-xl text-right payment-total-received">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block leading-tight label-text">Total Recebido</span>
            <span className="text-lg font-bold font-serif text-cyan-300 leading-tight value-text">
              {formatBRL(totalGeral)}
            </span>
          </div>

          <button
            onClick={() => setIsConvenioModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-xl border border-amber-500/30 transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] group btn-gestao-convenios"
            title="Abrir detalhamento de baixas e pendentes de Convênios"
          >
            <Users className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Gestão Convênios</span>
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl border border-white/10 transition-colors btn-detalhar-modalidades"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showDetails ? "Ocultar Detalhes" : "Detalhar Modalidades"}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Seletor de Loja (Abas Rápidas) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-white/5">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
          <Store className="w-3.5 h-3.5 text-cyan-400" /> Filtrar Loja:
        </span>
        <button
          onClick={() => setSelectedLojaTab("todas")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            selectedLojaTab === 'todas' 
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)] store-tab-btn-active' 
              : 'bg-black/30 border border-white/10 text-slate-300 hover:bg-white/5 store-tab-btn-inactive'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Todas as Lojas (Consolidado)
        </button>

        {porLoja.map((loja) => (
          <button
            key={loja.id}
            onClick={() => setSelectedLojaTab(String(loja.id))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedLojaTab === String(loja.id) 
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)] store-tab-btn-active' 
                : 'bg-black/30 border border-white/10 text-slate-300 hover:bg-white/5 store-tab-btn-inactive'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Loja {loja.id} - {loja.nome}
          </button>
        ))}
      </div>

      {/* Cards de Formas de Pagamento (Grid de 5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
        {resumo.map((item) => {
          const isConvenio = item.id === "convenio";
          return (
            <div
              key={item.id}
              onClick={() => {
                if (isConvenio) setIsConvenioModalOpen(true);
              }}
              className={`rounded-xl p-3 md:p-4 border bg-gradient-to-br flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${getCardThemeClass(item.id)} ${
                isConvenio
                  ? "cursor-pointer hover:scale-[1.03] hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] group"
                  : "hover:scale-[1.02]"
              } ${getGradient(item.id)}`}
              title={isConvenio ? "Clique para gerenciar baixas e pendências de convênios" : undefined}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                  {getIcon(item.id)}
                  <span className="text-[11px] md:text-xs font-bold text-slate-200 truncate payment-title">{item.nome}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] md:text-xs font-black px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-slate-100 payment-pill">
                    {item.percentual}%
                  </span>
                  {isConvenio && (
                    <ArrowUpRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-400 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  )}
                </div>
              </div>

              <div className="mt-1">
                <div className="text-sm md:text-lg font-bold font-serif text-slate-100 tabular-nums truncate payment-val">
                  {formatBRL(item.valor)}
                </div>
                <div className="flex items-center justify-between text-[9px] md:text-[10px] text-slate-400 mt-1">
                  <span className="truncate">{item.qtd.toLocaleString('pt-BR')} transações</span>
                  {item.troco !== undefined && item.troco < 0 && (
                    <span className="text-emerald-300/80 font-mono shrink-0 ml-1" title={`Troco abatido: ${formatBRL(Math.abs(item.troco))}`}>
                      Líq.
                    </span>
                  )}
                </div>
              </div>

              {/* Ativação do Card de Convênio: Badge interativo de Baixas & Pendentes */}
              {isConvenio && (
                <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-amber-300 font-semibold group-hover:text-amber-100 transition-colors">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-400" /> Baixas & Pendentes
                  </span>
                  <span className="bg-amber-500/25 px-1.5 py-0.5 rounded border border-amber-500/35 text-[9px] font-bold">
                    Ver Detalhes →
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Barra de Distribuição Proporcional */}
      {totalGeral > 0 && (
        <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
            <span className="flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-cyan-400" /> Distribuição de Recebimentos
            </span>
            <span>100% do faturamento da seleção</span>
          </div>

          <div className="w-full h-3.5 bg-black/50 rounded-full overflow-hidden flex p-0.5 gap-0.5">
            {resumo.map((item) => (
              <div
                key={item.id}
                style={{ width: `${Math.max(1, item.percentual)}%` }}
                title={`${item.nome}: ${formatBRL(item.valor)} (${item.percentual}%)`}
                className={`h-full rounded-sm transition-all duration-500 ${getBarColor(item.id)}`}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 px-1">
            {resumo.map((item) => (
              <div key={item.id} className="flex items-center gap-1.5 text-[10px] text-slate-300">
                <span className={`size-2 rounded-full ${getBarColor(item.id)}`} />
                <span>{item.nome}:</span>
                <span className="font-bold text-slate-100">{item.percentual}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEÇÃO: COMPARATIVO SEPARADO POR LOJA */}
      {porLoja.length > 0 && (
        <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-4 h-4 text-cyan-400" />
                Vendas por Forma de Pagamento Separadas por Loja
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Compare lado a lado o volume de Dinheiro, PIX e Cartões em cada filial
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              {porLoja.length} Filiais Ativas
            </span>
          </div>

          {/* Cards Separados por Cada Loja */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {porLoja.map((l) => (
              <div 
                key={l.id} 
                className={`rounded-xl p-4 border transition-all ${selectedLojaTab === String(l.id) ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-black/40 border-white/10 hover:border-white/20'}`}
              >
                <div className="flex items-start justify-between mb-3 border-b border-white/5 pb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-6 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-black grid place-items-center">
                        {l.id}
                      </span>
                      <h5 className="font-bold text-sm text-slate-100">{l.nome}</h5>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {l.qtdTotal.toLocaleString('pt-BR')} transações de caixa
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-serif text-cyan-300 block">
                      {formatBRL(l.totalGeral)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">
                      {l.percentualTotal}% do faturamento
                    </span>
                  </div>
                </div>

                {/* Lista de Formas desta Loja */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <Banknote className="w-3.5 h-3.5" /> Dinheiro Líquido
                    </span>
                    <span className="font-bold font-mono text-slate-200">{formatBRL(l.dinheiro)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                      <Zap className="w-3.5 h-3.5" /> PIX
                    </span>
                    <span className="font-bold font-mono text-slate-200">{formatBRL(l.pix)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                      <CreditCard className="w-3.5 h-3.5" /> Cartão Débito
                    </span>
                    <span className="font-bold font-mono text-slate-200">{formatBRL(l.debito)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-purple-400 font-medium">
                      <CreditCard className="w-3.5 h-3.5" /> Cartão Crédito
                    </span>
                    <span className="font-bold font-mono text-slate-200">{formatBRL(l.credito)}</span>
                  </div>

                  {l.convenios > 0 && (
                    <div 
                      onClick={() => {
                        setSelectedLojaTab(String(l.id));
                        setIsConvenioModalOpen(true);
                      }}
                      className="flex items-center justify-between text-xs cursor-pointer hover:bg-amber-500/10 p-1 rounded-lg transition-colors group/conv"
                      title="Clique para ver convênios desta filial"
                    >
                      <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                        <Users className="w-3.5 h-3.5" /> Convênios & Outros
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold font-mono text-slate-200">{formatBRL(l.convenios)}</span>
                        <ArrowUpRight className="w-3 h-3 text-amber-400 opacity-60 group-hover/conv:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Mini Barra da Loja */}
                {l.totalGeral > 0 && (
                  <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden flex gap-0.5 mt-3">
                    <div style={{ width: `${(l.dinheiro / l.totalGeral) * 100}%` }} className="bg-emerald-500 h-full" title={`Dinheiro: ${formatBRL(l.dinheiro)}`} />
                    <div style={{ width: `${(l.pix / l.totalGeral) * 100}%` }} className="bg-cyan-400 h-full" title={`PIX: ${formatBRL(l.pix)}`} />
                    <div style={{ width: `${(l.debito / l.totalGeral) * 100}%` }} className="bg-blue-500 h-full" title={`Débito: ${formatBRL(l.debito)}`} />
                    <div style={{ width: `${(l.credito / l.totalGeral) * 100}%` }} className="bg-purple-500 h-full" title={`Crédito: ${formatBRL(l.credito)}`} />
                    <div style={{ width: `${(l.convenios / l.totalGeral) * 100}%` }} className="bg-amber-400 h-full" title={`Convênios: ${formatBRL(l.convenios)}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gaveta com Detalhamento de cada Finalizadora */}
      {showDetails && (
        <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Detalhamento de Todas as Finalizadoras no Caixa
            </h4>
            <span className="text-[11px] text-slate-400">
              {detalhes.length} modalidades registradas
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto no-scrollbar border border-white/5 rounded-xl bg-black/40">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900 border-b border-white/10 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Loja</th>
                  <th className="py-2.5 px-3">Forma de Pagamento</th>
                  <th className="py-2.5 px-3 text-right">Qtd Transações</th>
                  <th className="py-2.5 px-3 text-right">Valor Total (R$)</th>
                  <th className="py-2.5 px-3 text-right">Part. %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {detalhes.map((d, idx) => {
                  const part = totalGeral > 0 ? ((d.valor / totalGeral) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={`${d.id}-${d.idLoja || idx}`} className="hover:bg-white/[0.02]">
                      <td className="py-2 px-3 text-slate-400 font-medium">
                        Loja {d.idLoja} {d.nomeLoja ? `(${d.nomeLoja})` : ''}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-200">
                        {d.forma}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">
                        {d.qtd.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">
                        {formatBRL(d.valor)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-cyan-400 font-bold">
                        {part}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Gestão & Detalhamento de Convênios (Baixas e Pendentes) */}
      <ConveniosDetailsModal
        isOpen={isConvenioModalOpen}
        onClose={() => setIsConvenioModalOpen(false)}
        selectedStore={selectedLojaTab}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
