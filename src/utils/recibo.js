import { semEmoji } from './format';

const AZUL = [15, 56, 134];
const AZUL_CLARO = [26, 115, 232];
const FUNDO = [238, 244, 252];
const TINTA = [22, 32, 46];
const CINZA = [91, 100, 114];
const LINHA = [215, 224, 238];

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/* ---------- Texto ---------- */

function fmt(n) {
  const v = Math.round((n + Number.EPSILON) * 100) / 100;
  const neg = v < 0;
  const [int, dec] = Math.abs(v).toFixed(2).split('.');
  return (neg ? '-' : '') + int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + dec;
}

export function dataLonga(dk) {
  const [y, m, d] = dk.split('-');
  return `${d}/${m}/${y}`;
}

export function mesAno(dk) {
  const [y, m] = dk.split('-');
  return `${MESES[Number(m) - 1]} de ${y}`;
}

export function ehSalario(tx) {
  return tx.categoria === 'salario_proprio' || tx.categoria === 'salario_func';
}

// Número estável: vem da data e do id do pagamento, por isso o mesmo pagamento dá sempre o mesmo número.
export function numeroRecibo(tx) {
  const fim = String(tx.id).replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase().padStart(4, '0');
  return `R${tx.dateKey.replace(/-/g, '')}-${fim}`;
}

/* ---------- Valor por extenso (português) ---------- */

const UN = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove'];
const DZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CT = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function ate999(n) {
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes = [];
  if (c) partes.push(CT[c]);
  if (r) partes.push(r < 20 ? UN[r] : DZ[Math.floor(r / 10)] + (r % 10 ? ' e ' + UN[r % 10] : ''));
  return partes.join(' e ');
}

export function inteiroPorExtenso(n) {
  if (n === 0) return 'zero';
  const mi = Math.floor(n / 1e6);
  const mil = Math.floor((n % 1e6) / 1000);
  const r = n % 1000;
  const blocos = [];
  if (mi) blocos.push({ txt: mi === 1 ? 'um milhão' : ate999(mi) + ' milhões', val: mi });
  if (mil) blocos.push({ txt: mil === 1 ? 'mil' : ate999(mil) + ' mil', val: mil });
  if (r) blocos.push({ txt: ate999(r), val: r });
  let out = blocos[0].txt;
  for (let i = 1; i < blocos.length; i++) {
    const v = blocos[i].val;
    out += (v < 100 || v % 100 === 0 ? ' e ' : ' ') + blocos[i].txt;
  }
  return out;
}

export function valorPorExtenso(valor) {
  const cent = Math.round(valor * 100);
  const int = Math.floor(cent / 100);
  const c = cent % 100;
  if (int >= 1e9) return '';
  let t;
  if (int === 0 && c) {
    t = inteiroPorExtenso(c) + (c === 1 ? ' centavo' : ' centavos');
  } else {
    t = inteiroPorExtenso(int) + (int === 1 ? ' metical' : int >= 1e6 && int % 1e6 === 0 ? ' de meticais' : ' meticais');
    if (c) t += ' e ' + inteiroPorExtenso(c) + (c === 1 ? ' centavo' : ' centavos');
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* ---------- Conteúdo do comprovativo ---------- */

// extra: { negocio, responsavel, recebedor, referente, categoriaLabel, metodoLabel }
export function montarRecibo(tx, extra) {
  const salario = ehSalario(tx);
  const recebedor = semEmoji(extra.recebedor || '').trim();
  const referente = semEmoji(extra.referente || '').trim();
  const negocio = semEmoji(extra.negocio || '').trim() || 'Negócio';
  const responsavel = semEmoji(extra.responsavel || '').trim();

  const linhas = [['Data do pagamento', dataLonga(tx.dateKey)]];
  if (recebedor) linhas.push(['Recebido por', recebedor]);
  if (referente) linhas.push(['Referente a', referente]);
  if (!salario && extra.categoriaLabel) linhas.push(['Tipo de despesa', semEmoji(extra.categoriaLabel)]);
  linhas.push(['Método de pagamento', extra.metodoLabel || 'Dinheiro']);
  linhas.push(['Pago por', responsavel ? `${negocio} (${responsavel})` : negocio]);

  return {
    numero: numeroRecibo(tx),
    titulo: salario ? 'Comprovativo de pagamento de salário' : 'Comprovativo de pagamento',
    negocio,
    valorTxt: `${fmt(tx.valor)} MT`,
    extenso: valorPorExtenso(tx.valor),
    linhas,
    nomePagador: responsavel,
    nomeRecebedor: recebedor,
    rodape: 'Documento emitido pela aplicação Minha Carteira. É um comprovativo interno de pagamento e não substitui factura nem recibo fiscal.',
  };
}

/* ---------- PDF (A5) ---------- */

export async function criarReciboPdf(r) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const W = 148;
  const M = 12;
  const CW = W - 2 * M;
  let y = 0;

  const cor = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const preencher = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const traco = (c) => doc.setDrawColor(c[0], c[1], c[2]);

  /* Cabeçalho */
  preencher(AZUL); doc.rect(0, 0, W, 36, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(190, 210, 245);
  doc.text(r.titulo.toUpperCase(), M, 11);
  doc.text(`Nº ${r.numero}`, W - M, 11, { align: 'right' });
  doc.setFontSize(16); doc.setTextColor(255, 255, 255);
  const nome = doc.splitTextToSize(r.negocio, CW).slice(0, 2);
  doc.text(nome, M, 21);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(190, 210, 245);
  doc.text('Minha Carteira', M, 32);

  /* Valor */
  y = 44;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
  const extensoLinhas = r.extenso ? doc.splitTextToSize(r.extenso, CW - 10) : [];
  const alturaCaixa = 22 + extensoLinhas.length * 4.2;
  preencher(FUNDO); doc.roundedRect(M, y, CW, alturaCaixa, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); cor(CINZA);
  doc.text('VALOR PAGO', M + 5, y + 6.5);
  doc.setFontSize(22); cor(AZUL);
  doc.text(r.valorTxt, M + 5, y + 16);
  if (extensoLinhas.length) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); cor(CINZA);
    doc.text(extensoLinhas, M + 5, y + 22.5);
  }
  y += alturaCaixa + 8;

  /* Linhas */
  const COL = 38;
  r.linhas.forEach(([label, valor], i) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
    const partes = doc.splitTextToSize(valor, CW - COL);
    const h = partes.length * 5 + 4;
    if (y + h > 175) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); cor(CINZA);
    doc.text(label.toUpperCase(), M, y);
    doc.setFontSize(10.5); cor(TINTA);
    doc.text(partes, M + COL, y);
    y += h;
    if (i < r.linhas.length - 1) { traco(LINHA); doc.setLineWidth(0.2); doc.line(M, y - 4.6, M + CW, y - 4.6); }
  });

  /* Assinaturas */
  if (y + 40 > 200) { doc.addPage(); y = 20; }
  y = Math.max(y + 16, 150);
  const metade = (CW - 10) / 2;
  traco(TINTA); doc.setLineWidth(0.3);
  doc.line(M, y, M + metade, y);
  doc.line(M + metade + 10, y, M + CW, y);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); cor(TINTA);
  doc.text('Quem pagou', M, y + 4.5);
  doc.text('Quem recebeu', M + metade + 10, y + 4.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); cor(CINZA);
  if (r.nomePagador) doc.text(doc.splitTextToSize(r.nomePagador, metade)[0], M, y + 9);
  if (r.nomeRecebedor) doc.text(doc.splitTextToSize(r.nomeRecebedor, metade)[0], M + metade + 10, y + 9);

  /* Rodapé */
  traco(AZUL_CLARO); doc.setLineWidth(0.4); doc.line(M, 192, M + CW, 192);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); cor(CINZA);
  doc.text(doc.splitTextToSize(r.rodape, CW), M, 196.5);

  return doc;
}

/* ---------- Imagem (PNG, 1080 px de largura) ---------- */

const FONTE = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

function quebrar(ctx, texto, largura) {
  const palavras = String(texto).split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = '';
  palavras.forEach((p) => {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width <= largura || !atual) atual = teste;
    else { linhas.push(atual); atual = p; }
  });
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [''];
}

function desenharImagem(ctx, W, r) {
  const M = 72;
  const CW = W - 2 * M;
  let y = 0;

  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, 5000);

  /* Cabeçalho */
  ctx.font = `bold 52px ${FONTE}`;
  const nomeLinhas = quebrar(ctx, r.negocio, CW).slice(0, 2);
  const alturaCab = 120 + nomeLinhas.length * 60 + 40;
  ctx.fillStyle = rgb(AZUL); ctx.fillRect(0, 0, W, alturaCab);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgb(190, 210, 245)'; ctx.font = `bold 24px ${FONTE}`;
  ctx.textAlign = 'left'; ctx.fillText(r.titulo.toUpperCase(), M, 74);
  ctx.textAlign = 'right'; ctx.fillText(`Nº ${r.numero}`, W - M, 74);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff'; ctx.font = `bold 52px ${FONTE}`;
  nomeLinhas.forEach((l, i) => ctx.fillText(l, M, 146 + i * 60));
  ctx.fillStyle = 'rgb(190, 210, 245)'; ctx.font = `24px ${FONTE}`;
  ctx.fillText('Minha Carteira', M, 146 + (nomeLinhas.length - 1) * 60 + 50);

  /* Valor */
  y = alturaCab + 50;
  ctx.font = `italic 30px ${FONTE}`;
  const ext = r.extenso ? quebrar(ctx, r.extenso, CW - 70) : [];
  const alturaCaixa = 170 + ext.length * 42;
  ctx.fillStyle = rgb(FUNDO);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(M, y, CW, alturaCaixa, 24); else ctx.rect(M, y, CW, alturaCaixa);
  ctx.fill();
  ctx.fillStyle = rgb(CINZA); ctx.font = `bold 24px ${FONTE}`;
  ctx.fillText('VALOR PAGO', M + 36, y + 52);
  ctx.fillStyle = rgb(AZUL); ctx.font = `bold 78px ${FONTE}`;
  ctx.fillText(r.valorTxt, M + 36, y + 138);
  ctx.fillStyle = rgb(CINZA); ctx.font = `italic 30px ${FONTE}`;
  ext.forEach((l, i) => ctx.fillText(l, M + 36, y + 190 + i * 42));
  y += alturaCaixa + 56;

  /* Linhas */
  const COL = 340;
  r.linhas.forEach(([label, valor], i) => {
    ctx.font = `bold 34px ${FONTE}`;
    const partes = quebrar(ctx, valor, CW - COL);
    ctx.fillStyle = rgb(CINZA); ctx.font = `bold 20px ${FONTE}`;
    ctx.fillText(label.toUpperCase(), M, y);
    ctx.fillStyle = rgb(TINTA); ctx.font = `bold 34px ${FONTE}`;
    partes.forEach((l, k) => ctx.fillText(l, M + COL, y + k * 44));
    y += partes.length * 44 + 22;
    if (i < r.linhas.length - 1) {
      ctx.strokeStyle = rgb(LINHA); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(M, y - 20); ctx.lineTo(M + CW, y - 20); ctx.stroke();
      y += 20;
    }
  });

  /* Assinaturas */
  y += 110;
  const metade = (CW - 60) / 2;
  ctx.strokeStyle = rgb(TINTA); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(M + metade, y); ctx.moveTo(M + metade + 60, y); ctx.lineTo(M + CW, y); ctx.stroke();
  ctx.fillStyle = rgb(TINTA); ctx.font = `bold 26px ${FONTE}`;
  ctx.fillText('Quem pagou', M, y + 40);
  ctx.fillText('Quem recebeu', M + metade + 60, y + 40);
  ctx.fillStyle = rgb(CINZA); ctx.font = `26px ${FONTE}`;
  const lp = r.nomePagador ? quebrar(ctx, r.nomePagador, metade).slice(0, 2) : [];
  const lr = r.nomeRecebedor ? quebrar(ctx, r.nomeRecebedor, metade).slice(0, 2) : [];
  lp.forEach((l, i) => ctx.fillText(l, M, y + 78 + i * 34));
  lr.forEach((l, i) => ctx.fillText(l, M + metade + 60, y + 78 + i * 34));
  y += 120 + Math.max(lp.length, lr.length, 1) * 34;

  /* Rodapé */
  ctx.strokeStyle = rgb(AZUL_CLARO); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(M + CW, y); ctx.stroke();
  ctx.fillStyle = rgb(CINZA); ctx.font = `22px ${FONTE}`;
  const rod = quebrar(ctx, r.rodape, CW);
  rod.forEach((l, i) => ctx.fillText(l, M, y + 40 + i * 32));
  return y + 40 + rod.length * 32 + 30;
}

export async function criarReciboImagem(r) {
  const W = 1080;
  const medida = document.createElement('canvas');
  medida.width = W; medida.height = 10;
  const altura = Math.ceil(desenharImagem(medida.getContext('2d'), W, r));
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = altura;
  desenharImagem(canvas.getContext('2d'), W, r);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png');
  });
}
