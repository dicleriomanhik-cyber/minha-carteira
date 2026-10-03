import { DESPESA_IDS } from '../context/DataContext';

const soma = (arr) => arr.reduce((s, t) => s + (t.valor || 0), 0);
const arred = (n) => Math.round(n * 100) / 100;

// Calcula o resultado de um conjunto de movimentos (regime de caixa: conta o que entrou e saiu de facto).
// Fora do cálculo ficam a Poupança (dinheiro do dono) e o Xitique (dinheiro de terceiros).
export function calcResultado(txs) {
  const entradas = txs.filter((t) => t.tipo === 'entrada');
  const saidas = txs.filter((t) => t.tipo === 'saida');

  const trocos = soma(saidas.filter((t) => t.categoria === 'troco'));
  const receita = soma(entradas) - trocos;
  const custoMercadoria = entradas.reduce((s, t) => s + (t.custoTotal || 0), 0);
  const lucroBruto = receita - custoMercadoria;

  const salarios = soma(saidas.filter((t) => t.categoria && t.categoria.startsWith('salario_')));
  const despesas = soma(saidas.filter((t) => DESPESA_IDS.has(t.categoria) && !t.categoria.startsWith('salario_')));
  const outras = soma(saidas.filter((t) => t.categoria !== 'poupanca' && t.categoria !== 'troco' && !DESPESA_IDS.has(t.categoria)));
  const custosFixos = salarios + despesas + outras;
  const lucroLiquido = lucroBruto - custosFixos;

  // Margem calculada só com as vendas ligadas ao stock (únicas em que se conhece o custo).
  const comStock = entradas.filter((t) => t.produtoId);
  const receitaStock = soma(comStock);
  const custoStock = comStock.reduce((s, t) => s + (t.custoTotal || 0), 0);
  const margem = receitaStock > 0 ? (receitaStock - custoStock) / receitaStock : null;

  return {
    temDados: txs.length > 0,
    receita: arred(receita), custoMercadoria: arred(custoMercadoria), lucroBruto: arred(lucroBruto),
    salarios: arred(salarios), despesas: arred(despesas), outras: arred(outras),
    custosFixos: arred(custosFixos), lucroLiquido: arred(lucroLiquido), margem,
  };
}

// Ponto de equilíbrio: quanto é preciso vender para a margem cobrir os custos do período.
export function calcEquilibrio(res) {
  if (res.custosFixos <= 0) return { estado: 'sem_custos' };
  if (res.margem === null || res.margem <= 0) return { estado: 'sem_margem' };
  const pe = res.custosFixos / res.margem;
  return { estado: 'ok', pe: arred(pe), margem: res.margem };
}
