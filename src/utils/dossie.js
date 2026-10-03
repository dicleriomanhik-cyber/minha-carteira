import { calcResultado } from './resultado';
import { dateKey } from './format';

export const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const PERIODOS_DOSSIE = [3, 6, 12];

const arred = (n) => Math.round(n * 100) / 100;
const soma = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
const pad = (n) => String(n).padStart(2, '0');

// Lista dos últimos n meses (o mês actual incluído), do mais antigo para o mais recente.
export function mesesDoPeriodo(n, agora = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() - (n - 1 - i), 1);
    return { chave: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: `${MESES_ABREV[d.getMonth()]} ${d.getFullYear()}`, curto: MESES_ABREV[d.getMonth()] };
  });
}

// Junta tudo o que o dossiê mostra. Regime de caixa, igual ao Relatório.
export function calcDossie({ n, transacoes, fiados, produtos, movimentosPoupanca, totalPoupanca, saldoFiado, agora = new Date() }) {
  const hojeKey = dateKey(agora);
  const mesAtual = hojeKey.slice(0, 7);
  const meses = mesesDoPeriodo(n, agora);
  const inicio = `${meses[0].chave}-01`;
  const dkDe = (ts) => dateKey(new Date(ts));
  const noPeriodo = (dk) => !!dk && dk >= inicio && dk <= hojeKey;

  const txs = transacoes.filter((t) => noPeriodo(t.dateKey));
  const total = calcResultado(txs);

  const porMes = meses.map((m) => {
    const r = calcResultado(txs.filter((t) => t.dateKey.slice(0, 7) === m.chave));
    return { ...m, ...r, parcial: m.chave === mesAtual };
  });

  // Meses em que já havia registos (o negócio pode ter começado a usar a app há pouco tempo).
  const primeiroRegisto = transacoes.length ? transacoes.reduce((min, t) => (t.dateKey < min ? t.dateKey : min), transacoes[0].dateKey) : null;
  const primeiroMes = primeiroRegisto ? primeiroRegisto.slice(0, 7) : null;
  const comDados = porMes.filter((m) => primeiroMes && m.chave >= primeiroMes);
  const completos = comDados.filter((m) => !m.parcial);
  const baseMedia = completos.length ? completos : comDados;
  const mediaVendas = baseMedia.length ? arred(soma(baseMedia, (m) => m.receita) / baseMedia.length) : 0;
  const mediaLucro = baseMedia.length ? arred(soma(baseMedia, (m) => m.lucroLiquido) / baseMedia.length) : 0;
  const margemLiquida = total.receita > 0 ? total.lucroLiquido / total.receita : null;

  // Fiados
  let feitos = 0;
  let cobrados = 0;
  fiados.forEach((f) => {
    const aumentos = f.aumentos || [];
    if (noPeriodo(dkDe(f.criadoEm))) feitos += (f.valorTotal || 0) - soma(aumentos, (a) => a.valor);
    aumentos.forEach((a) => { if (noPeriodo(dkDe(a.timestamp))) feitos += a.valor; });
    (f.pagamentos || []).forEach((p) => { if (noPeriodo(dkDe(p.timestamp))) cobrados += p.valor; });
  });
  const abertos = fiados.filter((f) => saldoFiado(f) > 0);
  const vencidos = abertos.filter((f) => f.vencimento && f.vencimento < hojeKey);
  const fiadosInfo = {
    feitos: arred(feitos),
    cobrados: arred(cobrados),
    porReceber: arred(soma(abertos, (f) => saldoFiado(f))),
    clientesEmAberto: new Set(abertos.map((f) => f.cliente)).size,
    emAtraso: arred(soma(vencidos, (f) => saldoFiado(f))),
    clientesEmAtraso: new Set(vencidos.map((f) => f.cliente)).size,
  };

  // Stock actual
  const valorCusto = soma(produtos, (p) => (p.quantidade || 0) * (p.precoCusto || 0));
  const valorVenda = soma(produtos, (p) => (p.quantidade || 0) * (p.precoVenda || 0));
  const stock = {
    produtos: produtos.length,
    unidades: soma(produtos, (p) => p.quantidade || 0),
    valorCusto: arred(valorCusto),
    valorVenda: arred(valorVenda),
    lucroPotencial: arred(valorVenda - valorCusto),
    maiores: [...produtos]
      .map((p) => ({ nome: p.nome, quantidade: p.quantidade || 0, precoCusto: p.precoCusto || 0, precoVenda: p.precoVenda || 0, valor: (p.quantidade || 0) * (p.precoCusto || 0) }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8),
  };

  // Poupança
  const movsPeriodo = movimentosPoupanca.filter((m) => noPeriodo(m.dateKey || dkDe(m.timestamp)));
  const poupanca = {
    total: arred(totalPoupanca),
    guardado: arred(soma(movsPeriodo.filter((m) => m.tipo === 'deposito'), (m) => m.valor)),
    retirado: arred(soma(movsPeriodo.filter((m) => m.tipo === 'retirada'), (m) => m.valor)),
  };

  return {
    n, meses: porMes, inicio, fim: hojeKey, total, margemLiquida,
    mesesComDados: comDados.length, mediaVendas, mediaLucro, mediaSobreCompletos: completos.length > 0, baseMediaN: baseMedia.length,
    primeiroRegisto, fiados: fiadosInfo, stock, poupanca, temDados: txs.length > 0,
  };
}
