import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../components/Modal';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import MensagemErro from '../components/MensagemErro';
import MetodoLogo from '../components/MetodoLogo';
import { METODOS } from '../context/DataContext';
import { formatMoney, formatHora, semEmoji } from '../utils/format';
import { obterCatalogo, obterVendasHoje, registarVenda } from '../utils/funcionarioSessao';

const textoDisp = (n) => `${n} ${n === 1 ? 'disponível' : 'disponíveis'}`;

const NOME_METODO = METODOS.reduce((a, m) => { a[m.id] = m.label; return a; }, {});

function IconeSair() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
      <path d="M16 8l4 4-4 4" />
      <path d="M20 12H9" />
    </svg>
  );
}

function IconeActualizar({ girar }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={girar ? 'animate-spin' : ''}>
      <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" />
      <path d="M20 20v-4h-4" />
    </svg>
  );
}

function IconePesquisa() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

// Registo de vendas do funcionário: só vê nome, preço de venda e quantidade disponível.
export default function FuncionarioVendas({ sessao, aoSair, aoSessaoTerminou }) {
  const [catalogo, setCatalogo] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState('');
  const [pesquisa, setPesquisa] = useState('');
  const [produto, setProduto] = useState(null); // produto aberto para vender
  const [qtd, setQtd] = useState('1');
  const [metodo, setMetodo] = useState('dinheiro');
  const [nota, setNota] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [erroVenda, setErroVenda] = useState('');
  const [sucesso, setSucesso] = useState('');
  const temporizador = useRef(null);

  const carregar = useCallback(async () => {
    setACarregar(true);
    setErro('');
    const [c, v] = await Promise.all([obterCatalogo(sessao.token), obterVendasHoje(sessao.token)]);
    if (c.sessaoTerminou || v.sessaoTerminou) { aoSessaoTerminou(); return; }
    if (c.erro || v.erro) setErro(c.erro || v.erro);
    if (!c.erro) setCatalogo(Array.isArray(c.dados) ? c.dados : []);
    if (!v.erro) setVendas(Array.isArray(v.dados) ? v.dados : []);
    setACarregar(false);
  }, [sessao.token, aoSessaoTerminou]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const filtrados = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    return q ? catalogo.filter((p) => semEmoji(p.nome).toLowerCase().includes(q)) : catalogo;
  }, [catalogo, pesquisa]);

  const totalHoje = useMemo(() => vendas.reduce((s, v) => s + Number(v.valor || 0), 0), [vendas]);

  const quantidade = Math.floor(Number(qtd));
  const qtdValida = Number.isFinite(quantidade) && quantidade >= 1 && (!produto || quantidade <= produto.disponivel);
  const totalVenda = produto && qtdValida ? Number(produto.precoVenda) * quantidade : 0;

  function abrirVenda(p) {
    setProduto(p); setQtd('1'); setMetodo('dinheiro'); setNota(''); setErroVenda('');
  }

  const fecharVenda = () => { if (!aGuardar) setProduto(null); };

  function mudarQtd(delta) {
    const atual = Number.isFinite(quantidade) && quantidade >= 1 ? quantidade : 1;
    const novo = Math.min(produto.disponivel, Math.max(1, atual + delta));
    setQtd(String(novo));
  }

  async function confirmarVenda() {
    if (!qtdValida) { setErroVenda(quantidade > produto.disponivel ? `Só há ${textoDisp(produto.disponivel)}.` : 'Escreve uma quantidade válida.'); return; }
    setAGuardar(true); setErroVenda('');
    const r = await registarVenda(sessao.token, { produtoId: produto.id, quantidade, metodo, nota: nota.trim() });
    setAGuardar(false);
    if (r.sessaoTerminou) { aoSessaoTerminou(); return; }
    if (r.erro) {
      setErroVenda(r.erro);
      if (/stock|existe/i.test(r.erro)) carregar();
      return;
    }
    const nome = semEmoji(produto.nome);
    setProduto(null);
    setSucesso(`Venda registada: ${quantidade} x ${nome} — ${formatMoney(r.dados?.valor ?? totalVenda)} MT`);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setSucesso(''), 5000);
    carregar();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mango)] font-display text-sm font-bold text-[var(--mango-ink)]">MC</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--ink-soft)]">Registo de vendas</p>
          <p className="truncate font-display text-base font-bold text-[var(--ink)]">Olá, {semEmoji(sessao.nome)}</p>
        </div>
        <button type="button" onClick={carregar} disabled={aCarregar} aria-label="Actualizar" className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--mango)] disabled:opacity-50">
          <IconeActualizar girar={aCarregar} />
        </button>
        <button type="button" onClick={aoSair} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--brick)]">
          <IconeSair />Sair
        </button>
      </header>

      <section className="cartao-azul mt-4 rounded-2xl p-4">
        <p className="text-xs text-[var(--ink-soft)]">Vendido por ti hoje</p>
        <p className="font-mono-ref mt-0.5 text-3xl font-bold text-[var(--ink)]">{formatMoney(totalHoje)} MT</p>
        <p className="mt-0.5 text-xs text-[var(--ink-soft)]">{vendas.length} {vendas.length === 1 ? 'venda' : 'vendas'}</p>
      </section>

      {sucesso && <p className="mt-3 rounded-lg bg-[var(--teal-soft)] px-3 py-2 text-sm font-semibold text-[var(--teal)]" role="status">{sucesso}</p>}
      {erro && <div className="mt-3"><MensagemErro>{erro}</MensagemErro></div>}

      <section className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Produtos</p>
        <div className="relative mb-2">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"><IconePesquisa /></span>
          <input className="campo pl-10" type="search" placeholder="Procurar produto" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} />
        </div>

        {aCarregar && catalogo.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--ink-soft)]">A carregar...</p>
        ) : catalogo.length === 0 ? (
          <p className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm text-[var(--ink-soft)]">O dono ainda não tem produtos no stock.</p>
        ) : filtrados.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--ink-soft)]">Nenhum produto com esse nome.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-[var(--paper)]">
            {filtrados.map((p) => {
              const semPreco = !(Number(p.precoVenda) > 0);
              const esgotado = p.disponivel <= 0;
              const bloqueado = semPreco || esgotado;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={bloqueado}
                  onClick={() => abrirVenda(p)}
                  className="flex w-full items-center gap-3 border-b border-dashed border-[var(--ink)]/10 px-4 py-3 text-left last:border-none disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-[var(--ink)]">{semEmoji(p.nome)}</span>
                    <span className="block text-[12px] text-[var(--ink-soft)]">
                      {esgotado ? 'Esgotado' : textoDisp(p.disponivel)}
                    </span>
                  </span>
                  <span className="font-mono-ref shrink-0 text-sm font-bold text-[var(--ink)]">
                    {semPreco ? 'Sem preço' : `${formatMoney(Number(p.precoVenda))} MT`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">As tuas vendas de hoje</p>
        {vendas.length === 0 ? (
          <p className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm text-[var(--ink-soft)]">Ainda não registaste nenhuma venda hoje.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-[var(--paper)]">
            {vendas.map((v) => (
              <div key={v.id} className="flex items-center gap-3 border-b border-dashed border-[var(--ink)]/10 px-4 py-3 last:border-none">
                <MetodoLogo id={v.metodo} className="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-[var(--ink)]">{v.quantidade} x {semEmoji(v.produto)}</p>
                  <p className="text-[11.5px] text-[var(--ink-soft)]">{formatHora(v.criado_em)} · {NOME_METODO[v.metodo] || v.metodo}</p>
                </div>
                <p className="font-mono-ref shrink-0 text-sm font-bold text-[var(--teal)]">{formatMoney(Number(v.valor))} MT</p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-[var(--ink-soft)]">Se te enganaste numa venda, avisa o dono.</p>
      </section>

      <Modal titulo={produto ? semEmoji(produto.nome) : ''} subtitulo="Registar venda" aberto={!!produto} aoFechar={fecharVenda}>
        {produto && (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
              <span className="text-xs text-[var(--ink-soft)]">Preço de venda</span>
              <span className="font-mono-ref text-base font-bold text-[var(--ink)]">{formatMoney(Number(produto.precoVenda))} MT</span>
            </div>

            <Campo label="Quantidade" hint={textoDisp(produto.disponivel)}>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => mudarQtd(-1)} aria-label="Menos um" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-xl font-bold text-[var(--ink)] active:scale-95">−</button>
                <input className="campo font-mono-ref text-center text-lg font-bold" type="text" inputMode="numeric" pattern="[0-9]*" value={qtd} onChange={(e) => setQtd(e.target.value.replace(/\D/g, '').slice(0, 5))} />
                <button type="button" onClick={() => mudarQtd(1)} aria-label="Mais um" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-xl font-bold text-[var(--ink)] active:scale-95">+</button>
              </div>
            </Campo>

            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Como o cliente pagou</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {METODOS.map((m) => {
                  const ativo = metodo === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      onClick={() => setMetodo(m.id)}
                      className={`flex items-center gap-2.5 rounded-xl border-2 px-2.5 py-2 text-left transition active:scale-[0.98] ${ativo ? 'border-[var(--mango)] bg-[var(--mango-soft)]' : 'border-transparent bg-[var(--bg-soft)]'}`}
                    >
                      <MetodoLogo id={m.id} className="h-8 w-8" />
                      <span className="truncate text-[13px] font-semibold text-[var(--ink)]">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Campo label="Nota (opcional)">
              <input className="campo" maxLength={120} placeholder="Nota" value={nota} onChange={(e) => setNota(e.target.value)} />
            </Campo>

            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-[var(--ink)]">Total</span>
              <span className="font-mono-ref text-2xl font-bold text-[var(--ink)]">{formatMoney(totalVenda)} MT</span>
            </div>

            <MensagemErro>{erroVenda}</MensagemErro>
            <div className="flex gap-2 pt-1">
              <Botao variante="secundario" disabled={aGuardar} onClick={fecharVenda}>Cancelar</Botao>
              <Botao disabled={aGuardar || !qtdValida} onClick={confirmarVenda}>{aGuardar ? 'A registar...' : 'Registar venda'}</Botao>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
