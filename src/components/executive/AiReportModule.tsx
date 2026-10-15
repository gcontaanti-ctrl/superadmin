import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Download, Loader2, Database, BrainCircuit, Search, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AiReportResult {
  title: string;
  summary: string;
  columns: { key: string; label: string; type: string }[];
  rows: any[];
  kpis: { label: string; value: string | number }[];
}

export function AiReportModule({ selectedStore }: { selectedStore: string }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<AiReportResult | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai-report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: prompt,
          idEmpresa: selectedStore === 'todas' ? undefined : selectedStore 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar relatório.");
      
      setResult(data);
      toast.success("Relatório gerado com sucesso pela IA.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro desconhecido ao processar.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!result || !result.rows.length) return;
    setExporting(true);
    try {
      const res = await fetch("/api/ai-report/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: result.title,
          columns: result.columns,
          rows: result.rows 
        })
      });
      
      if (!res.ok) throw new Error("Falha ao exportar excel.");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `IA_${result.title.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Relatório exportado para Excel com sucesso.");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível gerar o arquivo Excel.");
    } finally {
      setExporting(false);
    }
  };

  const formatCellValue = (val: any, type: string) => {
    if (val === null || val === undefined) return "-";
    if (type === 'currency' || type === 'money') {
      return Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    if (type === 'number') {
      return Number(val).toLocaleString("pt-BR");
    }
    if (type === 'percent') {
      return Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
    }
    return String(val);
  };

  return (
    <div className="flex flex-col gap-4 h-full w-full">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-strong rounded-2xl p-5 border border-primary/20 bg-gradient-to-br from-indigo-950/40 to-slate-900/60 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
          <BrainCircuit className="w-48 h-48 text-indigo-400 rotate-12" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="size-12 rounded-xl bg-[image:var(--gradient-primary)] grid place-items-center glow text-primary-foreground shrink-0 shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
              Gerador de Relatórios (IA)
            </h2>
            <p className="text-xs text-indigo-200 mt-1 max-w-md">
              Descreva em linguagem natural o que você quer extrair do banco de dados (ex: "produtos com tributação manual", "margem das filiais") e a IA construirá a tabela em tempo real.
            </p>
          </div>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="glass-strong rounded-2xl p-4 border border-white/10 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
              placeholder="Digite sua solicitação de relatório..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGenerate();
              }}
              disabled={loading}
            />
          </div>
          <Button 
            onClick={handleGenerate} 
            disabled={loading || !prompt.trim()} 
            className="py-3 px-6 h-auto bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando DB2...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Gerar Relatório
              </>
            )}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Sugestões:</span>
          {["produtos com tributação manual", "margem das filiais", "estoque crítico das lojas"].map(sug => (
            <button 
              key={sug} 
              onClick={() => { setPrompt(sug); }}
              className="text-[10px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              "{sug}"
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && !result && (
        <div className="flex-1 glass-strong rounded-2xl flex flex-col items-center justify-center p-12 gap-4 border border-indigo-500/10 min-h-[400px]">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />
            <Database className="w-12 h-12 text-indigo-400 animate-bounce relative z-10" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-200">A IA está gerando sua query...</h3>
            <p className="text-sm text-slate-400 mt-1">Isso pode levar alguns segundos dependendo do tamanho das tabelas do DB2.</p>
          </div>
        </div>
      )}

      {/* Result Panel */}
      {!loading && result && (
        <div className="flex flex-col gap-4 animate-fade-in flex-1">
          {/* Result Header & KPIs */}
          <div className="glass-strong rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {result.title}
                </h3>
                <p className="text-sm text-slate-300 mt-1">{result.summary}</p>
              </div>
              <Button
                onClick={handleExport}
                disabled={exporting || result.rows.length === 0}
                variant="outline"
                className="shrink-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Exportar Excel (.xlsx)
              </Button>
            </div>

            {result.kpis && result.kpis.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 border-t border-white/10 pt-4">
                {result.kpis.map((kpi, i) => (
                  <div key={i} className="bg-black/30 rounded-xl p-3 border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1 truncate">{kpi.label}</span>
                    <span className="text-lg font-bold text-slate-100">{kpi.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Table */}
          <div className="glass-strong rounded-2xl border border-white/10 overflow-hidden flex-1 min-h-[300px] flex flex-col">
            <div className="bg-black/40 px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Dados Extraídos ({result.rows.length} registros)
              </span>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-black/20 sticky top-0 z-10">
                  <tr>
                    {result.columns.map((col, i) => (
                      <th key={i} className="py-3 px-4 font-semibold text-slate-300 border-b border-white/10">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.length > 0 ? (
                    result.rows.map((row, rIndex) => (
                      <tr key={rIndex} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        {result.columns.map((col, cIndex) => (
                          <td key={cIndex} className="py-2.5 px-4 text-slate-300">
                            {formatCellValue(row[col.key], col.type)}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={result.columns.length} className="py-8 text-center text-slate-500">
                        Nenhum dado encontrado para o relatório solicitado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
