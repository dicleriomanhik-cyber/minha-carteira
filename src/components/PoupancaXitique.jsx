import { useState } from 'react';
import Botao from './Botao';
import Campo from './Campo';
import Modal from './Modal';
import SeletorDia from './SeletorDia';
import EmptyState from './EmptyState';
import XitiqueParticipoCard from './XitiqueParticipoCard';
import XitiqueFormModal from './XitiqueFormModal';
import { useData } from '../context/DataContext';
import { useDialog } from './DialogProvider';
import { formatMoney, formatDataExtenso, formatHora, HOJE_KEY } from '../utils/format';

function Seta({ positivo }) {
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${positivo ? 'bg-[var(--teal-soft)] text-[var(--teal)]' : 'bg-[var(--brick-soft)] text-[var(--brick)]'}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {positivo ? <path d="M12 5v14M6 13l6 6 6-6" /> : <path d="M12 19V5M6 11l6-6 6 6" />}
      </svg>
    </span>
  );
}

const soma = (arr) => Math.round(arr.reduce((s, m) => s + m.valor, 0) * 100) / 100;

// Parte "Xitique" da Poupança: o dinheiro de xitique que é teu (a tua vez recebida, menos o que retiraste) e os
// xitiques em que só participas (pagas a tua parte, que sai do Caixa, e recebes a tua vez).
export default function PoupancaXitique() {
  const {
    xitiques, xitiquePessoal, saldoXitiquePessoal, salvarXitique, retirarDoXitique, deleteMovimentoXitique,
  } = useData();
  const { confirmar, avisar } = useDialog();

  const participa = xitiques.filter((x) => x.papel === 'participa');
  const gere = xitiques.filter((x) => x.papel === 'gere');
  const recebidoTotal = soma(xitiquePessoal.filter((m) => m.tipo === 'recebido'));
  const retiradoTotal = soma(xitiquePessoal.filter((m) => m.tipo === 'retirado'));

  const [form, setForm] = useState(false); // novo xitique em que só participas
  const [modalRetirar, setModalRetirar] = useState(false);
  const [valorRetirar, setValorRetirar] = useState('');
  const [notaRetirar, setNotaRetirar] = useState('');
  const [diaRetirar, setDiaRetirar] = useState(HOJE_KEY);
  const [verTodos, setVerTodos] = useState(false);

  const recebidoEm = (id) => soma(xitiquePessoal.filter((m) => m.tipo === 'recebido' && m.xitiqueId === id));

  async function abrirRetirar() {
    if (saldoXitiquePessoal <= 0) { await avisar('Ainda não há dinheiro no Xitique da tua Poupança.'); return; }
    setValorRetirar('');
    setNotaRetirar('');
    setDiaRetirar(HOJE_KEY);
    setModalRetirar(true);
  }

  async function confirmarRetirar() {
    const v = parseFloat(valorRetirar);
    if (!v || v <= 0) { await avisar('Introduz um valor válido.'); return; }
    if (v > saldoXitiquePessoal + 0.01) { await avisar('Esse valor é maior que o teu Xitique (' + formatMoney(saldoXitiquePessoal) + ' MT).'); return; }
    if (!notaRetirar.trim()) { await avisar('Escreve o motivo da retirada.'); return; }
    retirarDoXitique(v, notaRetirar.trim(), diaRetirar);
    setModalRetirar(false);
  }

  function guardarForm({ nome, valor }) {
    salvarXitique({ nome, papel: 'participa', valor });
    setForm(false);
  }

  const ordenados = [...xitiquePessoal].sort((a, b) => b.timestamp - a.timestamp);
  const visiveis = verTodos ? ordenados : ordenados.slice(0, 8);

  return (
    <>
      <section className="mt-4 rounded-2xl bg-[var(--paper)] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Xitique da tua Poupança</p>
        <p className="font-display mt-1 text-2xl font-bold text-[var(--ink)]">{formatMoney(saldoXitiquePessoal)} <span className="text-sm font-semibold text-[var(--ink-soft)]">MT</span></p>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">Recebido {formatMoney(recebidoTotal)} MT · Retirado {formatMoney(retiradoTotal)} MT</p>
        <button onClick={abrirRetirar} className="mt-3 w-full rounded-xl border-2 border-[var(--mango)] py-3 text-sm font-semibold text-[var(--mango)] active:scale-[0.98]">Retirar</button>
        <p className="mt-3 text-xs leading-relaxed text-[var(--ink-soft)]">
          É o dinheiro que recebeste quando chegou a tua vez, em qualquer xitique. Não entra no Caixa nem nas vendas. Ao retirar, o dinheiro não volta ao Caixa: fica só o registo.
        </p>
      </section>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Xitiques em que participas</p>
        <button onClick={() => setForm(true)} className="text-sm font-semibold text-[var(--mango)]">+ Xitique</button>
      </div>
      <div className="mt-2 space-y-2.5">
        {participa.length === 0 ? (
          <section className="rounded-2xl bg-[var(--paper)] p-4">
            <EmptyState>Ainda não tens xitiques aqui.<br />Toca em "+ Xitique" para os xitiques em que só pagas a tua parte e recebes a tua vez.</EmptyState>
          </section>
        ) : (
          participa.map((x) => <XitiqueParticipoCard key={x.id} x={x} />)
        )}
      </div>

      {gere.length > 0 && (
        <>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Xitiques que giras</p>
          <section className="mt-2 rounded-2xl bg-[var(--paper)] p-4">
            {gere.map((x) => (
              <div key={x.id} className="flex items-center justify-between border-b border-dashed border-[var(--ink)]/10 py-2 text-sm last:border-none">
                <span className="text-[var(--ink)]">{x.nome}</span>
                <span className="font-mono-ref text-[var(--ink-soft)]">Recebeste {formatMoney(recebidoEm(x.id))} MT</span>
              </div>
            ))}
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink-soft)]">Estes xitiques giram-se na aba Xitique. Quando entregas a tua vez a ti próprio, o valor vem para aqui.</p>
          </section>
        </>
      )}

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Movimentos do Xitique</p>
      <section className="mt-2 rounded-2xl bg-[var(--paper)] p-4">
        {ordenados.length === 0 ? (
          <EmptyState>Ainda não há movimentos.<br />Aparecem aqui as partes que pagas e as vezes que recebes.</EmptyState>
        ) : (
          visiveis.map((m) => {
            const positivo = m.tipo === 'recebido';
            const titulo = m.tipo === 'pago' ? 'Pagaste' : m.tipo === 'recebido' ? 'Recebeste' : 'Retirado';
            return (
              <div key={m.id} className="flex items-center gap-3 border-b border-dashed border-[var(--ink)]/10 py-3 last:border-none">
                <Seta positivo={positivo} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-[var(--ink)]">{titulo}{m.nota ? ' · ' + m.nota : ''}</div>
                  <div className="text-[11px] text-[var(--ink-soft)]">
                    {formatDataExtenso(new Date(m.timestamp))} · {formatHora(m.timestamp)}
                    {m.tipo === 'pago' ? ' · saiu do Caixa' : ''}
                    {m.entregaId ? ' · da aba Xitique' : ''}
                  </div>
                </div>
                <div className={`font-mono-ref shrink-0 text-sm font-semibold ${positivo ? 'text-[var(--teal)]' : 'text-[var(--brick)]'}`}>
                  {positivo ? '+' : '−'} {formatMoney(m.valor)}
                </div>
                {m.entregaId ? (
                  <span className="w-6 shrink-0" />
                ) : (
                  <button
                    onClick={async () => {
                      const ok = await confirmar(m.tipo === 'pago' ? 'Apagar este pagamento? O dinheiro volta ao saldo do Caixa.' : 'Apagar este movimento?', { perigo: true, textoOk: 'Apagar' });
                      if (ok) deleteMovimentoXitique(m.id);
                    }}
                    className="shrink-0 p-1 text-[var(--ink-soft)] opacity-50 hover:opacity-100"
                  >✕</button>
                )}
              </div>
            );
          })
        )}
      </section>
      {ordenados.length > 8 && (
        <button onClick={() => setVerTodos((v) => !v)} className="mt-3 text-xs font-semibold text-[var(--mango)]">
          {verTodos ? 'Mostrar menos ▴' : `Ver todos os ${ordenados.length} movimentos ▾`}
        </button>
      )}

      <XitiqueFormModal
        aberto={form}
        aoFechar={() => setForm(false)}
        titulo="Novo xitique"
        ajuda="Para um xitique em que não giras o dinheiro: só registas o que tu pagas e o que tu recebes."
        aoGuardar={guardarForm}
      />

      <Modal titulo="Retirar do Xitique" aberto={modalRetirar} aoFechar={() => setModalRetirar(false)}>
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-[var(--ink-soft)]">Este dinheiro sai do Xitique da tua Poupança e não volta ao Caixa. Fica registado no histórico.</p>
          <Campo label="Dia">
            <SeletorDia value={diaRetirar} onChange={setDiaRetirar} />
          </Campo>
          <Campo label="Valor a retirar (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorRetirar} onChange={(e) => setValorRetirar(e.target.value)} />
          </Campo>
          <Campo label="Motivo">
            <input className="campo" maxLength={40} placeholder="" value={notaRetirar} onChange={(e) => setNotaRetirar(e.target.value)} />
          </Campo>
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setModalRetirar(false)}>Cancelar</Botao>
            <Botao onClick={confirmarRetirar}>Confirmar</Botao>
          </div>
        </div>
      </Modal>
    </>
  );
}
