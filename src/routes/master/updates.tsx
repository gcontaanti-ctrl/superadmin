import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, UploadCloud, Server, GitCommit, FileArchive, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/master/updates")({
  component: MasterUpdates,
});

function MasterUpdates() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/master/updates");
      if (!res.ok) throw new Error("Falha ao carregar histórico");
      const data = await res.json();
      setUpdates(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !version) {
      toast.error("Preencha a versão e anexe o arquivo zip.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("updateFile", file);
    formData.append("version", version);
    formData.append("notes", notes);

    try {
      const res = await fetch("/api/master/updates", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Falha ao enviar atualização");
      }

      toast.success("Atualização publicada com sucesso! Os clientes vão baixar automaticamente.");
      setFile(null);
      setVersion("");
      setNotes("");
      
      // Limpa input de arquivo
      const fileInput = document.getElementById("file-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      fetchUpdates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif">Atualizações OTA</h2>
          <p className="text-sm text-slate-400">Faça upload de novas versões. Os clientes sincronizarão automaticamente.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <form onSubmit={handleUpload} className="bg-black/20 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-5">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <UploadCloud className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Nova Versão</h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Versão (ex: v1.0.5)</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-primary/60"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Arquivo (.zip)</label>
              <div className="relative">
                <input
                  id="file-upload"
                  type="file"
                  accept=".zip"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  required
                />
                <label 
                  htmlFor="file-upload" 
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-white/20 bg-black/30 hover:bg-white/5'}`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {file ? (
                      <>
                        <FileArchive className="w-8 h-8 text-primary mb-2" />
                        <p className="text-sm text-white font-semibold">{file.name}</p>
                        <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-sm text-slate-300"><span className="font-semibold text-primary">Clique para anexar</span> ou arraste e solte</p>
                        <p className="text-xs text-slate-500">Apenas arquivos ZIP do build</p>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Notas da Atualização</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="O que mudou nesta versão?"
                rows={3}
                className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-primary/60 resize-none"
              />
            </div>

            <Button type="submit" disabled={uploading || !file || !version} className="w-full mt-2">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Fazendo Upload...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Publicar Atualização
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-black/20 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md h-full flex flex-col">
            <div className="p-5 border-b border-white/10 flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Histórico de Lançamentos</h3>
            </div>

            {loading ? (
              <div className="flex-1 flex justify-center items-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : updates.length === 0 ? (
              <div className="flex-1 flex justify-center items-center p-12 text-center text-slate-400">
                Nenhuma atualização publicada ainda.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {updates.map((update, idx) => (
                  <div key={update.id} className="relative pl-6 pb-4">
                    {/* Timeline line */}
                    {idx !== updates.length - 1 && (
                      <div className="absolute top-8 left-[11px] bottom-0 w-px bg-white/10"></div>
                    )}
                    
                    {/* Timeline dot */}
                    <div className="absolute top-2 left-0 p-1 bg-black rounded-full border border-primary z-10">
                      {idx === 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      ) : (
                        <GitCommit className="w-4 h-4 text-slate-500" />
                      )}
                    </div>

                    <div className={`bg-white/5 border border-white/10 rounded-xl p-4 ${idx === 0 ? 'ring-1 ring-primary/30 bg-primary/5' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-lg text-white">{update.version}</h4>
                            {idx === 0 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary text-primary-foreground">
                                Mais Recente
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Publicado em {new Date(update.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <a 
                          href={update.file_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <FileArchive className="w-3.5 h-3.5" />
                          Baixar ZIP
                        </a>
                      </div>
                      
                      {update.release_notes && (
                        <div className="mt-3 p-3 bg-black/40 rounded-lg border border-white/5 text-sm text-slate-300">
                          {update.release_notes.split('\n').map((line: string, i: number) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
