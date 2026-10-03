import { dateKey } from './format';

const arred = (n) => Math.round(n * 100) / 100;

// Junta "João", "joão " e "JOÃO" no mesmo funcionário (os pagamentos guardam só o nome).
export const chaveNome = (nome) => String(nome || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Situação do salário de um funcionário no mês actual.
// Conta os pagamentos de salário de funcionário deste mês com o mesmo nome.
// Só o mês actual conta: um mês anterior por pagar não aparece aqui.
export function statusSalario(func, transacoes, hoje = new Date()) {
  const mes = dateKey(hoje).slice(0, 7);
  const k = chaveNome(func.nome);
  const pagoMes = arred(
    transacoes
      .filter((t) => t.tipo === 'saida' && t.categoria === 'salario_func' && t.dateKey && t.dateKey.slice(0, 7) === mes && chaveNome(t.pessoa) === k)
      .reduce((s, t) => s + (t.valor || 0), 0),
  );
  const salario = func.salario || 0;
  const falta = Math.max(0, arred(salario - pagoMes));
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diaEfetivo = Math.min(Math.max(1, func.dia || 1), diasNoMes); // dia 31 em fevereiro conta como o último dia
  const chegou = hoje.getDate() >= diaEfetivo;
  return {
    pagoMes,
    falta,
    estado: falta <= 0 ? 'pago' : pagoMes > 0 ? 'parcial' : 'por_pagar',
    diaEfetivo,
    chegou,
    atraso: chegou ? hoje.getDate() - diaEfetivo : null, // 0 = é hoje
  };
}
