import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import HeroCard from '../components/HeroCard';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import Modal from '../components/Modal';
import SeletorDia from '../components/SeletorDia';
import EmptyState from '../components/EmptyState';
import Linha from '../components/Linha';
import PagarParteModal from '../components/PagarParteModal';
import XitiqueFormModal from '../components/XitiqueFormModal';
import PillButton from '../components/PillButton';
import XitiqueParticipoCard from '../components/XitiqueParticipoCard';
import { useData, xitiqueIdDe } from '../context/DataContext';
import { useDialog } from '../components/DialogProvider';
import { formatMoney, formatDataExtenso, formatHora, iniciais, HOJE_KEY } from '../utils/format';
import { linkWhatsApp } from '../utils/whatsapp';
import { IconeWhatsApp } from '../components/Icons';

// Aqui estão todos os teus xitiques. Os que giras (guardas o dinheiro dos outros) têm lista de participantes, pagamentos
// e entregas. Os que só participas (pagas a tua parte e recebes a tua vez) mostram a tua conta; a tua vez vai para a
// Poupança, na parte Xitique, onde também podes geri-los.
export default function Xitique() {
  const {
    xitiques, participantes, entregas, pagouHoje, pagouDia, salvarParticipante, deleteParticipante, desmarcarPagamento, registrarPagamento,
    potXitique, registrarEntrega, deleteEntrega, salvarXitique, deleteXitique, usuarioNome, xitiquePessoal, deleteMovimentoXitique,
  } = useData();
  const { confirmar, avisar } = useDialog();

  const [selId, setSelId] = useState(null);
  const atual = xitiques.find((x) => x.id === selId) || xitiques[0] || null;
  const lista = atual
    ? participantes.filter((p) => xitiqueIdDe(p) === atual.id).sort((a, b) => (b.eu ? 1 : 0) - (a.eu ? 1 : 0))
    : [];
  const eu = lista.find((p) => p.eu) || null;
  const pot = atual ? potXitique(atual.id) : 0;
  const entregasAtual = atual ? entregas.filter((e) => xitiqueIdDe(e) === atual.id) : [];

  const [historyOpen, setHistoryOpen] = useState(false);
  const [formXitique, setFormXitique] = useState(null); // 'novo' | 'editar' | null (xitique que giras)
  const [escolhaTipo, setEscolhaTipo] = useState(false); // pergunta: giro ou só participo
  const [formParticipo, setFormParticipo] = useState(false);
  const [modalJuntar, setModalJuntar] = useState(false);

  const [modalParticipante, setModalParticipante] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [valorCombinado, setValorCombinado] = useState('');
  const [telefone, setTelefone] = useState('');

  const [modalPagamento, setModalPagamento] = useState(null); // participante (outra pessoa)
  const [valorPagamento, setValorPagamento] = useState('');
  const [diaPagamento, setDiaPagamento] = useState(HOJE_KEY);
  const [pagarEu, setPagarEu] = useState(false); // a tua parte: sai do Caixa

  const [modalEntrega, setModalEntrega] = useState(false);
  const [valorEntrega, setValorEntrega] = useState('');
  const [quemRecebeu, setQuemRecebeu] = useState('');
  const [diaEntrega, setDiaEntrega] = useState(HOJE_KEY);

  function abrirNovoParticipante() {
    setEditandoId(null);
    setNome('');
    setValorCombinado('');
    setTelefone('');
    setModalParticipante(true);
  }

  function abrirEditarParticipante(p) {
    setEditandoId(p.id);
    setNome(p.nome);
    setValorCombinado(p.valorCombinado);
    setTelefone(p.telefone || '');
    setModalParticipante(true);
  }

  async function guardarParticipante() {
    const n = nome.trim();
    const v = parseFloat(valorCombinado);
    if (!n) { await avisar('Introduz o nome do participante.'); return; }
    if (!v || v <= 0) { await avisar('Introduz um valor combinado válido.'); return; }
    salvarParticipante({ id: editandoId, nome: n, valorCombinado: v, telefone: telefone.trim(), xitiqueId: atual.id });
    setModalParticipante(false);
  }

  function textoApagarParticipante(p) {
    return p.eu
      ? `Tirar o teu nome da lista? Os teus pagamentos neste xitique saem do Caixa e o dinheiro volta ao saldo.`
      : `Apagar "${p.nome}" e o seu histórico de pagamentos?`;
  }

  async function apagarParticipante(p) {
    const ok = await confirmar(textoApagarParticipante(p), { perigo: true, textoOk: 'Apagar' });
    if (ok) deleteParticipante(p.id);
  }

  async function apagarAtual() {
    if (!editandoId) return;
    const p = participantes.find((x) => x.id === editandoId);
    if (!p) return;
    const ok = await confirmar(textoApagarParticipante(p), { perigo: true, textoOk: 'Apagar' });
    if (!ok) return;
    deleteParticipante(editandoId);
    setModalParticipante(false);
  }

  async function togglePagamento(p) {
    if (pagouHoje(p.id)) {
      const ok = await confirmar(p.eu ? 'Desmarcar o teu pagamento de hoje? O dinheiro volta ao saldo do Caixa.' : 'Desmarcar o pagamento de hoje?', { textoOk: 'Desmarcar' });
      if (!ok) return;
      desmarcarPagamento(p.id);
      return;
    }
    if (p.eu) { setPagarEu(true); return; }
    setModalPagamento(p);
    setValorPagamento(p.valorCombinado);
    setDiaPagamento(HOJE_KEY);
  }

  async function confirmarPagamento() {
    const v = parseFloat(valorPagamento);
    if (!v || v <= 0) { await avisar('Introduz um valor válido.'); return; }
    if (pagouDia(modalPagamento.id, diaPagamento)) { await avisar('Já há um pagamento registado para esse dia. Apaga-o primeiro se quiseres corrigir o valor.'); return; }
    registrarPagamento(modalPagamento.id, v, diaPagamento);
    setModalPagamento(null);
  }

  async function confirmarPagamentoEu({ valor, dia, setor, metodo }) {
    if (pagouDia(eu.id, dia)) { await avisar('Já há um pagamento teu registado para esse dia. Apaga-o primeiro se quiseres corrigir o valor.'); return; }
    registrarPagamento(eu.id, valor, dia, { setor, metodo });
    setPagarEu(false);
  }

  async function abrirEntrega() {
    if (pot <= 0) { await avisar('Ainda não há dinheiro guardado neste xitique.'); return; }
    if (lista.length === 0) { await avisar('Adiciona primeiro pelo menos um participante: a entrega só pode ser feita a alguém da lista.'); return; }
    setValorEntrega(pot.toFixed(2));
    setQuemRecebeu(lista[0].id);
    setDiaEntrega(HOJE_KEY);
    setModalEntrega(true);
  }

  async function confirmarEntregaFn() {
    const v = parseFloat(valorEntrega);
    if (!quemRecebeu) { await avisar('Escolhe quem recebeu a entrega.'); return; }
    if (!v || v <= 0) { await avisar('Introduz um valor válido.'); return; }
    if (v > pot + 0.01) { await avisar('Esse valor é maior que o total guardado (' + formatMoney(pot) + ' MT).'); return; }
    registrarEntrega(v, quemRecebeu, diaEntrega);
    setModalEntrega(false);
  }

  function guardarXitiqueForm({ nome: n, valor }) {
    if (formXitique === 'editar' && atual) {
      salvarXitique({ id: atual.id, nome: n, papel: 'gere' });
    } else {
      const id = salvarXitique({ nome: n, papel: 'gere', valor });
      setSelId(id);
    }
    setFormXitique(null);
  }

  async function apagarXitiqueAtual() {
    if (!atual) return;
    const ok = await confirmar(
      `Apagar o xitique "${atual.nome}"? Perdem-se a lista de participantes, os pagamentos e as entregas. Os teus pagamentos saem do Caixa e o dinheiro volta ao saldo. O que já recebeste na tua vez fica no Xitique da tua Poupança.`,
      { perigo: true, textoOk: 'Apagar' },
    );
    if (!ok) return;
    deleteXitique(atual.id);
    setFormXitique(null);
    setSelId(null);
  }

  const rotuloXitique = (x) => (x.papel === 'participa' ? `${x.nome} (participo)` : x.nome);

  const modaisNovo = (
    <>
      <Modal titulo="Novo xitique" aberto={escolhaTipo} aoFechar={() => setEscolhaTipo(false)}>
        <div className="space-y-3">
          <p className="text-sm text-[var(--ink-soft)]">Que tipo de xitique é?</p>
          <button onClick={() => { setEscolhaTipo(false); setFormXitique('novo'); }} className="block w-full rounded-2xl bg-[var(--bg-soft)] p-4 text-left active:scale-[0.99]">
            <span className="block text-sm font-semibold text-[var(--ink)]">Eu giro este xitique</span>
            <span className="mt-0.5 block text-xs text-[var(--ink-soft)]">Guardas o dinheiro dos outros e entregas a cada um na sua vez.</span>
          </button>
          <button onClick={() => { setEscolhaTipo(false); setFormParticipo(true); }} className="block w-full rounded-2xl bg-[var(--bg-soft)] p-4 text-left active:scale-[0.99]">
            <span className="block text-sm font-semibold text-[var(--ink)]">Só participo</span>
            <span className="mt-0.5 block text-xs text-[var(--ink-soft)]">Pagas a tua parte e recebes a tua vez. Outra pessoa guarda o dinheiro.</span>
          </button>
        </div>
      </Modal>
      <XitiqueFormModal
        aberto={formParticipo}
        aoFechar={() => setFormParticipo(false)}
        titulo="Novo xitique"
        ajuda="Para um xitique em que não giras o dinheiro: só registas o que tu pagas e o que tu recebes."
        aoGuardar={({ nome: n, valor }) => {
          const id = salvarXitique({ nome: n, papel: 'participa', valor });
          if (id) setSelId(id);
          setFormParticipo(false);
        }}
      />
    </>
  );

  if (!atual) {
    return (
      <Layout>
        <section className="rounded-2xl bg-[var(--paper)] p-5">
          <p className="font-display text-lg font-bold text-[var(--ink)]">Os teus xitiques</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
            Aqui ficam todos os teus xitiques. Nos que giras, guardas o dinheiro dos outros participantes e entregas a cada um na sua vez, e o teu nome fica também na lista. Nos que só participas, pagas a tua parte e recebes a tua vez.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
            O que recebes na tua vez vai para a <Link to="/poupanca" className="font-semibold text-[var(--mango)]">Poupança</Link>, na parte Xitique, separado da poupança normal.
          </p>
          <div className="mt-4 space-y-2">
            <Botao onClick={() => setFormXitique('novo')}>Criar um xitique que giro</Botao>
            <Botao variante="secundario" onClick={() => setFormParticipo(true)}>Adicionar um em que só participo</Botao>
          </div>
        </section>
        <XitiqueFormModal
          aberto={formXitique === 'novo'}
          aoFechar={() => setFormXitique(null)}
          titulo="Novo xitique"
          ajuda="Depois de criar, adicionas os outros participantes. O teu nome entra na lista automaticamente."
          aoGuardar={guardarXitiqueForm}
        />
        {modaisNovo}
      </Layout>
    );
  }

  const pills = (
    <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-0.5">
      {xitiques.map((x) => (
        <PillButton key={x.id} ativo={x.id === atual.id} onClick={() => { setSelId(x.id); setHistoryOpen(false); }}>{rotuloXitique(x)}</PillButton>
      ))}
      <button onClick={() => setEscolhaTipo(true)} className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--mango)]">+ Novo</button>
    </div>
  );

  // Xitique em que só participas: a tua conta (pagaste / recebeste) e os teus movimentos.
  if (atual.papel === 'participa') {
    const movs = xitiquePessoal.filter((m) => m.xitiqueId === atual.id).sort((a, b) => b.timestamp - a.timestamp);
    const pago = movs.filter((m) => m.tipo === 'pago').reduce((s, m) => s + m.valor, 0);
    const recebido = movs.filter((m) => m.tipo === 'recebido').reduce((s, m) => s + m.valor, 0);
    return (
      <Layout>
        {pills}
        <HeroCard
          label={`${atual.nome} · Já pagaste`}
          valor={pago}
          sub={
            <>
              <span>Recebeste <b className="font-mono-ref text-[var(--paper)]">{formatMoney(recebido)}</b></span>
              <span>Por ronda <b className="font-mono-ref text-[var(--paper)]">{formatMoney(atual.valor)}</b></span>
            </>
          }
        >
          <p className="mt-3 text-[11px] text-[var(--paper)]/50">Só participas neste xitique. A tua parte sai do Caixa e a tua vez vai para o Xitique da Poupança.</p>
        </HeroCard>

        <div className="mt-3"><XitiqueParticipoCard x={atual} aoApagar={() => setSelId(null)} /></div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Movimentos deste xitique</p>
        <section className="mt-2 rounded-2xl bg-[var(--paper)] p-4">
          {movs.length === 0 ? (
            <EmptyState>Ainda não há movimentos.<br />Aparecem aqui as partes que pagas e a vez que recebes.</EmptyState>
          ) : (
            movs.map((m) => {
              const positivo = m.tipo === 'recebido';
              return (
                <div key={m.id} className="flex items-center gap-3 border-b border-dashed border-[var(--ink)]/10 py-3 last:border-none">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold text-[var(--ink)]">{m.tipo === 'pago' ? 'Pagaste' : m.tipo === 'recebido' ? 'Recebeste' : 'Retirado'}</div>
                    <div className="text-[11px] text-[var(--ink-soft)]">{formatDataExtenso(new Date(m.timestamp))} · {formatHora(m.timestamp)}{m.tipo === 'pago' ? ' · saiu do Caixa' : ''}</div>
                  </div>
                  <div className={`font-mono-ref shrink-0 text-sm font-semibold ${positivo ? 'text-[var(--teal)]' : 'text-[var(--brick)]'}`}>{positivo ? '+' : '−'} {formatMoney(m.valor)}</div>
                  <button
                    onClick={async () => {
                      const ok = await confirmar(m.tipo === 'pago' ? 'Apagar este pagamento? O dinheiro volta ao saldo do Caixa.' : 'Apagar este movimento?', { perigo: true, textoOk: 'Apagar' });
                      if (ok) deleteMovimentoXitique(m.id);
                    }}
                    className="shrink-0 p-1 text-[var(--ink-soft)] opacity-50 hover:opacity-100"
                  >✕</button>
                </div>
              );
            })
          )}
        </section>

        {modaisNovo}
      </Layout>
    );
  }

  return (
    <Layout>
      {pills}

      <HeroCard
        label={`${atual.nome} · Total guardado`}
        valor={pot}
        sub={
          <>
            <span>Participantes <b className="font-mono-ref text-[var(--paper)]">{lista.length}</b></span>
            <span>Pagaram hoje <b className="font-mono-ref text-[var(--paper)]">{lista.filter((p) => pagouHoje(p.id)).length}</b></span>
          </>
        }
      >
        <p className="mt-3 text-[11px] text-[var(--paper)]/50">Dinheiro dos participantes: não entra no saldo do Caixa nem no lucro. A tua parte sai do Caixa.</p>
      </HeroCard>

      {!eu && (
        <section className="mt-3 rounded-2xl bg-[var(--mango-soft)] p-4">
          <p className="text-sm font-semibold text-[var(--ink)]">O teu nome ainda não está na lista</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">Junta-te para registares a tua parte, que sai do Caixa, e a tua vez, que vai para o Xitique da Poupança.</p>
          <button onClick={() => setModalJuntar(true)} className="mt-3 rounded-full bg-[var(--mango)] px-4 py-2 text-xs font-semibold text-[var(--mango-ink)]">Juntar o meu nome</button>
        </section>
      )}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Participantes</p>
        <span className="flex items-center gap-4">
          <button onClick={() => setFormXitique('editar')} className="text-xs font-semibold text-[var(--ink-soft)]">Editar xitique</button>
          <button onClick={abrirNovoParticipante} className="text-xs font-semibold text-[var(--mango)]">+ Adicionar</button>
        </span>
      </div>

      <section className="mt-2 rounded-2xl bg-[var(--paper)] p-4">
        {lista.length === 0 ? (
          <EmptyState>Ainda não há participantes.<br />Toca em "+ Adicionar" para começar a lista do xitique.</EmptyState>
        ) : (
          lista.map((p) => {
            const pago = pagouHoje(p.id);
            return (
              <Linha
                key={p.id}
                avatar={iniciais(p.nome)}
                aoTocarMeio={() => abrirEditarParticipante(p)}
                titulo={p.nome}
                badge={p.eu ? <span className="shrink-0 rounded-full bg-[var(--mango-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--mango)]">Tu</span> : null}
                subtitulo={`Combinado: ${formatMoney(p.valorCombinado)} MT`}
                acao={
                  <span className="flex shrink-0 items-center gap-1.5">
                    {!pago && !p.eu && <a href={linkWhatsApp(p.telefone, `Olá ${p.nome}, lembrete do xitique: o valor combinado de ${formatMoney(p.valorCombinado)} MT está por pagar. Obrigado!`)} target="_blank" rel="noopener noreferrer" aria-label="Lembrar por WhatsApp" title="Lembrar por WhatsApp" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white"><IconeWhatsApp className="h-4 w-4" /></a>}
                    <button
                      onClick={() => togglePagamento(p)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${pago ? 'bg-[var(--teal-soft)] text-[var(--teal)]' : 'border border-[var(--ink-soft)]/25 text-[var(--ink-soft)]'}`}
                    >
                      {pago ? 'Pagou' : p.eu ? 'Pagar' : 'Marcar Pago'}
                    </button>
                  </span>
                }
                aoApagar={() => apagarParticipante(p)}
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
            {entregasAtual.length === 0 ? (
              <p className="px-1 py-2 text-sm text-[var(--ink-soft)]">Ainda não há entregas registadas.</p>
            ) : (
              [...entregasAtual].sort((a, b) => b.timestamp - a.timestamp).map((e) => (
                <div key={e.id} className="flex items-center justify-between border-b border-dashed border-[var(--ink)]/10 py-2 text-sm last:border-none">
                  <span className="text-[var(--ink)]">{formatDataExtenso(new Date(e.timestamp))}{e.nota ? ' · ' + e.nota : ''}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono-ref font-semibold text-[var(--ink)]">{formatMoney(e.valor)} MT</span>
                    <button onClick={async () => { const ok = await confirmar('Apagar esta entrega do xitique? O valor volta a contar como guardado.' + (participantes.find((p) => p.id === e.participanteId)?.eu ? ' O valor também sai do Xitique da tua Poupança.' : ''), { perigo: true, textoOk: 'Apagar' }); if (ok) deleteEntrega(e.id); }} className="text-[var(--ink-soft)] opacity-50 hover:opacity-100">✕</button>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <XitiqueFormModal
        aberto={formXitique !== null}
        aoFechar={() => setFormXitique(null)}
        titulo={formXitique === 'editar' ? 'Editar xitique' : 'Novo xitique'}
        inicial={formXitique === 'editar' ? { nome: atual.nome } : null}
        mostrarValor={formXitique !== 'editar'}
        ajuda={formXitique === 'editar' ? undefined : 'Depois de criar, adicionas os outros participantes. O teu nome entra na lista automaticamente.'}
        aoGuardar={guardarXitiqueForm}
        aoApagar={formXitique === 'editar' ? apagarXitiqueAtual : undefined}
      />

      <XitiqueFormModal
        aberto={modalJuntar}
        aoFechar={() => setModalJuntar(false)}
        titulo="Juntar o meu nome"
        mostrarNome={false}
        aoGuardar={({ valor }) => {
          salvarParticipante({ nome: usuarioNome || 'Eu', valorCombinado: valor, xitiqueId: atual.id, eu: true });
          setModalJuntar(false);
        }}
      />

      {modaisNovo}

      {/* Modal Participante */}
      <Modal titulo={editandoId ? 'Editar Participante' : 'Novo Participante'} aberto={modalParticipante} aoFechar={() => setModalParticipante(false)}>
        <div className="space-y-4">
          <Campo label="Nome">
            <input className="campo" maxLength={30} placeholder="" value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo label="Valor Combinado (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorCombinado} onChange={(e) => setValorCombinado(e.target.value)} />
          </Campo>
          <Campo label="WhatsApp (opcional)">
            <input className="campo" type="tel" inputMode="tel" placeholder="" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </Campo>
          <div className="flex gap-2 pt-1">
            {editandoId && <Botao variante="perigo" onClick={apagarAtual}>Apagar</Botao>}
            <Botao variante="secundario" onClick={() => setModalParticipante(false)}>Cancelar</Botao>
            <Botao onClick={guardarParticipante}>Guardar</Botao>
          </div>
        </div>
      </Modal>

      {/* Modal Pagamento (outro participante: dinheiro de terceiros, não mexe no Caixa) */}
      <Modal titulo={modalPagamento ? `Pagamento de ${modalPagamento.nome}` : ''} aberto={!!modalPagamento} aoFechar={() => setModalPagamento(null)}>
        <div className="space-y-4">
          <Campo label="Dia">
            <SeletorDia value={diaPagamento} onChange={setDiaPagamento} />
          </Campo>
          <Campo label="Valor Recebido (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorPagamento} onChange={(e) => setValorPagamento(e.target.value)} />
          </Campo>
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setModalPagamento(null)}>Cancelar</Botao>
            <Botao onClick={confirmarPagamento}>Guardar</Botao>
          </div>
        </div>
      </Modal>

      {/* A tua parte: sai do Caixa */}
      <PagarParteModal
        aberto={pagarEu}
        aoFechar={() => setPagarEu(false)}
        titulo={`A tua parte em ${atual.nome}`}
        valorInicial={eu ? eu.valorCombinado : ''}
        aoConfirmar={confirmarPagamentoEu}
      />

      {/* Modal Entrega */}
      <Modal titulo="Registar Entrega do Xitique" aberto={modalEntrega} aoFechar={() => setModalEntrega(false)}>
        <div className="space-y-4">
          <Campo label="Dia">
            <SeletorDia value={diaEntrega} onChange={setDiaEntrega} />
          </Campo>
          <Campo label="Valor Entregue (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorEntrega} onChange={(e) => setValorEntrega(e.target.value)} />
          </Campo>
          <Campo label="Quem recebeu?">
            <select className="campo" value={quemRecebeu} onChange={(e) => setQuemRecebeu(e.target.value)}>
              {lista.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.eu ? ' (tu)' : ''}</option>)}
            </select>
          </Campo>
          {lista.find((p) => p.id === quemRecebeu)?.eu && (
            <p className="rounded-xl bg-[var(--bg-soft)] p-3 text-xs leading-relaxed text-[var(--ink-soft)]">Como és tu quem recebe, este valor vai para o Xitique da tua Poupança. Não entra no Caixa nem nas vendas.</p>
          )}
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setModalEntrega(false)}>Cancelar</Botao>
            <Botao onClick={confirmarEntregaFn}>Confirmar</Botao>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
