import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Settings, CreditCard, Save, Store } from "lucide-react";

export const Route = createFileRoute("/master/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [activeTab, setActiveTab] = useState("payment");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Configurações
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Gerencie as integrações e configurações globais da plataforma.
          </p>
        </div>
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
          <Save className="w-4 h-4" />
          Salvar Alterações
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 space-y-1">
          <button
            onClick={() => setActiveTab("general")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "general"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
            }`}
          >
            <Store className="w-4 h-4" />
            Geral
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "payment"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Pagamentos (APIs)
          </button>
        </div>

        <div className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
          {activeTab === "payment" && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Gateways de Pagamento</h3>
                <p className="text-sm text-slate-400">
                  Configure as chaves de API para aceitar cartão de crédito e PIX na loja virtual.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 border border-white/5 bg-black/20 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xl">
                        M
                      </div>
                      <div>
                        <h4 className="font-medium text-white">Mercado Pago</h4>
                        <p className="text-xs text-slate-500">Cartão de Crédito, PIX, Boleto</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="grid gap-4 pt-4 border-t border-white/5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Public Key</label>
                      <input 
                        type="text" 
                        placeholder="APP_USR-..." 
                        className="w-full bg-slate-950 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Access Token</label>
                      <input 
                        type="password" 
                        placeholder="APP_USR-..." 
                        className="w-full bg-slate-950 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-white/5 bg-black/20 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xl">
                        S
                      </div>
                      <div>
                        <h4 className="font-medium text-white">Stripe</h4>
                        <p className="text-xs text-slate-500">Cartão de Crédito Internacional</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="grid gap-4 pt-4 border-t border-white/5 opacity-50 pointer-events-none">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Publishable Key</label>
                      <input 
                        type="text" 
                        placeholder="pk_test_..." 
                        className="w-full bg-slate-950 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Secret Key</label>
                      <input 
                        type="password" 
                        placeholder="sk_test_..." 
                        className="w-full bg-slate-950 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "general" && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Informações Gerais</h3>
                <p className="text-sm text-slate-400">
                  Dados principais da sua loja virtual.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Nome da Loja</label>
                  <input 
                    type="text" 
                    defaultValue="Sofistic Store"
                    className="w-full bg-slate-950 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">URL do Site</label>
                  <div className="flex items-center">
                    <span className="bg-white/5 border border-white/10 border-r-0 px-3 py-2 rounded-l-md text-slate-400 text-sm">
                      https://
                    </span>
                    <input 
                      type="text" 
                      defaultValue="sofisticstore.com.br"
                      className="flex-1 bg-slate-950 border border-white/10 rounded-r-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Email de Contato</label>
                  <input 
                    type="email" 
                    defaultValue="contato@sofisticstore.com.br"
                    className="w-full bg-slate-950 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
