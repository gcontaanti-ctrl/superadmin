import { useState, useEffect } from "react";
import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Shield, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/master")({
  component: MasterLayout,
});

function MasterLayout() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        setAuthenticated(res.ok);
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setAuthChecked(true));
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Verificando acesso Master...
        </div>
      </div>
    );
  }

  if (!authenticated) {
    navigate({ to: "/" });
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-white/10 bg-black/40 px-6 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight font-serif text-white">Master Panel</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Super Admin Controls</p>
            </div>
          </div>
        </div>
        
        <nav className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
          <Link
            to="/master"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors [&.active]:bg-primary [&.active]:text-primary-foreground text-slate-400 hover:text-white hover:bg-white/5"
            activeOptions={{ exact: true }}
          >
            Dashboard
          </Link>
          <Link
            to="/master/users"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors [&.active]:bg-primary [&.active]:text-primary-foreground text-slate-400 hover:text-white hover:bg-white/5"
          >
            Usuários
          </Link>
          <Link
            to="/master/settings"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors [&.active]:bg-primary [&.active]:text-primary-foreground text-slate-400 hover:text-white hover:bg-white/5"
          >
            Configurações
          </Link>
          <Link
            to="/master/updates"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors [&.active]:bg-primary [&.active]:text-primary-foreground text-slate-400 hover:text-white hover:bg-white/5"
          >
            Atualizações (OTA)
          </Link>
        </nav>
      </header>
      
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
