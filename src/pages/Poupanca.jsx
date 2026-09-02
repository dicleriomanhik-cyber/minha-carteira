import { useState } from 'react';
import Layout from '../components/Layout';
import HeroCard from '../components/HeroCard';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { useData } from '../context/DataContext';
import { formatMoney, formatDataExtenso, formatHora } from '../utils/format';

export default function Poupanca() {
  const {
    totalPoupancaCalc, guardadoMesAtual, movimentosPoupanca,
    guardarPoupanca, retirarPoupanca, deleteMovimentoPoupanca, saldoHoje,
  } = useData();

  const [modalGuardar, setModalGuardar] = useState(false);
  const [valorGuardar, setValorGuardar] = useState('');
  const [notaGuardar, setNotaGuardar] = useState('');

  const [modalRetirar, setModalRetirar] = useState(false);
  const [valorRetirar, setValorRetirar] = useState('');
  const [notaRetirar, setNotaRetirar] = useState('');

  function abrirGuardar() {
    setValorGuardar('');
    setNotaGuardar('');
    setModalGuardar(true);
  }

  function confirmarGuardarFn() {
    const v = parseFloat(valorGuardar);
    if (!v || v <= 0) { alert('Introduz um valor válido.'); return; }
    if (v > saldoHoje + 0.01) {
      alert('Esse valor é maior que o Saldo na Mão de hoje (' + formatMoney(saldoHoje) + ' MT). Confirma o valor no Caixa do Dia primeiro.');
      return;
    }
    guardarPoupanca(v, notaGuardar.trim());
    setModalGuardar(false);
  }

  function abrirRetirar() {
    if (totalPoupancaCalc <= 0) { alert('Ainda não há dinheiro guardado na Poupança.'); return; }
    setValorRetirar('');
    setNotaRetirar('');
    setModalRetirar(true);
  }

  function confirmarRetirarFn() {
    const v = parseFloat(valorRetirar);
    if (!v || v <= 0) { alert('Introduz um valor válido.'); return; }
    if (v > totalPoupancaCalc + 0.01) { alert('Esse valor é maior que a tua Poupança total (' + formatMoney(totalPoupancaCalc) + ' MT).'); return; }
    retirarPoupanca(v, notaRetirar.trim());
    setModalRetirar(false);
  }

  const ordenados = [...movimentosPoupanca].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Layout>
      <HeroCard
        label="Poupança Pessoal"
        valor={totalPoupancaCalc}
        sub={<span>Guardado este mês <b className="font-mono-ref text-[var(--paper)]">{formatMoney(guardadoMesAtual)}</b></span>}
      />

      <div className="mt-4 flex gap-3">
        <button onClick={abrirGuardar} className="flex-1 rounded-xl bg-[var(--mango)] py-3 text-sm font-semibold text-[var(--mango-ink)] active:scale-[0.98]">+ Guardar da Caixa</button>
        <button onClick={abrirRetirar} className="flex-1 rounded-xl border border-[var(--mango)] py-3 text-sm font-semibold text-[var(--mango)] active:scale-[0.98]">− Retirar</button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">
        O que guardares aqui sai do "Saldo na Mão" — já não é dinheiro do negócio, é teu.
      </p>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Movimentos</p>
      <section className="mt-2 rounded-2xl bg-[var(--paper)] p-4">
        {ordenados.length === 0 ? (
          <EmptyState>Ainda não guardaste nada.<br />Toca em "+ Guardar da Caixa" para começar a tua poupança.</EmptyState>
        ) : (
          ordenados.map((m) => (
            <div key={m.id} className="flex items-center gap-3 border-b border-dashed border-[var(--ink)]/10 py-3 last:border-none">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-base">
                {m.tipo === 'deposito' ? '🐷' : '🎯'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-[var(--ink)]">
                  {m.tipo === 'deposito' ? 'Guardado' : 'Retirado'}{m.nota ? ' · ' + m.nota : ''}
                </div>
                <div className="text-[11px] text-[var(--ink-soft)]">{formatDataExtenso(new Date(m.timestamp))} · {formatHora(m.timestamp)}</div>
              </div>
              <div className={`font-mono-ref shrink-0 text-sm font-semibold ${m.tipo === 'deposito' ? 'text-[var(--teal)]' : 'text-[var(--brick)]'}`}>
                {m.tipo === 'deposito' ? '+' : '−'} {formatMoney(m.valor)}
              </div>
              <button onClick={() => { if (confirm('Apagar este movimento da Poupança?')) deleteMovimentoPoupanca(m.id); }} className="shrink-0 p-1 text-[var(--ink-soft)] opacity-50 hover:opacity-100">✕</button>
            </div>
          ))
        )}
      </section>

      {/* Modal Guardar */}
      <Modal titulo="Guardar da Caixa do Dia" aberto={modalGuardar} aoFechar={() => setModalGuardar(false)}>
        <div className="space-y-4">
          <Campo label="Valor a Guardar (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorGuardar} onChange={(e) => setValorGuardar(e.target.value)} />
          </Campo>
          <Campo label="Objetivo (opcional)">
            <input className="campo" maxLength={40} placeholder="Ex: Meta do mês" value={notaGuardar} onChange={(e) => setNotaGuardar(e.target.value)} />
          </Campo>
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setModalGuardar(false)}>Cancelar</Botao>
            <Botao onClick={confirmarGuardarFn}>Guardar</Botao>
          </div>
        </div>
      </Modal>

      {/* Modal Retirar */}
      <Modal titulo="Retirar da Poupança" aberto={modalRetirar} aoFechar={() => setModalRetirar(false)}>
        <div className="space-y-4">
          <Campo label="Valor a Retirar (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorRetirar} onChange={(e) => setValorRetirar(e.target.value)} />
          </Campo>
          <Campo label="Motivo (opcional)">
            <input className="campo" maxLength={40} placeholder="Ex: Comprei sapatos" value={notaRetirar} onChange={(e) => setNotaRetirar(e.target.value)} />
          </Campo>
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setModalRetirar(false)}>Cancelar</Botao>
            <Botao onClick={confirmarRetirarFn}>Confirmar</Botao>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
