import React, { useState } from "react";
import {
  Rocket,
  X,
  FileSpreadsheet,
  TrendingUp,
  ArrowRight,
  Tag,
  ClipboardList,
  Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const SYSTEM_VERSION = "3.6.0";
export const RELEASE_DATE = "23 de Novembro de 2026";

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

export function WhatsNewModal({ isOpen, onClose, onNavigate }: WhatsNewModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(true);

  if (!isOpen) return null;

  const markSeen = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem("horus_last_seen_version", SYSTEM_VERSION);
      } catch (_) {}
    }
  };

  const handleConfirm = () => {
    markSeen();
    onClose();
  };

  const handleOpenFeature = (targetTab?: string) => {
    markSeen();
    onClose();
    if (targetTab && onNavigate) {
      onNavigate(targetTab);
    }
  };

  const features = [
    {
      badge: "NOVO MÓDULO",
      badgeColor: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30",
      icon: FileSpreadsheet,
      iconGrad: "from-cyan-500 to-blue-600",
      targetTab: "central-relatorios",
      title: "Central de Relatórios Executivos",
      description:
        "Novo módulo unificado para gerar relatórios por loja, período e categoria, com pré-visualização analítica, impressão direta e exportação em CSV/Excel."
    },
    {
      badge: "DADOS REAIS DB2",
      badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      icon: TrendingUp,
      iconGrad: "from-emerald-500 to-teal-600",
      targetTab: "visao-geral",
      title: "Lucro, Margem Real & Comparativo de Ontem",
      description:
        "Indicadores do painel principal agora refletem lucro e margem reais direto do DB2 (Estoque Analítico), além do comparativo com o faturamento de ontem e contagem de tickets."
    },
    {
      badge: "CAMPANHAS",
      badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      icon: Tag,
      iconGrad: "from-amber-500 to-orange-600",
      targetTab: "promocoes",
      title: "Promoções & Ofertas Mais Recentes",
      description:
        "Listagem de promoções atualizada para priorizar automaticamente as campanhas mais recentes (data de início e código), facilitando a conferência diária."
    },
    {
      badge: "COMPRAS & FINANCEIRO",
      badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
      icon: ClipboardList,
      iconGrad: "from-purple-500 to-indigo-600",
      targetTab: "pedidos-compradores",
      title: "Pedidos de Compradores & Contas a Pagar",
      description:
        "Telas otimizadas e mais objetivas para acompanhar ordens de compra por comprador e consultar vencimentos financeiros por filial."
    },
    {
      badge: "DESIGN & USABILIDADE",
      badgeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
      icon: Palette,
      iconGrad: "from-blue-500 to-sky-600",
      targetTab: "visao-geral",
      title: "Novo Tema Claro Corporativo & Menu com Busca",
      description:
        "Novo visual profissional com fundo cinza frio e cards branco gelo, menu lateral categorizado com busca rápida de módulos e nova identidade Cybertech Horus."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
        onClick={handleConfirm}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10"
      >
        {/* Glow Decorativo de Fundo */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="p-6 md:p-7 border-b border-slate-200 dark:border-white/10 relative z-10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-13 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/25 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Rocket className="size-7 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold tracking-wider uppercase text-cyan-700 dark:text-cyan-400 bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                  Novidades da Versão {SYSTEM_VERSION}
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  • {RELEASE_DATE}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                O que há de novo no Cybertech Horus
              </h2>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Clique em qualquer novidade abaixo para abrir o módulo diretamente.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleConfirm}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full size-8 shrink-0 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Lista de Novidades Clicáveis (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-3.5 no-scrollbar relative z-10">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleOpenFeature(item.targetTab)}
                className="w-full text-left group p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/5 hover:border-blue-400/60 dark:hover:border-cyan-400/40 transition-all duration-200 hover:bg-blue-50/40 dark:hover:bg-slate-950/80 flex gap-4 items-start cursor-pointer"
              >
                <div
                  className={`size-11 rounded-xl bg-gradient-to-br ${item.iconGrad} p-0.5 shrink-0 shadow-md flex items-center justify-center`}
                >
                  <div className="w-full h-full bg-slate-950/85 rounded-[10px] flex items-center justify-center">
                    <Icon className="size-5 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                      <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors">
                        {item.title}
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-cyan-400 flex items-center gap-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0">
                      <span>Abrir</span>
                      <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer com Opção "Não mostrar novamente" e Botão Confirmar */}
        <div className="p-5 md:p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none hover:text-slate-900 dark:hover:text-slate-300">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="size-4 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer"
            />
            <span>Não exibir novamente para esta versão</span>
          </label>

          <Button
            onClick={handleConfirm}
            className="w-full sm:w-auto px-6 py-2.5 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 !text-white font-semibold text-xs md:text-sm shadow-lg shadow-cyan-500/25 gap-2"
          >
            <span>Explorar Novidades</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

