export function dateKey(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const HOJE_KEY = dateKey(new Date());

// Quantos dias para trás o utilizador pode escolher para registar um movimento esquecido.
export const DIAS_BACKDATE_PERMITIDOS = 5;

export function amanhaKey() {
  return dateKey(new Date(Date.now() + 86400000));
}

export function seteDiasAtrasKey() {
  return dateKey(new Date(Date.now() - 6 * 86400000));
}

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Devolve a dateKey de "hoje menos `offset` dias" (offset=0 é hoje).
export function diaOffsetKey(offset) {
  return dateKey(new Date(Date.now() - offset * 86400000));
}

// Lista dos últimos `n` dias (incluindo hoje), do mais recente para o mais antigo,
// já com um rótulo amigável — usado para deixar registar movimentos de dias anteriores.
export function diasRecentes(n) {
  return Array.from({ length: n }, (_, i) => {
    const dk = diaOffsetKey(i);
    const d = new Date(Date.now() - i * 86400000);
    let label;
    if (i === 0) label = 'Hoje';
    else if (i === 1) label = 'Ontem';
    else label = `${DIAS_ABREV[d.getDay()]}, ${formatDataCurta(dk)}`;
    return { dateKey: dk, label };
  });
}

// Cria um timestamp "no dia escolhido, com a hora actual" — assim uma entrada
// lançada mais tarde para um dia anterior ainda aparece com uma hora sensata
// e ordena correctamente nas listas.
export function timestampParaDia(dk) {
  const [y, m, d] = dk.split('-').map(Number);
  const agora = new Date();
  return new Date(y, m - 1, d, agora.getHours(), agora.getMinutes(), agora.getSeconds(), agora.getMilliseconds()).getTime();
}

export function formatMoney(n) {
  n = Math.round((n + Number.EPSILON) * 100) / 100;
  const neg = n < 0;
  const abs = Math.abs(n);
  // Número simples, sem ponto de milhar, mas sempre com as duas casas
  // decimais (ex: 0,00; 236,00; 236,50) para ficar claro que é dinheiro.
  const texto = abs.toFixed(2).replace('.', ',');
  return (neg ? '-' : '') + texto;
}

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function formatDataExtenso(d) {
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function formatHora(ts) {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function formatDataCurta(dk) {
  if (!dk) return '—';
  const [, m, d] = dk.split('-');
  return `${d}/${m}`;
}

export function iniciais(nome) {
  return nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

export function mesAtualLabel(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

export function formatDataLonga(dk) {
  if (!dk) return '—';
  const [y, m, d] = dk.split('-').map(Number);
  const data = new Date(y, m - 1, d);
  return `${String(d).padStart(2, '0')} ${MESES[data.getMonth()]} ${y}`;
}

export function periodoLabel(periodo) {
  if (periodo === 'dia') {
    const hoje = new Date();
    return `${DIAS[hoje.getDay()]}, ${formatDataLonga(HOJE_KEY)}`;
  }
  if (periodo === 'semana') {
    return `${formatDataLonga(seteDiasAtrasKey())} — ${formatDataLonga(HOJE_KEY)}`;
  }
  if (periodo === 'mes') {
    const hoje = new Date();
    const MESES_LONGO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${MESES_LONGO[hoje.getMonth()]} de ${hoje.getFullYear()}`;
  }
  return '';
}

export function novoId() {
  return Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}
