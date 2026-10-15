/**
 * Domain Calculations & Intelligence Rules for Stock Ruptures
 * Follows Clean Architecture - Pure Domain Functions (No External Dependencies)
 */

/**
 * Consumo Médio Diário = Quantidade vendida ÷ Dias analisados
 */
function calcularConsumoMedioDiario(qtdVendida, diasAnalisados) {
    if (!diasAnalisados || diasAnalisados <= 0) return 0;
    return Math.max(0, Number(qtdVendida || 0) / Number(diasAnalisados));
}

/**
 * Dias de Estoque = Estoque Atual ÷ Consumo Médio Diário
 */
function calcularDiasEstoque(estoqueAtual, consumoMedioDiario) {
    const cmd = Number(consumoMedioDiario || 0);
    if (cmd <= 0) return 999; // Sem consumo => estoque dura indefinitivamente
    return Math.max(0, Number(estoqueAtual || 0) / cmd);
}

/**
 * Quantidade Ideal = (Consumo Médio Diário × Lead Time) + Estoque de Segurança - Estoque Atual
 * Caso seja menor que zero, sugerir 0.
 */
function calcularQuantidadeIdeal(cmd, leadTimeDias, estoqueSeguranca, estoqueAtual) {
    const necessidade = (Number(cmd || 0) * Number(leadTimeDias || 0)) + Number(estoqueSeguranca || 0);
    const sugerido = necessidade - Number(estoqueAtual || 0);
    return Math.max(0, Math.ceil(sugerido));
}

/**
 * Score de risco em cores:
 * - Verde: > 15 dias de estoque
 * - Amarelo: Entre 8 e 15 dias
 * - Laranja: Entre 4 e 7 dias
 * - Vermelho: < 4 dias
 */
function obterScoreRisco(diasEstoque) {
    const dias = Number(diasEstoque);
    if (dias < 4) return { label: 'Vermelho', code: 'RED', color: '#ef4444', level: 4 };
    if (dias <= 7) return { label: 'Laranja', code: 'ORANGE', color: '#f97316', level: 3 };
    if (dias <= 15) return { label: 'Amarelo', code: 'YELLOW', color: '#eab308', level: 2 };
    return { label: 'Verde', code: 'GREEN', color: '#22c55e', level: 1 };
}

/**
 * Análise Inteligente do Produto:
 * - Irão acabar antes da próxima entrega
 * - Comprados acima da necessidade
 * - Excesso de estoque
 * - Baixo giro / Parados
 * - Venda acelerada / Crescimento de demanda / Queda de demanda
 */
function analisarInteligenciaProduto(item) {
    const {
        estoqueAtual,
        diasEstoque,
        leadTimeDias,
        venda7d,
        venda15d,
        venda30d,
        venda60d,
        venda90d,
        vendaMesmoPeriodoAnoAnterior,
        estoqueMaximo
    } = item;

    const insights = [];

    // 1. Acabar antes da próxima entrega
    if (diasEstoque < leadTimeDias) {
        insights.push({
            tipo: 'RUPTURA_IMINENTE',
            titulo: 'Risco de Ruptura Iminente',
            descricao: `Estoque acaba em ${diasEstoque.toFixed(1)} dias, mas a entrega leva ${leadTimeDias} dias.`
        });
    }

    // 2. Venda Acelerada / Crescimento
    const cmd7 = calcularConsumoMedioDiario(venda7d, 7);
    const cmd30 = calcularConsumoMedioDiario(venda30d, 30);
    if (cmd7 > cmd30 * 1.3 && cmd30 > 0) {
        insights.push({
            tipo: 'DEMANDA_CRESCENTE',
            titulo: 'Venda Acelerada',
            descricao: `Vendas nos últimos 7 dias cresceram ${( (cmd7/cmd30 - 1) * 100 ).toFixed(0)}% em relação aos últimos 30 dias.`
        });
    } else if (cmd7 < cmd30 * 0.7 && cmd30 > 0) {
        insights.push({
            tipo: 'DEMANDA_QUEDA',
            titulo: 'Queda de Demanda',
            descricao: `Vendas recentes caíram ${( (1 - cmd7/cmd30) * 100 ).toFixed(0)}% comparado à média mensal.`
        });
    }

    // 3. Excesso de estoque / Comprados acima da necessidade
    if (estoqueMaximo > 0 && estoqueAtual > estoqueMaximo) {
        insights.push({
            tipo: 'EXCESSO_ESTOQUE',
            titulo: 'Excesso de Estoque',
            descricao: `Estoque atual (${estoqueAtual}) supera o estoque máximo cadastrado (${estoqueMaximo}).`
        });
    }

    // 4. Produtos Parados / Baixo Giro
    if (venda30d <= 0 && estoqueAtual > 0) {
        insights.push({
            tipo: 'PRODUTO_PARADO',
            titulo: 'Produto Sem Movimentação',
            descricao: 'Nenhuma venda registrada nos últimos 30 dias.'
        });
    } else if (diasEstoque > 60 && estoqueAtual > 0) {
        insights.push({
            tipo: 'BAIXO_GIRO',
            titulo: 'Baixo Giro',
            descricao: `Cobertura de estoque de ${diasEstoque.toFixed(0)} dias excede 60 dias.`
        });
    }

    // 5. Comparativo Sazonal (Mesmo Período Ano Anterior)
    if (vendaMesmoPeriodoAnoAnterior > 0) {
        const cmdAnoAnterior = calcularConsumoMedioDiario(vendaMesmoPeriodoAnoAnterior, 30);
        if (cmd30 > cmdAnoAnterior * 1.2) {
            insights.push({
                tipo: 'SAZONALIDADE_ALTA',
                titulo: 'Crescimento Sazonal',
                descricao: `Vendas superam em ${( (cmd30/cmdAnoAnterior - 1)*100 ).toFixed(0)}% o mesmo período do ano anterior.`
            });
        }
    }

    return insights;
}

module.exports = {
    calcularConsumoMedioDiario,
    calcularDiasEstoque,
    calcularQuantidadeIdeal,
    obterScoreRisco,
    analisarInteligenciaProduto
};
