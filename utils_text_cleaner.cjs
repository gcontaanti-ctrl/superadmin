function normalizarTexto(txt) {
  if (!txt) return txt;

  // O DB2 CISS envia os textos usando o caractere de substituição oficial do Unicode (Replacement Character: \uFFFD ou efbfbd em UTF8)
  // por conta de perdas na conversão nativa do banco de dados de IBM850/CP850 ou WIN1252 para UTF8.
  // Como esses caracteres \uFFFD vêm agrupados, vamos mapear os textos inteiros baseados no cadastro original do ERP.

  let n = txt.trim();

  // Mapeamento direto de regras conhecidas com base no DB2 CISS
  const dicionario = {
    // Regra 78
    "Valida produtos com o percentual de variao de custo superior ou inferior a ltima compra": 
      "Valida produtos com o percentual de variação de custo superior ou inferior a última compra",
    
    // Regra 28
    "Valores de base de clculo de PIS/COFINS est divergente do total lquido ou percentual PIS/COFINS sem valor":
      "Valores de base de cálculo de PIS/COFINS estão divergentes do total líquido ou percentual PIS/COFINS sem valor",

    // Regra 8
    "Nota com movimento de PIS/COFINS com inconsistncia no registro dos valores":
      "Nota com movimento de PIS/COFINS com inconsistência no registro dos valores",

    // Outras regras e variações observadas no log
    "Nota de devoluo com nota de origem excluda":
      "Nota de devolução com nota de origem excluída",

    "Lanamento contbil com total crdito e total dbito divergentes":
      "Lançamento contábil com total crédito e total débito divergentes",

    "Notas pendentes ou com problema de cancelamento no monitor NFe":
      "Notas pendentes ou com problema de cancelamento no monitor NF-e",

    "Nota de entrada provinda de CPF, que no seja devoluo de venda, no deve gerar PIS/COFINS":
      "Nota de entrada proveniente de CPF, que não seja devolução de venda, não deve gerar PIS/COFINS",

    "Nota com valor contbil diferente da soma BASE ICMS, ISENTO ICMS, DIFERIDO, OUTROS ICMS":
      "Nota com valor contábil diferente da soma BASE ICMS, ISENTO ICMS, DIFERIDO, OUTROS ICMS",

    "Nota com diferena de valor de Base de ICMS":
      "Nota com diferença de valor de Base de ICMS",

    "Valida Notas com CFOP de Entrada diferente do CFOP do XML 5910/6910":
      "Valida Notas com CFOP de Entrada diferente do CFOP do XML 5910/6910",

    "Nota com diferena na configurao do COI com o movimento PIS/COFINS":
      "Nota com diferença na configuração do COI com o movimento PIS/COFINS",

    "Numerao de notas prprias que esto fora de sequncia":
      "Numeração de notas próprias que estão fora de sequência",

    "Nota com produto com situao tributria divergente da CST do ICMS":
      "Nota com produto com situação tributária divergente da CST do ICMS",

    "Validar modelo e srie da nota fiscal de entrada de prestao servio":
      "Validar modelo e série da nota fiscal de entrada de prestação de serviço",

    "Valida notas com CST 60 divergente do cenrio fiscal":
      "Valida notas com CST 60 divergente do cenário fiscal",

    "Nota fiscal de devoluo com chave igual a da nota origem da devoluo":
      "Nota fiscal de devolução com chave igual a da nota origem da devolução",

    "Notas com CFOP 1556,2556,1407,2407,2551,1551 que creditam ICMS ou PIS/Cofins":
      "Notas com CFOP 1556, 2556, 1407, 2407, 2551, 1551 que creditam ICMS ou PIS/Cofins",

    "Produto sem relacionamento de patrimnio CFOP (2551,1551)":
      "Produto sem relacionamento de patrimônio CFOP (2551, 1551)",

    "Patrimnio com valor inferior a 1200 reais CFOP (2551,1551)":
      "Patrimônio com valor inferior a 1.200 reais CFOP (2551, 1551)",

    "Nota lanada no CNPJ errado":
      "Nota lançada no CNPJ errado"
  };

  // Se bater exatamente no dicionário (removendo caracteres especiais de controle se houver)
  // Limpamos o string de caracteres estranhos para fazer o match no dicionário
  const limpo = n.replace(/\uFFFD/g, '');
  if (dicionario[limpo]) {
    return dicionario[limpo];
  }

  // Fallback de substituição caractere por caractere (caso venham novas regras)
  let corrigido = n;
  corrigido = corrigido.replace(/\uFFFD\uFFFD\uFFFD/g, 'çã'); 
  corrigido = corrigido.replace(/\uFFFD\uFFFD/g, 'çã'); // Variação observada
  corrigido = corrigido.replace(/variao/g, 'variação');
  corrigido = corrigido.replace(/clculo/g, 'cálculo');
  corrigido = corrigido.replace(/lquido/g, 'líquido');
  corrigido = corrigido.replace(/inconsistncia/g, 'inconsistência');
  corrigido = corrigido.replace(/devoluo/g, 'devolução');
  corrigido = corrigido.replace(/lanamento/g, 'lançamento');
  corrigido = corrigido.replace(/contbil/g, 'contábil');
  corrigido = corrigido.replace(/dbito/g, 'débito');
  corrigido = corrigido.replace(/crdito/g, 'crédito');
  corrigido = corrigido.replace(/cenrio/g, 'cenário');
  corrigido = corrigido.replace(/patrimnio/g, 'patrimônio');
  corrigido = corrigido.replace(/comunicao/g, 'comunicação');
  corrigido = corrigido.replace(/transmisso/g, 'transmissão');
  corrigido = corrigido.replace(/ltima/g, 'última');
  corrigido = corrigido.replace(/ltimo/g, 'último');
  corrigido = corrigido.replace(/nmero/g, 'número');
  corrigido = corrigido.replace(/situao/g, 'situação');
  corrigido = corrigido.replace(/tributria/g, 'tributária');
  corrigido = corrigido.replace(/servio/g, 'serviço');
  corrigido = corrigido.replace(/presena/g, 'presença');
  corrigido = corrigido.replace(/operao/g, 'operação');
  corrigido = corrigido.replace(/declarao/g, 'declaração');
  corrigido = corrigido.replace(/diferena/g, 'diferença');
  corrigido = corrigido.replace(/validao/g, 'validação');
  corrigido = corrigido.replace(/correo/g, 'correção');
  corrigido = corrigido.replace(/comparao/g, 'comparação');
  corrigido = corrigido.replace(/obrigatria/g, 'obrigatória');
  corrigido = corrigido.replace(/especificao/g, 'especificação');
  corrigido = corrigido.replace(/informao/g, 'informação');
  corrigido = corrigido.replace(/informaes/g, 'informações');
  corrigido = corrigido.replace(/gerncia/g, 'gerência');
  corrigido = corrigido.replace(/promoo/g, 'promoção');
  corrigido = corrigido.replace(/promoes/g, 'promoções');
  corrigido = corrigido.replace(/validaes/g, 'validações');
  corrigido = corrigido.replace(/seo/g, 'seção');
  corrigido = corrigido.replace(/excluda/g, 'excluída');
  corrigido = corrigido.replace(/excludo/g, 'excluído');
  corrigido = corrigido.replace(/sequncia/g, 'sequência');
  corrigido = corrigido.replace(/atuao/g, 'atuação');
  corrigido = corrigido.replace(/configurao/g, 'configuração');
  corrigido = corrigido.replace(/est/g, 'está');
  corrigido = corrigido.replace(/no/g, 'não');
  corrigido = corrigido.replace(/perodo/g, 'período');
  corrigido = corrigido.replace(/sada/g, 'saída');
  corrigido = corrigido.replace(/recepo/g, 'recepção');
  corrigido = corrigido.replace(/faturao/g, 'faturação');
  corrigido = corrigido.replace(/prprias/g, 'próprias');
  corrigido = corrigido.replace(/servio/g, 'serviço');
  corrigido = corrigido.replace(/diferena/g, 'diferença');
  corrigido = corrigido.replace(/Validao/g, 'Validação');
  corrigido = corrigido.replace(/srie/g, 'série');
  corrigido = corrigido.replace(/lanada/g, 'lançada');
  
  // Limpar qualquer caractere substituto solto
  corrigido = corrigido.replace(/\uFFFD/g, '');

  return corrigido;
}

module.exports = { normalizarTexto };
