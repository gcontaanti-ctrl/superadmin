import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  Save,
  Server,
  ShieldCheck,
  Wifi,
  XCircle,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type DbConfig = {
  database: string;
  hostname: string;
  port: string;
  protocol: string;
  uid: string;
  connectTimeout: string;
  useExternalHost: boolean;
  externalHost: string;
  externalPort: string;
  effectiveHost?: string;
  effectivePort?: string;
  mode?: "local" | "external";
  hasPassword?: boolean;
  updatedAt?: string | null;
};

type TestResult = {
  connected: boolean;
  latencyMs?: number;
  serverDate?: string;
  effectiveHost?: string;
  effectivePort?: string;
  mode?: "local" | "external";
  error?: string;
};

const emptyConfig: DbConfig = {
  database: "",
  hostname: "",
  port: "30231",
  protocol: "TCPIP",
  uid: "",
  connectTimeout: "30",
  useExternalHost: false,
  externalHost: "",
  externalPort: "",
};

export function DatabaseSettings() {
  const { theme, isDark, setTheme } = useTheme();
  const [config, setConfig] = useState<DbConfig>(emptyConfig);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const activeEndpoint = useMemo(() => {
    if (config.useExternalHost && config.externalHost) {
      return `${config.externalHost}:${config.externalPort || config.port}`;
    }

    return `${config.hostname}:${config.port}`;
  }, [config.externalHost, config.externalPort, config.hostname, config.port, config.useExternalHost]);

  useEffect(() => {
    fetch("/api/config/db")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          return;
        }

        setConfig({
          ...emptyConfig,
          ...data,
          port: String(data.port ?? emptyConfig.port),
          externalPort: String(data.externalPort ?? ""),
          connectTimeout: String(data.connectTimeout ?? emptyConfig.connectTimeout),
        });
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const updateConfig = <Key extends keyof DbConfig>(key: Key, value: DbConfig[Key]) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setTestResult(null);
  };

  const requestBody = () => ({
    ...config,
    password: password.trim().length > 0 ? password : undefined,
  });

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/config/db", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody()),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao salvar configuração");
      }

      setConfig({
        ...emptyConfig,
        ...data,
        port: String(data.port ?? emptyConfig.port),
        externalPort: String(data.externalPort ?? ""),
        connectTimeout: String(data.connectTimeout ?? emptyConfig.connectTimeout),
      });
      setPassword("");
      toast.success("Configuracao do banco salva");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/config/db/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody()),
      });
      const data = await res.json();

      if (!res.ok || data.connected === false) {
        throw new Error(data.error || "Falha ao conectar");
      }

      setTestResult(data);
      toast.success("Conexão DB2 validada");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao conectar";
      setTestResult({ connected: false, error: message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-strong rounded-2xl p-8 flex items-center justify-center gap-3 text-sm text-slate-300 min-h-[320px]">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        Carregando configuração
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Seção de Aparência e Tema do Sistema */}
      <section className="glass-strong rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 grid place-items-center">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold">Aparência & Identidade Visual</h3>
              <p className="text-xs text-slate-400">
                Escolha o tema global do HORUS ANALYTICS (Modo Escuro Midnight ou Modo Claro Executive)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
          {/* Opção Modo Escuro */}
          <div
            onClick={() => {
              setTheme("dark");
              toast.success("Modo Escuro ativado");
            }}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-3 ${
              isDark
                ? "bg-slate-900 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                : "bg-slate-900/50 border-slate-700/60 hover:border-slate-500"
            }`}
          >
            <div className="size-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Moon className="size-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-100">Modo Escuro (Midnight Cyan)</span>
                {isDark && (
                  <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                    Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Identidade visual clássica com fundo profundo, bordas neon e brilho ciano executivo.
              </p>
            </div>
          </div>

          {/* Opção Modo Claro */}
          <div
            onClick={() => {
              setTheme("light");
              toast.success("Modo Claro ativado");
            }}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-3 ${
              !isDark
                ? "bg-white border-blue-600 shadow-md ring-2 ring-blue-500/20"
                : "bg-slate-900/40 border-slate-700/60 hover:border-slate-500"
            }`}
          >
            <div className="size-9 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5">
              <Sun className="size-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">Modo Claro (Executive White)</span>
                {!isDark && (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-300 px-2 py-0.5 rounded-full">
                    Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Visual executivo limpo com fundo suave, cards brancos, sombras discretas e tons pastéis nos recebimentos.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-strong rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold">Configurações do Banco</h3>
              <p className="text-xs text-slate-400">
                DB2 ativo em {activeEndpoint}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{config.hasPassword ? "Senha salva" : "Sem senha salva"}</span>
            </div>
            <Button onClick={testConnection} disabled={testing} variant="outline" className="border-white/15 bg-white/5">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              Testar
            </Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </Button>
          </div>
        </div>

        {testResult && (
          <div
            className={`rounded-md border px-4 py-3 text-sm flex flex-col gap-1 ${
              testResult.connected
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                : "border-red-500/20 bg-red-500/10 text-red-100"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {testResult.connected ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.connected ? "Conexão validada" : "Conexão recusada"}
            </div>
            <div className="text-xs opacity-80">
              {testResult.connected
                ? `${testResult.effectiveHost}:${testResult.effectivePort} em ${testResult.latencyMs}ms`
                : testResult.error}
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-strong rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Server className="w-5 h-5 text-primary" />
            <h4 className="font-serif font-semibold text-lg">Credenciais DB2</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="database">Banco</Label>
              <Input
                id="database"
                value={config.database}
                onChange={(event) => updateConfig("database", event.target.value)}
                placeholder="cisserp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protocol">Protocolo</Label>
              <Input
                id="protocol"
                value={config.protocol}
                onChange={(event) => updateConfig("protocol", event.target.value.toUpperCase())}
                placeholder="TCPIP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uid">Usuario</Label>
              <Input
                id="uid"
                value={config.uid}
                onChange={(event) => updateConfig("uid", event.target.value)}
                placeholder="usuario_db2"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder={config.hasPassword ? "Manter senha atual" : "Digite a senha"}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded grid place-items-center text-slate-400 hover:text-slate-100"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Globe2 className="w-5 h-5 text-primary" />
            <h4 className="font-serif font-semibold text-lg">Acesso e IP Externo</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hostname">IP interno / Host</Label>
              <Input
                id="hostname"
                value={config.hostname}
                onChange={(event) => updateConfig("hostname", event.target.value)}
                placeholder="192.168.20.20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Porta interna</Label>
              <Input
                id="port"
                value={config.port}
                onChange={(event) => updateConfig("port", event.target.value)}
                inputMode="numeric"
                placeholder="30231"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="externalHost">IP externo / DNS</Label>
              <Input
                id="externalHost"
                value={config.externalHost}
                onChange={(event) => updateConfig("externalHost", event.target.value)}
                placeholder="meu-ip-ou-ddns.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="externalPort">Porta externa</Label>
              <Input
                id="externalPort"
                value={config.externalPort}
                onChange={(event) => updateConfig("externalPort", event.target.value)}
                inputMode="numeric"
                placeholder={config.port || "30231"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="connectTimeout">Timeout</Label>
              <Input
                id="connectTimeout"
                value={config.connectTimeout}
                onChange={(event) => updateConfig("connectTimeout", event.target.value)}
                inputMode="numeric"
                placeholder="30"
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/25 px-3 py-2">
              <div>
                <Label htmlFor="useExternalHost" className="text-sm">
                  Usar IP externo
                </Label>
                <div className="text-[11px] text-slate-400">{config.useExternalHost ? "Externo" : "Local"}</div>
              </div>
              <Switch
                id="useExternalHost"
                checked={config.useExternalHost}
                onCheckedChange={(checked) => updateConfig("useExternalHost", checked)}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
