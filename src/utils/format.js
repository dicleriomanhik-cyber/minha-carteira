export function dateKey(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const HOJE_KEY = dateKey(new Date());

export function amanhaKey() {
  return dateKey(new Date(Date.now() + 86400000));
}

export function seteDiasAtrasKey() {
  return dateKey(new Date(Date.now() - 6 * 86400000));
}

export function formatMoney(n) {
  n = Math.round((n + Number.EPSILON) * 100) / 100;
  const neg = n < 0;
  let parts = Math.abs(n).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + parts[0] + ',' + parts[1];
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

export function novoId() {
  return Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}
