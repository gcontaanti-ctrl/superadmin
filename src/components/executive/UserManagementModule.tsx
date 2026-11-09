import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, Shield, ShieldCheck, Key, Lock, Trash2, Edit3, 
  CheckCircle2, XCircle, Search, Store, Check, CheckSquare, Square, 
  Sparkles, RefreshCw, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { nav } from "./Sidebar";

interface SystemUser {
  id: string;
  nome: string;
  username: string;
  password?: string;
  role: string;
  permissions: string[];
  idEmpresa?: string;
  status: string;
  createdAt?: string;
}

interface UserManagementModuleProps {
  currentUser?: any;
}

export function UserManagementModule({ currentUser }: UserManagementModuleProps) {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "APROVADO" | "PENDENTE">("TODOS");
  const [dbLojas, setDbLojas] = useState<any[]>([]);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formEmpresa, setFormEmpresa] = useState("todas");
  const [formStatus, setFormStatus] = useState("APROVADO");
  const [formPermissions, setFormPermissions] = useState<string[]>(["visao-geral"]);
  const [saving, setSaving] = useState(false);

  // Módulos disponíveis para liberação (exclui o próprio módulo de admin de usuários para não administradores)
  const availableModules = nav.filter(item => item.id !== "gestao-usuarios");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/users");
      if (!res.ok) throw new Error("Falha ao buscar usuários");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (username: string, action: "APROVAR" | "REJEITAR") => {
    try {
      const res = await fetch("/api/system/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, action })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao processar solicitação");
      }
      toast.success(action === "APROVAR" ? `Acesso de @${username} aprovado com sucesso!` : `Acesso de @${username} recusado.`);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar.");
    }
  };

  useEffect(() => {
    loadUsers();
    fetch("/api/empresas")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDbLojas(data); })
      .catch(() => null);
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormNome("");
    setFormUsername("");
    setFormPassword("");
    setFormEmpresa("todas");
    setFormStatus("APROVADO");
    setFormPermissions(["visao-geral", "estoque", "rupturas"]);
    setIsModalOpen(true);
  };

  const openEditModal = (u: SystemUser) => {
    setEditingUser(u);
    setFormNome(u.nome || "");
    setFormUsername(u.username || "");
    setFormPassword(u.password || "");
    setFormEmpresa(u.idEmpresa || "todas");
    setFormStatus(u.status || "APROVADO");
    setFormPermissions(Array.isArray(u.permissions) ? u.permissions : ["visao-geral"]);
    setIsModalOpen(true);
  };

  const togglePermission = (moduleId: string) => {
    if (formPermissions.includes(moduleId)) {
      setFormPermissions(formPermissions.filter(id => id !== moduleId));
    } else {
      setFormPermissions([...formPermissions, moduleId]);
    }
  };

  const selectAllPermissions = () => {
    setFormPermissions(availableModules.map(m => m.id));
  };

  const clearAllPermissions = () => {
    setFormPermissions([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formUsername.trim()) {
      toast.error("Preencha o Nome e o Usuário de login.");
      return;
    }
    if (!editingUser && !formPassword.trim()) {
      toast.error("Informe uma senha para o novo usuário.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingUser?.id,
        nome: formNome.trim(),
        username: formUsername.trim().toLowerCase(),
        password: formPassword.trim() || undefined,
        idEmpresa: formEmpresa,
        status: formStatus,
        role: formUsername.trim().toLowerCase() === "cristiano" ? "superadmin" : "user",
        permissions: formUsername.trim().toLowerCase() === "cristiano" ? ["*"] : formPermissions
      };

      const res = await fetch("/api/system/users/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao salvar usuário");
      }

      toast.success(editingUser ? "Usuário atualizado com sucesso!" : "Novo usuário cadastrado com sucesso!");
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: SystemUser) => {
    if (u.username.toLowerCase() === "cristiano") {
      toast.error("O superusuário Cristiano não pode ser excluído.");
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o usuário "${u.nome}" (${u.username})?`)) {
      return;
    }

    try {
      const res = await fetch("/api/system/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, username: u.username })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao excluir");
      }
      toast.success("Usuário removido com sucesso.");
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir.");
    }
  };

  const pendingUsers = users.filter(u => u.status === "PENDENTE");

  const filteredUsers = users.filter(u => {
    const matchSearch = u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase());
    if (statusFilter === "TODOS") return matchSearch;
    return matchSearch && u.status === statusFilter;
  });

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Top Header Card */}
      <div className="glass-strong rounded-2xl p-5 border border-white/5 bg-black/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 grid place-items-center shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-serif text-slate-100">Gestão de Usuários & Permissões</h2>
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Exclusivo Cristiano
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Crie os usuários da sua equipe, aprove solicitações de novos gerentes e defina exatamente quais módulos cada um pode acessar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button 
            onClick={loadUsers} 
            variant="outline" 
            size="sm" 
            className="border-white/10 hover:bg-white/5 text-slate-300"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={openCreateModal}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-strong rounded-xl p-4 border border-white/5 bg-black/20 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total de Usuários</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">{users.length}</h3>
          </div>
          <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 grid place-items-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-strong rounded-xl p-4 border border-white/5 bg-black/20 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Usuários Ativos</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">
              {users.filter(u => u.status === 'APROVADO').length}
            </h3>
          </div>
          <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-strong rounded-xl p-4 border border-white/5 bg-black/20 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Pendentes p/ Aprovação</p>
            <h3 className={`text-2xl font-bold mt-1 ${pendingUsers.length > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
              {pendingUsers.length}
            </h3>
          </div>
          <div className={`size-10 rounded-xl border grid place-items-center ${pendingUsers.length > 0 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-strong rounded-xl p-4 border border-white/5 bg-black/20 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Super Administrador</p>
            <h3 className="text-sm font-bold text-cyan-300 mt-1 truncate">Cristiano (Total)</h3>
          </div>
          <div className="size-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 grid place-items-center text-cyan-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Destaque: Solicitações de Acesso Pendentes para Aprovação de Cristiano */}
      {pendingUsers.length > 0 && (
        <div className="glass-strong rounded-2xl p-4 border border-amber-500/30 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.12)] flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <span className="size-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>Solicitações de Acesso Pendentes para sua Aprovação ({pendingUsers.length})</span>
            </div>
            <span className="text-[11px] text-amber-300/80">
              Novos gerentes aguardando sua liberação para acessar o sistema
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingUsers.map((u) => {
              const foundLoja = dbLojas.find(l => String(l.IDEMPRESA) === String(u.idEmpresa));
              const nomeLoja = u.idEmpresa === "todas" ? "Todas as Lojas" : (foundLoja?.DESCREMPRESA || `Filial ${u.idEmpresa}`);
              return (
                <div key={u.id || u.username} className="bg-slate-950/85 border border-amber-500/25 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-lg">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-100 text-sm truncate">{u.nome}</h4>
                        <p className="text-xs text-cyan-400 font-mono">@{u.username}</p>
                      </div>
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
                        AGUARDANDO
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-slate-300 flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                      <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{nomeLoja}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <Button 
                      onClick={() => handleApproveUser(u.username, "APROVAR")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 flex-1 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Aprovar Acesso
                    </Button>
                    <Button 
                      onClick={() => openEditModal(u)}
                      variant="outline"
                      className="border-white/10 text-cyan-400 hover:bg-white/5 text-xs h-8 px-2.5"
                      title="Editar Permissões antes de Aprovar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      onClick={() => handleApproveUser(u.username, "REJEITAR")}
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-8 px-2.5"
                      title="Recusar Solicitação"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & List */}
      <div className="flex-1 glass-strong rounded-2xl p-5 border border-white/5 flex flex-col gap-4 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 sm:w-64 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Buscar por nome ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl text-xs">
              <button
                onClick={() => setStatusFilter("TODOS")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${statusFilter === "TODOS" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-slate-200"}`}
              >
                Todos ({users.length})
              </button>
              <button
                onClick={() => setStatusFilter("APROVADO")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${statusFilter === "APROVADO" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:text-slate-200"}`}
              >
                Ativos ({users.filter(u => u.status === "APROVADO").length})
              </button>
              <button
                onClick={() => setStatusFilter("PENDENTE")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${statusFilter === "PENDENTE" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-slate-400 hover:text-slate-200"}`}
              >
                Pendentes ({pendingUsers.length})
              </button>
            </div>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Exibindo {filteredUsers.length} de {users.length} usuários
          </span>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-y-auto no-scrollbar border border-white/5 rounded-xl bg-black/20">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-md border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px] z-10">
              <tr>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Loja / Filial</th>
                <th className="py-3 px-4">Permissões Liberadas</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredUsers.map((u) => {
                const isSuper = u.username.toLowerCase() === "cristiano";
                const userPermissions = Array.isArray(u.permissions) ? u.permissions : [];
                return (
                  <tr key={u.id || u.username} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`size-9 rounded-xl grid place-items-center font-bold text-xs ${isSuper ? 'bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/40 text-cyan-300' : 'bg-white/5 border border-white/10 text-slate-300'}`}>
                          {u.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200 flex items-center gap-1.5">
                            {u.nome}
                            {isSuper && (
                              <span className="bg-cyan-500/20 text-cyan-400 text-[9px] font-bold px-1.5 py-0.2 rounded border border-cyan-500/30">
                                SUPER
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Store className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {u.idEmpresa === "todas" || !u.idEmpresa ? "🏢 Todas as Lojas" : `Filial ${u.idEmpresa}`}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {isSuper ? (
                        <span className="bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold px-2.5 py-1 rounded-full">
                          ⭐ Acesso Total (Todos os Módulos)
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {userPermissions.slice(0, 3).map((p) => {
                            const found = availableModules.find(m => m.id === p);
                            return (
                              <span key={p} className="bg-white/5 border border-white/10 text-slate-300 text-[9px] font-medium px-2 py-0.5 rounded">
                                {found?.label || p}
                              </span>
                            );
                          })}
                          {userPermissions.length > 3 && (
                            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              +{userPermissions.length - 3} outros
                            </span>
                          )}
                          {userPermissions.length === 0 && (
                            <span className="text-[10px] text-amber-400/80 italic">Nenhum módulo liberado</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {u.status === "APROVADO" ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> ATIVO
                        </span>
                      ) : u.status === "PENDENTE" ? (
                        <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-amber-400" /> PENDENTE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> RECUSADO
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.status === "PENDENTE" && (
                          <Button 
                            onClick={() => handleApproveUser(u.username, "APROVAR")} 
                            size="sm" 
                            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Aprovar
                          </Button>
                        )}
                        <Button 
                          onClick={() => openEditModal(u)} 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2.5 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          Permissões
                        </Button>
                        {!isSuper && (
                          <Button 
                            onClick={() => handleDelete(u)} 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-white/10 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 grid place-items-center text-cyan-400">
                  {editingUser ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    {editingUser ? `Editar Usuário: ${editingUser.nome}` : "Cadastrar Novo Usuário"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Defina as credenciais e escolha exatamente os módulos liberados.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Nome Completo</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Carlos Roberto - Gerente"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Usuário de Login</label>
                  <input 
                    type="text"
                    required
                    disabled={editingUser?.username.toLowerCase() === "cristiano"}
                    placeholder="Ex: carlos"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/60 disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Senha {editingUser && <span className="text-slate-500 font-normal">(Deixe em branco para manter)</span>}
                  </label>
                  <input 
                    type="password"
                    placeholder={editingUser ? "••••••••" : "Digite a senha"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Loja / Filial</label>
                  <select 
                    value={formEmpresa}
                    onChange={(e) => setFormEmpresa(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/60"
                  >
                    <option value="todas" className="bg-slate-900">🏢 Todas as Lojas</option>
                    {dbLojas.map((l: any) => (
                      <option key={l.IDEMPRESA} value={l.IDEMPRESA} className="bg-slate-900">
                        {l.IDEMPRESA} - {l.DESCREMPRESA || `Filial ${l.IDEMPRESA}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Status do Acesso</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormStatus("APROVADO")}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${formStatus === 'APROVADO' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-black/30 border-white/10 text-slate-400'}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Acesso Liberado (Ativo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus("BLOQUEADO")}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${formStatus === 'BLOQUEADO' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-black/30 border-white/10 text-slate-400'}`}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Bloqueado
                    </button>
                  </div>
                </div>
              </div>

              {/* Módulos Liberados */}
              <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Módulos Liberados para este Usuário
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      O usuário só verá e poderá abrir os módulos marcados abaixo:
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold underline"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="text-[11px] text-slate-400 hover:text-slate-200 font-semibold"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-black/40 p-3 rounded-xl border border-white/5 max-h-60 overflow-y-auto">
                  {availableModules.map((m) => {
                    const isSelected = formPermissions.includes(m.id);
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.id}
                        onClick={() => togglePermission(m.id)}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'bg-cyan-500/10 border-cyan-500/40 text-slate-100 shadow-[0_0_10px_rgba(6,182,212,0.1)]' : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                          <span className="font-medium">{m.label}</span>
                        </div>
                        <div className={`size-4 rounded border grid place-items-center ${isSelected ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-white/20'}`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="border-t border-white/10 pt-4 flex justify-end gap-2.5">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  className="border-white/10 text-slate-300 hover:bg-white/5"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold"
                >
                  {saving ? "Salvando..." : editingUser ? "Salvar Alterações" : "Criar Usuário"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
