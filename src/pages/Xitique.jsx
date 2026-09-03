import { useState } from 'react';
import Layout from '../components/Layout';
import HeroCard from '../components/HeroCard';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Linha from '../components/Linha';
import { useData } from '../context/DataContext';
import { formatMoney, formatDataExtenso, iniciais } from '../utils/format';

export default function Xitique() {
  const {
    participantes, pagouHoje, salvarParticipante, deleteParticipante, desmarcarPagamento, registrarPagamento,
    totalGuardadoXitique, registrarEntrega, deleteEntrega, entregas,
  } = useData();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [modalParticipante, setModalParticipante] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [valorCombinado, setValorCombinado] = useState('');

  const [modalPagamento, setModalPagamento] = useState(null); // participante
  const [valorPagamento, setValorPagamento] = useState('');

  const [modalEntrega, setModalEntrega] = useState(false);
  const [valorEntrega, setValorEntrega] = useState('');
  const [quemRecebeu, setQuemRecebeu] = useState('');

  function abrirNovoParticipante() {
    setEditandoId(null);
    setNome('');
    setValorCombinado('');
    setModalParticipante(true);
  }

  function abrirEditarParticipante(p) {
    setEditandoId(p.id);
    setNome(p.nome);
    setValorCombinado(p.valorCombinado);
    setModalParticipante(true);
  }

  function guardarParticipante() {
    const n = nome.trim();
    const v = parseFloat(valorCombinado);
    if (!n) { alert('Introduz o nome do participante.'); return; }
    if (!v || v <= 0) { alert('Introduz um valor combinado válido.'); return; }
    salvarParticipante({ id: editandoId, nome: n, valorCombinado: v });
    setModalParticipante(false);
  }

  function apagarAtual() {
    if (!editandoId) return;
    const p = participantes.find((x) => x.id === editandoId);
    if (!p) return;
    if (!confirm(`Apagar "${p.nome}" e o seu histórico de pagamentos?`)) return;
    deleteParticipante(editandoId);
    setModalParticipante(false);
  }

  function togglePagamento(p) {
    if (pagouHoje(p.id)) {
      if (!confirm('Desmarcar o pagamento de hoje?')) return;
      desmarcarPagamento(p.id);
      return;
    }
    setModalPagamento(p);
    setValorPagamento(p.valorCombinado);
  }

  function confirmarPagamento() {
    const v = parseFloat(valorPagamento);
    if (!v || v <= 0) { alert('Introduz um valor válido.'); return; }
    registrarPagamento(modalPagamento.id, v);
    setModalPagamento(null);
  }

  function abrirEntrega() {
    const total = totalGuardadoXitique;
    if (total <= 0) { alert('Ainda não há dinheiro guardado no Xitique.'); return; }
    if (participantes.length === 0) { alert('Adiciona primeiro pelo menos um participante — a entrega só pode ser feita a alguém da lista.'); return; }
    setValorEntrega(total.toFixed(2));
    setQuemRecebeu(participantes[0].id);
    setModalEntrega(true);
  }

  function confirmarEntregaFn() {
    const v = parseFloat(valorEntrega);
    const total = totalGuardadoXitique;
    if (!quemRecebeu) { alert('Escolhe quem recebeu a entrega.'); return; }
    if (!v || v <= 0) { alert('Introduz um valor válido.'); return; }
    if (v > total + 0.01) { alert('Esse valor é maior que o total guardado (' + formatMoney(total) + ' MT).'); return; }
    registrarEntrega(v, quemRecebeu);
    setModalEntrega(false);
  }

  return (
    <Layout>
      <HeroCard
        label="Total Guardado · Pertence ao Xitique"
        valor={totalGuardadoXitique}
        sub={
          <>
            <span>Participantes <b className="font-mono-ref text-[var(--paper)]">{participantes.length}</b></span>
            <span>Pagaram hoje <b className="font-mono-ref text-[var(--paper)]">{participantes.filter((p) => pagouHoje(p.id)).length}</b></span>
          </>
        }
      />

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Participantes</p>
        <button onClick={abrirNovoParticipante} className="text-xs font-semibold text-[var(--mango)]">+ Adicionar</button>
      </div>

      <section className="mt-2 rounded-2xl bg-[var(--paper)] p-4">
        {participantes.length === 0 ? (
          <EmptyState>Ainda não há participantes.<br />Toca em "+ Adicionar" para começar a lista do Xitique.</EmptyState>
        ) : (
          participantes.map((p) => {
            const pago = pagouHoje(p.id);
            return (
              <Linha
                key={p.id}
                avatar={iniciais(p.nome)}
                aoTocarMeio={() => abrirEditarParticipante(p)}
                titulo={p.nome}
                subtitulo={`Combinado: ${formatMoney(p.valorCombinado)} MT`}
                acao={
                  <button
                    onClick={() => togglePagamento(p)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${pago ? 'bg-[var(--teal-soft)] text-[var(--teal)]' : 'border border-[var(--ink-soft)]/25 text-[var(--ink-soft)]'}`}
                  >
                    {pago ? '✓ Pagou' : 'Marcar Pago'}
                  </button>
                }
                aoApagar={() => { if (confirm(`Apagar "${p.nome}" e o seu histórico de pagamentos?`)) deleteParticipante(p.id); }}
              />
            );
          })
        )}
      </section>

      <button
        onClick={abrirEntrega}
        className="mt-4 w-full rounded-xl bg-[var(--mango)] py-3 text-sm font-semibold text-[var(--mango-ink)] active:scale-[0.98]"
      >
        Registar Entrega do Xitique
      </button>

      <section className="mt-4">
        <button onClick={() => setHistoryOpen((v) => !v)} className="text-xs font-semibold text-[var(--mango)]">
          {historyOpen ? 'Esconder entregas anteriores ▴' : 'Ver entregas anteriores ▾'}
        </button>
        {historyOpen && (
          <div className="mt-2 rounded-2xl bg-[var(--paper)] p-3">
            {entregas.length === 0 ? (
              <p className="px-1 py-2 text-sm text-[var(--ink-soft)]">Ainda não há entregas registadas.</p>
            ) : (
              [...entregas].sort((a, b) => b.timestamp - a.timestamp).map((e) => (
                <div key={e.id} className="flex items-center justify-between border-b border-dashed border-[var(--ink)]/10 py-2 text-sm last:border-none">
                  <span className="text-[var(--ink)]">{formatDataExtenso(new Date(e.timestamp))}{e.nota ? ' · ' + e.nota : ''}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono-ref font-semibold text-[var(--ink)]">{formatMoney(e.valor)} MT</span>
                    <button onClick={() => { if (confirm('Apagar esta entrega do Xitique? O valor volta a contar como guardado.')) deleteEntrega(e.id); }} className="text-[var(--ink-soft)] opacity-50 hover:opacity-100">✕</button>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Modal Participante */}
      <Modal titulo={editandoId ? 'Editar Participante' : 'Novo Participante'} aberto={modalParticipante} aoFechar={() => setModalParticipante(false)}>
        <div className="space-y-4">
          <Campo label="Nome">
            <input className="campo" maxLength={30} placeholder="Ex: Dona Amélia" value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo label="Valor Combinado (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorCombinado} onChange={(e) => setValorCombinado(e.target.value)} />
          </Campo>
          <div className="flex gap-2 pt-1">
            {editandoId && <Botao variante="perigo" onClick={apagarAtual}>Apagar</Botao>}
            <Botao variante="secundario" onClick={() => setModalParticipante(false)}>Cancelar</Botao>
            <Botao onClick={guardarParticipante}>Guardar</Botao>
          </div>
        </div>
      </Modal>

      {/* Modal Pagamento */}
      <Modal titulo={modalPagamento ? `Pagamento de ${modalPagamento.nome}` : ''} aberto={!!modalPagamento} aoFechar={() => setModalPagamento(null)}>
        <div className="space-y-4">
          <Campo label="Valor Recebido (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorPagamento} onChange={(e) => setValorPagamento(e.target.value)} />
          </Campo>
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setModalPagamento(null)}>Cancelar</Botao>
            <Botao onClick={confirmarPagamento}>Guardar</Botao>
          </div>
        </div>
      </Modal>

      {/* Modal Entrega */}
      <Modal titulo="Registar Entrega do Xitique" aberto={modalEntrega} aoFechar={() => setModalEntrega(false)}>
        <div className="space-y-4">
          <Campo label="Valor Entregue (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorEntrega} onChange={(e) => setValorEntrega(e.target.value)} />
          </Campo>
          <Campo label="Quem recebeu?">
            <select className="campo" value={quemRecebeu} onChange={(e) => setQuemRecebeu(e.target.value)}>
              {participantes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Campo>
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setModalEntrega(false)}>Cancelar</Botao>
            <Botao onClick={confirmarEntregaFn}>Confirmar</Botao>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
