import { useState, useEffect, useCallback } from "react";
import {
  Scale, FileSearch, AlertTriangle, CheckCircle2, FileMinus,
  BarChart3, Brain, Wrench, FileText,
  TrendingDown, AlertOctagon, ShieldCheck, Percent,
  FileX, Building2, RefreshCw, Loader2, ShieldAlert,
  FileCheck, Activity, XCircle, Clock
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { FiscalXmlSpedCompareSubModule } from "./FiscalXmlSpedCompareSubModule";

interface AuditorFiscalModuleProps {
  selectedStore: string;
  globalStartDate: string;
  globalEndDate: string;
  dbLojas?: any[];
}

const CAMPOS_COMPARADOS = [
  "Chave NF-e", "Número", "Série", "Data", "Emitente", "Destinatário",
  "CFOP", "CST", "CSOSN", "NCM", "CEST", "Alíquota", "ICMS", "ST",
  "IPI", "PIS", "COFINS", "FCP", "Valor Produto", "Valor Total", "Quantidade", "Unidade"
];

const RELATORIOS = [
  { label: "Auditoria Fiscal Completa", icon: FileSearch },
  { label: "Validações SPED por Regra", icon: ShieldAlert },
  { label: "Inconsistências SPED por Período", icon: AlertTriangle },
  { label: "NF-e Emitidas por Status SEFAZ", icon: FileCheck },
  { label: "NF-e Recebidas de Terceiros", icon: FileText },
  { label: "Divergências de Conferência", icon: AlertOctagon },
  { label: "Notas Não Escrituradas", icon: FileMinus },
  { label: "Tributação por Produto e UF", icon: Percent },
  { label: "Conferência NF-e por Fornecedor", icon: ShieldCheck },
  { label: "Diferença de Impostos por Período", icon: TrendingDown },
  { label: "Produtos com CST Inconsistente", icon: Wrench },
];

const COLORS = ["#f43f5e","#f97316","#eab308","#22c55e","#06b6d4","#8b5cf6","#ec4899","#64748b"];

function fmtCur(v: number | null | undefined) {
  if (!v && v !== 0) return "R$ 0,00";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtNum(v: number | null | undefined) {
  if (!v && v !== 0) return "0";
  return Number(v).toLocaleString("pt-BR");
}
function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDateOnly(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

type SubTab = "dashboard" | "validacoes-sped" | "nfe-autorizadas" | "divergencias" | "nao-escrituradas" | "conf-nfe" | "ranking" | "relatorios" | "compare-sped";

export function AuditorFiscalModule({ selectedStore, globalStartDate, globalEndDate, dbLojas = [] }: AuditorFiscalModuleProps) {
  const [subTab, setSubTab] = useState<SubTab>("dashboard");
  const [loading, setLoading] = useState(false);
  const [filial, setFilial] = useState(selectedStore);
  const [startDate, setStartDate] = useState(globalStartDate);
  const [endDate, setEndDate] = useState(globalEndDate);
  const [nfeTipo, setNfeTipo] = useState<"emitidas" | "recebidas">("emitidas");

  useEffect(() => { setFilial(selectedStore); }, [selectedStore]);
  useEffect(() => { if (globalStartDate) setStartDate(globalStartDate); }, [globalStartDate]);
  useEffect(() => { if (globalEndDate) setEndDate(globalEndDate); }, [globalEndDate]);

  const [dashboard, setDashboard] = useState<any>(null);
  const [validacoes, setValidacoes] = useState<any>(null);
  const [nfeData, setNfeData] = useState<any>(null);
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [divergencias, setDivergencias] = useState<any[]>([]);
  const [naoEscrituradas, setNaoEscrituradas] = useState<any[]>([]);
  const [confere, setConfere] = useState<any[]>([]);

  const buildQs = useCallback(() => {
    const p = new URLSearchParams({ startDate, endDate });
    if (filial && filial !== "todas") p.set("idEmpresa", filial);
    return p.toString();
  }, [filial, startDate, endDate]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const qs = buildQs();
    const baseQs = new URLSearchParams({ startDate, endDate }).toString();
    try {
      const [dash, val, nfe, rank, div, nao, conf] = await Promise.all([
        fetch(`/api/auditor-fiscal/dashboard?${qs}`).then(r => r.json()).catch(() => ({})),
        fetch(`/api/auditor-fiscal/validacoes-sped?${baseQs}`).then(r => r.json()).catch(() => ({})),
        fetch(`/api/auditor-fiscal/nfe-autorizadas?${qs}`).then(r => r.json()).catch(() => ({})),
        fetch(`/api/auditor-fiscal/validacoes-ranking?${baseQs}`).then(r => r.json()).catch(() => ({ lista: [] })),
        fetch(`/api/auditor-fiscal/divergencias?${qs}`).then(r => r.json()).catch(() => ({ lista: [] })),
        fetch(`/api/auditor-fiscal/nao-escrituradas?${qs}`).then(r => r.json()).catch(() => ({ lista: [] })),
        fetch(`/api/auditor-fiscal/confere-nfe?${qs}`).then(r => r.json()).catch(() => ({ lista: [] })),
      ]);
      setDashboard(dash);
      setValidacoes(val);
      setNfeData(nfe);
      setRankingData(rank.lista || []);
      setDivergencias(div.lista || []);
      setNaoEscrituradas(nao.lista || []);
      setConfere(conf.lista || []);
    } catch (e) {
      toast.error("Erro ao carregar dados fiscais do DB2.");
    } finally {
      setLoading(false);
    }
  }, [buildQs, startDate, endDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const d = dashboard || {};
  const val = validacoes || {};
  const nfe = nfeData || {};

  const totalInconsistencias = parseInt(val.totais?.TOTAL_INCONSISTENCIAS) || 0;
  const totalValidacoes = parseInt(val.totais?.TOTAL_VALIDACOES) || 0;
  const regrasComErro = parseInt(val.totais?.REGRAS_COM_ERRO) || 0;

  const pctOk = d.totalNf > 0
    ? (((d.totalNf - d.notasDivergentes - d.notasNaoEscrituradas) / d.totalNf) * 100).toFixed(1)
    : "—";
  const scoreNum = d.totalNf > 0
    ? Math.max(0, Math.min(100, Math.round(100 - ((d.notasDivergentes + d.notasNaoEscrituradas) / d.totalNf) * 100)))
    : 100;

  const subTabs: { id: SubTab; label: string; icon: any; badge?: string }[] = [
    { id: "dashboard",         label: "Dashboard",          icon: BarChart3 },
    { id: "validacoes-sped",   label: "Validações SPED",    icon: ShieldAlert, badge: totalInconsistencias > 0 ? String(totalInconsistencias) : undefined },
    { id: "nfe-autorizadas",   label: "NF-e SEFAZ",         icon: FileCheck },
    { id: "divergencias",      label: "Divergências",       icon: AlertTriangle },
    { id: "nao-escrituradas",  label: "Não Escrituradas",   icon: FileMinus },
    { id: "conf-nfe",          label: "Conf. NF-e",         icon: FileSearch },
    { id: "compare-sped",      label: "Comparar SPED",      icon: FileSearch },
    { id: "ranking",           label: "Ranking",            icon: TrendingDown },
    { id: "relatorios",        label: "Relatórios",         icon: FileText },
  ];

  const nomeLoja = (id: any) => dbLojas.find((l: any) => String(l.IDEMPRESA) === String(id))?.NOMEFANTASIA || `Emp. ${id}`;

  return (
    <div className="flex flex-col gap-5 w-full max-w-full mx-auto mt-4 px-4 md:px-8 pb-10">

      {/* HEADER + FILTROS */}
      <div className="glass-strong rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 shrink-0">
            <Scale className="w-6 h-6 text-rose-400" />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-bold text-slate-100 truncate">Auditor Fiscal Inteligente</h1>
            <p className="text-[11px] text-slate-400 truncate">SPED · XML NF-e / NFC-e · ERP · Cadastro Fiscal</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
          <div className="flex items-center gap-1.5 bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select value={filial} onChange={e => setFilial(e.target.value)} className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none">
              <option value="todas">Todas as Filiais</option>
              {dbLojas.map((l: any) => (
                <option key={l.IDEMPRESA} value={String(l.IDEMPRESA)}>
                  {l.NOMEFANTASIA || l.RAZAOSOCIAL || `Filial ${l.IDEMPRESA}`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2">
            <span className="text-[10px] text-slate-400 font-semibold">DE</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs text-slate-200 focus:outline-none" />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2">
            <span className="text-[10px] text-slate-400 font-semibold">ATÉ</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs text-slate-200 focus:outline-none" />
          </div>
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 rounded-xl text-xs font-bold text-white transition">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar
          </button>
        </div>
      </div>

      {/* SUB-TABS (sem scroll) */}
      <div className="flex flex-wrap gap-0.5 border-b border-white/10">
        {subTabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-[11px] font-bold border-b-2 transition whitespace-nowrap relative
                ${subTab === t.id ? "border-rose-500 text-rose-400" : "border-transparent text-slate-400 hover:text-slate-200 hover:border-white/20"}`}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.badge && (
                <span className="ml-0.5 px-1.5 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full leading-none">{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center py-16"><Loader2 className="w-10 h-10 text-rose-400 animate-spin" /></div>
      )}

      {!loading && (
        <>
          {/* ─── DASHBOARD ─── */}
          {subTab === "dashboard" && (
            <div className="flex flex-col gap-5">
              <div className="glass-strong rounded-2xl px-6 py-4 flex flex-wrap items-center gap-4 border border-emerald-500/20">
                <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse shrink-0" />
                <span className="text-emerald-400 font-bold text-lg">{pctOk}% OK</span>
                <span className="text-slate-400 text-sm">· {startDate} → {endDate} · Dados reais DB2</span>
                {totalInconsistencias > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {fmtNum(totalInconsistencias)} inconsistências SPED detectadas
                  </span>
                )}
                <div className="ml-auto text-right">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Score Fiscal</div>
                  <div className={`text-4xl font-serif font-black tabular-nums leading-none ${scoreNum >= 95 ? "text-emerald-400" : scoreNum >= 80 ? "text-yellow-400" : "text-rose-400"}`}>{scoreNum}</div>
                  <div className={`text-[10px] font-semibold ${scoreNum >= 95 ? "text-emerald-500" : scoreNum >= 80 ? "text-yellow-500" : "text-rose-500"}`}>{scoreNum >= 95 ? "EXCELENTE" : scoreNum >= 80 ? "ATENÇÃO" : "CRÍTICO"}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "NFs no Sistema", value: fmtNum(d.totalNf), color: "cyan", icon: FileText, sub: "Total NF entrada + saída" },
                  { label: "NF-e Autorizadas", value: fmtNum(nfe.totalEmitidas), color: "indigo", icon: FileCheck, sub: "NF-e emitidas com protocolo SEFAZ" },
                  { label: "NF-e Recebidas", value: fmtNum(nfe.totalRecebidas), color: "purple", icon: FileSearch, sub: "NF-e de terceiros vinculadas" },
                  { label: "Inconsist. SPED", value: fmtNum(totalInconsistencias), color: totalInconsistencias > 0 ? "rose" : "emerald", icon: ShieldAlert, sub: `${regrasComErro} regras com ocorrência` },
                ].map(k => {
                  const Icon = k.icon;
                  return (
                    <div key={k.label} className="glass-strong rounded-2xl p-5 flex flex-col gap-3 hover:bg-white/[0.03] transition">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-tight">{k.label}</span>
                        <Icon className={`w-4 h-4 text-${k.color}-400 shrink-0`} />
                      </div>
                      <div className={`text-3xl font-black font-serif text-${k.color}-400 tabular-nums`}>{k.value}</div>
                      <div className="text-[11px] text-slate-500 border-t border-white/5 pt-2">{k.sub}</div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Valor Total NFs", value: fmtCur(d.valorTotal), color: "slate" },
                  { label: "ICMS ST Total", value: fmtCur(d.totalIcmsst), color: "amber" },
                  { label: "IPI Total", value: fmtCur(d.totalIpi), color: "purple" },
                  { label: "Validações SPED", value: fmtNum(totalValidacoes), color: "orange" },
                ].map(k => (
                  <div key={k.label} className="glass-strong rounded-2xl p-5 flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k.label}</span>
                    <div className={`text-xl font-black font-serif text-${k.color}-400 tabular-nums`}>{k.value}</div>
                  </div>
                ))}
              </div>

              <div className="glass-strong rounded-2xl p-5">
                <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-3">Campos verificados automaticamente pelo comparador:</div>
                <div className="flex flex-wrap gap-2">
                  {CAMPOS_COMPARADOS.map(c => (
                    <span key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                      <CheckCircle2 className="w-3 h-3" /> {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── VALIDAÇÕES SPED ─── */}
          {subTab === "validacoes-sped" && (
            <div className="flex flex-col gap-5">
              {/* Totais */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Inconsistências", value: fmtNum(totalInconsistencias), color: totalInconsistencias > 0 ? "rose" : "emerald", icon: AlertTriangle },
                  { label: "Validações Executadas", value: fmtNum(totalValidacoes), color: "orange", icon: Activity },
                  { label: "Regras com Ocorrência", value: fmtNum(regrasComErro), color: "amber", icon: ShieldAlert },
                ].map(k => {
                  const Icon = k.icon;
                  return (
                    <div key={k.label} className="glass-strong rounded-2xl p-5 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k.label}</span>
                        <Icon className={`w-4 h-4 text-${k.color}-400`} />
                      </div>
                      <div className={`text-3xl font-black font-serif text-${k.color}-400 tabular-nums`}>{k.value}</div>
                    </div>
                  );
                })}
              </div>

              {/* Gráfico de barras com ranking SPED real */}
              {rankingData.length > 0 && (
                <div className="glass-strong rounded-2xl p-5">
                  <h3 className="font-serif font-bold text-slate-100 mb-4">Ranking de Inconsistências por Regra SPED</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={rankingData.map(r => ({ name: r.DESCRICAO?.slice(0, 35) + (r.DESCRICAO?.length > 35 ? '…' : ''), total: parseInt(r.TOTAL) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                        formatter={(v: number) => [fmtNum(v), "Inconsistências"]}
                      />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {rankingData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Resumo por regra */}
              <div className="glass-strong rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-serif font-bold text-slate-100">Regras com Inconsistências — Dados Reais CISS/SPED</h3>
                  <span className="text-[11px] text-rose-400 font-bold bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                    {val.resumo?.length || 0} regras
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        <th className="px-6 py-3">Regra de Validação</th>
                        <th className="px-4 py-3 text-center">Momento</th>
                        <th className="px-4 py-3 text-right">Ocorrências</th>
                        <th className="px-4 py-3 text-right">Total Inconsist.</th>
                        <th className="px-4 py-3">Última Detecção</th>
                        <th className="px-4 py-3">Correção Sugerida</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(val.resumo || []).length === 0 ? (
                        <tr><td colSpan={6} className="py-12 text-center text-slate-500">Nenhuma inconsistência SPED no período.</td></tr>
                      ) : (val.resumo || []).map((r: any, idx: number) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition text-slate-300">
                          <td className="px-6 py-3 max-w-[280px]">
                            <div className="font-bold text-slate-100 text-[11px] leading-snug">{r.DESCRICAO}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              r.MOMENTOVALIDACAO === 'G' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              r.MOMENTOVALIDACAO === 'V' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                              'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }`}>
                              {r.MOMENTOVALIDACAO === 'G' ? 'Geração' : r.MOMENTOVALIDACAO === 'V' ? 'Validação' : r.MOMENTOVALIDACAO}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-orange-400">{fmtNum(r.QTD_OCORRENCIAS)}</td>
                          <td className="px-4 py-3 text-right font-mono font-black text-rose-400 text-base">{fmtNum(r.TOTAL_INCONSISTENCIAS)}</td>
                          <td className="px-4 py-3 text-[10px] text-slate-400">{fmtDate(r.ULTIMA_OCORRENCIA)}</td>
                          <td className="px-4 py-3 text-[10px] text-slate-500 max-w-[200px] leading-snug">{r.DESCRCORRECAO || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detalhes cronológicos */}
              <div className="glass-strong rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h3 className="font-serif font-bold text-slate-100">Histórico Cronológico de Validações</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Cada execução de validação com inconsistências detectadas.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        <th className="px-6 py-3">Data/Hora</th>
                        <th className="px-4 py-3">Regra</th>
                        <th className="px-4 py-3 text-center">Momento</th>
                        <th className="px-4 py-3 text-right">Inconsistências</th>
                        <th className="px-4 py-3 text-center">Usuário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(val.detalhe || []).slice(0, 50).map((d: any, idx: number) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition text-slate-300">
                          <td className="px-6 py-2.5 font-mono text-[11px] text-slate-400">{fmtDate(d.DATAVALIDACAO)}</td>
                          <td className="px-4 py-2.5 max-w-[260px] text-[11px] text-slate-200 leading-snug">{d.DESCRICAO}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              d.MOMENTOVALIDACAO === 'G' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}>
                              {d.MOMENTOVALIDACAO === 'G' ? 'GERAÇÃO' : 'VALIDAÇÃO'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-400 text-sm">{d.QTDINCONSISTENCIA}</td>
                          <td className="px-4 py-2.5 text-center text-slate-500 text-[11px]">#{d.IDUSUARIO}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── NF-e AUTORIZADAS (SEFAZ) ─── */}
          {subTab === "nfe-autorizadas" && (
            <div className="flex flex-col gap-5">
              {/* Resumo por status */}
              <div className="glass-strong rounded-2xl p-5">
                <h3 className="font-serif font-bold text-slate-100 mb-4">Status das NF-e Emitidas (protocolo SEFAZ)</h3>
                <div className="flex flex-wrap gap-3">
                  {(nfe.resumoStatus || []).map((s: any, idx: number) => (
                    <div key={idx} className={`flex flex-col gap-1 px-4 py-3 rounded-xl border ${
                      s.TIPOSITUACAO === 'A' ? 'bg-emerald-500/10 border-emerald-500/30' :
                      s.TIPOSITUACAO === 'C' ? 'bg-rose-500/10 border-rose-500/30' :
                      s.TIPOSITUACAO === 'D' ? 'bg-slate-500/10 border-slate-500/30' :
                      'bg-amber-500/10 border-amber-500/30'
                    }`}>
                      <div className={`text-[10px] font-bold uppercase ${
                        s.TIPOSITUACAO === 'A' ? 'text-emerald-400' :
                        s.TIPOSITUACAO === 'C' ? 'text-rose-400' :
                        'text-slate-400'
                      }`}>
                        {s.TIPOSITUACAO === 'A' ? '✅ Autorizada' :
                         s.TIPOSITUACAO === 'C' ? '❌ Cancelada' :
                         s.TIPOSITUACAO === 'D' ? '⚠️ Denegada' :
                         s.TIPOSITUACAO || '?'} · Cód. {s.CODIGOSTATUSRECEITA}
                      </div>
                      <div className="text-lg font-black font-serif text-slate-100">{fmtNum(s.TOTAL)}</div>
                      <div className="text-[11px] text-slate-400">{fmtCur(s.VALOR_TOTAL)}</div>
                      <div className="text-[10px] text-slate-500 max-w-[200px] leading-snug">{s.DESCRICAOSTATUSRECEITA}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggle emitidas/recebidas */}
              <div className="flex gap-2">
                <button onClick={() => setNfeTipo("emitidas")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${nfeTipo === "emitidas" ? "bg-rose-600 border-rose-500 text-white" : "border-white/10 text-slate-400 hover:text-slate-200"}`}>
                  NF-e Emitidas ({fmtNum(nfe.totalEmitidas)})
                </button>
                <button onClick={() => setNfeTipo("recebidas")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${nfeTipo === "recebidas" ? "bg-rose-600 border-rose-500 text-white" : "border-white/10 text-slate-400 hover:text-slate-200"}`}>
                  NF-e Recebidas de Terceiros ({fmtNum(nfe.totalRecebidas)})
                </button>
              </div>

              {/* Tabela emitidas */}
              {nfeTipo === "emitidas" && (
                <div className="glass-strong rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          <th className="px-6 py-3">Chave NF-e</th>
                          <th className="px-4 py-3">Empresa</th>
                          <th className="px-4 py-3">Destinatário</th>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3 text-center">Situação</th>
                          <th className="px-4 py-3 text-center">Ambiente</th>
                          <th className="px-4 py-3 text-right">Valor</th>
                          <th className="px-4 py-3 text-right">ICMS ST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(nfe.emitidas || []).length === 0 ? (
                          <tr><td colSpan={8} className="py-12 text-center text-slate-500">Sem NF-e emitidas no período.</td></tr>
                        ) : (nfe.emitidas || []).map((n: any, idx: number) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition text-slate-300">
                            <td className="px-6 py-2.5 font-mono text-[10px] text-slate-400 max-w-[160px] truncate" title={n.CHAVENFE}>{n.CHAVENFE?.slice(0, 20)}…</td>
                            <td className="px-4 py-2.5 text-slate-400 text-[11px]">{nomeLoja(n.IDEMPRESA)}</td>
                            <td className="px-4 py-2.5 max-w-[180px] truncate font-medium" title={n.DESTINATARIO}>{n.DESTINATARIO || "—"}</td>
                            <td className="px-4 py-2.5 text-slate-400">{fmtDateOnly(n.DATA_NF)}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                n.TIPOSITUACAO === 'A' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                n.TIPOSITUACAO === 'C' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}>
                                {n.TIPOSITUACAO === 'A' ? 'Autorizada' : n.TIPOSITUACAO === 'C' ? 'Cancelada' : n.TIPOSITUACAO || '?'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`text-[10px] font-bold ${n.AMBIENTEAUTORIZACAO === 'P' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                {n.AMBIENTEAUTORIZACAO === 'P' ? 'Produção' : 'Homolog.'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold">{fmtCur(n.VALCONTABIL)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-amber-400">{fmtCur(n.ICMSST)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tabela recebidas */}
              {nfeTipo === "recebidas" && (
                <div className="glass-strong rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          <th className="px-6 py-3">Chave NF-e</th>
                          <th className="px-4 py-3">Empresa</th>
                          <th className="px-4 py-3">Emitente (Fornecedor)</th>
                          <th className="px-4 py-3">CNPJ/CPF</th>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Espécie</th>
                          <th className="px-4 py-3 text-right">Valor</th>
                          <th className="px-4 py-3 text-right">ICMS ST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(nfe.recebidas || []).length === 0 ? (
                          <tr><td colSpan={8} className="py-12 text-center text-slate-500">Sem NF-e recebidas no período.</td></tr>
                        ) : (nfe.recebidas || []).map((n: any, idx: number) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition text-slate-300">
                            <td className="px-6 py-2.5 font-mono text-[10px] text-slate-400 max-w-[160px] truncate" title={n.CHAVENFE}>{n.CHAVENFE?.slice(0, 20)}…</td>
                            <td className="px-4 py-2.5 text-slate-400 text-[11px]">{nomeLoja(n.IDEMPRESA)}</td>
                            <td className="px-4 py-2.5 max-w-[180px] truncate font-medium" title={n.EMITENTE}>{n.EMITENTE || "—"}</td>
                            <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{n.CNPJCPF || "—"}</td>
                            <td className="px-4 py-2.5 text-slate-400">{fmtDateOnly(n.DATA_NF)}</td>
                            <td className="px-4 py-2.5 text-slate-400">{n.ESPECIENOTA || "—"}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold">{fmtCur(n.VALCONTABIL)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-amber-400">{fmtCur(n.ICMSST)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── DIVERGÊNCIAS ─── */}
          {subTab === "divergencias" && (
            <div className="glass-strong rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-serif font-bold text-slate-100">Divergências de Conferência — CONFERE_DIVERGENCIA</h3>
                <span className="text-[11px] text-rose-400 font-bold bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">{divergencias.length} registros</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="px-6 py-3">Planilha</th>
                      <th className="px-4 py-3">Empresa</th>
                      <th className="px-4 py-3">Seq.</th>
                      <th className="px-4 py-3 text-right">Qtd Divergente</th>
                      <th className="px-4 py-3 text-right">Qtd a Devolver</th>
                      <th className="px-4 py-3">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divergencias.length === 0 ? (
                      <tr><td colSpan={6} className="py-12 text-center text-emerald-500 font-bold">✅ Nenhuma divergência no período</td></tr>
                    ) : divergencias.map((d: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.03] transition text-slate-300">
                        <td className="px-6 py-3 font-mono font-bold text-slate-100">{d.IDPLANILHA}</td>
                        <td className="px-4 py-3">{nomeLoja(d.IDEMPRESA)}</td>
                        <td className="px-4 py-3 text-slate-400">{d.NUMSEQUENCIA}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">{d.QTDDIVERGENTE}</td>
                        <td className="px-4 py-3 text-right font-mono text-orange-400">{d.QTDDEVOLVER}</td>
                        <td className="px-4 py-3 text-slate-400">{fmtDateOnly(d.DTMOVIMENTO)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── NÃO ESCRITURADAS ─── */}
          {subTab === "nao-escrituradas" && (
            <div className="flex flex-col gap-4">
              <div className="glass-strong rounded-2xl px-5 py-4 border border-rose-500/20 flex items-center gap-3">
                <FileMinus className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <div className="font-bold text-rose-400 text-sm">Pedidos de Compra sem Baixa em Estoque</div>
                  <div className="text-xs text-slate-400">PEDIDO_COMPRA com IDPLANILHA = NULL — NF não escriturada.</div>
                </div>
                <div className={`ml-auto font-black text-2xl ${naoEscrituradas.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{naoEscrituradas.length}</div>
              </div>
              <div className="glass-strong rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        <th className="px-6 py-3">Pedido</th>
                        <th className="px-4 py-3">Empresa</th>
                        <th className="px-4 py-3">Fornecedor</th>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3 text-right">Frete</th>
                        <th className="px-4 py-3">Chave NF-e</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {naoEscrituradas.length === 0 ? (
                        <tr><td colSpan={7} className="py-12 text-center text-emerald-500 font-bold">✅ Nenhum pedido sem escrituração</td></tr>
                      ) : naoEscrituradas.map((n: any, idx: number) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.03] transition text-slate-300">
                          <td className="px-6 py-3 font-mono font-bold text-slate-100">{n.IDPEDIDO}</td>
                          <td className="px-4 py-3 text-slate-400">{nomeLoja(n.IDEMPRESA)}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate font-medium" title={n.FORNECEDOR}>{n.FORNECEDOR || "—"}</td>
                          <td className="px-4 py-3 text-slate-400">{fmtDateOnly(n.DATA_PEDIDO)}</td>
                          <td className="px-4 py-3 text-right font-mono">{fmtCur(n.VALFRETE)}</td>
                          <td className="px-4 py-3 font-mono text-[10px] text-slate-500 max-w-[160px] truncate" title={n.CHAVENFE || ""}>
                            {n.CHAVENFE ? n.CHAVENFE.slice(0, 20) + "…" : <span className="text-rose-500">SEM CHAVE</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">NÃO ESCRITURADA</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── CONF. NF-e ─── */}
          {subTab === "conf-nfe" && (
            <div className="glass-strong rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-slate-100">Conferência de NF-e — CONFERE_NFE</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Notas fiscais conferidas com chave NF-e, número, série e situação.</p>
                </div>
                <span className="text-[11px] text-cyan-400 font-bold bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">{confere.length} NFs</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="px-6 py-3">Nº Nota</th>
                      <th className="px-4 py-3">Série</th>
                      <th className="px-4 py-3">Empresa</th>
                      <th className="px-4 py-3">Fornecedor</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3 text-right">Qtd</th>
                      <th className="px-4 py-3 text-right">Valor Bruto</th>
                      <th className="px-4 py-3 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confere.length === 0 ? (
                      <tr><td colSpan={8} className="py-12 text-center text-slate-500">Sem conferências no período.</td></tr>
                    ) : confere.map((c: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.03] transition text-slate-300">
                        <td className="px-6 py-3 font-mono font-bold text-slate-100">{c.NUMNOTA}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{c.SERIENOTA || "—"}</td>
                        <td className="px-4 py-3 text-slate-400">{nomeLoja(c.IDEMPRESA)}</td>
                        <td className="px-4 py-3 max-w-[180px] truncate font-medium" title={c.FORNECEDOR}>{c.FORNECEDOR || "—"}</td>
                        <td className="px-4 py-3 text-slate-400">{fmtDateOnly(c.DATA_NF)}</td>
                        <td className="px-4 py-3 text-right font-mono">{c.QTDPRODUTO}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">{fmtCur(c.VALTOTBRUTO)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            c.SITUACAOCONFERENCIA === 'C' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            c.SITUACAOCONFERENCIA === 'D' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                            {c.SITUACAOCONFERENCIA === 'C' ? 'Conforme' : c.SITUACAOCONFERENCIA === 'D' ? 'Divergente' : 'Pendente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── RANKING ─── */}
          {subTab === "ranking" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="glass-strong rounded-2xl p-6">
                <h3 className="font-serif text-lg font-bold text-slate-100 mb-4">Inconsistências SPED por Tipo</h3>
                {rankingData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-emerald-400 gap-2">
                    <CheckCircle2 className="w-10 h-10" />
                    <div className="font-bold">Sem inconsistências no período</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={rankingData.map(r => ({ name: r.DESCRICAO, value: parseInt(r.TOTAL) }))}
                        cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={3} dataKey="value">
                        {rankingData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }}
                        formatter={(v: number) => [fmtNum(v), "Inconsistências"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="glass-strong rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h3 className="font-serif font-bold text-slate-100">Top Regras SPED com Mais Erros</h3>
                </div>
                <div className="flex flex-col divide-y divide-white/5">
                  {rankingData.length === 0 ? (
                    <div className="p-8 text-center text-emerald-500 font-bold">✅ Nenhuma inconsistência</div>
                  ) : rankingData.map((item: any, idx: number) => {
                    const max = parseInt(rankingData[0]?.TOTAL) || 1;
                    const pct = Math.round((parseInt(item.TOTAL) / max) * 100);
                    return (
                      <div key={idx} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition">
                        <div className="text-lg font-black font-serif text-slate-500 w-6 text-center">{idx + 1}</div>
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <div className="flex-1">
                          <div className="text-[11px] font-bold text-slate-200 leading-tight">{item.DESCRICAO}</div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
                          </div>
                        </div>
                        <div className="font-black text-lg font-serif" style={{ color: COLORS[idx % COLORS.length] }}>{fmtNum(item.TOTAL)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── RELATÓRIOS ─── */}
          {subTab === "compare-sped" && (
            <FiscalXmlSpedCompareSubModule startDate={startDate} endDate={endDate} />
          )}

          {subTab === "relatorios" && (
            <div className="glass-strong rounded-2xl p-6">
              <h3 className="font-serif text-lg font-bold text-slate-100 mb-1">Relatórios Fiscais</h3>
              <p className="text-xs text-slate-400 mb-5">Exporte relatórios em PDF ou CSV para uso interno ou envio à SEFAZ.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {RELATORIOS.map(r => {
                  const Icon = r.icon;
                  return (
                    <button key={r.label}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-rose-500/30 hover:bg-rose-500/5 transition text-left group">
                      <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-rose-500/10 transition">
                        <Icon className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-300 group-hover:text-slate-100 transition">{r.label}</div>
                        <div className="text-[11px] text-slate-500">{startDate} → {endDate}</div>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                        <span className="text-[10px] px-2 py-1 rounded bg-slate-700 text-slate-300 font-bold">PDF</span>
                        <span className="text-[10px] px-2 py-1 rounded bg-slate-700 text-slate-300 font-bold">CSV</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
