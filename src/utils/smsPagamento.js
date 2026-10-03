// Leitura de SMS de dinheiro recebido (M-Pesa, e-Mola, mKesh).
// Só lê o que o SMS diz; nunca adivinha. Se não tiver a certeza, devolve um erro claro.

const MSG_SAIDA = 'Este SMS é de um pagamento que saiu da tua conta. Aqui só se lê dinheiro recebido; regista as saídas em "− Saída".';
const MSG_NAO_ENTENDI = 'Não consegui perceber este SMS. Confirma que é um SMS de dinheiro recebido do M-Pesa, e-Mola ou mKesh, copiado inteiro.';

function dateKeyDe(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "10,00" "20.00" "1.500,00" "1,500.00" -> número. O mKesh em inglês manda "000000001000" (centavos, sem vírgula).
export function lerValor(txt) {
  let s = String(txt || '').trim();
  if (!s) return null;
  if (/^\d{8,}$/.test(s)) return Math.round(parseInt(s, 10)) / 100;
  const ult = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  let inteiro = s;
  let dec = '';
  if (ult >= 0 && s.length - ult - 1 <= 2) {
    inteiro = s.slice(0, ult);
    dec = s.slice(ult + 1);
  }
  inteiro = inteiro.replace(/[.,\s]/g, '');
  if (!/^\d+$/.test(inteiro) || (dec && !/^\d+$/.test(dec))) return null;
  const n = parseFloat(dec ? `${inteiro}.${dec}` : inteiro);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function dataValida(a, m, d) {
  const dt = new Date(a, m - 1, d);
  return dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null;
}

// Devolve { dt, hora } ou null. Aceita 2026-09-19 23:55:51 (mKesh) e 24/9/26 as 2:54 PM / 08:18:24 06/09/2026 (M-Pesa, e-Mola).
function lerDataHora(t) {
  let dt = null;
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) dt = dataValida(+iso[1], +iso[2], +iso[3]);
  if (!dt) {
    const dm = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?!\d)/);
    if (dm) {
      const ano = dm[3].length === 2 ? 2000 + +dm[3] : +dm[3];
      dt = dataValida(ano, +dm[2], +dm[1]);
    }
  }
  if (!dt) return null;
  let hora = null;
  const h = t.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (h) {
    let hh = +h[1];
    const ap = (h[3] || '').toUpperCase();
    if (ap === 'PM' && hh < 12) hh += 12;
    if (ap === 'AM' && hh === 12) hh = 0;
    if (hh <= 23 && +h[2] <= 59) hora = `${String(hh).padStart(2, '0')}:${h[2]}`;
  }
  return { dt, hora };
}

function lerMetodo(t) {
  if (/ID\s*(da\s*)?Trans(acao|ação)?\s*:/i.test(t) || /e-?mola/i.test(t)) return 'emola';
  if (/mkesh|\bMZN\b/i.test(t)) return 'mkesh';
  if (/m-?pesa/i.test(t)) return 'mpesa';
  return null;
}

function lerReferencia(t, metodo) {
  let m;
  if (metodo === 'mpesa') {
    m = t.match(/Confirmado\s+([A-Z0-9]{8,14})\b/i) || t.match(/\b([A-Z0-9]{8,14})\s+confirmado\b/i);
  } else if (metodo === 'emola') {
    m = t.match(/ID\s*(?:da\s*)?Trans(?:acao|ação)?\s*:\s*([A-Za-z0-9.]+)/i);
    if (m) m = [m[0], m[1].replace(/\.+$/, '')];
  } else if (metodo === 'mkesh') {
    m = t.match(/Refer[eê]ncia\s*:\s*(\d+)/i) || t.match(/Transaction\s*ID\s*:?\s*([A-Za-z0-9]+)/i);
  }
  return m && m[1] ? m[1].toUpperCase() : null;
}

function lerRemetente(t) {
  const m = t.match(/\b(?:Recebeu|Recebeste)\s+[\d.,]+\s*(?:MT|MZN)\s+de\s+(.+?)(?=\s+(?:aos?|às?|as)\s+\d|\s+na\s+sua\b|\s*\()/i);
  if (!m) return null;
  const nome = m[1].replace(/\s+/g, ' ').replace(/^[\s,;:-]+|[\s,;:-]+$/g, '');
  return nome && nome.length <= 60 ? nome : null;
}

// opcoes.hoje (Date) e opcoes.diasMax só existem para os testes; a app usa os valores por defeito.
export function lerSms(texto, opcoes = {}) {
  const hoje = opcoes.hoje || new Date();
  const diasMax = opcoes.diasMax || 5; // mesmo limite do seletor de dias (hoje + 4 anteriores)
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!t) return { ok: false, erro: 'Cola primeiro o texto do SMS.' };

  const recebidos = t.match(/\b(?:Recebeu|Recebeste)\s+[\d.,]+\s*(?:MT|MZN)/gi) || [];
  if (recebidos.length > 1) return { ok: false, erro: 'Colaste mais de um SMS. Cola um de cada vez.' };

  const pt = t.match(/\b(?:Recebeu|Recebeste)\s+([\d.,]+)\s*(?:MT|MZN)/i);
  const en = t.match(/\bYou received from\s+(\S+)\s+(\d[\d.,]*)\s*(?:MZN|MT)/i);

  if (!pt && !en) {
    if (/\b(?:pagamento|Compraste|Efectuou|Efetuou|Enviaste|Transferiste|Levantaste|Pagaste|paid|sent)\b/i.test(t)) return { ok: false, erro: MSG_SAIDA };
    return { ok: false, erro: MSG_NAO_ENTENDI };
  }

  const metodo = lerMetodo(t);
  if (!metodo) return { ok: false, erro: 'Não consegui perceber de que serviço é este SMS (M-Pesa, e-Mola ou mKesh).' };

  const valor = lerValor(pt ? pt[1] : en[2]);
  if (!valor || valor <= 0) return { ok: false, erro: 'Não consegui ler o valor deste SMS.' };

  let de = null;
  if (en) de = en[1].replace(/^258(?=\d{9}$)/, '');
  else de = lerRemetente(t);

  const dh = lerDataHora(t);
  let dateKey = null;
  let hora = null;
  let aviso = null;
  if (dh) {
    const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const dias = Math.round((hojeZero - dh.dt) / 86400000);
    if (dias < 0) {
      aviso = 'A data do SMS é de um dia que ainda não chegou; vai ficar hoje.';
    } else if (dias >= diasMax) {
      return { ok: false, erro: `Este SMS é de ${dias} dias atrás. A app só deixa registar os últimos ${diasMax} dias; regista-o à mão no dia certo se for preciso.` };
    } else {
      dateKey = dateKeyDe(dh.dt);
      hora = dh.hora;
    }
  } else {
    aviso = 'Não consegui ler a data do SMS; vai ficar hoje.';
  }

  return { ok: true, metodo, valor, dateKey, hora, referencia: lerReferencia(t, metodo), de, aviso };
}
