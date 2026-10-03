import { dateKey } from './format';

// Tipos de lembrete (cada um liga-se a uma categoria de despesa, para o pagamento ficar no relatório).
export const TIPOS_LEMBRETE = [
  { id: 'renda', label: 'Renda', categoria: 'desp_renda' },
  { id: 'licenca', label: 'Licença ou alvará', categoria: 'desp_licencas' },
  { id: 'utilities', label: 'Luz, água ou internet', categoria: 'desp_utilities' },
  { id: 'impostos', label: 'Impostos e taxas', categoria: 'desp_impostos' },
  { id: 'outro', label: 'Outro pagamento', categoria: 'outra_saida' },
];

export const RECORRENCIAS = [
  { id: 'mensal', label: 'Todos os meses' },
  { id: 'anual', label: 'Todos os anos' },
  { id: 'unico', label: 'Uma só vez' },
];

export const MESES_NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const pad = (n) => String(n).padStart(2, '0');
const ultimoDiaMes = (ano, mes) => new Date(ano, mes + 1, 0).getDate();
const dataMes = (ano, mes, dia) => new Date(ano, mes, Math.min(dia, ultimoDiaMes(ano, mes)));

// Calcula a próxima data em que o lembrete tem de ser pago.
// Devolve null se já não há nada por pagar (pagamento único já feito).
// dias < 0 quer dizer em atraso.
export function proximaOcorrencia(l, agora = new Date()) {
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  let data;
  let periodo;

  if (l.recorrencia === 'unico') {
    if (l.pagoEm || !l.data) return null;
    const [y, m, d] = l.data.split('-').map(Number);
    data = new Date(y, m - 1, d);
    periodo = 'unico';
  } else if (l.recorrencia === 'anual') {
    let ano = hoje.getFullYear();
    if (l.ultimoPeriodo === String(ano)) ano += 1;
    data = dataMes(ano, (l.mes || 1) - 1, l.dia || 1);
    periodo = String(ano);
  } else {
    let ano = hoje.getFullYear();
    let mes = hoje.getMonth();
    if (l.ultimoPeriodo === `${ano}-${pad(mes + 1)}`) {
      mes += 1;
      if (mes > 11) { mes = 0; ano += 1; }
    }
    data = dataMes(ano, mes, l.dia || 1);
    periodo = `${data.getFullYear()}-${pad(data.getMonth() + 1)}`;
  }

  const dias = Math.round((data - hoje) / 86400000);
  return { dk: dateKey(data), dias, atrasado: dias < 0, periodo };
}

export function textoPrazo(dias) {
  if (dias < 0) return `em atraso há ${-dias} dia${dias === -1 ? '' : 's'}`;
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  return `vence em ${dias} dias`;
}
