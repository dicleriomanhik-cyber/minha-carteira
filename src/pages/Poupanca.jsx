import { useState } from 'react';
import Layout from '../components/Layout';
import HeroCard from '../components/HeroCard';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import Modal from '../components/Modal';
import SeletorDia from '../components/SeletorDia';
import EmptyState from '../components/EmptyState';
import { useData } from '../context/DataContext';
import { useDialog } from '../components/DialogProvider';
import { formatMoney, formatDataExtenso, formatHora, HOJE_KEY } from '../utils/format';

export default function Poupanca() {
  const {
    totalPoupancaCalc, guardadoMesAtual, movimentosPoupanca,
    guardarPoupanca, retirarPoupanca, deleteMovimentoPoupanca, saldoFechamentoDia,
    metas, addMeta, deleteMeta,
  } = useData();
  const { confirmar, avisar } = useDialog();

  const [modalGuardar, setModalGuardar] = useState(false);
  const [valorGuardar, setValorGuardar] = useState('');
  const [notaGuardar, setNotaGuardar] = useState('');
  const [diaGuardar, setDiaGuardar] = useState(HOJE_KEY);

  const [modalRetirar, setModalRetirar] = useState(false);
  const [valorRetirar, setValorRetirar] = useState('');
  const [notaRetirar, setNotaRetirar] = useState('');
  const [diaRetirar, setDiaRetirar] = useState(HOJE_KEY);

  const [metaGuardar, setMetaGuardar] = useState('');
  const [metaRetirar, setMetaRetirar] = useState('');
  const [modalMeta, setModalMeta] = useState(false);
  const [nomeMeta, setNomeMeta] = useState('');
  const [valorMeta, setValorMeta] = useState('');

  function poupadoNaMeta(id) {
    return movimentosPoupanca.filter((m) => m.metaId === id).reduce((s, m) => (m.tipo === 'deposito' ? s + m.valor : s - m.valor), 0);
  }

  async function confirmarMetaFn() {
    const v = parseFloat(valorMeta);
    if (!nomeMeta.trim()) { await avisar('Escreve para que é a meta.'); return; }
    if (!v || v <= 0) { await avisar('Escreve quanto precisas (MT).'); return; }
    addMeta(nomeMeta.trim(), v);
    setModalMeta(false);
  }

  function abrirGuardar() {
    setValorGuardar('');
    setNotaGuardar('');
    setDiaGuardar(HOJE_KEY);
    setMetaGuardar('');
    setModalGuardar(true);
  }

  async function confirmarGuardarFn() {
    const v = parseFloat(valorGuardar);
    if (!v || v <= 0) { await avisar('Introduz um valor válido.'); return; }
    const saldoDoDia = saldoFechamentoDia(diaGuardar);
    if (v > saldoDoDia + 0.01) {
      await avisar('Esse valor é maior que o Saldo na Mão desse dia (' + formatMoney(saldoDoDia) + ' MT). Confirma o valor no Caixa do Dia primeiro.');
      return;
    }
    guardarPoupanca(v, notaGuardar.trim(), diaGuardar, metaGuardar || undefined);
    setModalGuardar(false);
  }

  async function abrirRetirar() {
    if (totalPoupancaCalc <= 0) { await avisar('Ainda não há dinheiro guardado na Poupança.'); return; }
    setValorRetirar('');
    setNotaRetirar('');
    setDiaRetirar(HOJE_KEY);
    setMetaRetirar('');
    setModalRetirar(true);
  }

  async function confirmarRetirarFn() {
    const v = parseFloat(valorRetirar);
    if (!v || v <= 0) { await avisar('Introduz um valor válido.'); return; }
    if (v > totalPoupancaCalc + 0.01) { await avisar('Esse valor é maior que a tua Poupança total (' + formatMoney(totalPoupancaCalc) + ' MT).'); return; }
    if (!notaRetirar.trim()) { await avisar('Escreve o motivo da retirada.'); return; }
    if (metaRetirar && v > poupadoNaMeta(metaRetirar) + 0.01) { await avisar('Só tens ' + formatMoney(poupadoNaMeta(metaRetirar)) + ' MT nessa meta.'); return; }
    retirarPoupanca(v, notaRetirar.trim(), diaRetirar, metaRetirar || undefined);
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

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Metas</p>
        <button onClick={() => { setNomeMeta(''); setValorMeta(''); setModalMeta(true); }} className="text-sm font-semibold text-[var(--mango)]">+ Meta</button>
      </div>
      <div className="mt-2 space-y-2.5">
        {metas.length === 0 ? (
          <section className="rounded-2xl bg-[var(--paper)] p-4">
            <EmptyState>Ainda não tens metas.<br />Toca em "+ Meta" e diz para que estás a poupar.</EmptyState>
          </section>
        ) : (
          metas.map((meta) => {
            const guardado = poupadoNaMeta(meta.id);
            const pc = Math.max(0, Math.min(100, (guardado / meta.valor) * 100));
            const atingida = guardado >= meta.valor;
            return (
              <section key={meta.id} className="rounded-2xl bg-[var(--paper)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">🎯 {meta.nome}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">
                      Meta {formatMoney(meta.valor)} MT · {Math.round(pc)}% · {atingida ? 'atingida!' : 'faltam ' + formatMoney(meta.valor - guardado) + ' MT'}
                    </p>
                  </div>
                  <p className="font-mono-ref shrink-0 text-base font-bold text-[var(--ink)]">{formatMoney(guardado)}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-soft)]">
                  <div className="h-full rounded-full" style={{ width: pc + '%', background: atingida ? 'var(--teal)' : 'var(--mango)' }} />
                </div>
                <button onClick={async () => { const ok = await confirmar('Apagar a meta "' + meta.nome + '"? O dinheiro continua na tua Poupança.', { perigo: true, textoOk: 'Apagar' }); if (ok) deleteMeta(meta.id); }} className="mt-2 text-[11px] font-semibold text-[var(--brick)]">Apagar meta</button>
              </section>
            );
          })
        )}
      </div>

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
                <div className="text-[11px] text-[var(--ink-soft)]">{formatDataExtenso(new Date(m.timestamp))} · {formatHora(m.timestamp)}{metas.find((x) => x.id === m.metaId) ? ' · ' + metas.find((x) => x.id === m.metaId).nome : ''}</div>
              </div>
              <div className={`font-mono-ref shrink-0 text-sm font-semibold ${m.tipo === 'deposito' ? 'text-[var(--teal)]' : 'text-[var(--brick)]'}`}>
                {m.tipo === 'deposito' ? '+' : '−'} {formatMoney(m.valor)}
              </div>
              <button onClick={async () => { const ok = await confirmar('Apagar este movimento da Poupança?', { perigo: true, textoOk: 'Apagar' }); if (ok) deleteMovimentoPoupanca(m.id); }} className="shrink-0 p-1 text-[var(--ink-soft)] opacity-50 hover:opacity-100">✕</button>
            </div>
          ))
        )}
      </section>

      {/* Modal Guardar */}
      <Modal titulo="Guardar da Caixa do Dia" aberto={modalGuardar} aoFechar={() => setModalGuardar(false)}>
        <div className="space-y-4">
          <Campo label="Dia">
            <SeletorDia value={diaGuardar} onChange={setDiaGuardar} />
          </Campo>
          <Campo label="Valor a Guardar (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorGuardar} onChange={(e) => setValorGuardar(e.target.value)} />
          </Campo>
          <Campo label="Meta (opcional)">
            <select className="campo" value={metaGuardar} onChange={(e) => setMetaGuardar(e.target.value)}>
              <option value="">Sem meta</option>
              {metas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Nota (opcional)">
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
          <Campo label="Dia">
            <SeletorDia value={diaRetirar} onChange={setDiaRetirar} />
          </Campo>
          <Campo label="Valor a Retirar (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorRetirar} onChange={(e) => setValorRetirar(e.target.value)} />
          </Campo>
          <Campo label="Meta (opcional)">
            <select className="campo" value={metaRetirar} onChange={(e) => setMetaRetirar(e.target.value)}>
              <option value="">Sem meta</option>
              {metas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Motivo">
            <input className="campo" maxLength={40} placeholder="Ex: Comprei sapatos" value={notaRetirar} onChange={(e) => setNotaRetirar(e.target.value)} />
          </Campo>
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setModalRetirar(false)}>Cancelar</Botao>
            <Botao onClick={confirmarRetirarFn}>Confirmar</Botao>
          </div>
        </div>
      </Modal>

      {/* Modal Nova Meta */}
      <Modal titulo="Nova meta" aberto={modalMeta} aoFechar={() => setModalMeta(false)}>
        <div className="space-y-4">
          <Campo label="Para quê?">
            <input className="campo" maxLength={40} placeholder="Ex: Comprar uma arca congeladora" value={nomeMeta} onChange={(e) => setNomeMeta(e.target.value)} />
          </Campo>
          <Campo label="Quanto precisas (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorMeta} onChange={(e) => setValorMeta(e.target.value)} />
          </Campo>
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setModalMeta(false)}>Cancelar</Botao>
            <Botao onClick={confirmarMetaFn}>Guardar meta</Botao>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
