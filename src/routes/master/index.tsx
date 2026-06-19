import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Users, ShieldAlert, Key, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/master/")({
  component: MasterDashboard,
});

function MasterDashboard() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/master/clients");
      if (!res.ok) throw new Error("Falha ao carregar clientes");
      const data = await res.json();
      setClients(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const generateNewLicense = async () => {
    const name = prompt("Nome do Cliente (Empresa):");
    if (!name) return;

    try {
      const res = await fetch("/api/master/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      
      if (!res.ok) throw new Error("Falha ao gerar licença");
      
      toast.success("Licença gerada com sucesso!");
      fetchClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar licença");
    }
  };

  const toggleModule = async (clientId: string, module: string, currentValue: boolean) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const updatedModules = { ...client.active_modules, [module]: !currentValue };

    try {
      const res = await fetch(`/api/master/clients/${clientId}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_modules: updatedModules }),
      });
      
      if (!res.ok) throw new Error("Falha ao atualizar módulos");
      
      toast.success("Módulos atualizados com sucesso!");
      fetchClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar módulos");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif">Gestão de Clientes</h2>
          <p className="text-sm text-slate-400">Gerencie licenças e módulos ativos dos seus clientes.</p>
        </div>
        <Button onClick={generateNewLicense} className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          Nova Licença
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Total de Clientes</p>
            <p className="text-2xl font-bold">{clients.length}</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Licenças Ativas</p>
            <p className="text-2xl font-bold">{clients.filter(c => c.license_key).length}</p>
          </div>
        </div>
      </div>

      <div className="bg-black/20 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-5 border-b border-white/10 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Licenças Emitidas</h3>
        </div>
        
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Nenhuma licença gerada ainda. Clique em "Nova Licença" para começar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">Cliente</th>
                  <th className="py-3 px-4 font-medium">License Key</th>
                  <th className="py-3 px-4 font-medium text-center">Módulos</th>
                  <th className="py-3 px-4 font-medium text-right">Último Ping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clients.map(client => (
                  <tr key={client.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-semibold text-white">
                      {client.name}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg w-fit border border-white/5">
                        <Key className="w-3.5 h-3.5 text-slate-400" />
                        <code className="text-xs font-mono text-emerald-400 select-all">
                          {client.license_key}
                        </code>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center gap-2">
                        {['vendas', 'financeiro', 'estoque'].map(mod => {
                          const active = client.active_modules?.[mod] === true;
                          return (
                            <button
                              key={mod}
                              onClick={() => toggleModule(client.id, mod, active)}
                              className={`px-2 py-1 rounded text-xs font-semibold capitalize border transition-colors ${
                                active 
                                ? 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30' 
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              {mod}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-slate-400 text-xs">
                      {client.last_ping ? new Date(client.last_ping).toLocaleString('pt-BR') : 'Nunca sincronizou'}
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
