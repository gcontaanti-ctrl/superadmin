import React, { useState, useEffect } from "react";
import { ShieldAlert, Users, Key, Database, Play, Save, CheckCircle2, Server, Globe, Power } from "lucide-react";
import { toast } from "sonner";

export function CybertechAdminModule() {
  const [activeTab, setActiveTab] = useState<"clientes" | "usuarios" | "conexao">("clientes");

  const [dbConfig, setDbConfig] = useState({
    host: "localhost",
    port: "50000",
    database: "DB2",
    user: "dbamv",
    password: "••••••••",
  });

  useEffect(() => {
    fetch("/api/config/db")
      .then(r => r.json())
      .then(data => {
        if (data && data.database) {
          setDbConfig({
            host: data.hostname,
            port: data.port,
            database: data.database,
            user: data.uid,
            password: data.pwd || "",
          });
        }
      })
      .catch(err => console.error("Erro ao carregar config:", err));
  }, []);

  const handleTestConnection = async () => {
    toast.info("Testando conexão com banco de dados...");
    try {
      const payload = {
        hostname: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        uid: dbConfig.user,
        pwd: dbConfig.password,
        protocol: "TCPIP"
      };
      const res = await fetch("/api/config/db/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Conexão bem sucedida com o banco DB2!");
      } else {
        toast.error("Falha na conexão: " + (data.error || "Erro desconhecido"));
      }
    } catch (e) {
      toast.error("Erro de rede ao testar conexão.");
    }
  };

  const handleSaveConfig = async () => {
    const payload = {
      hostname: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      uid: dbConfig.user,
      pwd: dbConfig.password,
      protocol: "TCPIP"
    };
    try {
      const res = await fetch("/api/config/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Configurações do banco de dados atualizadas com sucesso! Reinicie o servidor para aplicar.");
      } else {
        toast.error("Erro ao salvar: " + data.error);
      }
    } catch (e) {
      toast.error("Erro de rede ao salvar configurações.");
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-5 border border-white/5 bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 grid place-items-center">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-slate-100">Cybertech Admin</h2>
            <p className="text-[11px] text-slate-400 font-medium">Gestão de Licenças, Clientes e Configurações de Banco de Dados</p>
          </div>
        </div>
        
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab("clientes")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'clientes' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Globe className="w-3.5 h-3.5" /> Clientes & Licenças
          </button>
          <button
            onClick={() => setActiveTab("usuarios")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'usuarios' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Users className="w-3.5 h-3.5" /> Usuários
          </button>
          <button
            onClick={() => setActiveTab("conexao")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'conexao' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Database className="w-3.5 h-3.5" /> Conexão DB2
          </button>
        </div>
      </div>

      <div className="flex-1 glass-strong rounded-2xl p-6 border border-white/5 overflow-y-auto">
        {/* Clientes Tab */}
        {activeTab === "clientes" && (
          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4" /> Gestão de Clientes do ERP
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-black/30 border border-white/10 rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 blur-xl rounded-full" />
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-200">Super Atacadista LTDA</h4>
                    <p className="text-[10px] text-slate-400">CNPJ: 12.345.678/0001-90</p>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">ATIVO</span>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Plano</span>
                    <span className="text-slate-300 font-medium">Enterprise (Multilojas)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Vencimento</span>
                    <span className="text-slate-300 font-medium">10/12/2026</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Lim. Usuários</span>
                    <span className="text-slate-300 font-medium">Ilimitado</span>
                  </div>
                </div>
                <div className="mt-2 pt-3 border-t border-white/5 flex gap-2">
                  <button className="flex-1 bg-white/5 hover:bg-white/10 text-xs font-semibold py-1.5 rounded transition text-slate-300">Editar Plano</button>
                  <button className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold py-1.5 rounded transition text-red-400">Suspender</button>
                </div>
              </div>

              <div className="bg-black/30 border border-white/10 rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden opacity-75">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 blur-xl rounded-full" />
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-200">Mercadão do Bairro</h4>
                    <p className="text-[10px] text-slate-400">CNPJ: 98.765.432/0001-10</p>
                  </div>
                  <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-500/30">PENDENTE</span>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Plano</span>
                    <span className="text-slate-300 font-medium">Básico (1 Loja)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Vencimento</span>
                    <span className="text-amber-400 font-bold">Hoje</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Lim. Usuários</span>
                    <span className="text-slate-300 font-medium">5/5 ativos</span>
                  </div>
                </div>
                <div className="mt-2 pt-3 border-t border-white/5 flex gap-2">
                  <button className="flex-1 bg-white/5 hover:bg-white/10 text-xs font-semibold py-1.5 rounded transition text-slate-300">Editar Plano</button>
                  <button className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-semibold py-1.5 rounded transition text-amber-400">Cobrar</button>
                </div>
              </div>
            </div>
            
            <button className="w-fit mt-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" /> Adicionar Novo Cliente
            </button>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "usuarios" && (
          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2 mb-2">
              <Key className="w-4 h-4" /> Controle de Acessos e Usuários
            </h3>
            
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Nome / Email</th>
                  <th className="py-3 px-4">Cliente / Loja</th>
                  <th className="py-3 px-4">Nível de Acesso</th>
                  <th className="py-3 px-4">Último Login</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-200">João Silva (Admin)</div>
                    <div className="text-[10px] text-slate-500">joao.silva@cybertech.com</div>
                  </td>
                  <td className="py-3 px-4">Cybertech (Sistema)</td>
                  <td className="py-3 px-4">
                    <span className="bg-fuchsia-500/20 text-fuchsia-400 text-[9px] font-bold px-2 py-0.5 rounded border border-fuchsia-500/30">GOD MODE</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">Agora</td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-[10px] font-bold text-cyan-400 hover:underline">Editar</button>
                  </td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-200">Maria Oliveira</div>
                    <div className="text-[10px] text-slate-500">maria@superatacado.com.br</div>
                  </td>
                  <td className="py-3 px-4">Super Atacadista LTDA</td>
                  <td className="py-3 px-4">
                    <span className="bg-blue-500/20 text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded border border-blue-500/30">GERENTE GERAL</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">Há 2 horas</td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-[10px] font-bold text-cyan-400 hover:underline">Editar</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Database Config Tab */}
        {activeTab === "conexao" && (
          <div className="flex flex-col gap-6 max-w-3xl">
            <div>
              <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                <Server className="w-4 h-4" /> Configuração do Banco de Dados (DBA)
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure os parâmetros de conexão com o banco de dados IBM DB2 do cliente ativo. Essas configurações alteram o comportamento do servidor Node.js.</p>
            </div>
            
            <div className="bg-black/30 border border-white/10 rounded-2xl p-6 flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Hostname (Endereço do Servidor)</label>
                  <input 
                    type="text" 
                    value={dbConfig.host}
                    onChange={e => setDbConfig({...dbConfig, host: e.target.value})}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Porta</label>
                  <input 
                    type="text" 
                    value={dbConfig.port}
                    onChange={e => setDbConfig({...dbConfig, port: e.target.value})}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Nome do Banco (Database)</label>
                  <input 
                    type="text" 
                    value={dbConfig.database}
                    onChange={e => setDbConfig({...dbConfig, database: e.target.value})}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Usuário DBA</label>
                  <input 
                    type="text" 
                    value={dbConfig.user}
                    onChange={e => setDbConfig({...dbConfig, user: e.target.value})}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Senha DBA</label>
                  <input 
                    type="password" 
                    value={dbConfig.password}
                    onChange={e => setDbConfig({...dbConfig, password: e.target.value})}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3 mt-2">
                <Database className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-blue-300">String de Conexão Gerada (Preview)</h5>
                  <p className="text-[10px] text-blue-400/70 font-mono mt-1 break-all">
                    DATABASE={dbConfig.database};HOSTNAME={dbConfig.host};UID={dbConfig.user};PWD=********;PORT={dbConfig.port};PROTOCOL=TCPIP
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2 pt-5 border-t border-white/5">
                <button 
                  onClick={handleTestConnection}
                  className="bg-black/50 hover:bg-black border border-white/10 text-slate-300 text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Power className="w-4 h-4" /> Testar Conexão
                </button>
                <button 
                  onClick={handleSaveConfig}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)] text-xs font-bold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Salvar Configurações
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
