import React, { useMemo } from 'react';
import { Building2, User, FileText, Calendar, Hash, MapPin, Package, DollarSign, Receipt } from 'lucide-react';

interface NfeViewerProps {
  xml: string;
}

const fmtCurrency = (val: string | number) => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const fmtDoc = (doc: string) => {
  if (!doc) return '-';
  if (doc.length === 14) return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (doc.length === 11) return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return doc;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR');
  } catch {
    return dateStr;
  }
};

export default function NfeViewer({ xml }: NfeViewerProps) {
  const data = useMemo(() => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");
      
      const getTag = (parent: Element | Document | null, tag: string) => {
        if (!parent) return '';
        const el = parent.getElementsByTagName(tag)[0];
        return el ? el.textContent || '' : '';
      };

      const emit = doc.getElementsByTagName("emit")[0];
      const dest = doc.getElementsByTagName("dest")[0];
      const ide = doc.getElementsByTagName("ide")[0];
      const ICMSTot = doc.getElementsByTagName("ICMSTot")[0];
      const protNFe = doc.getElementsByTagName("protNFe")[0];

      const emitCnpj = getTag(emit, "CNPJ") || getTag(emit, "CPF");
      const destCnpj = getTag(dest, "CNPJ") || getTag(dest, "CPF");

      const items = Array.from(doc.getElementsByTagName("det")).map((det, idx) => {
        const prod = det.getElementsByTagName("prod")[0];
        const imposto = det.getElementsByTagName("imposto")[0];
        return {
          nItem: det.getAttribute("nItem") || String(idx + 1),
          cProd: getTag(prod, "cProd"),
          xProd: getTag(prod, "xProd"),
          qCom: parseFloat(getTag(prod, "qCom")) || 0,
          uCom: getTag(prod, "uCom"),
          vUnCom: parseFloat(getTag(prod, "vUnCom")) || 0,
          vProd: parseFloat(getTag(prod, "vProd")) || 0,
          vICMS: parseFloat(getTag(imposto, "vICMS")) || 0,
          vIPI: parseFloat(getTag(imposto, "vIPI")) || 0,
        };
      });

      return {
        ide: {
          nNF: getTag(ide, "nNF"),
          serie: getTag(ide, "serie"),
          dhEmi: getTag(ide, "dhEmi") || getTag(ide, "dEmi"),
          natOp: getTag(ide, "natOp"),
          chNFe: getTag(protNFe, "chNFe") || getTag(doc.getElementsByTagName("infNFe")[0], "Id")?.replace('NFe', ''),
        },
        emit: {
          xNome: getTag(emit, "xNome"),
          xFant: getTag(emit, "xFant"),
          CNPJ: emitCnpj,
          IE: getTag(emit, "IE"),
          ender: `${getTag(emit, "xLgr")}, ${getTag(emit, "nro")}${getTag(emit, "xCpl") ? ' - ' + getTag(emit, "xCpl") : ''} - ${getTag(emit, "xBairro")}, ${getTag(emit, "xMun")} - ${getTag(emit, "UF")}`
        },
        dest: {
          xNome: getTag(dest, "xNome"),
          CNPJ: destCnpj,
          IE: getTag(dest, "IE"),
          ender: `${getTag(dest, "xLgr")}, ${getTag(dest, "nro")}${getTag(dest, "xCpl") ? ' - ' + getTag(dest, "xCpl") : ''} - ${getTag(dest, "xBairro")}, ${getTag(dest, "xMun")} - ${getTag(dest, "UF")}`
        },
        total: {
          vNF: getTag(ICMSTot, "vNF"),
          vProd: getTag(ICMSTot, "vProd"),
          vFrete: getTag(ICMSTot, "vFrete"),
          vDesc: getTag(ICMSTot, "vDesc"),
          vICMS: getTag(ICMSTot, "vICMS"),
          vIPI: getTag(ICMSTot, "vIPI"),
        },
        items
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [xml]);

  if (!data) return <div className="p-8 text-center text-rose-400 font-medium">Erro ao processar o XML da Nota. Pode estar corrompido ou fora do padrão.</div>;

  return (
    <div className="flex flex-col gap-6 p-2 h-full text-slate-300">
      
      {/* HEADER DA NOTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* EMITENTE */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold mb-3">
            <Building2 className="w-4 h-4" />
            <h3>Emitente</h3>
          </div>
          <div className="flex flex-col gap-1 text-[11px]">
            <p className="font-bold text-slate-100 text-xs">{data.emit.xFant || data.emit.xNome}</p>
            <p className="text-slate-400">{data.emit.xNome}</p>
            <p className="font-mono text-slate-300 mt-1">CNPJ: {fmtDoc(data.emit.CNPJ)}</p>
            <p className="font-mono text-slate-400">IE: {data.emit.IE}</p>
            <p className="text-slate-500 mt-1 flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{data.emit.ender}</span>
            </p>
          </div>
        </div>

        {/* DADOS DA NFE */}
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 flex flex-col justify-center items-center text-center">
          <Receipt className="w-8 h-8 text-cyan-400 mb-2 opacity-80" />
          <h2 className="text-xl font-bold text-white mb-1">NF-e Nº {data.ide.nNF}</h2>
          <p className="text-cyan-200/70 text-[11px] font-bold tracking-wider mb-3">SÉRIE {data.ide.serie}</p>
          
          <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 mb-2">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">Chave de Acesso</p>
            <p className="font-mono text-[10px] text-cyan-300">{data.ide.chNFe}</p>
          </div>
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Emissão: {formatDate(data.ide.dhEmi)}
          </p>
        </div>

        {/* DESTINATÁRIO */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-indigo-400 font-bold mb-3">
            <User className="w-4 h-4" />
            <h3>Destinatário</h3>
          </div>
          <div className="flex flex-col gap-1 text-[11px]">
            <p className="font-bold text-slate-100 text-xs">{data.dest.xNome}</p>
            <p className="font-mono text-slate-300 mt-1">CNPJ: {fmtDoc(data.dest.CNPJ)}</p>
            <p className="font-mono text-slate-400">IE: {data.dest.IE || 'Isento'}</p>
            <p className="text-slate-500 mt-1 flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{data.dest.ender}</span>
            </p>
          </div>
        </div>
      </div>

      {/* TOTAIS */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
        <div className="flex gap-8">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total dos Produtos</p>
            <p className="font-mono font-bold text-slate-200">{fmtCurrency(data.total.vProd)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Descontos</p>
            <p className="font-mono font-bold text-rose-400">{fmtCurrency(data.total.vDesc)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Base ICMS</p>
            <p className="font-mono font-bold text-slate-400">{fmtCurrency(data.total.vICMS)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-emerald-400/70 uppercase font-bold mb-1">Valor Total da Nota</p>
          <p className="text-2xl font-mono font-bold text-emerald-400">{fmtCurrency(data.total.vNF)}</p>
        </div>
      </div>

      {/* ITENS */}
      <div className="bg-white/5 border border-white/10 rounded-xl flex-1 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-white/10 bg-black/20 flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-400" />
          <h3 className="font-bold text-sm text-slate-200">Itens da Nota ({data.items.length})</h3>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-slate-900 border-b border-white/10 shadow-md">
              <tr className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="py-2 px-3 w-10 text-center">Nº</th>
                <th className="py-2 px-3 w-24">Código</th>
                <th className="py-2 px-3">Descrição do Produto</th>
                <th className="py-2 px-3 w-12 text-center">Unid.</th>
                <th className="py-2 px-3 w-20 text-right">Qtd.</th>
                <th className="py-2 px-3 w-24 text-right">V. Unitário</th>
                <th className="py-2 px-3 w-24 text-right">V. Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.items.map(item => (
                <tr key={item.nItem} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3 text-center text-slate-500">{item.nItem}</td>
                  <td className="py-2 px-3 font-mono text-slate-400">{item.cProd}</td>
                  <td className="py-2 px-3 font-medium text-slate-200 truncate max-w-[200px]" title={item.xProd}>{item.xProd}</td>
                  <td className="py-2 px-3 text-center text-slate-400">{item.uCom}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">{item.qCom.toLocaleString('pt-BR')}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">{fmtCurrency(item.vUnCom)}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-200">{fmtCurrency(item.vProd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
