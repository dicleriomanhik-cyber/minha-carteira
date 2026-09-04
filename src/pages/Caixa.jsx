import { useState } from 'react';
import Layout from '../components/Layout';
import HeroCard from '../components/HeroCard';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import AlertBanner from '../components/AlertBanner';
import { useData } from '../context/DataContext';
import { CATEGORIAS, CAT_LOOKUP } from '../context/DataContext';
import { useDialog } from '../components/DialogProvider';
import { formatMoney, formatDataExtenso, formatHora, HOJE_KEY } from '../utils/format';

function ChipCategoria({ cat, selecionada, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
        selecionada ? 'bg-[var(--mango)] text-[var(--mango-ink)]' : 'bg-[var(--bg-soft)] text-[var(--ink)]'
      }`}
    >
      {cat.icon} {cat.label}
    </button>
  );
}

export default function Caixa() {
  const {
    doHoje, totalEntradasHoje, totalSaidasHoje, saldoHoje, totalProdutosHoje, totalMaquinaHoje, lucroRealHojeCalc,
    getSaldoInicial, saldoInicialDefinidoHoje, sugestaoSaldoInicial, setSaldoInicialHoje,
    addTransacao, registrarVendaComStock, deleteTransacao, deleteDia, historicoDias, saldoFechamentoDia, produtos,
  } = useData();
  const { confirmar, avisar } = useDialog();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [modalTipo, setModalTipo] = useState(null); // 'entrada' | 'saida' | null
  const [categoria, setCategoria] = useState(null);
  const [valor, setValor] = useState('');
  const [nota, setNota] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [qtdVenda, setQtdVenda] = useState('1');
  const [modalSaldoAberto, setModalSaldoAberto] = useState(false);
  const [valorSaldo, setValorSaldo] = useState('');

  const lucro = lucroRealHojeCalc();
  const saldoInicial = getSaldoInicial(HOJE_KEY);
  const definido = saldoInicialDefinidoHoje();

  function abrirModal(tipo) {
    setModalTipo(tipo);
    setCategoria(null);
    setValor('');
    setNota('');
    setProdutoId('');
    setQtdVenda('1');
  }

  function onSelecionarProduto(id) {
    setProdutoId(id);
    if (id) {
      const p = produtos.find((x) => x.id === id);
      if (p) setValor((parseInt(qtdVenda) || 1) * p.precoVenda);
    }
  }

  function onQtdVendaChange(q) {
    setQtdVenda(q);
    const p = produtos.find((x) => x.id === produtoId);
    if (p) setValor(((parseInt(q) || 1) * p.precoVenda).toFixed(2));
  }

  async function salvar() {
    const v = parseFloat(valor);
    if (!categoria) { await avisar('Escolhe uma categoria.'); return; }
    if (!v || v <= 0) { await avisar('Introduz um valor válido.'); return; }

    if (categoria === 'venda' && produtoId) {
      const qtd = parseInt(qtdVenda) || 1;
      const res = registrarVendaComStock({ tipo: modalTipo, categoria, valor: v, nota: nota.trim(), produtoId, quantidade: qtd });
      if (res.erro) { await avisar(res.erro); return; }
    } else {
      addTransacao({ tipo: modalTipo, categoria, valor: v, nota: nota.trim() });
    }
    setModalTipo(null);
  }

  function abrirSaldoInicial() {
    setValorSaldo(sugestaoSaldoInicial() ? sugestaoSaldoInicial().toFixed(2) : '');
    setModalSaldoAberto(true);
  }

  async function confirmarSaldoInicial() {
    const v = parseFloat(valorSaldo);
    if (isNaN(v) || v < 0) { await avisar('Introduz um valor válido (pode ser 0).'); return; }
    setSaldoInicialHoje(v);
    setModalSaldoAberto(false);
  }

  return (
    <Layout>
      <AlertBanner />

      <HeroCard
        label="Saldo"
        valor={saldoHoje}
        acao={
          <button
            onClick={abrirSaldoInicial}
            className={`mb-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs ${definido ? 'bg-white/5' : 'bg-[var(--mango)]/20'}`}
          >
            <span className="text-[var(--paper)]/70">
              Saldo inicial: <b className="text-[var(--paper)]">{formatMoney(saldoInicial)} MT</b>
            </span>
            <span className="font-semibold text-[var(--mango)]">{definido ? 'editar' : 'definir agora'}</span>
          </button>
        }
        sub={
          <>
            <span>Entradas <b className="font-mono-ref text-[var(--paper)]">{formatMoney(totalEntradasHoje)}</b></span>
            <span>Saídas <b className="font-mono-ref text-[var(--paper)]">{formatMoney(totalSaidasHoje)}</b></span>
          </>
        }
      >
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--paper)]/50">🧺 Produtos</div>
            <div className="font-mono-ref mt-0.5 text-sm font-semibold">{formatMoney(totalProdutosHoje)} MT</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--paper)]/50">⚙️ Máquina</div>
            <div className="font-mono-ref mt-0.5 text-sm font-semibold">{formatMoney(totalMaquinaHoje)} MT</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--paper)]/50">📈 Lucro Real</div>
            <div className="font-mono-ref mt-0.5 text-sm font-semibold">{formatMoney(lucro.lucro)} MT</div>
          </div>
        </div>
      </HeroCard>

      <div className="mt-4 flex gap-3">
        <button onClick={() => abrirModal('entrada')} className="flex-1 rounded-xl bg-[var(--teal)] py-3 text-sm font-semibold text-white active:scale-[0.98]">+ Entrada</button>
        <button onClick={() => abrirModal('saida')} className="flex-1 rounded-xl bg-[var(--brick)] py-3 text-sm font-semibold text-white active:scale-[0.98]">− Saída</button>
      </div>

      <section className="mt-6 rounded-2xl bg-[var(--paper)] p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Registos de Hoje</p>
        {doHoje.length === 0 ? (
          <EmptyState>Ainda não há registos hoje.<br />Toca em "+ Entrada" para começar.</EmptyState>
        ) : (
          <div>
            {doHoje.map((t) => {
              const cat = CAT_LOOKUP[t.categoria] || { icon: '💰', label: t.categoria };
              return (
                <div key={t.id} className="flex items-center gap-3 border-b border-dashed border-[var(--ink)]/10 py-3 last:border-none">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-base">{cat.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold text-[var(--ink)]">{cat.label}</div>
                    {t.nota && <div className="truncate text-[12px] text-[var(--ink-soft)]">{t.nota}</div>}
                    <div className="text-[11px] text-[var(--ink-soft)]">{formatHora(t.timestamp)}</div>
                  </div>
                  <div className={`font-mono-ref shrink-0 text-sm font-semibold ${t.tipo === 'entrada' ? 'text-[var(--teal)]' : 'text-[var(--brick)]'}`}>
                    {t.tipo === 'entrada' ? '+' : '−'} {formatMoney(t.valor)}
                  </div>
                  <button onClick={async () => { const ok = await confirmar('Apagar este registo?', { perigo: true, textoOk: 'Apagar' }); if (ok) deleteTransacao(t.id); }} className="shrink-0 p-1 text-[var(--ink-soft)] opacity-50 hover:opacity-100">✕</button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-4">
        <button onClick={() => setHistoryOpen((v) => !v)} className="text-xs font-semibold text-[var(--mango)]">
          {historyOpen ? 'Esconder dias anteriores ▴' : 'Ver dias anteriores ▾'}
        </button>
        {historyOpen && (
          <div className="mt-2 rounded-2xl bg-[var(--paper)] p-3">
            {historicoDias.length === 0 ? (
              <p className="px-1 py-2 text-sm text-[var(--ink-soft)]">Sem dias anteriores registados.</p>
            ) : (
              historicoDias.map((dk) => {
                const [y, m, d] = dk.split('-').map(Number);
                const dataObj = new Date(y, m - 1, d);
                return (
                  <div key={dk} className="flex items-center justify-between border-b border-dashed border-[var(--ink)]/10 py-2 text-sm last:border-none">
                    <span className="text-[var(--ink)]">{formatDataExtenso(dataObj)}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono-ref font-semibold text-[var(--ink)]">{formatMoney(saldoFechamentoDia(dk))} MT</span>
                      <button onClick={async () => { const ok = await confirmar(`Apagar todos os registos de ${formatDataExtenso(dataObj)}? Esta ação não pode ser desfeita.`, { perigo: true, textoOk: 'Apagar' }); if (ok) deleteDia(dk); }} className="text-[var(--ink-soft)] opacity-50 hover:opacity-100">✕</button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* Modal Nova Transação */}
      <Modal titulo={modalTipo === 'entrada' ? 'Nova Entrada' : 'Nova Saída'} aberto={!!modalTipo} aoFechar={() => setModalTipo(null)}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {modalTipo && CATEGORIAS[modalTipo].map((c) => (
              <ChipCategoria key={c.id} cat={c} selecionada={categoria === c.id} onClick={() => setCategoria(c.id)} />
            ))}
          </div>

          {modalTipo === 'entrada' && categoria === 'venda' && (
            <>
              <Campo label="Produto do stock (opcional)">
                <select className="campo" value={produtoId} onChange={(e) => onSelecionarProduto(e.target.value)}>
                  <option value="">— Não descontar do stock —</option>
                  {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} (stock: {p.quantidade})</option>)}
                </select>
              </Campo>
              {produtoId && (
                <Campo label="Quantidade Vendida">
                  <input className="campo" type="number" min="1" step="1" value={qtdVenda} onChange={(e) => onQtdVendaChange(e.target.value)} />
                </Campo>
              )}
            </>
          )}

          <Campo label="Valor (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
          <Campo label="Nota (opcional)">
            <input className="campo" type="text" maxLength={40} placeholder="Ex: Cliente da esquina" value={nota} onChange={(e) => setNota(e.target.value)} />
          </Campo>

          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setModalTipo(null)}>Cancelar</Botao>
            <Botao onClick={salvar}>Guardar</Botao>
          </div>
        </div>
      </Modal>

      {/* Modal Saldo Inicial */}
      <Modal titulo="Saldo Inicial de Hoje" aberto={modalSaldoAberto} aoFechar={() => setModalSaldoAberto(false)}>
        <p className="mb-3 text-sm text-[var(--ink-soft)]">Quanto dinheiro físico do negócio já tens no bolso agora, antes de qualquer venda de hoje?</p>
        <Campo label="Valor (MT)">
          <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorSaldo} onChange={(e) => setValorSaldo(e.target.value)} />
        </Campo>
        <div className="mt-4 flex gap-2">
          <Botao variante="secundario" onClick={() => setModalSaldoAberto(false)}>Cancelar</Botao>
          <Botao onClick={confirmarSaldoInicial}>Guardar</Botao>
        </div>
      </Modal>
    </Layout>
  );
}
