import { useState, useEffect } from "react";
import { 
  FileText, Search, Check, AlertTriangle, Printer, Loader2, Database, X
} from "lucide-react";
import { toast } from "sonner";
import NfeViewer from "./NfeViewer";

interface ComparedItem {
  notaFiscal?: string;
  idEmpresa?: number;
  nomeLoja?: string;
  fornecedor?: string;
  itemIndex: number;
  code: string;
  description: string;
  ncm: string;
  cfop: string;
  vProd: number;
  vDesc: number;
  icmsCst: string;
  vIcms: number;
  pIcms: number;
  vIpi: number;
  pIpi: number;
  vPis: number;
  pPis: number;
  vCofins: number;
  pCofins: number;
  sped: {
    cfop: string;
    ncm: string;
    icmsCst: string;
    vIcms: number;
    pIcms: number;
    vIpi: number;
    pIpi: number;
    vPis: number;
    pPis: number;
    vCofins: number;
    pCofins: number;
  };
  status: "OK" | "DIVERGENTE";
  verified?: boolean;
}

interface FiscalXmlSpedCompareSubModuleProps {
  startDate?: string;
  endDate?: string;
}

export function FiscalXmlSpedCompareSubModule({ startDate, endDate }: FiscalXmlSpedCompareSubModuleProps) {
  const [loading, setLoading] = useState(false);
  const [comparedItems, setComparedItems] = useState<ComparedItem[]>([]);
  const [printMode, setPrintMode] = useState(false);
  const [summary, setSummary] = useState({ diverged: 0, checked: 0, total: 0 });

  const [selectedXml, setSelectedXml] = useState<string | null>(null);
  const [xmlModalOpen, setXmlModalOpen] = useState(false);
  const [loadingXml, setLoadingXml] = useState(false);

  useEffect(() => {
    if (printMode) {
      setTimeout(() => {
        window.print();
        setPrintMode(false);
      }, 500);
    }
  }, [printMode]);

  const handleFetchFromDb = async () => {
    if (!startDate || !endDate) {
      toast.error("Por favor, selecione um período global no painel.");
      return;
    }

    setLoading(true);
    setComparedItems([]);
    
    try {
      const res = await fetch("/api/fiscal/compare-sped-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, limit: 30 })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setComparedItems(data.items || []);
      toast.success(`Divergências carregadas automaticamente! Foram processadas ${data.count || 0} notas do banco.`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao buscar comparação. Verifique se o backend (API) está rodando.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewXml = async (numNota?: string, idEmpresa?: number) => {
    if (!numNota || !idEmpresa) return;
    setLoadingXml(true);
    setXmlModalOpen(true);
    setSelectedXml(null);
    try {
      const res = await fetch(`http://localhost:3001/api/fiscal/xml-nfe?numNota=${numNota}&idEmpresa=${idEmpresa}`);
      const data = await res.json();
      if (data.xml) setSelectedXml(data.xml);
      else toast.error("XML não encontrado no banco.");
    } catch (err) {
      toast.error("Erro ao buscar XML da nota.");
    } finally {
      setLoadingXml(false);
    }
  };

  const toggleVerify = (index: number) => {
    setComparedItems(prev => {
      const nw = [...prev];
      nw[index] = { ...nw[index], verified: !nw[index].verified };
      return nw;
    });
  };

  const fmtCurrency = (v: number) =>
    (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const divergentItems = comparedItems.filter(i => i.status === "DIVERGENTE");

  if (printMode) {
    return (
      <div className="bg-white text-black p-8 max-w-5xl mx-auto font-sans">
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold">Relatório de Divergências Fiscais - XML vs SPED</h1>
          <p className="text-sm text-gray-600 mt-2">Período: {startDate} a {endDate} | Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        </div>
        
        {divergentItems.length === 0 ? (
          <p>Nenhuma divergência encontrada no período.</p>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="p-2 border">Loja</th>
                <th className="p-2 border">NF-e</th>
                <th className="p-2 border">Fornecedor</th>
                <th className="p-2 border">Produto</th>
                <th className="p-2 border text-right">V. Prod.</th>
                <th className="p-2 border text-right">Desc.</th>
                <th className="p-2 border text-center">CST (XML)</th>
                <th className="p-2 border text-center">CST (SPED)</th>
                <th className="p-2 border text-right">Alíq. ICMS</th>
                <th className="p-2 border text-right">ICMS (XML)</th>
                <th className="p-2 border text-right">ICMS (SPED)</th>
                <th className="p-2 border text-right">IPI</th>
                <th className="p-2 border text-right">PIS</th>
                <th className="p-2 border text-right">COFINS</th>
                <th className="p-2 border text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {divergentItems.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="p-2 border">{item.idEmpresa || '-'}</td>
                  <td className="p-2 border font-mono">{item.notaFiscal || '-'}</td>
                  <td className="p-2 border truncate max-w-[150px]">{item.fornecedor || '-'}</td>
                  <td className="p-2 border font-semibold">{item.description}</td>
                  <td className="p-2 border text-right">{fmtCurrency(item.vProd)}</td>
                  <td className="p-2 border text-right text-red-600">{fmtCurrency(item.vDesc)}</td>
                  <td className="p-2 border text-center">{item.icmsCst || '-'}</td>
                  <td className="p-2 border text-center font-bold text-red-700">{item.sped.icmsCst || '-'}</td>
                  <td className="p-2 border text-right">
                    {item.pIcms}% → {item.sped.pIcms}%
                  </td>
                  <td className="p-2 border text-right">{fmtCurrency(item.vIcms)}</td>
                  <td className="p-2 border text-right font-bold text-red-700">{fmtCurrency(item.sped.vIcms)}</td>
                  <td className="p-2 border text-right">{fmtCurrency(item.vIpi)} → {fmtCurrency(item.sped.vIpi)}</td>
                  <td className="p-2 border text-right">{fmtCurrency(item.vPis)} → {fmtCurrency(item.sped.vPis)}</td>
                  <td className="p-2 border text-right">{fmtCurrency(item.vCofins)} → {fmtCurrency(item.sped.vCofins)}</td>
                  <td className="p-2 border text-center font-bold">
                    {item.verified ? <span className="text-green-600">VERIFICADO</span> : <span className="text-red-600">PENDENTE</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full">
      {comparedItems.length === 0 && (
        <div className="glass-strong rounded-2xl p-6 flex flex-col md:flex-row gap-6 border border-rose-500/10">
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">1. Buscar XMLs do Banco de Dados</h3>
            <p className="text-xs text-slate-400">
              A pesquisa utilizará as notas do período selecionado ({startDate} a {endDate}) e buscará os XMLs originais diretamente no banco DB2.
            </p>
            <button 
              onClick={handleFetchFromDb}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-rose-600 text-white hover:bg-rose-500 py-3 rounded-lg font-bold transition-all shadow-lg shadow-rose-500/20 w-full md:w-auto px-6"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
              {loading ? "Processando XMLs..." : "Puxar Automático do Banco"}
            </button>
          </div>
          
          <div className="flex-1 flex flex-col gap-4 justify-center items-start">
            <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-xl text-rose-300 text-sm w-full h-full flex flex-col justify-between">
              <div>
                <h4 className="font-bold flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> Comparador em Lote (SPED)</h4>
                <p className="text-xs text-rose-400/80 leading-relaxed">
                  Este processo agrupa automaticamente os itens divergentes de todas as notas buscadas. As divergências aparecerão abaixo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-rose-400" /></div>
      )}

      {comparedItems.length > 0 && !loading && (
        <div className="flex flex-col w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-end mb-4 px-2">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Divergências Encontradas (XML vs SPED)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Visualização Fullscreen. Mostrando as inconsistências fiscais processadas em {comparedItems.length} notas.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                {divergentItems.length} Divergências
              </span>
              <button
                onClick={() => setPrintMode(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-full font-bold text-xs transition border border-white/10"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button
                onClick={() => setComparedItems([])}
                className="flex items-center gap-2 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 px-4 py-1.5 rounded-full font-bold text-xs transition border border-rose-500/20"
              >
                Nova Busca
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-4">
            <table className="w-full text-left text-xs table-auto min-w-[1200px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-4 px-3 w-[120px]">Loja</th>
                  <th className="py-4 px-3 w-[80px]">NF-e</th>
                  <th className="py-4 px-3">Fornecedor</th>
                  <th className="py-4 px-3">Produto</th>
                  <th className="py-4 px-3 text-right">Valores</th>
                  <th className="py-4 px-3 text-right">CST</th>
                  <th className="py-4 px-3 text-right">Alíq. ICMS</th>
                  <th className="py-4 px-3 text-right">ICMS</th>
                  <th className="py-4 px-3 text-right">IPI</th>
                  <th className="py-4 px-3 text-right w-[140px]">PIS/COFINS</th>
                  <th className="py-4 px-3 text-center w-[80px]">Verif.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {divergentItems.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-emerald-400 font-bold"><Check className="w-8 h-8 mx-auto mb-2" />Nenhuma divergência encontrada nas notas puxadas!</td></tr>
                ) : (
                  divergentItems.map((item, idx) => {
                    const originalIndex = comparedItems.indexOf(item);
                    return (
                      <tr key={originalIndex} className={`transition-colors ${item.verified ? 'bg-emerald-500/10' : 'hover:bg-white/[0.02]'}`}>
                        <td className="px-3 py-4" title={item.nomeLoja}>
                          <div className="text-slate-400 font-mono text-[10px] mb-1">Loja {item.idEmpresa || '-'}</div>
                          <div className="text-slate-200 font-bold text-[11px] leading-tight break-words max-w-[150px]">{item.nomeLoja || '-'}</div>
                        </td>
                        <td 
                          className="px-3 py-4 font-mono text-cyan-400 font-bold text-sm cursor-pointer hover:underline"
                          onClick={() => handleViewXml(item.notaFiscal, item.idEmpresa)}
                          title="Clique para ver o XML original"
                        >
                          {item.notaFiscal || '-'}
                        </td>
                        <td className="px-3 py-4 break-words max-w-[200px] text-slate-400" title={item.fornecedor}>{item.fornecedor || '-'}</td>
                        <td className="px-3 py-4 break-words max-w-[250px] text-slate-100 font-semibold leading-tight" title={item.description}>{item.description}</td>
                        <td className="px-3 py-4 text-right">
                          <div className="text-slate-300 font-mono font-medium">{fmtCurrency(item.vProd)}</div>
                          {item.vDesc > 0 && <div className="text-rose-400 text-[11px] font-mono mt-1">-{fmtCurrency(item.vDesc)}</div>}
                        </td>
                        <td className="px-3 py-4 text-right font-mono text-sm">
                          <div className="text-slate-400 flex justify-end items-center gap-1.5"><span className="text-[10px] text-slate-600 font-sans">XML</span>{item.icmsCst || '-'}</div>
                          <div className={`flex justify-end items-center gap-1.5 mt-1 ${item.icmsCst !== item.sped.icmsCst ? "text-rose-500 font-bold" : "text-slate-500"}`}><span className="text-[10px] text-rose-500/50 font-sans">SPD</span>{item.sped.icmsCst || '-'}</div>
                        </td>
                        <td className="px-3 py-4 text-right font-mono text-sm">
                          <div className="text-slate-400 flex justify-end">{item.pIcms}%</div>
                          <div className={`flex justify-end mt-1 ${item.pIcms !== item.sped.pIcms ? "text-rose-500 font-bold" : "text-slate-500"}`}>{item.sped.pIcms}%</div>
                        </td>
                        <td className="px-3 py-4 text-right font-mono text-sm">
                          <div className="text-slate-400 flex justify-end">{fmtCurrency(item.vIcms)}</div>
                          <div className={`flex justify-end mt-1 ${item.vIcms !== item.sped.vIcms ? "text-rose-500 font-bold" : "text-slate-500"}`}>{fmtCurrency(item.sped.vIcms)}</div>
                        </td>
                        <td className="px-3 py-4 text-right font-mono text-sm">
                          <div className="text-slate-400 flex justify-end">{fmtCurrency(item.vIpi)}</div>
                          <div className={`flex justify-end mt-1 ${item.vIpi !== item.sped.vIpi ? "text-rose-500 font-bold" : "text-slate-500"}`}>{fmtCurrency(item.sped.vIpi)}</div>
                        </td>
                        <td className="px-3 py-4 text-right font-mono text-xs w-[140px]">
                          <div className="text-slate-400 flex justify-between items-center w-full" title="PIS XML">
                            <span className="text-[10px] text-slate-600 font-sans">P:</span> {fmtCurrency(item.vPis)}
                          </div>
                          <div className="text-slate-400 flex justify-between items-center w-full mt-1 border-b border-white/5 pb-1 mb-1" title="COFINS XML">
                            <span className="text-[10px] text-slate-600 font-sans">C:</span> {fmtCurrency(item.vCofins)}
                          </div>
                          <div className="text-slate-500 flex justify-between items-center w-full" title="PIS SPED">
                            <span className="text-[10px] text-rose-500/50 font-sans">P:</span> 
                            <span className={item.vPis !== item.sped.vPis ? "text-rose-500 font-bold" : ""}>{fmtCurrency(item.sped.vPis)}</span>
                          </div>
                          <div className="text-slate-500 flex justify-between items-center w-full mt-1" title="COFINS SPED">
                            <span className="text-[10px] text-rose-500/50 font-sans">C:</span> 
                            <span className={item.vCofins !== item.sped.vCofins ? "text-rose-500 font-bold" : ""}>{fmtCurrency(item.sped.vCofins)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center">
                          <label className="flex items-center justify-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={item.verified || false}
                              onChange={() => toggleVerify(originalIndex)}
                              className="w-4 h-4 rounded border-rose-500/30 bg-black/40 checked:bg-emerald-500 focus:ring-emerald-500/50 cursor-pointer transition-colors"
                            />
                          </label>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* XML Modal */}
      {xmlModalOpen && (
        <div className="fixed inset-0 z-[999] flex justify-center items-center p-4 sm:p-8">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setXmlModalOpen(false)}></div>
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                XML Original da Nota Fiscal
              </h3>
              <button onClick={() => setXmlModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-[#0d1117] relative flex flex-col">
              {loadingXml ? (
                <div className="flex flex-col justify-center items-center h-full gap-3 text-cyan-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="font-medium animate-pulse">Buscando XML no banco DB2...</p>
                </div>
              ) : selectedXml ? (
                <NfeViewer xml={selectedXml} />
              ) : (
                <div className="flex justify-center items-center h-full text-rose-400 font-medium">XML indisponível ou não encontrado.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
