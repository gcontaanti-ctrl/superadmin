import { Search, Bell, ChevronDown, Database } from "lucide-react";

export function Topbar() {
  return (
    <header className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Database className="size-3.5 text-primary" />
        <span className="tracking-executive text-[10px]">IBM DB2 · MATRIZ_PROD</span>
        <span className="size-1 rounded-full bg-muted-foreground/40" />
        <span className="text-[color:var(--success)]">conectado</span>
      </div>

      <div className="ml-4 flex-1 max-w-xl relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Buscar produtos, lojas, NFs, funcionários…"
          className="w-full glass rounded-xl pl-9 pr-20 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-muted-foreground">⌘K</kbd>
      </div>

      <button className="relative size-9 grid place-items-center rounded-xl glass hover:bg-white/5 transition">
        <Bell className="size-4" />
        <span className="absolute top-2 right-2 size-1.5 rounded-full bg-[color:var(--warning)]" />
      </button>

      <button className="flex items-center gap-2 glass rounded-xl pl-1.5 pr-2.5 py-1.5 hover:bg-white/5 transition">
        <div className="size-7 rounded-lg bg-[image:var(--gradient-primary)] grid place-items-center text-xs font-semibold text-primary-foreground">
          RA
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-medium leading-tight">Ricardo A.</div>
          <div className="text-[10px] text-muted-foreground leading-tight">Diretor Financeiro (CFO) · Matriz</div>
        </div>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
    </header>
  );
}

