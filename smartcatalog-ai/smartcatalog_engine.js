/**
 * SmartCatalog Engine - Algoritmo Determinístico de Comparação Textual, Duplicidade e Eleição de Mestre
 * 0 Custos de API / 100% de Performance e Precisão
 */

// 1. Algoritmo Levenshtein Distance para similaridade de nomes
export function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// 2. Normalizador de strings
export function normalizeText(text) {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim();
}

// 3. Percentual de Similaridade entre dois textos
export function calculateTextSimilarity(str1, str2) {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);

  if (norm1 === norm2) return 100;
  if (!norm1 || !norm2) return 0;

  const maxLen = Math.max(norm1.length, norm2.length);
  const dist = levenshteinDistance(norm1, norm2);
  const similarity = ((maxLen - dist) / maxLen) * 100;
  return Math.max(0, Math.round(similarity * 100) / 100);
}

// 4. Análise Completa de Duplicidade entre 2 Produtos
export function analyzeProductPair(prodA, prodB) {
  const reasons = [];
  let totalScore = 0;

  const gtinA = prodA.gtin_ean ? prodA.gtin_ean.trim() : '';
  const gtinB = prodB.gtin_ean ? prodB.gtin_ean.trim() : '';

  if (gtinA && gtinB && gtinA === gtinB) {
    totalScore += 50;
    reasons.push(`Mesmo Código GTIN/EAN (${gtinA})`);
  }

  if (prodA.codigo_interno && prodB.codigo_interno && prodA.codigo_interno === prodB.codigo_interno) {
    totalScore += 30;
    reasons.push(`Mesmo Código Interno (${prodA.codigo_interno})`);
  }

  const nameSim = calculateTextSimilarity(prodA.descricao, prodB.descricao);
  if (nameSim >= 70) {
    const points = (nameSim / 100) * 40;
    totalScore += points;
    reasons.push(`Descrição com ${nameSim}% de similaridade`);
  }

  const marcaA = normalizeText(prodA.marca);
  const marcaB = normalizeText(prodB.marca);
  if (marcaA && marcaB && marcaA === marcaB) {
    totalScore += 10;
    reasons.push(`Mesma Marca (${prodA.marca})`);
  }

  if (prodA.peso_liquido > 0 && prodA.peso_liquido === prodB.peso_liquido) {
    totalScore += 5;
    reasons.push(`Mesmo Peso Líquido (${prodA.peso_liquido}kg)`);
  }

  const finalSimilarity = Math.min(100, Math.round(totalScore));
  
  return {
    isDuplicateCandidate: finalSimilarity >= 65,
    similarityPercentage: finalSimilarity,
    reasons: reasons.join(' | ')
  };
}

// 5. Algoritmo de Escolha Automática do PRODUTO MESTRE
export function electMasterProduct(products) {
  if (!products || products.length === 0) return null;

  const calculateProductScore = (p) => {
    let score = 0;
    score += (p.historico_vendas_total || 0) * 0.4;
    score += (p.qtd_movimentacoes || 0) * 10;
    if (p.gtin_ean && p.gtin_ean.length >= 8) score += 50;
    if (p.marca) score += 20;
    if (p.categoria) score += 15;
    if (p.peso_liquido > 0) score += 10;
    if ((p.estoque_atual || 0) > 0) score += 25;
    return score;
  };

  let master = products[0];
  let maxScore = calculateProductScore(master);

  for (let i = 1; i < products.length; i++) {
    const p = products[i];
    const currentScore = calculateProductScore(p);

    if (currentScore > maxScore) {
      maxScore = currentScore;
      master = p;
    }
  }

  return {
    masterProduct: master,
    masterScore: maxScore,
    suggestedForInactivation: products.filter(p => p.id !== master.id)
  };
}
