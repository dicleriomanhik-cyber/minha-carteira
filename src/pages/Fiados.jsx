import { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import HeroCard from '../components/HeroCard';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Linha from '../components/Linha';
import { useData } from '../context/DataContext';
import { formatMoney, formatDataCurta, iniciais, dateKey } from '../utils/format';

function Badge({ status }) {
  if (status === 'vencido') return <span className="rounded-full bg-[var(--brick-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--brick)]">🔴 Vencido</span>;
  if (status === 'amanha') return <span className="rounded-full bg-[var(--amber-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--amber)]">🟠 Amanhã</span>;
  return null;
}

const CAMPOS_VAZIOS = { cliente: '', produtoStockId: '', produtoDescricao: '', quantidade: '1', valorTotal: '', valorPago: '0', vencimento: '' };

export default function Fiados() {
  const { fiados, produtos, saldoFiado, statusFiado, nomesClientesFiado, salvarFiado, registarRecebimentoFiado, deleteFiado } = useData();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [campos, setCampos] = useState(CAMPOS_VAZIOS);

  const [modalReceber, setModalReceber] = useState(null); // fiado
  const [valorReceber, setValorReceber] = useState('');

  const [modalDetalhe, setModalDetalhe] = useState(null); // fiado

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

  function abrirNovo() {
    setCampos({ ...CAMPOS_VAZIOS, vencimento: dateKey(new Date(Date.now() + 7 * 86400000)) });
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

  function guardar() {
    const cliente = campos.cliente.trim();
    const produtoDescricao = campos.produtoDescricao.trim();
    const valorTotal = parseFloat(campos.valorTotal);
    let valorPago = parseFloat(campos.valorPago);
    const vencimento = campos.vencimento;

    if (!cliente) { alert('Introduz o nome do cliente.'); return; }
    if (!produtoDescricao) { alert('Descreve o produto ou escolhe um do stock.'); return; }
    if (!valorTotal || valorTotal <= 0) { alert('Introduz um valor total válido.'); return; }
    if (isNaN(valorPago) || valorPago < 0) valorPago = 0;
    if (valorPago > valorTotal) { alert('O valor pago agora não pode ser maior que o valor total.'); return; }
    if (!vencimento) { alert('Escolhe a data de vencimento.'); return; }

    const quantidade = campos.produtoStockId ? (parseInt(campos.quantidade) || 1) : null;

    const res = salvarFiado({ cliente, produtoStockId: campos.produtoStockId || null, produtoDescricao, quantidade, valorTotal, valorPago, vencimento });
    if (res.erro) { alert(res.erro); return; }
    setModalAberto(false);
  }

  function abrirReceber(f) {
    setModalReceber(f);
    setValorReceber(saldoFiado(f).toFixed(2));
  }

  function confirmarReceber() {
    const f = modalReceber;
    const devido = saldoFiado(f);
    const v = parseFloat(valorReceber);
    if (!v || v <= 0) { alert('Introduz um valor válido.'); return; }
    if (v > devido + 0.01) { alert('Esse valor é maior que a dívida (' + formatMoney(devido) + ' MT).'); return; }
    registarRecebimentoFiado(f.id, v, 'fiado_recebido', 'Pagamento de fiado - ' + f.cliente);
    setModalReceber(null);
  }

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
            <Linha
              key={f.id}
              avatar={iniciais(f.cliente)}
              aoTocarMeio={() => setModalDetalhe(f)}
              titulo={f.cliente}
              badge={<Badge status={statusFiado(f)} />}
              subtitulo={`${f.produto} · deve ${formatMoney(saldoFiado(f))} MT · vence ${formatDataCurta(f.vencimento)}`}
              acao={
                <button onClick={() => abrirReceber(f)} className="shrink-0 rounded-full border border-[var(--ink-soft)]/25 px-3 py-1.5 text-xs font-semibold text-[var(--ink-soft)]">
                  Receber
                </button>
              }
              aoApagar={() => { if (confirm(`Apagar o fiado de "${f.cliente}" (${f.produto})? Os pagamentos já recebidos continuam no Caixa do Dia.`)) deleteFiado(f.id); }}
            />
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
                  <span className="truncate text-[var(--ink)]">{f.cliente} · {f.produto}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono-ref font-semibold text-[var(--ink)]">{formatMoney(f.valorTotal)} MT</span>
                    <button onClick={() => { if (confirm(`Apagar o fiado de "${f.cliente}" (${f.produto})? Os pagamentos já recebidos continuam no Caixa do Dia.`)) deleteFiado(f.id); }} className="text-[var(--ink-soft)] opacity-50 hover:opacity-100">✕</button>
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
            <input className="campo" list="clientes-fiado" maxLength={30} placeholder="Ex: Dona Berta" value={campos.cliente} onChange={(e) => setCampos((c) => ({ ...c, cliente: e.target.value }))} />
            <datalist id="clientes-fiado">
              {nomesClientesFiado.map((n) => <option key={n} value={n} />)}
            </datalist>
          </Campo>

          <Campo label="Produto do stock (opcional)">
            <select className="campo" value={campos.produtoStockId} onChange={(e) => onProdutoStockChange(e.target.value)}>
              <option value="">— Produto avulso (escreve abaixo) —</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} (stock: {p.quantidade})</option>)}
            </select>
          </Campo>

          {campos.produtoStockId && (
            <Campo label="Quantidade">
              <input className="campo" type="number" min="1" step="1" value={campos.quantidade} onChange={(e) => onQuantidadeChange(e.target.value)} />
            </Campo>
          )}

          <Campo label="Produto / Descrição">
            <input className="campo" maxLength={60} placeholder="Ex: 3 latas de leite" value={campos.produtoDescricao} onChange={(e) => setCampos((c) => ({ ...c, produtoDescricao: e.target.value }))} />
          </Campo>

          <Campo label="Valor Total (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={campos.valorTotal} onChange={(e) => setCampos((c) => ({ ...c, valorTotal: e.target.value }))} />
          </Campo>

          <Campo label="Valor Pago Agora / Sinal (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={campos.valorPago} onChange={(e) => setCampos((c) => ({ ...c, valorPago: e.target.value }))} />
          </Campo>

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
      <Modal titulo="Receber Pagamento" aberto={!!modalReceber} aoFechar={() => setModalReceber(null)}>
        {modalReceber && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--ink-soft)]">
              {modalReceber.cliente} deve {formatMoney(saldoFiado(modalReceber))} MT ({modalReceber.produto}).
            </p>
            <Campo label="Valor Recebido (MT)">
              <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorReceber} onChange={(e) => setValorReceber(e.target.value)} />
            </Campo>
            <div className="flex gap-2 pt-1">
              <Botao variante="secundario" onClick={() => setModalReceber(null)}>Cancelar</Botao>
              <Botao onClick={confirmarReceber}>Confirmar</Botao>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Detalhe */}
      <Modal titulo={modalDetalhe?.cliente} aberto={!!modalDetalhe} aoFechar={() => setModalDetalhe(null)}>
        {modalDetalhe && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[var(--ink-soft)]">Produto</span><span className="font-medium text-[var(--ink)]">{modalDetalhe.produto}</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-soft)]">Valor Total</span><span className="font-mono-ref font-medium text-[var(--ink)]">{formatMoney(modalDetalhe.valorTotal)} MT</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-soft)]">Já pago</span><span className="font-mono-ref font-medium text-[var(--ink)]">{formatMoney(modalDetalhe.valorPago)} MT</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-soft)]">Falta pagar</span><span className="font-mono-ref font-medium text-[var(--ink)]">{formatMoney(saldoFiado(modalDetalhe))} MT</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-soft)]">Vencimento</span><span className="font-medium text-[var(--ink)]">{formatDataCurta(modalDetalhe.vencimento)}</span></div>
            <div className="pt-3">
              <Botao variante="secundario" onClick={() => setModalDetalhe(null)}>Fechar</Botao>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
