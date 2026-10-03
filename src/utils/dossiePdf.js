import { semEmoji } from './format';

const AZUL = [15, 56, 134];
const AZUL_CLARO = [26, 115, 232];
const FUNDO = [238, 244, 252];
const TINTA = [22, 32, 46];
const CINZA = [91, 100, 114];
const VERDE = [31, 122, 108];
const TIJOLO = [181, 72, 47];
const LINHA = [215, 224, 238];

const W = 210;
const M = 15;
const CW = W - 2 * M;
const FIM_PAGINA = 280;

function fmt(n) {
  const v = Math.round((n + Number.EPSILON) * 100) / 100;
  const neg = v < 0;
  const [int, dec] = Math.abs(v).toFixed(2).split('.');
  return (neg ? '-' : '') + int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + dec;
}

function abrev(n) {
  const a = Math.abs(n);
  const s = a >= 1e6 ? (a / 1e6).toFixed(1).replace('.', ',') + 'M' : a >= 1e3 ? (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace('.', ',') + 'k' : String(Math.round(a));
  return (n < 0 ? '-' : '') + s;
}

function dataLonga(dk) {
  const [y, m, d] = dk.split('-');
  return `${d}/${m}/${y}`;
}

export async function criarDossiePdf(dados, meta) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 0;

  const cor = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const preencher = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const traco = (c) => doc.setDrawColor(c[0], c[1], c[2]);

  function garantir(h) {
    if (y + h > FIM_PAGINA) { doc.addPage(); y = 20; }
  }

  function titulo(texto) {
    garantir(14);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); cor(AZUL);
    doc.text(texto.toUpperCase(), M, y);
    traco(AZUL_CLARO); doc.setLineWidth(0.5); doc.line(M, y + 1.8, M + CW, y + 1.8);
    y += 8;
  }

  function linha(label, valor, { negrito = false, fundo = false, corValor = TINTA } = {}) {
    garantir(7);
    if (fundo) { preencher(FUNDO); doc.rect(M, y - 4.6, CW, 6.6, 'F'); }
    doc.setFont('helvetica', negrito ? 'bold' : 'normal'); doc.setFontSize(10);
    cor(negrito ? TINTA : CINZA); doc.text(label, M + 2, y);
    cor(corValor); doc.setFont('helvetica', 'bold');
    doc.text(valor, M + CW - 2, y, { align: 'right' });
    y += 6.6;
  }

  function nota(texto, tamanho = 8.5) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(tamanho); cor(CINZA);
    const linhas = doc.splitTextToSize(texto, CW - 4);
    garantir(linhas.length * 4 + 2);
    doc.text(linhas, M + 2, y);
    y += linhas.length * 4 + 1;
  }

  /* ---------- Cabeçalho ---------- */
  preencher(AZUL); doc.rect(0, 0, W, 42, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(190, 210, 245);
  doc.text('DOSSIÊ FINANCEIRO', M, 12);
  doc.text('Minha Carteira', W - M, 12, { align: 'right' });
  doc.setFontSize(19); doc.setTextColor(255, 255, 255);
  const nomeNegocio = semEmoji(meta.negocio) || 'Negócio';
  doc.text(doc.splitTextToSize(nomeNegocio, CW)[0], M, 22);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(220, 232, 252);
  const resp = [meta.responsavel ? `Responsável: ${semEmoji(meta.responsavel)}` : '', meta.whatsapp ? `WhatsApp: ${meta.whatsapp}` : ''].filter(Boolean).join('   |   ');
  if (resp) doc.text(resp, M, 29);
  const periodoTxt = `Período: ${dados.meses[0].label} a ${dados.meses[dados.meses.length - 1].label} (${dados.n} meses) - de ${dataLonga(dados.inicio)} a ${dataLonga(dados.fim)}`;
  doc.text(periodoTxt, M, 35);
  y = 52;

  /* ---------- Números principais ---------- */
  const cartoes = [
    ['Vendas no período', fmt(dados.total.receita) + ' MT', TINTA],
    ['Lucro líquido', fmt(dados.total.lucroLiquido) + ' MT', dados.total.lucroLiquido >= 0 ? VERDE : TIJOLO],
    ['Média mensal de vendas', fmt(dados.mediaVendas) + ' MT', TINTA],
    ['Margem líquida', dados.margemLiquida === null ? '-' : (dados.margemLiquida * 100).toFixed(1).replace('.', ',') + ' %', TINTA],
  ];
  const cw = (CW - 3 * 3) / 4;
  cartoes.forEach(([lab, val, c], i) => {
    const x = M + i * (cw + 3);
    preencher(FUNDO); doc.roundedRect(x, y, cw, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); cor(CINZA);
    doc.text(lab, x + 3, y + 6);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(val.length > 14 ? 9 : 10.5); cor(c);
    doc.text(val, x + 3, y + 13);
  });
  y += 26;

  if (dados.mesesComDados < dados.n) {
    nota(`Atenção: o negócio só tem registos desde ${dados.primeiroRegisto ? dataLonga(dados.primeiroRegisto) : '-'}, por isso o período tem ${dados.mesesComDados} mês(es) com dados.`);
    y += 2;
  }

  /* ---------- Resultado do período ---------- */
  titulo('Resultado do período');
  const t = dados.total;
  linha('Vendas e outras entradas (sem trocos)', fmt(t.receita) + ' MT');
  linha('Custo da mercadoria vendida', '- ' + fmt(t.custoMercadoria) + ' MT');
  linha('Lucro bruto', fmt(t.lucroBruto) + ' MT', { negrito: true, fundo: true });
  linha('Salários', '- ' + fmt(t.salarios) + ' MT');
  linha('Despesas do negócio', '- ' + fmt(t.despesas) + ' MT');
  linha('Outras saídas', '- ' + fmt(t.outras) + ' MT');
  linha('Lucro líquido', fmt(t.lucroLiquido) + ' MT', { negrito: true, fundo: true, corValor: t.lucroLiquido >= 0 ? VERDE : TIJOLO });
  nota(`Média mensal de lucro líquido: ${fmt(dados.mediaLucro)} MT (${dados.baseMediaN} mês(es)${dados.mediaSobreCompletos ? ' completo(s), sem o mês actual' : ''}).`);
  y += 4;

  /* ---------- Gráfico mês a mês ---------- */
  titulo('Evolução mês a mês');
  const altGraf = 58;
  garantir(altGraf + 22);
  const eixoW = 14;
  const gx = M + eixoW;
  const gw = CW - eixoW;
  const gTop = y + 6;
  const gBase = gTop + altGraf - 14;
  const alturaUtil = gBase - gTop;

  // legenda
  preencher(AZUL_CLARO); doc.rect(M + 2, y - 1, 3, 3, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); cor(CINZA); doc.text('Vendas', M + 6.5, y + 1.4);
  preencher(VERDE); doc.rect(M + 24, y - 1, 3, 3, 'F'); doc.text('Lucro líquido', M + 28.5, y + 1.4);

  // Eixo com valores redondos (passo 1, 2, 2,5 ou 5 vezes uma potência de 10).
  const maxDados = Math.max(1, ...dados.meses.map((m) => Math.max(m.receita, m.lucroLiquido)));
  const minDados = Math.min(0, ...dados.meses.map((m) => m.lucroLiquido));
  const bruto = (maxDados - minDados) / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((k) => k * pot).find((v) => v >= bruto) || pot * 10;
  const minV = Math.floor(minDados / passo) * passo;
  const maxV = Math.ceil(maxDados / passo) * passo;
  const faixa = maxV - minV;
  const yDe = (v) => gBase - ((v - minV) / faixa) * alturaUtil;
  const y0 = yDe(0);

  // linhas de grelha
  traco(LINHA); doc.setLineWidth(0.2);
  for (let v = minV; v <= maxV + passo / 2; v += passo) {
    const yy = yDe(v);
    doc.line(gx, yy, gx + gw, yy);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); cor(CINZA);
    doc.text(abrev(v), gx - 1.5, yy + 1, { align: 'right' });
  }
  traco(CINZA); doc.setLineWidth(0.3); doc.line(gx, y0, gx + gw, y0);

  const grupoW = gw / dados.meses.length;
  const barW = Math.min(6, grupoW * 0.36);
  dados.meses.forEach((m, i) => {
    const cx = gx + grupoW * i + grupoW / 2;
    const hV = Math.max(0, y0 - yDe(m.receita));
    preencher(AZUL_CLARO);
    if (hV > 0) doc.rect(cx - barW - 0.3, y0 - hV, barW, hV, 'F');
    const l = m.lucroLiquido;
    preencher(l >= 0 ? VERDE : TIJOLO);
    const yl = yDe(l);
    if (Math.abs(yl - y0) > 0) doc.rect(cx + 0.3, Math.min(yl, y0), barW, Math.abs(yl - y0), 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); cor(CINZA);
    doc.text(m.curto + (m.parcial ? '*' : ''), cx, gBase + 5 + (minV < 0 ? 0 : 0), { align: 'center' });
  });
  y = gBase + 12;
  nota('* Mês actual (ainda incompleto).', 7.5);
  y += 3;

  /* ---------- Tabela mês a mês ---------- */
  titulo('Detalhe por mês');
  const cols = [M + 2, M + 52, M + 94, M + 138, M + CW - 2];
  garantir(8);
  preencher(AZUL); doc.rect(M, y - 4.8, CW, 7, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
  doc.text('Mês', cols[0], y);
  doc.text('Vendas', cols[1], y, { align: 'right' });
  doc.text('Custo mercadoria', cols[2], y, { align: 'right' });
  doc.text('Salários e despesas', cols[3], y, { align: 'right' });
  doc.text('Lucro líquido', cols[4], y, { align: 'right' });
  y += 7;
  const mesesTabela = dados.meses.filter((m) => !dados.primeiroRegisto || m.chave >= dados.primeiroRegisto.slice(0, 7));
  mesesTabela.forEach((m, i) => {
    garantir(7);
    if (i % 2 === 0) { preencher(FUNDO); doc.rect(M, y - 4.6, CW, 6.4, 'F'); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); cor(TINTA);
    doc.text(m.label + (m.parcial ? ' *' : ''), cols[0], y);
    doc.text(fmt(m.receita), cols[1], y, { align: 'right' });
    doc.text(fmt(m.custoMercadoria), cols[2], y, { align: 'right' });
    doc.text(fmt(m.salarios + m.despesas + m.outras), cols[3], y, { align: 'right' });
    doc.setFont('helvetica', 'bold'); cor(m.lucroLiquido >= 0 ? VERDE : TIJOLO);
    doc.text(fmt(m.lucroLiquido), cols[4], y, { align: 'right' });
    y += 6.4;
  });
  garantir(8);
  traco(AZUL); doc.setLineWidth(0.4); doc.line(M, y - 4.4, M + CW, y - 4.4);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); cor(TINTA);
  doc.text('Total', cols[0], y);
  doc.text(fmt(t.receita), cols[1], y, { align: 'right' });
  doc.text(fmt(t.custoMercadoria), cols[2], y, { align: 'right' });
  doc.text(fmt(t.custosFixos), cols[3], y, { align: 'right' });
  cor(t.lucroLiquido >= 0 ? VERDE : TIJOLO);
  doc.text(fmt(t.lucroLiquido), cols[4], y, { align: 'right' });
  y += 10;

  /* ---------- Fiados ---------- */
  titulo('Fiados (vendas a crédito)');
  const f = dados.fiados;
  linha('Fiados concedidos no período', fmt(f.feitos) + ' MT');
  linha('Fiados cobrados no período', fmt(f.cobrados) + ' MT', { corValor: VERDE });
  linha(`Por receber hoje (${f.clientesEmAberto} cliente${f.clientesEmAberto === 1 ? '' : 's'})`, fmt(f.porReceber) + ' MT', { fundo: true });
  linha(`Em atraso hoje (${f.clientesEmAtraso} cliente${f.clientesEmAtraso === 1 ? '' : 's'})`, fmt(f.emAtraso) + ' MT', { corValor: f.emAtraso > 0 ? TIJOLO : TINTA });
  y += 4;

  /* ---------- Stock ---------- */
  titulo('Stock actual');
  const s = dados.stock;
  if (s.produtos === 0) {
    nota('Sem produtos registados no stock.');
  } else {
    linha('Produtos registados', String(s.produtos));
    linha('Unidades em stock', String(s.unidades));
    linha('Valor do stock ao preço de custo', fmt(s.valorCusto) + ' MT', { fundo: true });
    linha('Valor do stock ao preço de venda', fmt(s.valorVenda) + ' MT');
    linha('Lucro potencial do stock', fmt(s.lucroPotencial) + ' MT', { corValor: s.lucroPotencial >= 0 ? VERDE : TIJOLO });
    y += 2;
    const c2 = [M + 2, M + 84, M + 118, M + 150, M + CW - 2];
    garantir(8 + s.maiores.length * 6);
    preencher(AZUL); doc.rect(M, y - 4.8, CW, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
    doc.text('Maiores produtos em stock', c2[0], y);
    doc.text('Qtd.', c2[1], y, { align: 'right' });
    doc.text('Custo un.', c2[2], y, { align: 'right' });
    doc.text('Venda un.', c2[3], y, { align: 'right' });
    doc.text('Valor (custo)', c2[4], y, { align: 'right' });
    y += 7;
    s.maiores.forEach((p, i) => {
      garantir(7);
      if (i % 2 === 0) { preencher(FUNDO); doc.rect(M, y - 4.6, CW, 6.4, 'F'); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); cor(TINTA);
      doc.text(doc.splitTextToSize(semEmoji(p.nome) || '-', 76)[0], c2[0], y);
      doc.text(String(p.quantidade), c2[1], y, { align: 'right' });
      doc.text(fmt(p.precoCusto), c2[2], y, { align: 'right' });
      doc.text(fmt(p.precoVenda), c2[3], y, { align: 'right' });
      doc.text(fmt(p.valor), c2[4], y, { align: 'right' });
      y += 6.4;
    });
    y += 2;
  }
  y += 2;

  /* ---------- Poupança ---------- */
  titulo('Poupança');
  linha('Guardado no período', fmt(dados.poupanca.guardado) + ' MT', { corValor: VERDE });
  linha('Retirado no período', fmt(dados.poupanca.retirado) + ' MT');
  linha('Total na poupança hoje', fmt(dados.poupanca.total) + ' MT', { negrito: true, fundo: true });
  y += 4;

  /* ---------- Notas ---------- */
  titulo('Notas');
  nota('Este dossiê foi gerado automaticamente pela aplicação Minha Carteira, a partir dos registos feitos pelo próprio negócio. Não é um documento contabilístico auditado nem substitui as demonstrações financeiras oficiais.');
  nota('Os valores seguem o regime de caixa: contam o dinheiro que entrou e saiu de facto. Os trocos dados são descontados das vendas.');
  nota('A poupança (dinheiro do dono) e o xitique (dinheiro de terceiros) ficam fora do cálculo do lucro.');
  nota('A média mensal usa só os meses completos com registos; o mês actual conta nos totais mas não na média, quando já existe pelo menos um mês completo.');

  /* ---------- Rodapé em todas as páginas ---------- */
  const total_pag = doc.getNumberOfPages();
  const hoje = new Date();
  const geradoEm = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
  for (let p = 1; p <= total_pag; p += 1) {
    doc.setPage(p);
    traco(LINHA); doc.setLineWidth(0.2); doc.line(M, 287, M + CW, 287);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); cor(CINZA);
    doc.text(`Gerado pela Minha Carteira (SmartMetrics Limitada) em ${geradoEm}. Valores em MT.`, M, 291.5);
    doc.text(`Página ${p} de ${total_pag}`, M + CW, 291.5, { align: 'right' });
  }

  return doc;
}
