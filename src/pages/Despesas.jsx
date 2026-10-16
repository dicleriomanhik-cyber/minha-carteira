import { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import HeroCard from '../components/HeroCard';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import SeletorMetodo from '../components/SeletorMetodo';
import Modal from '../components/Modal';
import SeletorDia from '../components/SeletorDia';
import EmptyState from '../components/EmptyState';
import ReciboModal from '../components/ReciboModal';
import { useData, METODOS, DESPESA_GRUPOS, DESPESA_IDS, CAT_LOOKUP } from '../context/DataContext';
import { useDialog } from '../components/DialogProvider';
import { formatMoney, formatDataExtenso, formatHora, HOJE_KEY } from '../utils/format';

const SETORES = [
  { id: 'produtos', label: 'Produtos' },
  { id: 'maquina', label: 'Serviços' },
];

export default function Despesas() {
  const { transacoes, registarDespesa, deleteTransacao, nomesPagos, saldoFechamentoDiaSetor, saldoPorMetodo } = useData();
  const { confirmar, avisar } = useDialog();

  const [aberto, setAberto] = useState(false);
  const [grupoId, setGrupoId] = useState('salarios');
  const [categoria, setCategoria] = useState('salario_proprio');
  const [valor, setValor] = useState('');
  const [pessoa, setPessoa] = useState('');
  const [nota, setNota] = useState('');
  const [dia, setDia] = useState(HOJE_KEY);
  const [setor, setSetor] = useState('produtos');
  const [metodo, setMetodo] = useState('dinheiro');
  const [verTodos, setVerTodos] = useState(false);
  const [reciboTxId, setReciboTxId] = useState(null);

  const grupo = DESPESA_GRUPOS.find((g) => g.id === grupoId);
  const precisaNome = categoria === 'salario_func';

  const lista = useMemo(
    () => transacoes.filter((t) => t.tipo === 'saida' && DESPESA_IDS.has(t.categoria)).sort((a, b) => b.timestamp - a.timestamp),
    [transacoes],
  );
  const mesAtual = HOJE_KEY.slice(0, 7);
  const totalMes = lista.filter((t) => t.dateKey.slice(0, 7) === mesAtual).reduce((s, t) => s + t.valor, 0);
  const salariosMes = lista.filter((t) => t.dateKey.slice(0, 7) === mesAtual && t.categoria.startsWith('salario')).reduce((s, t) => s + t.valor, 0);
  const visiveis = verTodos ? lista : lista.slice(0, 10);

  function abrir() {
    setGrupoId('salarios'); setCategoria('salario_proprio');
    setValor(''); setPessoa(''); setNota(''); setDia(HOJE_KEY); setSetor('produtos'); setMetodo('dinheiro');
    setAberto(true);
  }

  function escolherGrupo(id) {
    const g = DESPESA_GRUPOS.find((x) => x.id === id);
    setGrupoId(id);
    setCategoria(g.itens[0].id);
  }

  async function confirmarFn() {
    const v = parseFloat(valor);
    if (!v || v <= 0) { await avisar('Introduz um valor válido.'); return; }
    if (precisaNome && !pessoa.trim()) { await avisar('Escreve o nome do funcionário.'); return; }
    const saldoSetor = saldoFechamentoDiaSetor(dia, setor);
    if (v > saldoSetor + 0.01) {
      await avisar('Esse valor é maior que o saldo de ' + SETORES.find((x) => x.id === setor).label + ' nesse dia (' + formatMoney(saldoSetor) + ' MT).');
      return;
    }
    const saldoMetodo = saldoPorMetodo[metodo] || 0;
    if (v > saldoMetodo + 0.01) {
      await avisar('Só tens ' + formatMoney(saldoMetodo) + ' MT em ' + METODOS.find((m) => m.id === metodo).label + '.');
      return;
    }
    registarDespesa({ categoria, valor: v, nota: nota.trim(), pessoa: precisaNome ? pessoa.trim() : null, setor, metodo, dateKey: dia });
    setAberto(false);
  }

  return (
    <Layout>
      <HeroCard
        label="Salários e Despesas · este mês"
        valor={totalMes}
        sub={
          <>
            <span>Salários <b className="font-mono-ref text-[var(--paper)]">{formatMoney(salariosMes)}</b></span>
            <span>Outras despesas <b className="font-mono-ref text-[var(--paper)]">{formatMoney(totalMes - salariosMes)}</b></span>
          </>
        }
      />

      <button onClick={abrir} className="mt-4 w-full rounded-xl bg-[var(--mango)] py-3 text-sm font-semibold text-[var(--mango-ink)] active:scale-[0.98]">+ Registar pagamento</button>
      <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">
        Tudo o que registares aqui sai do saldo total do Caixa e aparece no Relatório.
      </p>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Pagamentos</p>
      <section className="mt-2 rounded-2xl bg-[var(--paper)] p-4">
        {lista.length === 0 ? (
          <EmptyState>Ainda não registaste salários nem despesas.<br />Toca em "Registar pagamento" para começar.</EmptyState>
        ) : (
          visiveis.map((t) => {
            const cat = CAT_LOOKUP[t.categoria] || { label: t.categoria };
            return (
              <div key={t.id} className="flex items-center gap-3 border-b border-dashed border-[var(--ink)]/10 py-3 last:border-none">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-[var(--ink)]">{cat.label}{t.pessoa ? ' · ' + t.pessoa : ''}</div>
                  <div className="text-[11px] text-[var(--ink-soft)]">
                    {cat.grupo ? cat.grupo + ' · ' : ''}{formatDataExtenso(new Date(t.timestamp))} · {formatHora(t.timestamp)}{t.nota ? ' · ' + t.nota : ''}
                  </div>
                  <button onClick={() => setReciboTxId(t.id)} className="mt-1 text-[11.5px] font-semibold text-[var(--mango)] active:opacity-70">Comprovativo</button>
                </div>
                <div className="font-mono-ref shrink-0 text-sm font-semibold text-[var(--brick)]">− {formatMoney(t.valor)}</div>
                <button
                  onClick={async () => { const ok = await confirmar('Apagar este registo? O dinheiro volta ao saldo do Caixa.', { perigo: true, textoOk: 'Apagar' }); if (ok) deleteTransacao(t.id); }}
                  className="shrink-0 p-1 text-[var(--ink-soft)] opacity-50 hover:opacity-100"
                >✕</button>
              </div>
            );
          })
        )}
      </section>
      {lista.length > 10 && (
        <button onClick={() => setVerTodos((v) => !v)} className="mt-3 text-xs font-semibold text-[var(--mango)]">
          {verTodos ? 'Mostrar menos' : `Ver todos os ${lista.length} pagamentos`}
        </button>
      )}

      <ReciboModal aberto={reciboTxId !== null} aoFechar={() => setReciboTxId(null)} txIdInicial={reciboTxId} />

      <Modal titulo="Registar pagamento" aberto={aberto} aoFechar={() => setAberto(false)}>
        <div className="space-y-4">
          <Campo label="Dia">
            <SeletorDia value={dia} onChange={setDia} />
          </Campo>
          <Campo label="Tipo">
            <select className="campo" value={grupoId} onChange={(e) => escolherGrupo(e.target.value)}>
              {DESPESA_GRUPOS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </Campo>
          <Campo label="Categoria">
            <select className="campo" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {grupo.itens.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
          </Campo>
          {precisaNome && (
            <Campo label="Nome do funcionário">
              <input className="campo" list="nomes-funcionarios" maxLength={40} placeholder="Nome" value={pessoa} onChange={(e) => setPessoa(e.target.value)} />
              <datalist id="nomes-funcionarios">
                {nomesPagos.map((n) => <option key={n} value={n} />)}
              </datalist>
            </Campo>
          )}
          <Campo label="Valor (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
          <Campo label="Sai do saldo de">
            <select className="campo" value={setor} onChange={(e) => setSetor(e.target.value)}>
              {SETORES.map((x) => <option key={x.id} value={x.id}>{x.label} ({formatMoney(saldoFechamentoDiaSetor(dia, x.id))} MT)</option>)}
            </select>
          </Campo>
          <Campo label="Pago por">
            <SeletorMetodo value={metodo} onChange={setMetodo} saldo />
          </Campo>
          <Campo label="Nota (opcional)">
            <input className="campo" maxLength={40} placeholder="" value={nota} onChange={(e) => setNota(e.target.value)} />
          </Campo>
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setAberto(false)}>Cancelar</Botao>
            <Botao onClick={confirmarFn}>Registar</Botao>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
