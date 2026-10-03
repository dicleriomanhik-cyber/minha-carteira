import { useState } from 'react';
import Layout from '../components/Layout';
import HeroCard from '../components/HeroCard';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import MetodoLogo from '../components/MetodoLogo';
import SeletorMetodo from '../components/SeletorMetodo';
import Modal from '../components/Modal';
import SeletorDia from '../components/SeletorDia';
import EmptyState from '../components/EmptyState';
import AlertBanner from '../components/AlertBanner';
import FechoDiaModal from '../components/FechoDiaModal';
import LembretesModal from '../components/LembretesModal';
import SmsModal from '../components/SmsModal';
import MetaCard from '../components/MetaCard';
import LucroMesCard from '../components/LucroMesCard';
import { IconeFecho, IconeSino, IconeSms } from '../components/Icons';
import { useData, METODOS } from '../context/DataContext';
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
      {cat.label}
    </button>
  );
}

const SETOR_INFO = {
  produtos: { label: 'Produtos' },
  maquina: { label: 'Serviços' },
};

// Categorias cujo setor é automático (não perguntamos ao utilizador).
const SETOR_AUTOMATICO_POR_CATEGORIA = { venda: 'produtos', maquina: 'maquina' };

export default function Caixa() {
  const {
    doHoje, totalEntradasHoje, totalSaidasHoje, saldoHoje, totalProdutosHoje, totalMaquinaHoje, lucroRealHojeCalc,
    saldoProdutosHoje, saldoMaquinaHoje, totalEntradasSetorHoje, totalSaidasSetorHoje,
    addTransacao, registrarVendaComStock, deleteTransacao, deleteDia, historicoDias, saldoFechamentoDia, produtos, saldoPorMetodo,
  } = useData();
  const { confirmar, avisar } = useDialog();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [fechoAberto, setFechoAberto] = useState(false);
  const [lembretesAberto, setLembretesAberto] = useState(false);
  const [smsAberto, setSmsAberto] = useState(false);
  const [refSms, setRefSms] = useState(null); // { referencia, metodo } quando a entrada vem de um SMS
  const [modalTipo, setModalTipo] = useState(null); // 'entrada' | 'saida' | null
  const [categoria, setCategoria] = useState(null);
  const [setorTransacao, setSetorTransacao] = useState(null);
  const [valor, setValor] = useState('');
  const [nota, setNota] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [metodo, setMetodo] = useState('dinheiro');
  const [qtdVenda, setQtdVenda] = useState('1');
  const [diaTransacao, setDiaTransacao] = useState(HOJE_KEY);


  const lucro = lucroRealHojeCalc();

  const setorAutomatico = categoria ? SETOR_AUTOMATICO_POR_CATEGORIA[categoria] : null;
  const setorEfetivo = setorAutomatico || setorTransacao;

  function abrirModal(tipo) {
    setModalTipo(tipo);
    setCategoria(null);
    setSetorTransacao(null);
    setValor('');
    setNota('');
    setMetodo('dinheiro');
    setProdutoId('');
    setQtdVenda('1');
    setDiaTransacao(HOJE_KEY);
    setRefSms(null);
  }

  // Depois de ler o SMS, abre a Nova Entrada já preenchida; a categoria e o setor ficam para o utilizador escolher.
  function aoConfirmarSms(r) {
    setSmsAberto(false);
    abrirModal('entrada');
    setMetodo(r.metodo);
    setValor(String(r.valor));
    setDiaTransacao(r.dateKey || HOJE_KEY);
    setNota(r.de ? `De ${r.de}`.slice(0, 40) : '');
    setRefSms(r.referencia ? { referencia: r.referencia, metodo: r.metodo } : null);
  }

  function onSelecionarCategoria(c) {
    setCategoria(c);
    // Se a categoria tiver setor automático, já não é preciso escolher.
    setSetorTransacao(SETOR_AUTOMATICO_POR_CATEGORIA[c] || null);
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
    if (!setorEfetivo) { await avisar('Escolhe a que setor pertence: Produtos ou Serviços.'); return; }
    if (!v || v <= 0) { await avisar('Introduz um valor válido.'); return; }

    if (categoria === 'venda' && produtoId) {
      const qtd = parseInt(qtdVenda) || 1;
      const res = registrarVendaComStock({ tipo: modalTipo, categoria, valor: v, nota: nota.trim(), setor: setorEfetivo, metodo, produtoId, quantidade: qtd, dateKey: diaTransacao, referencia: refSms?.referencia || null });
      if (res.erro) { await avisar(res.erro); return; }
    } else {
      addTransacao({ tipo: modalTipo, categoria, valor: v, nota: nota.trim(), setor: setorEfetivo, metodo, dateKey: diaTransacao, referencia: refSms?.referencia || null });
    }
    setModalTipo(null);
  }

  return (
    <Layout>
      <AlertBanner aoAbrirFecho={() => setFechoAberto(true)} aoAbrirLembretes={() => setLembretesAberto(true)} />

      <HeroCard
        label="Saldo Total"
        valor={saldoHoje}
        sub={
          <>
            <span>Entradas <b className="font-mono-ref text-[var(--paper)]">{formatMoney(totalEntradasHoje)}</b></span>
            <span>Saídas <b className="font-mono-ref text-[var(--paper)]">{formatMoney(totalSaidasHoje)}</b></span>
            <span>Lucro Real <b className="font-mono-ref text-[var(--paper)]">{formatMoney(lucro.lucro)} MT</b></span>
          </>
        }
      >
        <p className="mt-3 text-[11px] text-[var(--paper)]/50">Soma de Produtos + Serviços. Os saldos iniciais definem-se no Perfil.</p>
      </HeroCard>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {['produtos', 'maquina'].map((setor) => {
          const info = SETOR_INFO[setor];
          const saldoSetor = setor === 'produtos' ? saldoProdutosHoje : saldoMaquinaHoje;
          return (
            <section key={setor} className="cartao-azul rounded-2xl p-4 text-[var(--paper)]">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--paper)]/60">Saldo {info.label}</p>
              <p className="font-display mt-1 text-xl font-bold leading-none">
                {formatMoney(saldoSetor)}
                <span className="ml-1 text-xs font-semibold text-[var(--paper)]/50">MT</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--paper)]/70">
                <span>Ent. <b className="font-mono-ref text-[var(--paper)]">{formatMoney(totalEntradasSetorHoje(setor))}</b></span>
                <span>Saí. <b className="font-mono-ref text-[var(--paper)]">{formatMoney(totalSaidasSetorHoje(setor))}</b></span>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {METODOS.map((m) => (
          <div key={m.id} className="rounded-2xl bg-[var(--paper)] p-3">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]"><MetodoLogo id={m.id} className="h-6 w-6" />{m.label}</p>
            <p className="font-mono-ref mt-1.5 text-base font-bold text-[var(--ink)]">{formatMoney(saldoPorMetodo[m.id])} <span className="text-[10px] font-semibold text-[var(--ink-soft)]">MT</span></p>
          </div>
        ))}
      </div>

      <LucroMesCard />
      <MetaCard />

      <div className="mt-4 flex gap-3">
        <button onClick={() => abrirModal('entrada')} className="flex-1 rounded-xl bg-[var(--teal)] py-3 text-sm font-semibold text-white active:scale-[0.98]">+ Entrada</button>
        <button onClick={() => abrirModal('saida')} className="flex-1 rounded-xl bg-[var(--brick)] py-3 text-sm font-semibold text-white active:scale-[0.98]">− Saída</button>
      </div>

      <button onClick={() => setSmsAberto(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--paper)] py-3 text-[13px] font-semibold text-[var(--ink)] active:scale-[0.98]">
        <IconeSms className="h-5 w-5 text-[var(--mango)]" />Registar por SMS
      </button>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => setFechoAberto(true)} className="flex items-center justify-center gap-2 rounded-xl bg-[var(--paper)] py-3 text-[13px] font-semibold text-[var(--ink)] active:scale-[0.98]">
          <IconeFecho className="h-5 w-5 text-[var(--mango)]" />Fecho do dia
        </button>
        <button onClick={() => setLembretesAberto(true)} className="flex items-center justify-center gap-2 rounded-xl bg-[var(--paper)] py-3 text-[13px] font-semibold text-[var(--ink)] active:scale-[0.98]">
          <IconeSino className="h-5 w-5 text-[var(--mango)]" />Lembretes
        </button>
      </div>

      <section className="mt-6 rounded-2xl bg-[var(--paper)] p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Registos de Hoje</p>
        {doHoje.length === 0 ? (
          <EmptyState>Ainda não há registos hoje.<br />Toca em "+ Entrada" para começar.</EmptyState>
        ) : (
          <div>
            {doHoje.map((t) => {
              const cat = CAT_LOOKUP[t.categoria] || { label: t.categoria };
              return (
                <div key={t.id} className="flex items-center gap-3 border-b border-dashed border-[var(--ink)]/10 py-3 last:border-none">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] font-display text-sm font-bold">{(cat.label || '?')[0]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-[var(--ink)]">
                      {cat.label}
                      <span className="rounded-full bg-[var(--bg-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-soft)]">
                        {SETOR_INFO[t.setor || 'produtos'].label}
                      </span>
                    </div>
                    {t.nota && <div className="truncate text-[12px] text-[var(--ink-soft)]">{t.nota}</div>}
                    <div className="text-[11px] text-[var(--ink-soft)]">{formatHora(t.timestamp)} · <MetodoLogo id={(METODOS.find((m) => m.id === t.metodo) || METODOS[0]).id} className="inline-block h-3.5 w-3.5 align-[-2px]" /> {(METODOS.find((m) => m.id === t.metodo) || METODOS[0]).label}</div>
                  </div>
                  <div className={`font-mono-ref shrink-0 text-sm font-semibold ${t.tipo === 'entrada' ? 'text-[var(--teal)]' : 'text-[var(--brick)]'}`}>
                    {t.tipo === 'entrada' ? '+' : '−'} {formatMoney(t.valor)}
                  </div>
                  <button onClick={async () => { const ok = await confirmar(t.categoria === 'poupanca' ? 'Este registo é uma poupança. Se apagares, o movimento também sai da Poupança e o dinheiro volta ao saldo. Apagar?' : 'Apagar este registo?', { perigo: true, textoOk: 'Apagar' }); if (ok) deleteTransacao(t.id); }} className="shrink-0 p-1 text-[var(--ink-soft)] opacity-50 hover:opacity-100">✕</button>
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
          {refSms && (
            <p className="rounded-xl bg-[var(--bg-soft)] p-3 text-xs text-[var(--ink-soft)]">
              Valor, método e dia lidos do SMS. Escolhe a categoria, confirma tudo e guarda.
            </p>
          )}
          <Campo label="Dia">
            <SeletorDia value={diaTransacao} onChange={setDiaTransacao} />
            {diaTransacao !== HOJE_KEY && (
              <p className="mt-1.5 text-[11px] text-[var(--mango)]">A registar para um dia anterior — não vai aparecer em "Registos de Hoje", mas sim em "Ver dias anteriores".</p>
            )}
          </Campo>

          <div className="flex flex-wrap gap-2">
            {modalTipo && CATEGORIAS[modalTipo].map((c) => (
              <ChipCategoria key={c.id} cat={c} selecionada={categoria === c.id} onClick={() => onSelecionarCategoria(c.id)} />
            ))}
          </div>

          {categoria && (
            setorAutomatico ? (
              <p className="text-xs text-[var(--ink-soft)]">
                Setor: <b className="text-[var(--ink)]">{SETOR_INFO[setorAutomatico].label}</b>
              </p>
            ) : (
              <Campo label="Setor">
                <div className="flex gap-2">
                  {Object.entries(SETOR_INFO).map(([id, info]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSetorTransacao(id)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        setorTransacao === id ? 'bg-[var(--mango)] text-[var(--mango-ink)]' : 'bg-[var(--bg-soft)] text-[var(--ink)]'
                      }`}
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
              </Campo>
            )
          )}

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

          <Campo label="Método">
            <SeletorMetodo value={metodo} onChange={setMetodo} />
          </Campo>
          <Campo label="Valor (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
          <Campo label="Nota (opcional)">
            <input className="campo" type="text" maxLength={40} placeholder="" value={nota} onChange={(e) => setNota(e.target.value)} />
          </Campo>

          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setModalTipo(null)}>Cancelar</Botao>
            <Botao onClick={salvar}>Guardar</Botao>
          </div>
        </div>
      </Modal>

      <SmsModal aberto={smsAberto} aoFechar={() => setSmsAberto(false)} aoConfirmar={aoConfirmarSms} />
      <FechoDiaModal aberto={fechoAberto} aoFechar={() => setFechoAberto(false)} />
      <LembretesModal aberto={lembretesAberto} aoFechar={() => setLembretesAberto(false)} />
    </Layout>
  );
}
