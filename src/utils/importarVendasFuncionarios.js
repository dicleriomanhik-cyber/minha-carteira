import { timestampParaDia } from './format';

// Passa as vendas registadas pelos funcionários (tabela vendas_funcionarios) para o Caixa e o Stock do dono.
// Regras (ver docs/CONTEXTO-PROJECTO.md, secção 4):
// - cada venda vira uma entrada com o id "func-<id da venda>"; se esse id já existir no Caixa, não se repete nada
//   (nem a entrada nem o desconto de stock), assim a mesma venda nunca conta duas vezes;
// - o stock desce pela quantidade vendida mas nunca fica abaixo de 0 (se o stock já não chegar, a venda entra na mesma);
// - o custo da venda é o preço de custo ACTUAL do produto; se o produto já foi apagado, a venda entra sem produto nem custo.

export const idTransacaoFuncionario = (vendaId) => `func-${vendaId}`;

// Desconta do stock as quantidades das entradas dadas (só as que têm produtoId). Nunca fica abaixo de 0.
export function descontarStock(produtos, transacoes) {
  const porProduto = {};
  transacoes.forEach((t) => {
    if (t.produtoId) porProduto[t.produtoId] = (porProduto[t.produtoId] || 0) + (Number(t.quantidade) || 0);
  });
  if (!Object.keys(porProduto).length) return produtos;
  return produtos.map((p) => (porProduto[p.id]
    ? { ...p, quantidade: Math.max(0, (Number(p.quantidade) || 0) - porProduto[p.id]) }
    : p));
}

export function prepararImportacao({ vendas, transacoes, produtos }) {
  const existentes = new Set(transacoes.map((t) => t.id));
  const ordenadas = [...vendas].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
  const novas = [];
  ordenadas.forEach((v) => {
    const id = idTransacaoFuncionario(v.id);
    if (existentes.has(id)) return;
    existentes.add(id);
    const qtd = Number(v.quantidade) || 0;
    const p = produtos.find((x) => x.id === v.produto_id);
    const momento = new Date(v.criado_em).getTime();
    const tx = {
      id,
      tipo: 'entrada',
      categoria: 'venda',
      valor: Number(v.valor) || 0,
      nota: `${v.produto_nome} x${qtd} · ${v.funcionario_nome}`,
      setor: 'produtos',
      metodo: v.metodo,
      timestamp: Number.isFinite(momento) ? momento : timestampParaDia(v.data_key),
      dateKey: v.data_key,
      funcionario: v.funcionario_nome,
    };
    if (p) {
      tx.produtoId = p.id;
      tx.quantidade = qtd;
      tx.custoTotal = Math.round(qtd * (Number(p.precoCusto) || 0) * 100) / 100;
    }
    novas.push(tx);
  });
  return {
    novas,
    produtos: descontarStock(produtos, novas),
    ids: vendas.map((v) => v.id), // todas as pendentes são marcadas como importadas, mesmo as que já estavam no Caixa
    total: novas.reduce((s, t) => s + t.valor, 0),
  };
}
