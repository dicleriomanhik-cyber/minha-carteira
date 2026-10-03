// Meta de vendas do mês. "Vendas" é o mesmo número do Relatório: "Vendas e serviços (sem trocos)".
// Cálculo puro (sem React), para poder ser testado com dados de teste.

const arred = (n) => Math.round(n * 100) / 100;

export function chaveMes(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Estado da meta no mês de `hoje`. `vendido` já vem calculado (calcResultado(movimentos do mês).receita).
export function progressoMeta(meta, vendido, hoje = new Date()) {
  if (!meta || meta <= 0) return { temMeta: false };
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const dia = hoje.getDate();
  const diasRestantes = diasNoMes - dia + 1; // hoje ainda conta
  const v = Math.max(0, vendido || 0);
  const falta = arred(Math.max(0, meta - v));
  const atingida = v >= meta;
  const esperadoAteHoje = arred((meta * dia) / diasNoMes);
  return {
    temMeta: true,
    meta: arred(meta),
    vendido: arred(v),
    pct: Math.min(100, Math.round((v / meta) * 100)),
    falta,
    atingida,
    diasRestantes,
    porDia: atingida ? 0 : arred(falta / diasRestantes),
    esperadoAteHoje,
    noRitmo: v >= esperadoAteHoje,
  };
}
