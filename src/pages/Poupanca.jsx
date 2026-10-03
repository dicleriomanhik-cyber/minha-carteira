import { useState } from 'react';
import Layout from '../components/Layout';
import HeroCard from '../components/HeroCard';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import SeletorMetodo from '../components/SeletorMetodo';
import Modal from '../components/Modal';
import SeletorDia from '../components/SeletorDia';
import EmptyState from '../components/EmptyState';
import { useData, METODOS } from '../context/DataContext';
import { useDialog } from '../components/DialogProvider';
import { formatMoney, formatDataExtenso, formatHora, HOJE_KEY } from '../utils/format';

const SETORES = [
  { id: 'produtos', label: 'Produtos' },
  { id: 'maquina', label: 'Serviços' },
];

function Seta({ tipo }) {
  const guardar = tipo === 'deposito';
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${guardar ? 'bg-[var(--teal-soft)] text-[var(--teal)]' : 'bg-[var(--brick-soft)] text-[var(--brick)]'}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {guardar ? <path d="M12 5v14M6 13l6 6 6-6" /> : <path d="M12 19V5M6 11l6-6 6 6" />}
      </svg>
    </span>
  );
}

function Anel({ pc, atingida }) {
  const r = 22; const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0 -rotate-90">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--bg-soft)" strokeWidth="6" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={atingida ? 'var(--teal)' : 'var(--mango)'} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pc) / 100} style={{ transition: 'stroke-dashoffset .4s' }} />
    </svg>
  );
}

export default function Poupanca() {
  const {
    totalPoupancaCalc, guardadoMesAtual, movimentosPoupanca,
    guardarPoupanca, retirarPoupanca, deleteMovimentoPoupanca,
    saldoFechamentoDiaSetor, saldoPorMetodo,
    depositosSemSaida, descontarDepositosAntigos,
    metas, addMeta, deleteMeta,
  } = useData();
  const { confirmar, avisar } = useDialog();

  const [modalGuardar, setModalGuardar] = useState(false);
  const [valorGuardar, setValorGuardar] = useState('');
  const [notaGuardar, setNotaGuardar] = useState('');
  const [diaGuardar, setDiaGuardar] = useState(HOJE_KEY);
  const [setorGuardar, setSetorGuardar] = useState('produtos');
  const [metodoGuardar, setMetodoGuardar] = useState('dinheiro');
  const [metaGuardar, setMetaGuardar] = useState('');

  const [modalRetirar, setModalRetirar] = useState(false);
  const [valorRetirar, setValorRetirar] = useState('');
  const [notaRetirar, setNotaRetirar] = useState('');
  const [diaRetirar, setDiaRetirar] = useState(HOJE_KEY);
  const [metaRetirar, setMetaRetirar] = useState('');

  const [modalMeta, setModalMeta] = useState(false);
  const [nomeMeta, setNomeMeta] = useState('');
  const [valorMeta, setValorMeta] = useState('');

  const [verTodos, setVerTodos] = useState(false);

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

  function abrirGuardar(metaId = '') {
    setValorGuardar('');
    setNotaGuardar('');
    setDiaGuardar(HOJE_KEY);
    setSetorGuardar('produtos');
    setMetodoGuardar('dinheiro');
    setMetaGuardar(metaId);
    setModalGuardar(true);
  }

  async function confirmarGuardarFn() {
    const v = parseFloat(valorGuardar);
    if (!v || v <= 0) { await avisar('Introduz um valor válido.'); return; }
    const saldoSetor = saldoFechamentoDiaSetor(diaGuardar, setorGuardar);
    const nomeSetor = SETORES.find((x) => x.id === setorGuardar).label;
    if (v > saldoSetor + 0.01) {
      await avisar('Esse valor é maior que o saldo de ' + nomeSetor + ' nesse dia (' + formatMoney(saldoSetor) + ' MT).');
      return;
    }
    const saldoMetodo = saldoPorMetodo[metodoGuardar] || 0;
    if (v > saldoMetodo + 0.01) {
      await avisar('Só tens ' + formatMoney(saldoMetodo) + ' MT em ' + METODOS.find((m) => m.id === metodoGuardar).label + '.');
      return;
    }
    guardarPoupanca(v, notaGuardar.trim(), diaGuardar, metaGuardar || undefined, { setor: setorGuardar, metodo: metodoGuardar });
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

  async function descontarAntigos() {
    const total = depositosSemSaida.reduce((s, m) => s + m.valor, 0);
    const ok = await confirmar(
      `Vão ser criadas ${depositosSemSaida.length} saída(s) no Caixa, nas datas em que guardaste, num total de ${formatMoney(total)} MT, tiradas de Produtos e de Dinheiro. Se já tinhas registado estas saídas à mão no Caixa, apaga-as primeiro para não descontar duas vezes. Continuar?`,
      { textoOk: 'Descontar' },
    );
    if (ok) descontarDepositosAntigos();
  }

  const ordenados = [...movimentosPoupanca].sort((a, b) => b.timestamp - a.timestamp);
  const visiveis = verTodos ? ordenados : ordenados.slice(0, 8);
  const totalSemSaida = depositosSemSaida.reduce((s, m) => s + m.valor, 0);

  const saldoSetorDia = (id) => saldoFechamentoDiaSetor(diaGuardar, id);

  return (
    <Layout>
      <HeroCard
        label="Poupança"
        valor={totalPoupancaCalc}
        sub={
          <>
            <span>Guardado este mês <b className="font-mono-ref text-[var(--paper)]">{formatMoney(guardadoMesAtual)}</b></span>
            <span>Metas <b className="font-mono-ref text-[var(--paper)]">{metas.length}</b></span>
          </>
        }
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={() => abrirGuardar()} className="flex items-center justify-center gap-2 rounded-xl bg-[var(--mango)] py-3.5 text-sm font-semibold text-[var(--mango-ink)] shadow-sm active:scale-[0.98]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
          Guardar
        </button>
        <button onClick={abrirRetirar} className="flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--mango)] py-3.5 text-sm font-semibold text-[var(--mango)] active:scale-[0.98]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
          Retirar
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">
        O que guardas sai do saldo total do Caixa e fica aqui. Ao retirar, o dinheiro não volta ao Caixa: fica só o registo no histórico e no relatório.
      </p>

      {depositosSemSaida.length > 0 && (
        <section className="mt-4 rounded-2xl bg-[var(--amber-soft)] p-4">
          <p className="text-sm font-semibold text-[var(--amber)]">Poupança que ainda não saiu do saldo total</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--amber)]">
            {depositosSemSaida.length} movimento(s) antigo(s), no total de {formatMoney(totalSemSaida)} MT, foram guardados sem descontar do Caixa.
          </p>
          <button onClick={descontarAntigos} className="mt-3 rounded-full bg-[var(--amber)] px-4 py-2 text-xs font-semibold text-white">Descontar do saldo</button>
        </section>
      )}

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
              <section key={meta.id} className="rounded-2xl bg-[var(--paper)] p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Anel pc={pc} atingida={atingida} />
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[var(--ink)]">{Math.round(pc)}%</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-[var(--ink)]">{meta.nome}</p>
                    <p className="font-display mt-0.5 text-xl font-bold leading-tight text-[var(--ink)]">
                      {formatMoney(guardado)}
                      <span className="ml-1 text-xs font-semibold text-[var(--ink-soft)]">de {formatMoney(meta.valor)} MT</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{atingida ? 'Meta cumprida' : 'Faltam ' + formatMoney(meta.valor - guardado) + ' MT'}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-[var(--ink)]/10 pt-3">
                  <button onClick={() => abrirGuardar(meta.id)} className="rounded-full bg-[var(--mango-soft)] px-3.5 py-1.5 text-xs font-semibold text-[var(--mango)]">Guardar nesta meta</button>
                  <button onClick={async () => { const ok = await confirmar('Apagar a meta "' + meta.nome + '"? O dinheiro continua na tua Poupança.', { perigo: true, textoOk: 'Apagar' }); if (ok) deleteMeta(meta.id); }} className="text-[11px] font-semibold text-[var(--brick)]">Apagar</button>
                </div>
              </section>
            );
          })
        )}
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Movimentos</p>
      <section className="mt-2 rounded-2xl bg-[var(--paper)] p-4">
        {ordenados.length === 0 ? (
          <EmptyState>Ainda não guardaste nada.<br />Toca em "Guardar" para começar a tua poupança.</EmptyState>
        ) : (
          visiveis.map((m) => (
            <div key={m.id} className="flex items-center gap-3 border-b border-dashed border-[var(--ink)]/10 py-3 last:border-none">
              <Seta tipo={m.tipo} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-[var(--ink)]">
                  {m.tipo === 'deposito' ? 'Guardado' : 'Retirado'}{m.nota ? ' · ' + m.nota : ''}
                </div>
                <div className="text-[11px] text-[var(--ink-soft)]">{formatDataExtenso(new Date(m.timestamp))} · {formatHora(m.timestamp)}{metas.find((x) => x.id === m.metaId) ? ' · ' + metas.find((x) => x.id === m.metaId).nome : ''}</div>
              </div>
              <div className={`font-mono-ref shrink-0 text-sm font-semibold ${m.tipo === 'deposito' ? 'text-[var(--teal)]' : 'text-[var(--brick)]'}`}>
                {m.tipo === 'deposito' ? '+' : '−'} {formatMoney(m.valor)}
              </div>
              <button onClick={async () => { const ok = await confirmar(m.tipo === 'deposito' ? 'Apagar este movimento da Poupança? O dinheiro volta ao saldo do Caixa.' : 'Apagar este movimento da Poupança?', { perigo: true, textoOk: 'Apagar' }); if (ok) deleteMovimentoPoupanca(m.id); }} className="shrink-0 p-1 text-[var(--ink-soft)] opacity-50 hover:opacity-100">✕</button>
            </div>
          ))
        )}
      </section>
      {ordenados.length > 8 && (
        <button onClick={() => setVerTodos((v) => !v)} className="mt-3 text-xs font-semibold text-[var(--mango)]">
          {verTodos ? 'Mostrar menos ▴' : `Ver todos os ${ordenados.length} movimentos ▾`}
        </button>
      )}

      {/* Modal Guardar */}
      <Modal titulo="Guardar da Caixa" aberto={modalGuardar} aoFechar={() => setModalGuardar(false)}>
        <div className="space-y-4">
          <Campo label="Dia">
            <SeletorDia value={diaGuardar} onChange={setDiaGuardar} />
          </Campo>
          <Campo label="Valor a Guardar (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorGuardar} onChange={(e) => setValorGuardar(e.target.value)} />
          </Campo>
          <Campo label="Sai do saldo de">
            <select className="campo" value={setorGuardar} onChange={(e) => setSetorGuardar(e.target.value)}>
              {SETORES.map((x) => <option key={x.id} value={x.id}>{x.label} ({formatMoney(saldoSetorDia(x.id))} MT)</option>)}
            </select>
          </Campo>
          <Campo label="Sai de">
            <SeletorMetodo value={metodoGuardar} onChange={setMetodoGuardar} saldo />
          </Campo>
          <Campo label="Meta (opcional)">
            <select className="campo" value={metaGuardar} onChange={(e) => setMetaGuardar(e.target.value)}>
              <option value="">Sem meta</option>
              {metas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Nota (opcional)">
            <input className="campo" maxLength={40} placeholder="" value={notaGuardar} onChange={(e) => setNotaGuardar(e.target.value)} />
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
          <p className="text-xs leading-relaxed text-[var(--ink-soft)]">Este dinheiro sai da Poupança e não volta ao Caixa. Fica registado no histórico e no relatório.</p>
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
            <input className="campo" maxLength={40} placeholder="" value={notaRetirar} onChange={(e) => setNotaRetirar(e.target.value)} />
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
            <input className="campo" maxLength={40} placeholder="Comprar um Terreno" value={nomeMeta} onChange={(e) => setNomeMeta(e.target.value)} />
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
