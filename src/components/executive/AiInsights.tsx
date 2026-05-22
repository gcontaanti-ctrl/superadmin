import { useState, useEffect } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  ShieldCheck, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  FileCheck,
  BrainCircuit,
  Eye,
  CheckCircle,
  HelpCircle,
  X,
  FileText,
  Building,
  TrendingDown,
  Percent,
  PlusCircle,
  AlertOctagon,
  Info,
  DollarSign,
  ArrowRight
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

export function AiInsights() {
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<"divergencia" | "ruptura" | "desconto" | null>(null);
  const [selectedDiv, setSelectedDiv] = useState<any>(null);
  const [insightsData, setInsightsData] = useState<{ rupturas: any[]; divergencias: any[]; descontos: any[] } | null>(null);
  
  // Forecast Data
  const forecastData = [
    { label: "Mar/26", realizado: 489000, projetado: 489000 },
    { label: "Abr/26", realizado: 502000, projetado: 502000 },
    { label: "Mai/26", realizado: 508328, projetado: 508328 },
    { label: "Jun/26 (Pred)", realizado: null, projetado: 524000 },
    { label: "Jul/26 (Pred)", realizado: null, projetado: 539000 },
    { label: "Ago/26 (Pred)", realizado: null, projetado: 552000 }
  ];

  const handleApplyAction = (actionTitle: string) => {
    toast.success(`Plano de ação iniciado: "${actionTitle}"`);
    setActiveModal(null);
  };

  const fetchInsights = async () => {
    setLoading(true);
    toast.info("Varrendo tabelas de Vendas, Estoque e Notas Fiscais no DB2...");
    try {
      const res = await fetch('/api/ia-insights');
      const data = await res.json();
      setInsightsData(data);
      toast.success("Varredura de IA concluída! Insights atualizados com sucesso.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao conectar no motor de IA.");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchInsights();
  }, []);

  const triggerScan = () => {
    fetchInsights();
  };

  const fmtCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="flex flex-col gap-6 w-full relative">
      {/* Top Section / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-[image:var(--gradient-primary)] grid place-items-center glow text-primary-foreground shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-100 flex items-center gap-1.5">
              Insights de IA Executiva
              <span className="text-[9px] uppercase font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                IA Prescritiva
              </span>
            </h3>
            <p className="text-xs text-slate-400">Varredura contínua de anomalias, estoque e margens do DB2</p>
          </div>
        </div>

        <button
          onClick={triggerScan}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Forçar Varredura
        </button>
      </div>

      {loading ? (
        <div className="glass-strong rounded-2xl p-24 flex flex-col justify-center items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Processando modelos estatísticos e redes neurais...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Saúde Operacional</span>
                <h5 className="text-lg font-bold text-slate-200 mt-0.5">94.2%</h5>
                <span className="text-[9px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> +1.4% este mês
                </span>
              </div>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Ações Recomendadas</span>
                <h5 className="text-lg font-bold text-slate-200 mt-0.5">4 Pendentes</h5>
                <span className="text-[9px] text-slate-500">2 aplicadas na última semana</span>
              </div>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Target className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Anomalias de Preços</span>
                <h5 className="text-lg font-bold text-amber-400 mt-0.5">1 Alerta</h5>
                <span className="text-[9px] text-amber-500">Ação imediata requerida</span>
              </div>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Recomendações Prescritivas */}
          <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <h4 className="font-serif text-base font-bold text-slate-200">Recomendações Estratégicas Prioritárias</h4>
              <p className="text-xs text-slate-400">Sugestões automatizadas baseadas em custos e movimentação real</p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Alerta de Divergência */}
              {insightsData?.divergencias && insightsData.divergencias.length > 0 && insightsData.divergencias.map((div, i) => (
              <div key={`div-${i}`} className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">Divergência de Faturamento Detectada</span>
                      <span className="text-[8px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded uppercase">Crítico</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      O fornecedor <strong>{div.FORNECEDOR || "DESCONHECIDO"}</strong> faturou {div.PRODUTO} no valor unitário de {fmtCurrency(parseFloat(div.PRECO_ENTRADA))}, porém o Pedido de Compra #{div.IDPEDIDO} previa {fmtCurrency(parseFloat(div.PRECO_PEDIDO))}. Diferença faturada de <strong>+{fmtCurrency(parseFloat(div.DIFERENCA))} por unidade</strong>.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedDiv(div); setActiveModal("divergencia"); }}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition cursor-pointer self-start sm:self-auto text-center shrink-0"
                >
                  Contestar Nota
                </button>
              </div>
              ))}

              {/* Reposição de Estoque */}
              {insightsData?.rupturas && insightsData.rupturas.length > 0 && insightsData.rupturas.map((rup, i) => (
              <div key={`rup-${i}`} className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">Risco Alto de Ruptura de Estoque</span>
                      <span className="text-[8px] font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.2 rounded uppercase">Logística</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      O item <strong>{rup.PRODUTO}</strong> possui apenas {parseInt(rup.QTDATUALESTOQUE)} unidades em estoque local na <strong>FILIAL {rup.IDEMPRESA}</strong>.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal("ruptura")}
                  className="px-3.5 py-2.5 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-400 transition cursor-pointer self-start sm:self-auto text-center shrink-0"
                >
                  Comprar Agora
                </button>
              </div>
              ))}

              {/* Fluxo de Caixa */}
              {insightsData?.descontos && insightsData.descontos.length > 0 && insightsData.descontos.map((desc, i) => (
              <div key={`desc-${i}`} className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0 mt-0.5">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">Aproveitamento de Desconto Financeiro</span>
                      <span className="text-[8px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded uppercase">Tesouraria</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      O título de contas a pagar de <strong>{fmtCurrency(desc.VALOR_ORIGINAL)}</strong> de {desc.FORNECEDOR} oferece bonificação de {desc.DESCONTO_PCT}% para antecipações efetuadas até {desc.DATA_LIMITE} (Economia líquida de {fmtCurrency(desc.ECONOMIA)}).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal("desconto")}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition cursor-pointer self-start sm:self-auto text-center shrink-0"
                >
                  Antecipar Título
                </button>
              </div>
              ))}
            </div>
          </div>

          {/* Gráfico de Predição de Faturamento */}
          <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <h4 className="font-serif text-base font-bold text-slate-200">Predição Inteligente de Faturamento (Forecasting)</h4>
              <p className="text-xs text-slate-400">Projeção estatística baseada em sazonalidade histórica dos últimos 6 meses</p>
            </div>

            <div className="h-56 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                  <YAxis 
                    stroke="rgba(255,255,255,0.4)" 
                    fontSize={9} 
                    tickLine={false}
                    tickFormatter={(v) => `R$ ${v/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(0,0,0,0.85)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
                    labelStyle={{ fontFamily: "serif", fontWeight: "bold", color: "#f8fafc" }}
                    itemStyle={{ color: "#f1f5f9" }}
                    formatter={(value: any) => [value ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "N/A"]}
                  />
                  <Area name="Realizado" type="monotone" dataKey="realizado" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#realGrad)" />
                  <Area name="Projetado (IA)" type="monotone" dataKey="projetado" stroke="#ec4899" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#projGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Matriz SWOT Dinâmica (FOFA) */}
          <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <h4 className="font-serif text-base font-bold text-slate-200">Matriz SWOT Estratégica (Mapeamento Automatizado)</h4>
              <p className="text-xs text-slate-400">Diagnóstico situacional gerado com base no panorama comercial atual</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {/* Forças */}
              <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-xl p-4">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">FORÇAS (Interno)</span>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                  <li><strong>Faturamento Saudável:</strong> Ultrapassou a meta de R$ 500k no último mês fechado.</li>
                  <li><strong>Equipe de Compras:</strong> Compradora Mariana lidera com ticket médio alto.</li>
                  <li><strong>Lojas Ativas:</strong> Filial 1 (Centro) consolidou liderança de vendas.</li>
                </ul>
              </div>

              {/* Oportunidades */}
              <div className="bg-indigo-950/10 border border-indigo-500/20 rounded-xl p-4">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-2">OPORTUNIDADES (Externo)</span>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                  <li><strong>Cross-Selling:</strong> Potencial de crescimento nas seções de Limpeza.</li>
                  <li><strong>Descontos de Fornecedor:</strong> Ambev e Coca-Cola possuem acordos comerciais subutilizados.</li>
                  <li><strong>Capacitação:</strong> Replicar mentoria dos vendedores estrela para o resto do time.</li>
                </ul>
              </div>

              {/* Fraquezas */}
              <div className="bg-amber-950/10 border border-amber-500/20 rounded-xl p-4">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-2">FRAQUEZAS (Interno)</span>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                  <li><strong>Baixa Base de Fornecedores:</strong> Poucos fornecedores homologados para repor produtos líderes.</li>
                  <li><strong>Inatividade:</strong> Vendedores inativos ou abaixo da meta com desvio de faturamento.</li>
                </ul>
              </div>

              {/* Ameaças */}
              <div className="bg-rose-950/10 border border-rose-500/20 rounded-xl p-4">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-2">AMEAÇAS (Externo)</span>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                  <li><strong>Instabilidade de Preços:</strong> Fornecedores alterando custos unitários sem prévio aviso (ex: Nestle).</li>
                  <li><strong>Flutuações de Demanda:</strong> Quedas de vendas na filial do Shopping em feriados locais.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DIALOGS FOR ALERTS --- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-strong rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl p-6 relative flex flex-col gap-5 text-left max-h-[90vh] overflow-y-auto">
            {/* Fechar botão */}
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content: Divergência */}
            {activeModal === "divergencia" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                    <AlertOctagon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-slate-100">Dossiê de Divergência de Faturamento</h3>
                    <p className="text-[10px] text-slate-400">Pedido de Compra vs. Nota Fiscal Eletrônica</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 bg-black/45 p-4 rounded-xl border border-white/5 text-xs text-slate-300">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Item / Produto:</span>
                    <span className="font-bold text-slate-200">{selectedDiv?.PRODUTO}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Compradora Responsável:</span>
                    <span className="font-semibold text-indigo-300">{selectedDiv?.COMPRADORA || "NÃO INFORMADA"}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Data do Pedido:</span>
                    <span className="font-semibold text-slate-200">{selectedDiv?.DATA_PEDIDO ? new Date(selectedDiv.DATA_PEDIDO).toLocaleDateString('pt-BR') : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Fornecedor:</span>
                    <span className="font-semibold text-slate-200">{selectedDiv?.FORNECEDOR || "DESCONHECIDO"}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Pedido Associado:</span>
                    <span className="font-mono text-indigo-400">#{selectedDiv?.IDPEDIDO}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Preço no Pedido (Acordado):</span>
                    <span className="font-mono text-emerald-400 font-bold">{fmtCurrency(parseFloat(selectedDiv?.PRECO_PEDIDO))}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Preço Unitário na Nota:</span>
                    <span className="font-mono text-rose-400 font-bold">{fmtCurrency(parseFloat(selectedDiv?.PRECO_ENTRADA))}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Divergência Unitária:</span>
                    <span className="font-mono text-rose-500 font-extrabold">+{fmtCurrency(parseFloat(selectedDiv?.DIFERENCA))}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Quantidade Faturada:</span>
                    <span className="font-mono text-slate-200">{parseInt(selectedDiv?.QTD_ENTRADA)} unidades</span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-sm">
                    <span className="text-slate-300">Diferença/Perda Estimada:</span>
                    <span className="font-mono text-rose-400">{fmtCurrency(parseFloat(selectedDiv?.DIFERENCA) * parseFloat(selectedDiv?.QTD_ENTRADA))}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 bg-black/45 p-4 rounded-xl border border-white/5 text-xs text-slate-300 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-sm text-slate-200">Dados Financeiros (Contas a Pagar)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Condição de Pagamento:</span>
                    <span className="font-bold text-slate-200">{selectedDiv?.is_parcelado ? 'PARCELADO' : 'À VISTA / ÚNICA'}</span>
                  </div>
                  
                  {selectedDiv?.boletos && selectedDiv.boletos.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {selectedDiv.boletos.map((bol: any, idx: number) => (
                        <div key={idx} className="bg-white/5 p-2 rounded-lg border border-white/5 flex flex-col gap-1">
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-300">Parcela {idx + 1} (Tít. #{bol.IDTITULO})</span>
                            <span className="font-mono text-emerald-400">{fmtCurrency(parseFloat(bol.VALTITULO))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-slate-400">Vencimento: {bol.DTVENCIMENTO ? new Date(bol.DTVENCIMENTO).toLocaleDateString('pt-BR') : 'N/A'}</span>
                            <span className={`text-[10px] font-bold ${bol.FLAGBAIXADA === 'T' ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {bol.FLAGBAIXADA === 'T' ? `PAGO EM ${bol.DTULTIMOPAGAMENTO ? new Date(bol.DTULTIMOPAGAMENTO).toLocaleDateString('pt-BR') : 'N/A'}` : 'PENDENTE'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-center py-2">Nenhum boleto vinculado encontrado para esta nota.</div>
                  )}
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    onClick={() => handleApplyAction("Notificar fornecedor Nestle sobre contestação de nota")}
                    className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/10 hover:opacity-90 transition cursor-pointer text-center"
                  >
                    Enviar Contestação ao Fornecedor
                  </button>
                  <button
                    onClick={() => handleApplyAction("Aprovar nota com ressalva no financeiro")}
                    className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold text-xs text-slate-300 transition cursor-pointer text-center"
                  >
                    Aprovar com Ressalva (Ajustar Financeiro)
                  </button>
                </div>
              </div>
            )}

            {/* Content: Ruptura */}
            {activeModal === "ruptura" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-slate-100">Alerta de Ruptura de Estoque</h3>
                    <p className="text-[10px] text-slate-400">Nível Crítico de Suprimento Logístico</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 bg-black/45 p-4 rounded-xl border border-white/5 text-xs text-slate-300">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Item / Produto:</span>
                    <span className="font-bold text-slate-200">Azeite de Oliva Extra Virgem 500ml</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Localização física:</span>
                    <span className="font-semibold text-slate-200">Filial 1 (Centro)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Estoque Atual:</span>
                    <span className="font-mono text-rose-400 font-extrabold">2 unidades (Crítico)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Giro Médio (30 dias):</span>
                    <span className="font-mono text-slate-300">45 unidades / mês</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Cobertura de Estoque:</span>
                    <span className="font-mono text-rose-500 font-bold">~1.3 dias</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Fornecedor Recomendado:</span>
                    <span className="font-semibold text-slate-300">Bunge Alimentos S.A.</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Custo Unitário Previsto:</span>
                    <span className="font-mono text-slate-300">{fmtCurrency(24.90)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Sugestão de Reposição:</span>
                    <span className="font-mono text-indigo-400 font-bold">Pedir 43 unidades (Estoque Máximo)</span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-sm">
                    <span className="text-slate-300">Investimento Estimado:</span>
                    <span className="font-mono text-primary">{fmtCurrency(1070.70)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    onClick={() => handleApplyAction("Gerar Ordem Compra Azeite com Bunge")}
                    className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/10 hover:opacity-90 transition cursor-pointer text-center"
                  >
                    Emitir Ordem de Compra Automática
                  </button>
                  <button
                    onClick={() => handleApplyAction("Solicitar transferência interna de estoque de outra filial")}
                    className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold text-xs text-slate-300 transition cursor-pointer text-center"
                  >
                    Transferir de Outra Filial (Filial 2 possui 12un)
                  </button>
                </div>
              </div>
            )}

            {/* Content: Desconto */}
            {activeModal === "desconto" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-slate-100">Desconto por Antecipação (DDA)</h3>
                    <p className="text-[10px] text-slate-400">Otimização Financeira e Tesouraria</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 bg-black/45 p-4 rounded-xl border border-white/5 text-xs text-slate-300">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Título / Duplicata:</span>
                    <span className="font-mono text-slate-200">#55291-C</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Credor:</span>
                    <span className="font-semibold text-slate-200">NESTLE BRASIL LTDA</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Valor Original do Título:</span>
                    <span className="font-mono text-slate-300 font-bold">{fmtCurrency(3450.00)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Vencimento Original:</span>
                    <span className="font-mono text-slate-400 font-semibold">30/05/2026 (11 dias)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Desconto Ofertado:</span>
                    <span className="font-mono text-emerald-400 font-bold">2.5%</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Valor Líquido Antecipado:</span>
                    <span className="font-mono text-emerald-500 font-extrabold">{fmtCurrency(3363.75)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Custo de Oportunidade (Anualizado):</span>
                    <span className="font-mono text-indigo-400 font-semibold">82.5% a.a.</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Saldo Disponível em Caixa:</span>
                    <span className="font-mono text-emerald-400 font-semibold">{fmtCurrency(289412.00)}</span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-sm">
                    <span className="text-slate-300">Desconto / Economia Líquida:</span>
                    <span className="font-mono text-emerald-400">{fmtCurrency(86.25)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    onClick={() => handleApplyAction("Realizar pagamento antecipado Nestle DDA")}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/10 hover:opacity-90 transition cursor-pointer text-center"
                  >
                    Autorizar Pagamento Antecipado (DDA)
                  </button>
                  <button
                    onClick={() => handleApplyAction("Agendar pagamento para 22/05 (limite do desconto)")}
                    className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold text-xs text-slate-300 transition cursor-pointer text-center"
                  >
                    Agendar para Limite da Regra (22/05)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

