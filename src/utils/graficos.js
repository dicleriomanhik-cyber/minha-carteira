// Dados dos gráficos do Relatório e do cartão de lucro do Caixa. Cálculo puro (sem React), para testar com dados de teste.
// "Vendas" é sempre o mesmo número do Relatório: vendas e serviços sem trocos (calcResultado(...).receita).
import { calcResultado } from './resultado';

const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const arred = (n) => Math.round(n * 100) / 100;

function dk(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Vendas de cada dia entre `ini` e `fim` (dateKeys, inclusive), com os dias sem vendas a zero.
export function vendasPorDia(transacoes, ini, fim) {
  const [a, m, d] = ini.split('-').map(Number);
  const [fa, fm, fd] = fim.split('-').map(Number);
  const fimData = new Date(fa, fm - 1, fd, 12);
  const dias = [];
  for (let cur = new Date(a, m - 1, d, 12); cur <= fimData; cur.setDate(cur.getDate() + 1)) {
    const chave = dk(cur);
    const vendas = calcResultado(transacoes.filter((t) => t.dateKey === chave)).receita;
    dias.push({ dateKey: chave, dia: cur.getDate(), diaSemana: cur.getDay(), vendas });
  }
  return dias;
}

// Para onde foi o dinheiro das vendas: custo da mercadoria, salários, despesas e outras saídas.
export function destinoDinheiro(res) {
  const itens = [
    { id: 'custo', label: 'Custo da mercadoria', valor: res.custoMercadoria },
    { id: 'salarios', label: 'Salários', valor: res.salarios },
    { id: 'despesas', label: 'Despesas operacionais', valor: res.despesas },
    { id: 'outras', label: 'Outras saídas', valor: res.outras },
  ].filter((i) => i.valor > 0);
  const max = itens.reduce((m, i) => Math.max(m, i.valor), 0);
  return itens.map((i) => ({
    ...i,
    pctBarra: max > 0 ? (i.valor / max) * 100 : 0,
    pctVendas: res.receita > 0 ? Math.round((i.valor / res.receita) * 100) : null,
  }));
}

// Vendas e lucro líquido dos `n` meses que terminam no mês de `ref` (Date). Do mais antigo para o mais recente.
export function ultimosMeses(transacoes, ref, n = 6) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const base = new Date(ref.getFullYear(), ref.getMonth() - i, 1, 12);
    const chave = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
    const res = calcResultado(transacoes.filter((t) => typeof t.dateKey === 'string' && t.dateKey.startsWith(chave)));
    out.push({ chave, label: MESES_CURTO[base.getMonth()], ano: base.getFullYear(), temDados: res.temDados, vendas: res.receita, lucro: res.lucroLiquido });
  }
  return out;
}

// Lucro líquido do mês de `ref` e diferença para o mês anterior (null se o mês anterior não tem dados).
export function lucroDoMes(transacoes, ref) {
  const [atual, ant] = ultimosMeses(transacoes, ref, 2).reverse();
  return {
    temDados: atual.temDados,
    lucro: atual.lucro,
    vendas: atual.vendas,
    diferenca: ant.temDados ? arred(atual.lucro - ant.lucro) : null,
  };
}
