import React, { useState } from "react";
import {
  Sparkles,
  Rocket,
  CheckCircle2,
  X,
  CreditCard,
  Cloud,
  FileSpreadsheet,
  CalendarCheck,
  TrendingUp,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const SYSTEM_VERSION = "3.5.0";
export const RELEASE_DATE = "09 de Novembro de 2026";

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(true);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem("horus_last_seen_version", SYSTEM_VERSION);
      } catch (_) {}
    }
    onClose();
  };

  const features = [
    {
      badge: "NOVO MÓDULO",
      badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      icon: CreditCard,
      iconGrad: "from-cyan-500 to-blue-600",
      title: "Vendas por Bandeira de Cartão (TEF / POS)",
      description:
        "Painel completo para acompanhamento de vendas em cartões de crédito, débito e convênios (Elo, GoodCard, Discover, Ticket, Sodexo, etc.), com ticket médio, volume de transações e divisão comparativa entre lojas."
    },
    {
      badge: "ALTA PERFORMANCE",
      badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      icon: Cloud,
      iconGrad: "from-purple-500 to-indigo-600",
      title: "Deploy Oficial em Nuvem Vercel",
      description:
        "Acesso ultra-rápido, seguro e disponível 24 horas por dia através de link oficial em nuvem, eliminando a dependência de máquinas físicas locais ficarem ligadas no cliente."
    },
    {
      badge: "GESTÃO FINANCEIRA",
      badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      icon: FileSpreadsheet,
      iconGrad: "from-emerald-500 to-teal-600",
      title: "Controle de Convênios & Baixas Pendentes",
      description:
        "Visão detalhada de faturamento em convênios corporativos e sindicais, identificando títulos pendentes, vencidos e liquidados para controle de fluxo financeiro."
    },
    {
      badge: "PREVENÇÃO DE PERDAS",
      badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      icon: CalendarCheck,
      iconGrad: "from-amber-500 to-orange-600",
      title: "Auditor de Validade Crítica & Avarias",
      description:
        "Monitoramento antecipado de lotes próximos ao vencimento, com acionamento de queimas de estoque e minimização de perdas operacionais nos supermercados."
    },
    {
      badge: "EM DESENVOLVIMENTO",
      badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      icon: ShoppingBag,
      iconGrad: "from-blue-500 to-sky-600",
      title: "Inteligência & Vendas Atacarejo",
      description:
        "Novo módulo em criação para medir o faturamento, a margem de contribuição e o volume vendido de produtos com preço de atacado/atacarejo em cada unidade da rede."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={handleConfirm}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl shadow-blue-950/50 flex flex-col max-h-[90vh] overflow-hidden z-10">
        {/* Glow Decorativo de Fundo */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="p-6 md:p-7 border-b border-white/10 relative z-10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-13 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/25 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Rocket className="size-7 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold tracking-wider uppercase text-cyan-400 bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                  Novidades da Versão {SYSTEM_VERSION}
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  • {RELEASE_DATE}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                O que há de novo no Horus Gestão
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Confira as atualizações e melhorias implementadas no seu painel executivo.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleConfirm}
            className="text-slate-400 hover:text-white rounded-full size-8 shrink-0 bg-white/5 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Lista de Novidades (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-4 no-scrollbar relative z-10">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group p-4 md:p-4.5 rounded-2xl bg-slate-950/50 border border-white/5 hover:border-white/15 transition-all duration-200 hover:bg-slate-950/70 flex gap-4 items-start"
              >
                <div
                  className={`size-11 rounded-xl bg-gradient-to-br ${item.iconGrad} p-0.5 shrink-0 shadow-md flex items-center justify-center`}
                >
                  <div className="w-full h-full bg-slate-950/80 rounded-[10px] flex items-center justify-center">
                    <Icon className="size-5 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                    <h3 className="text-sm md:text-base font-semibold text-slate-100">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer com Opção "Não mostrar novamente" e Botão Confirmar */}
        <div className="p-5 md:p-6 border-t border-white/10 bg-slate-950/60 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-400 select-none hover:text-slate-300">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="size-4 rounded border-white/20 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer"
            />
            <span>Não exibir novamente para esta versão</span>
          </label>

          <Button
            onClick={handleConfirm}
            className="w-full sm:w-auto px-6 py-2.5 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs md:text-sm shadow-lg shadow-cyan-500/25 gap-2"
          >
            <span>Explorar Novidades</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
