import { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import HeroCard from '../components/HeroCard';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { IconeWhatsApp } from '../components/Icons';
import { useData, METODOS } from '../context/DataContext';
import { useDialog } from '../components/DialogProvider';
import { formatMoney, formatDataCurta, iniciais, dateKey, semEmoji } from '../utils/format';
import { linkWhatsApp } from '../utils/whatsapp';

function Badge({ status }) {
  if (status === 'vencido') return <span className="rounded-full bg-[var(--brick-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--brick)]">Vencido</span>;
  if (status === 'amanha') return <span className="rounded-full bg-[var(--amber-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--amber)]">Amanhã</span>;
  return null;
}

const CAMPOS_VAZIOS = { cliente: '', telefone: '', produtoStockId: '', produtoDescricao: '', quantidade: '1', valorTotal: '', valorPago: '0', vencimento: '' };
const AUMENTO_VAZIO = { produtoStockId: '', quantidade: '1', descricao: '', valor: '' };
const arred = (n) => Math.round(n * 100) / 100;

// Linha do tempo de uma dívida: criação, aumentos e pagamentos, do mais antigo para o mais recente.
function historicoFiado(f) {
  const aumentos = f.aumentos || [];
  const inicial = arred((f.valorTotal || 0) - aumentos.reduce((s, a) => s + a.valor, 0));
  const eventos = [{ ts: f.criadoEm, texto: 'Dívida criada', valor: inicial, tipo: 'mais' }];
  aumentos.forEach((a) => eventos.push({ ts: a.timestamp, texto: 'Aumento · ' + a.descricao, valor: a.valor, tipo: 'mais' }));
  (f.pagamentos || []).forEach((p) => eventos.push({ ts: p.timestamp, texto: 'Pagamento', valor: p.valor, tipo: 'menos' }));
  return eventos.sort((a, b) => a.ts - b.ts);
}

export default function Fiados() {
  const { fiados, produtos, saldoFiado, statusFiado, nomesClientesFiado, salvarFiado, aumentarFiado, editarFiado, registarRecebimentoFiado, deleteFiado } = useData();
  const { confirmar, avisar } = useDialog();

  const msgFiado = (f) => {
    const quando = statusFiado(f) === 'vencido' ? 'venceu em' : 'vence em';
    return `Olá ${f.cliente}, tudo bem? Este é um lembrete amigável do valor de ${formatMoney(saldoFiado(f))} MT (${semEmoji(f.produto)}) que ficou em fiado e ${quando} ${formatDataCurta(f.vencimento)}. Obrigado!`;
  };

  const [historyOpen, setHistoryOpen] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [campos, setCampos] = useState(CAMPOS_VAZIOS);
  const [metodoSinal, setMetodoSinal] = useState('dinheiro');

  const [receberId, setReceberId] = useState(null);
  const [valorReceber, setValorReceber] = useState('');
  const [metodoReceber, setMetodoReceber] = useState('dinheiro');

  const [aumentarId, setAumentarId] = useState(null);
  const [aum, setAum] = useState(AUMENTO_VAZIO);

  const [editarId, setEditarId] = useState(null);
  const [ed, setEd] = useState({ produto: '', valorTotal: '', vencimento: '', telefone: '' });

  const [detalheId, setDetalheId] = useState(null);

  const porId = (id) => fiados.find((x) => x.id === id) || null;
  const fReceber = porId(receberId);
  const fAumentar = porId(aumentarId);
  const fEditar = porId(editarId);
  const fDetalhe = porId(detalheId);

  const ativos = useMemo(() => {
    const ordem = { vencido: 0, amanha: 1, ok: 2 };
    return fiados.filter((f) => saldoFiado(f) > 0).sort((a, b) => {
      const sa = statusFiado(a), sb = statusFiado(b);
      if (ordem[sa] !== ordem[sb]) return ordem[sa] - ordem[sb];
      return (a.vencimento || '').localeCompare(b.vencimento || '');
    });
  }, [fiados, saldoFiado, statusFiado]);

  const pagos = useMemo(() => fiados.filter((f) => saldoFiado(f) <= 0).sort((a, b) => b.criadoEm - a.criadoEm), [fiados, saldoFiado]);

  const totalDevido = ativos.reduce((s, f) => s + saldoFiado(f), 0);
  const vencidosCount = ativos.filter((f) => statusFiado(f) === 'vencido').length;

  /* ---------- Novo fiado ---------- */
  function abrirNovo() {
    setCampos({ ...CAMPOS_VAZIOS, vencimento: dateKey(new Date(Date.now() + 7 * 86400000)) });
    setMetodoSinal('dinheiro');
    setModalAberto(true);
  }

  function onProdutoStockChange(id) {
    setCampos((c) => {
      const next = { ...c, produtoStockId: id };
      if (id) {
        const p = produtos.find((x) => x.id === id);
        if (p) {
          next.produtoDescricao = p.nome;
          const qtd = parseInt(next.quantidade) || 1;
          next.valorTotal = (qtd * p.precoVenda).toFixed(2);
        }
      }
      return next;
    });
  }

  function onQuantidadeChange(q) {
    setCampos((c) => {
      const next = { ...c, quantidade: q };
      const p = produtos.find((x) => x.id === c.produtoStockId);
      if (p) next.valorTotal = ((parseInt(q) || 1) * p.precoVenda).toFixed(2);
      return next;
    });
  }

  async function guardar() {
    const cliente = campos.cliente.trim();
    const produtoDescricao = campos.produtoDescricao.trim();
    const valorTotal = parseFloat(campos.valorTotal);
    let valorPago = parseFloat(campos.valorPago);
    const vencimento = campos.vencimento;

    if (!cliente) { await avisar('Introduz o nome do cliente.'); return; }
    if (!produtoDescricao) { await avisar('Descreve o produto ou serviço, ou escolhe um do stock.'); return; }
    if (!valorTotal || valorTotal <= 0) { await avisar('Introduz um valor total válido.'); return; }
    if (isNaN(valorPago) || valorPago < 0) valorPago = 0;
    if (valorPago > valorTotal) { await avisar('O valor pago agora não pode ser maior que o valor total.'); return; }
    if (!vencimento) { await avisar('Escolhe a data de vencimento.'); return; }

    const quantidade = campos.produtoStockId ? (parseInt(campos.quantidade) || 1) : null;

    const res = salvarFiado({ cliente, telefone: campos.telefone.trim(), produtoStockId: campos.produtoStockId || null, produtoDescricao, quantidade, valorTotal, valorPago, vencimento, metodo: metodoSinal });
    if (res.erro) { await avisar(res.erro); return; }
    setModalAberto(false);
  }

  /* ---------- Receber (diminuir a dívida) ---------- */
  function abrirReceber(f) {
    setReceberId(f.id);
    setMetodoReceber('dinheiro');
    setValorReceber(saldoFiado(f).toFixed(2));
  }

  async function confirmarReceber() {
    const f = fReceber;
    if (!f) return;
    const devido = saldoFiado(f);
    const v = parseFloat(valorReceber);
    if (!v || v <= 0) { await avisar('Introduz um valor válido.'); return; }
    if (v > devido + 0.01) { await avisar('Esse valor é maior que a dívida (' + formatMoney(devido) + ' MT).'); return; }
    registarRecebimentoFiado(f.id, v, 'fiado_recebido', 'Pagamento de fiado - ' + f.cliente, metodoReceber);
    setReceberId(null);
  }

  /* ---------- Aumentar a dívida ---------- */
  function abrirAumentar(f) {
    setAum(AUMENTO_VAZIO);
    setAumentarId(f.id);
  }

  function onAumProdutoChange(id) {
    setAum((c) => {
      const next = { ...c, produtoStockId: id };
      if (id) {
        const p = produtos.find((x) => x.id === id);
        if (p) {
          next.descricao = p.nome;
          next.valor = ((parseInt(next.quantidade) || 1) * p.precoVenda).toFixed(2);
        }
      }
      return next;
    });
  }

  function onAumQuantidadeChange(q) {
    setAum((c) => {
      const next = { ...c, quantidade: q };
      const p = produtos.find((x) => x.id === c.produtoStockId);
      if (p) next.valor = ((parseInt(q) || 1) * p.precoVenda).toFixed(2);
      return next;
    });
  }

  async function confirmarAumentar() {
    const f = fAumentar;
    if (!f) return;
    const descricao = aum.descricao.trim();
    const valor = parseFloat(aum.valor);
    if (!descricao) { await avisar('Descreve o produto ou serviço que o cliente levou.'); return; }
    if (!valor || valor <= 0) { await avisar('Introduz o valor a acrescentar.'); return; }
    const res = aumentarFiado(f.id, {
      descricao, valor,
      produtoStockId: aum.produtoStockId || null,
      quantidade: aum.produtoStockId ? (parseInt(aum.quantidade) || 1) : null,
    });
    if (res.erro) { await avisar(res.erro); return; }
    setAumentarId(null);
  }

  /* ---------- Editar ---------- */
  function abrirEditar(f) {
    setEd({ produto: f.produto || '', valorTotal: String(f.valorTotal ?? ''), vencimento: f.vencimento || '', telefone: f.telefone || '' });
    setEditarId(f.id);
  }

  async function confirmarEditar() {
    const f = fEditar;
    if (!f) return;
    const produto = ed.produto.trim();
    const valorTotal = parseFloat(ed.valorTotal);
    if (!produto) { await avisar('Descreve o produto ou serviço.'); return; }
    if (!valorTotal || valorTotal <= 0) { await avisar('Introduz um valor total válido.'); return; }
    if (valorTotal < (f.valorPago || 0) - 0.01) { await avisar('O valor total não pode ser menor do que o já pago (' + formatMoney(f.valorPago || 0) + ' MT).'); return; }
    if (!ed.vencimento) { await avisar('Escolhe a data de vencimento.'); return; }
    editarFiado(f.id, { produto, valorTotal: arred(valorTotal), vencimento: ed.vencimento, telefone: ed.telefone.trim() });
    setEditarId(null);
  }

  async function apagar(f) {
    const ok = await confirmar(`Apagar o fiado de "${f.cliente}" (${f.produto})? Os pagamentos já recebidos continuam no Caixa do Dia.`, { perigo: true, textoOk: 'Apagar' });
    if (ok) { setDetalheId(null); deleteFiado(f.id); }
  }

  const prodAum = produtos.find((x) => x.id === aum.produtoStockId);

  return (
    <Layout>
      <HeroCard
        label="Total em Fiado · Por Receber"
        valor={totalDevido}
        sub={
          <>
            <span>Devedores <b className="font-mono-ref text-[var(--paper)]">{ativos.length}</b></span>
            <span>Vencidos <b className="font-mono-ref text-[var(--paper)]">{vencidosCount}</b></span>
          </>
        }
      />

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Quem Deve</p>
        <button onClick={abrirNovo} className="text-xs font-semibold text-[var(--mango)]">+ Fiado</button>
      </div>

      <section className="mt-2 rounded-2xl bg-[var(--paper)] p-4">
        {ativos.length === 0 ? (
          <EmptyState>Ainda não há fiados registados.<br />Toca em "+ Fiado" para começar o teu livro de crédito.</EmptyState>
        ) : (
          ativos.map((f) => (
            <div key={f.id} className="border-b border-dashed border-[var(--ink)]/10 py-3 last:border-none">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] font-display text-sm font-bold text-[var(--ink)]">
                  {iniciais(f.cliente)}
                </div>
                <button type="button" onClick={() => setDetalheId(f.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--ink)]">
                    <span className="truncate">{f.cliente}</span>
                    <Badge status={statusFiado(f)} />
                  </div>
                  <div className="line-clamp-2 text-[11.5px] text-[var(--ink-soft)]">{semEmoji(f.produto)}</div>
                  <div className="font-mono-ref text-[11.5px] font-semibold text-[var(--ink)]">
                    deve {formatMoney(saldoFiado(f))} MT
                    <span className="font-normal text-[var(--ink-soft)]"> · vence {formatDataCurta(f.vencimento)}</span>
                  </div>
                </button>
                <button onClick={() => apagar(f)} aria-label="Apagar" className="shrink-0 p-1 text-[var(--ink-soft)] opacity-50 transition hover:opacity-100">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <a
                  href={linkWhatsApp(f.telefone, msgFiado(f))}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Lembrar por WhatsApp"
                  className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <IconeWhatsApp className="h-4 w-4" />
                  Lembrar
                </a>
                <button onClick={() => abrirReceber(f)} className="rounded-full border border-[var(--ink-soft)]/25 px-3 py-1.5 text-xs font-semibold text-[var(--ink-soft)]">
                  Receber
                </button>
                <button onClick={() => abrirAumentar(f)} className="rounded-full border border-[var(--mango)] px-3 py-1.5 text-xs font-semibold text-[var(--mango)]">
                  Aumentar
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="mt-4">
        <button onClick={() => setHistoryOpen((v) => !v)} className="text-xs font-semibold text-[var(--mango)]">
          {historyOpen ? 'Esconder fiados pagos ▴' : 'Ver fiados já pagos ▾'}
        </button>
        {historyOpen && (
          <div className="mt-2 rounded-2xl bg-[var(--paper)] p-3">
            {pagos.length === 0 ? (
              <p className="px-1 py-2 text-sm text-[var(--ink-soft)]">Sem fiados pagos ainda.</p>
            ) : (
              pagos.map((f) => (
                <div key={f.id} className="flex items-center justify-between border-b border-dashed border-[var(--ink)]/10 py-2 text-sm last:border-none">
                  <button type="button" onClick={() => setDetalheId(f.id)} className="min-w-0 flex-1 truncate text-left text-[var(--ink)]">{semEmoji(f.cliente)} · {semEmoji(f.produto)}</button>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono-ref font-semibold text-[var(--ink)]">{formatMoney(f.valorTotal)} MT</span>
                    <button onClick={() => apagar(f)} className="text-[var(--ink-soft)] opacity-50 hover:opacity-100">✕</button>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Modal Novo Fiado */}
      <Modal titulo="+ Fiado" aberto={modalAberto} aoFechar={() => setModalAberto(false)} tamanho="larga">
        <div className="space-y-4">
          <Campo label="Nome do Cliente">
            <input className="campo" list="clientes-fiado" maxLength={30} placeholder="Dona Berta" value={campos.cliente} onChange={(e) => setCampos((c) => ({ ...c, cliente: e.target.value }))} />
            <datalist id="clientes-fiado">
              {nomesClientesFiado.map((n) => <option key={n} value={n} />)}
            </datalist>
          </Campo>

          <Campo label="WhatsApp do cliente (opcional)">
            <input className="campo" type="tel" inputMode="tel" placeholder="84 123 4567" value={campos.telefone} onChange={(e) => setCampos((c) => ({ ...c, telefone: e.target.value }))} />
          </Campo>

          <Campo label="Produto do stock (opcional)">
            <select className="campo" value={campos.produtoStockId} onChange={(e) => onProdutoStockChange(e.target.value)}>
              <option value="">— Produto ou serviço avulso (escreve abaixo) —</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} (stock: {p.quantidade})</option>)}
            </select>
          </Campo>

          {campos.produtoStockId && (
            <Campo label="Quantidade">
              <input className="campo" type="number" min="1" step="1" value={campos.quantidade} onChange={(e) => onQuantidadeChange(e.target.value)} />
            </Campo>
          )}

          <Campo label="Produto ou serviço">
            <input className="campo" maxLength={60} placeholder="3 latas de leite" value={campos.produtoDescricao} onChange={(e) => setCampos((c) => ({ ...c, produtoDescricao: e.target.value }))} />
          </Campo>

          <Campo label="Valor Total (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={campos.valorTotal} onChange={(e) => setCampos((c) => ({ ...c, valorTotal: e.target.value }))} />
          </Campo>

          <Campo label="Valor Pago Agora / Sinal (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={campos.valorPago} onChange={(e) => setCampos((c) => ({ ...c, valorPago: e.target.value }))} />
          </Campo>

          {parseFloat(campos.valorPago) > 0 && (
            <Campo label="Sinal recebido em">
              <select className="campo" value={metodoSinal} onChange={(e) => setMetodoSinal(e.target.value)}>
                {METODOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Campo>
          )}

          <Campo label="Data de Vencimento">
            <input className="campo" type="date" value={campos.vencimento} onChange={(e) => setCampos((c) => ({ ...c, vencimento: e.target.value }))} />
          </Campo>

          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setModalAberto(false)}>Cancelar</Botao>
            <Botao onClick={guardar}>Guardar</Botao>
          </div>
        </div>
      </Modal>

      {/* Modal Receber Pagamento */}
      <Modal titulo="Receber Pagamento" aberto={!!fReceber} aoFechar={() => setReceberId(null)}>
        {fReceber && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--ink-soft)]">
              {fReceber.cliente} deve {formatMoney(saldoFiado(fReceber))} MT ({fReceber.produto}).
            </p>
            <Campo label="Recebido em">
              <select className="campo" value={metodoReceber} onChange={(e) => setMetodoReceber(e.target.value)}>
                {METODOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Campo>
            <Campo label="Valor Recebido (MT)">
              <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorReceber} onChange={(e) => setValorReceber(e.target.value)} />
            </Campo>
            <div className="flex gap-2 pt-1">
              <Botao variante="secundario" onClick={() => setReceberId(null)}>Cancelar</Botao>
              <Botao onClick={confirmarReceber}>Confirmar</Botao>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Aumentar Dívida */}
      <Modal titulo="Aumentar dívida" aberto={!!fAumentar} aoFechar={() => setAumentarId(null)} tamanho="larga">
        {fAumentar && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--ink-soft)]">
              {fAumentar.cliente} deve agora {formatMoney(saldoFiado(fAumentar))} MT. O que ele levou a mais fica somado na mesma dívida.
            </p>

            <Campo label="Produto do stock (opcional)">
              <select className="campo" value={aum.produtoStockId} onChange={(e) => onAumProdutoChange(e.target.value)}>
                <option value="">— Produto ou serviço avulso (escreve abaixo) —</option>
                {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} (stock: {p.quantidade})</option>)}
              </select>
            </Campo>

            {aum.produtoStockId && (
              <Campo label="Quantidade">
                <input className="campo" type="number" min="1" step="1" value={aum.quantidade} onChange={(e) => onAumQuantidadeChange(e.target.value)} />
              </Campo>
            )}

            <Campo label="Produto ou serviço">
              <input className="campo" maxLength={60} placeholder="2 sacos de arroz" value={aum.descricao} onChange={(e) => setAum((c) => ({ ...c, descricao: e.target.value }))} />
            </Campo>

            <Campo label="Valor a acrescentar (MT)">
              <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={aum.valor} onChange={(e) => setAum((c) => ({ ...c, valor: e.target.value }))} />
            </Campo>

            {parseFloat(aum.valor) > 0 && (
              <p className="text-xs text-[var(--ink-soft)]">
                Nova dívida: <b className="font-mono-ref text-[var(--ink)]">{formatMoney(saldoFiado(fAumentar) + parseFloat(aum.valor))} MT</b>
                {prodAum ? ` · sai ${parseInt(aum.quantidade) || 1} do stock de ${prodAum.nome}` : ''}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Botao variante="secundario" onClick={() => setAumentarId(null)}>Cancelar</Botao>
              <Botao onClick={confirmarAumentar}>Acrescentar</Botao>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Editar */}
      <Modal titulo="Editar fiado" aberto={!!fEditar} aoFechar={() => setEditarId(null)} tamanho="larga">
        {fEditar && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--ink-soft)]">{fEditar.cliente} · já pagou {formatMoney(fEditar.valorPago || 0)} MT</p>
            <Campo label="Produto ou serviço">
              <input className="campo" maxLength={120} value={ed.produto} onChange={(e) => setEd((c) => ({ ...c, produto: e.target.value }))} />
            </Campo>
            <Campo label="Valor total da dívida (MT)">
              <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" value={ed.valorTotal} onChange={(e) => setEd((c) => ({ ...c, valorTotal: e.target.value }))} />
            </Campo>
            <Campo label="Data de vencimento">
              <input className="campo" type="date" value={ed.vencimento} onChange={(e) => setEd((c) => ({ ...c, vencimento: e.target.value }))} />
            </Campo>
            <Campo label="WhatsApp do cliente (opcional)">
              <input className="campo" type="tel" inputMode="tel" placeholder="84 123 4567" value={ed.telefone} onChange={(e) => setEd((c) => ({ ...c, telefone: e.target.value }))} />
            </Campo>
            <div className="flex gap-2 pt-1">
              <Botao variante="secundario" onClick={() => setEditarId(null)}>Cancelar</Botao>
              <Botao onClick={confirmarEditar}>Guardar</Botao>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Detalhe */}
      <Modal titulo={fDetalhe?.cliente} aberto={!!fDetalhe} aoFechar={() => setDetalheId(null)}>
        {fDetalhe && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><span className="text-[var(--ink-soft)]">Produto ou serviço</span><span className="text-right font-medium text-[var(--ink)]">{fDetalhe.produto}</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-soft)]">Valor Total</span><span className="font-mono-ref font-medium text-[var(--ink)]">{formatMoney(fDetalhe.valorTotal)} MT</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-soft)]">Já pago</span><span className="font-mono-ref font-medium text-[var(--ink)]">{formatMoney(fDetalhe.valorPago)} MT</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-soft)]">Falta pagar</span><span className="font-mono-ref font-medium text-[var(--ink)]">{formatMoney(saldoFiado(fDetalhe))} MT</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-soft)]">Vencimento</span><span className="font-medium text-[var(--ink)]">{formatDataCurta(fDetalhe.vencimento)}</span></div>

            <div className="pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mango)]">Movimentos</p>
              <div className="mt-1 divide-y divide-[var(--ink)]/5">
                {historicoFiado(fDetalhe).map((e, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="min-w-0 text-[12.5px] text-[var(--ink-soft)]">
                      <span className="block truncate text-[var(--ink)]">{e.texto}</span>
                      {formatDataCurta(dateKey(new Date(e.ts)))}
                    </span>
                    <span className={`font-mono-ref shrink-0 text-[13px] font-semibold ${e.tipo === 'mais' ? 'text-[var(--brick)]' : 'text-[var(--teal)]'}`}>
                      {e.tipo === 'mais' ? '+' : '−'} {formatMoney(e.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3">
              {saldoFiado(fDetalhe) > 0 && <Botao onClick={() => { setDetalheId(null); abrirReceber(fDetalhe); }}>Receber</Botao>}
              {saldoFiado(fDetalhe) > 0 && <Botao variante="secundario" onClick={() => { setDetalheId(null); abrirAumentar(fDetalhe); }}>Aumentar</Botao>}
              <Botao variante="secundario" onClick={() => { setDetalheId(null); abrirEditar(fDetalhe); }}>Editar</Botao>
              <Botao variante="fantasma" onClick={() => setDetalheId(null)}>Fechar</Botao>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
