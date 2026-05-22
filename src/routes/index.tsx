
import { useState, useEffect, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/executive/Sidebar";
import { KpiCards } from "@/components/executive/KpiCards";
import { RevenueChart } from "@/components/executive/RevenueChart";
import { StoreRanking } from "@/components/executive/StoreRanking";
import { CategoryBreakdown } from "@/components/executive/CategoryBreakdown";
import { AiInsights } from "@/components/executive/AiInsights";
import { AiChat } from "@/components/executive/AiChat";
import { ProductTracking } from "@/components/executive/ProductTracking";
import { FinancialModule } from "@/components/executive/FinancialModule";
import { CommercialModule } from "@/components/executive/CommercialModule";
import { PurchasesModule } from "@/components/executive/PurchasesModule";
import { DatabaseSettings } from "@/components/executive/DatabaseSettings";
import { Toaster, toast } from "sonner";
import { 
  Building2, Package, Database, Shield, Calendar, Loader2, LockKeyhole, LogIn, LogOut
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("visao-geral");
  const viewMode = "real";
  const [selectedStore, setSelectedStore] = useState("todas");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-06-30");
  const [dbLojas, setDbLojas] = useState<any[]>([]);
  const [dbEstoque, setDbEstoque] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        setAuthenticated(res.ok);
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    // Buscar lojas
    fetch('/api/empresas')
      .then(res => res.json())
      .then(data => { if (!data.error) setDbLojas(data); })
      .catch(console.error);

    // Buscar estoque
    fetch('/api/estoque')
      .then(res => res.json())
      .then(data => { if (!data.error) setDbEstoque(data); })
      .catch(console.error);
  }, [authenticated]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.authenticated) {
        throw new Error(data.error || "Falha ao entrar");
      }

      setPassword("");
      setAuthenticated(true);
      toast.success("Acesso liberado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setAuthenticated(false);
    setDbLojas([]);
    setDbEstoque([]);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Verificando acesso
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen username={username} setUsername={setUsername} password={password} setPassword={setPassword} loading={authLoading} onSubmit={login} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex p-4 gap-4 antialiased selection:bg-primary/20">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        selectedStore={selectedStore} 
        setSelectedStore={setSelectedStore} 
      />
      
      <main className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-2rem)] pr-1">
        {/* Top Header */}
        <header className="glass-strong rounded-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-serif">ERP Executive AI</h2>
            <div className="h-5 w-px bg-white/10" />
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mr-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Sincronizado DB2
            </div>

            {/* Global Store Selector in Top Header */}
            <div className="hidden sm:flex items-center gap-2 bg-black/45 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
              <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <select
                value={selectedStore}
                onChange={(e) => {
                  setSelectedStore(e.target.value);
                  const foundLoja = dbLojas.find((l: any) => String(l.IDEMPRESA) === e.target.value);
                  const lojaNome = e.target.value === "todas" 
                    ? "Todas as Lojas" 
                    : String(foundLoja?.DESCREMPRESA || "").trim() || `Filial ${e.target.value}`;
                  toast.success(`Filtrando painel por: ${lojaNome}`);
                }}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="todas" className="text-slate-900 bg-slate-900 font-semibold">💎 Todas as Lojas (Consolidado)</option>
                {dbLojas.map((loja: any) => {
                  const label = String(loja.DESCREMPRESA || "").trim() || `Filial ${loja.IDEMPRESA}`;
                  return (
                    <option key={loja.IDEMPRESA} value={loja.IDEMPRESA} className="text-slate-900 bg-slate-900">
                      🏢 {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Global Date Range Selector */}
            <div className="hidden md:flex items-center gap-2 bg-black/45 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    toast.success(`Data inicial: ${e.target.value}`);
                  }}
                  className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer text-[11px] font-semibold [color-scheme:dark]" 
                />
                <span className="text-slate-500">até</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    toast.success(`Data final: ${e.target.value}`);
                  }}
                  className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer text-[11px] font-semibold [color-scheme:dark]" 
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary">
            <Database className="w-3.5 h-3.5" />
            <span>Dados Reais (DB2)</span>
          </div>
          <Button onClick={logout} variant="outline" className="border-white/15 bg-white/5 text-xs">
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </Button>
        </header>

        {/* KPI Cards passing selectedStore */}
        <KpiCards selectedStore={selectedStore} />

        {/* Tab Contents */}
        {activeTab === "visao-geral" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <RevenueChart mode={viewMode} selectedStore={selectedStore} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StoreRanking mode={viewMode} />
                <CategoryBreakdown mode={viewMode} />
              </div>

              <div className="glass-strong rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <Building2 className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-serif font-semibold text-sm">Empresas Cadastradas (View DBA.VW_GEA_EMPRESA)</h4>
                    <p className="text-[10px] text-slate-400">Filiais carregadas dinamicamente com nomes comerciais corretos</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 font-semibold">
                        <th className="py-2 px-3">ID</th>
                        <th className="py-2 px-3">Nome Comercial / Razão</th>
                        <th className="py-2 px-3">CNPJ</th>
                        <th className="py-2 px-3 text-center">Cidade</th>
                        <th className="py-2 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbLojas.map((loja: any) => (
                        <tr 
                          key={loja.IDEMPRESA} 
                          onClick={() => { setSelectedStore(String(loja.IDEMPRESA)); toast.success(`Filtrando por: ${loja.DESCREMPRESA}`); }}
                          className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${String(selectedStore) === String(loja.IDEMPRESA) ? 'bg-primary/10 border-l-2 border-primary' : ''}`}
                        >
                          <td className="py-2.5 px-3 font-medium tabular-nums">{loja.IDEMPRESA}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-200">{loja.DESCREMPRESA}</td>
                          <td className="py-2.5 px-3 text-slate-300 font-mono">{loja.CNPJ || "Sem CNPJ"}</td>
                          <td className="py-2.5 px-3 text-center text-slate-300 font-bold">{loja.UF || "MACEIO"}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                              Ativa
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <AiChat />
              <AiInsights />
            </div>
          </div>
        )}

        {/* Estoque Tab */}
        {activeTab === "estoque" && (
          <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <Package className="w-6 h-6 text-primary animate-pulse" />
              <div>
                <h3 className="font-serif font-bold text-lg">Locais de Estoque (Tabela ADM.ESTOQUE_LOCAL)</h3>
                <p className="text-xs text-slate-400">Locais de armazenagem integrados do DB2</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">ID Local</th>
                    <th className="py-3 px-4">Descrição do Local</th>
                    <th className="py-3 px-4 text-center">Separação</th>
                    <th className="py-3 px-4 text-right">Troca</th>
                  </tr>
                </thead>
                <tbody>
                  {dbEstoque.map((est: any) => (
                    <tr key={est.IDLOCAL} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium tabular-nums">{est.IDLOCAL}</td>
                      <td className="py-3 px-4 font-semibold text-slate-200 text-sm">{est.DESCRLOCAL || "Local Geral"}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400">
                          ATIVO
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">
                          SIM
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Financeiro Tab */}
        {activeTab === "financeiro" && (
          <FinancialModule 
            selectedStore={selectedStore} 
            globalStartDate={startDate} 
            globalEndDate={endDate} 
          />
        )}

        {/* Comercial Tab */}
        {activeTab === "comercial" && (
          <CommercialModule 
            selectedStore={selectedStore} 
            globalStartDate={startDate} 
            globalEndDate={endDate} 
          />
        )}

        {/* Compras Tab */}
        {activeTab === "compras" && (
          <PurchasesModule 
            selectedStore={selectedStore} 
            globalStartDate={startDate} 
            globalEndDate={endDate} 
          />
        )}

        {/* Rastreamento Tab */}
        {activeTab === "rastreamento" && (
          <ProductTracking selectedStore={selectedStore} />
        )}

        {/* IA Analytics Tab */}
        {activeTab === "ia-analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <AiInsights />
            </div>
            <div className="flex flex-col gap-6">
              <AiChat />
            </div>
          </div>
        )}

        {activeTab === "configuracoes" && (
          <DatabaseSettings />
        )}

        {/* Other Tabs */}
        {activeTab !== "visao-geral" && activeTab !== "estoque" && activeTab !== "rastreamento" && activeTab !== "financeiro" && activeTab !== "comercial" && activeTab !== "compras" && activeTab !== "ia-analytics" && activeTab !== "configuracoes" && (
          <div className="glass-strong rounded-2xl p-10 text-center flex flex-col justify-center items-center gap-3 min-h-[300px]">
            <Shield className="w-12 h-12 text-slate-400 animate-pulse" />
            <h3 className="font-serif text-lg font-bold text-slate-200">Aba em Desenvolvimento</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Mais tabelas do DB2 estão sendo mapeadas para integrar este painel.
            </p>
          </div>
        )}
      </main>

      <Toaster position="bottom-right" theme="dark" closeButton />
    </div>
  );
}

type LoginScreenProps = {
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function LoginScreen({ username, setUsername, password, setPassword, loading, onSubmit }: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-4 antialiased">
      <form onSubmit={onSubmit} className="glass-strong w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center">
            <LockKeyhole className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold">ERP Executive AI</h1>
            <p className="text-xs text-slate-400">Acesso administrativo</p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="login-username" className="text-xs font-semibold text-slate-300">
            Usuario
          </label>
          <input
            id="login-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-primary/60"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="login-password" className="text-xs font-semibold text-slate-300">
            Senha
          </label>
          <input
            id="login-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-primary/60"
          />
        </div>

        <Button type="submit" disabled={loading || !username || !password} className="w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Entrar
        </Button>
      </form>
      <Toaster position="bottom-right" theme="dark" closeButton />
    </div>
  );
}

