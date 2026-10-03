import { diaOffsetKey } from './format';

const arred = (n) => Math.round(n * 100) / 100;

export const PERIODOS_LUCRO = [
  { id: '7', label: '7 dias', dias: 7 },
  { id: '30', label: '30 dias', dias: 30 },
  { id: 'tudo', label: 'Tudo', dias: null },
];

// Ranking dos produtos por lucro (receita - custo da mercadoria), só com vendas ligadas ao stock.
// Regime de caixa, como o resto da app: um fiado só conta quando é pago.
export function rankingProdutos(transacoes, produtos, periodoId) {
  const periodo = PERIODOS_LUCRO.find((p) => p.id === periodoId) || PERIODOS_LUCRO[1];
  const inicio = periodo.dias ? diaOffsetKey(periodo.dias - 1) : null;

  const mapa = new Map();
  transacoes.forEach((t) => {
    if (t.tipo !== 'entrada' || !t.produtoId) return;
    if (inicio && t.dateKey < inicio) return;
    const m = mapa.get(t.produtoId) || { produtoId: t.produtoId, receita: 0, custo: 0, unidades: 0 };
    m.receita += t.valor || 0;
    m.custo += t.custoTotal || 0;
    m.unidades += t.quantidade || 0; // recebimentos de fiado não têm quantidade
    mapa.set(t.produtoId, m);
  });

  const itens = [...mapa.values()].map((m) => {
    const p = produtos.find((x) => x.id === m.produtoId);
    const lucro = arred(m.receita - m.custo);
    return {
      produtoId: m.produtoId,
      nome: p ? p.nome : 'Produto apagado',
      receita: arred(m.receita),
      custo: arred(m.custo),
      unidades: m.unidades,
      lucro,
      margem: m.receita > 0 ? lucro / m.receita : null,
    };
  }).sort((a, b) => b.lucro - a.lucro);

  // Produtos com stock que não venderam nada no período (dinheiro parado ao preço de custo).
  const parados = produtos
    .filter((p) => p.quantidade > 0 && !mapa.has(p.id))
    .map((p) => ({ produtoId: p.id, nome: p.nome, quantidade: p.quantidade, parado: arred(p.quantidade * (p.precoCusto || 0)) }))
    .sort((a, b) => b.parado - a.parado);

  return {
    itens,
    parados,
    lucroTotal: arred(itens.reduce((s, i) => s + i.lucro, 0)),
    receitaTotal: arred(itens.reduce((s, i) => s + i.receita, 0)),
  };
}

// Sugestor de preço: "pct" = percentagem acima do custo; "valor" = MT por unidade.
// O preço sugerido sobe para o próximo meio metical, para ficar um preço fácil de cobrar.
export function sugerirPreco(custo, modo, quanto) {
  const c = parseFloat(custo);
  const q = parseFloat(quanto);
  if (isNaN(c) || c <= 0 || isNaN(q) || q <= 0) return null;
  const bruto = modo === 'valor' ? c + q : c * (1 + q / 100);
  const preco = Math.ceil(bruto * 2 - 1e-9) / 2;
  return { preco, ganho: arred(preco - c) };
}
