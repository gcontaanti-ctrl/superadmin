import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, UserPlus, Shield, MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/master/users")({
  component: UsersPage,
});

function UsersPage() {
  const [users] = useState([
    { id: 1, name: "Admin Principal", email: "admin@loja.com", role: "Super Admin", status: "Ativo" },
    { id: 2, name: "João Silva", email: "joao@loja.com", role: "Gerente", status: "Ativo" },
    { id: 3, name: "Maria Souza", email: "maria@loja.com", role: "Financeiro", status: "Inativo" },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Gestão de Usuários
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Gerencie os acessos, permissões e cadastre novos membros da equipe.
          </p>
        </div>
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">Usuário</th>
                <th className="px-6 py-4 font-medium">Permissão</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-200">{user.name}</div>
                        <div className="text-slate-500 text-xs">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      {user.role}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                      user.status === 'Ativo' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-white transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
