import { useState } from 'react';
import Layout from '../components/Layout';
import HeroCard from '../components/HeroCard';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Linha from '../components/Linha';
import { useData, METODOS } from '../context/DataContext';
import { useDialog } from '../components/DialogProvider';
import { formatMoney, dateKey } from '../utils/format';

const CAMPOS_VAZIOS = { nome: '', quantidade: '', precoCusto: '', precoVenda: '', alertaEm: '3', pacoteCusto: '', pacoteUn: '' };

export default function Produtos() {
  const { produtos, salvarProduto, deleteProduto, reporProduto, lucroRealHojeCalc, registrarVendaComStock, salvarFiado } = useData();
  const { confirmar, avisar } = useDialog();
  const { receita, custo, lucro } = lucroRealHojeCalc();

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [campos, setCampos] = useState(CAMPOS_VAZIOS);

  const [modalRepor, setModalRepor] = useState(null); // produto
  const [reporQtd, setReporQtd] = useState('');
  const [reporCusto, setReporCusto] = useState('');

  const [modalVender, setModalVender] = useState(null); // produto
  const [vQtd, setVQtd] = useState('1');
  const [vModo, setVModo] = useState('pronto');
  const [vMetodo, setVMetodo] = useState('dinheiro');
  const [vCliente, setVCliente] = useState('');
  const [vTelefone, setVTelefone] = useState('');
  const [vVenc, setVVenc] = useState('');

  function abrirVender(p) {
    setModalVender(p);
    setVQtd('1');
    setVModo('pronto');
    setVMetodo('dinheiro');
    setVCliente('');
    setVTelefone('');
    setVVenc(dateKey(new Date(Date.now() + 7 * 86400000)));
  }

  async function confirmarVender() {
    const p = modalVender;
    const qtd = parseInt(vQtd);
    if (!qtd || qtd <= 0) { await avisar('Introduz a quantidade.'); return; }
    if (qtd > p.quantidade) { await avisar(`Só tens ${p.quantidade} unidades de "${p.nome}" em stock.`); return; }
    const valor = qtd * p.precoVenda;
    let res;
    if (vModo === 'fiado') {
      if (!vCliente.trim()) { await avisar('Introduz o nome do cliente.'); return; }
      if (!vVenc) { await avisar('Escolhe a data de vencimento.'); return; }
      res = salvarFiado({ cliente: vCliente.trim(), telefone: vTelefone.trim(), produtoStockId: p.id, produtoDescricao: p.nome, quantidade: qtd, valorTotal: valor, valorPago: 0, vencimento: vVenc });
    } else {
      res = registrarVendaComStock({ tipo: 'entrada', categoria: 'venda', valor, nota: '', setor: 'produtos', metodo: vMetodo, produtoId: p.id, quantidade: qtd });
    }
    if (res && res.erro) { await avisar(res.erro); return; }
    setModalVender(null);
  }

  function onPacoteChange(campo, valor) {
    setCampos((c) => {
      const next = { ...c, [campo]: valor };
      const k = parseFloat(next.pacoteCusto);
      const u = parseFloat(next.pacoteUn);
      if (k > 0 && u > 0) next.precoCusto = String(Math.round((k / u) * 100) / 100);
      return next;
    });
  }

  function abrirNovo() {
    setEditandoId(null);
    setCampos(CAMPOS_VAZIOS);
    setModalAberto(true);
  }

  function abrirEditar(p) {
    setEditandoId(p.id);
    setCampos({ nome: p.nome, quantidade: p.quantidade, precoCusto: p.precoCusto, precoVenda: p.precoVenda, alertaEm: p.alertaEm ?? 3, pacoteCusto: '', pacoteUn: '' });
    setModalAberto(true);
  }

  async function guardar() {
    const nome = campos.nome.trim();
    const quantidade = parseInt(campos.quantidade);
    const precoCusto = parseFloat(campos.precoCusto);
    const precoVenda = parseFloat(campos.precoVenda);
    const alertaEmRaw = parseInt(campos.alertaEm);
    const alertaEm = isNaN(alertaEmRaw) ? 3 : alertaEmRaw;

    if (!nome) { await avisar('Introduz o nome do produto.'); return; }
    if (isNaN(quantidade) || quantidade < 0) { await avisar('Introduz uma quantidade válida.'); return; }
    if (isNaN(precoCusto) || precoCusto < 0) { await avisar('Introduz um preço de custo válido.'); return; }
    if (isNaN(precoVenda) || precoVenda < 0) { await avisar('Introduz um preço de venda válido.'); return; }

    salvarProduto({ id: editandoId, nome, quantidade, precoCusto, precoVenda, alertaEm });
    setModalAberto(false);
  }

  async function apagarAtual() {
    if (!editandoId) return;
    const ok = await confirmar('Apagar este produto do stock? Isto não apaga vendas já registadas.', { perigo: true, textoOk: 'Apagar' });
    if (!ok) return;
    deleteProduto(editandoId);
    setModalAberto(false);
  }

  function abrirRepor(p) {
    setModalRepor(p);
    setReporQtd('');
    setReporCusto('');
  }

  async function confirmarRepor() {
    const qtd = parseInt(reporQtd);
    const novoCusto = parseFloat(reporCusto);
    if (!qtd || qtd <= 0) { await avisar('Introduz uma quantidade válida.'); return; }
    reporProduto(modalRepor.id, qtd, novoCusto);
    setModalRepor(null);
  }

  return (
    <Layout>
      <HeroCard
        label="Lucro Real de Hoje"
        valor={lucro}
        sub={
          <>
            <span>Vendeste <b className="font-mono-ref text-[var(--paper)]">{formatMoney(receita)}</b></span>
            <span>Custo da mercadoria <b className="font-mono-ref text-[var(--paper)]">{formatMoney(custo)}</b></span>
          </>
        }
      />
      <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">
        Só entra aqui o que vendes com o botão Vender, ou com "Produto do stock" ligado na Nova Entrada ou num Fiado.
      </p>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Produtos em Stock</p>
        <button onClick={abrirNovo} className="text-xs font-semibold text-[var(--mango)]">+ Produto</button>
      </div>

      <section className="mt-2 rounded-2xl bg-[var(--paper)] p-4">
        {produtos.length === 0 ? (
          <EmptyState>Ainda não há produtos registados.<br />Toca em "+ Produto" para começar a controlar o teu stock.</EmptyState>
        ) : (
          produtos.map((p) => {
            const baixo = p.quantidade <= (p.alertaEm !== undefined ? p.alertaEm : 3);
            return (
              <Linha
                key={p.id}
                avatar="🧺"
                aoTocarMeio={() => abrirEditar(p)}
                titulo={p.nome}
                subtitulo={`${baixo ? '⚠️ ' : ''}Stock: ${p.quantidade} · Custo ${formatMoney(p.precoCusto)} · Venda ${formatMoney(p.precoVenda)} MT`}
                badge={baixo ? <span className="rounded-full bg-[var(--brick-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--brick)]">Baixo</span> : null}
                acao={
                  <span className="flex shrink-0 items-center gap-1.5">
                    <button onClick={() => abrirVender(p)} disabled={p.quantidade <= 0} className="rounded-full bg-[var(--mango)] px-3 py-1.5 text-xs font-semibold text-[var(--mango-ink)] disabled:opacity-40">
                      Vender
                    </button>
                    <button onClick={() => abrirRepor(p)} className="rounded-full border border-[var(--ink-soft)]/25 px-3 py-1.5 text-xs font-semibold text-[var(--ink-soft)]">
                      + Repor
                    </button>
                  </span>
                }
              />
            );
          })
        )}
      </section>

      {/* Modal Produto */}
      <Modal titulo={editandoId ? 'Editar Produto' : '+ Produto'} aberto={modalAberto} aoFechar={() => setModalAberto(false)}>
        <div className="space-y-4">
          <Campo label="Nome do Produto">
            <input className="campo" maxLength={40} placeholder="Ex: Açúcar (saco 50kg)" value={campos.nome} onChange={(e) => setCampos((c) => ({ ...c, nome: e.target.value }))} />
          </Campo>
          <Campo label="Quantidade em Stock">
            <input className="campo" type="number" min="0" step="1" placeholder="0" value={campos.quantidade} onChange={(e) => setCampos((c) => ({ ...c, quantidade: e.target.value }))} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Custo do pacote (opcional)">
              <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={campos.pacoteCusto} onChange={(e) => onPacoteChange('pacoteCusto', e.target.value)} />
            </Campo>
            <Campo label="Unidades no pacote">
              <input className="campo" type="number" min="1" step="1" placeholder="0" value={campos.pacoteUn} onChange={(e) => onPacoteChange('pacoteUn', e.target.value)} />
            </Campo>
          </div>
          <Campo label="Preço de Custo — por unidade (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={campos.precoCusto} onChange={(e) => setCampos((c) => ({ ...c, precoCusto: e.target.value }))} />
          </Campo>
          <Campo label="Preço de Venda — por unidade (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={campos.precoVenda} onChange={(e) => setCampos((c) => ({ ...c, precoVenda: e.target.value }))} />
          </Campo>
          {(() => {
            const c = parseFloat(campos.precoCusto);
            const v = parseFloat(campos.precoVenda);
            if (isNaN(c) || isNaN(v) || v <= 0) return null;
            const g = v - c;
            return (
              <p className="-mt-2 text-xs font-semibold" style={{ color: g < 0 ? 'var(--brick)' : 'var(--teal)' }}>
                {g < 0 ? `Atenção: vendes abaixo do custo (perdes ${formatMoney(-g)} MT por unidade).` : `Ganhas ${formatMoney(g)} MT por unidade (${Math.round((g / v) * 100)}% do preço de venda).`}
              </p>
            );
          })()}
          <Campo label="Alertar quando o stock chegar a">
            <input className="campo" type="number" min="0" step="1" placeholder="3" value={campos.alertaEm} onChange={(e) => setCampos((c) => ({ ...c, alertaEm: e.target.value }))} />
          </Campo>
          <div className="flex gap-2 pt-1">
            {editandoId && <Botao variante="perigo" onClick={apagarAtual}>Apagar</Botao>}
            <Botao variante="secundario" onClick={() => setModalAberto(false)}>Cancelar</Botao>
            <Botao onClick={guardar}>Guardar</Botao>
          </div>
        </div>
      </Modal>

      {/* Modal Vender */}
      <Modal titulo={modalVender ? `Vender — ${modalVender.nome}` : ''} aberto={!!modalVender} aoFechar={() => setModalVender(null)}>
        {modalVender && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--ink-soft)]">Em stock: {modalVender.quantidade} · Preço {formatMoney(modalVender.precoVenda)} MT por unidade</p>
            <Campo label="Quantidade">
              <input className="campo" type="number" min="1" step="1" placeholder="1" value={vQtd} onChange={(e) => setVQtd(e.target.value)} />
            </Campo>
            <p className="-mt-2 text-sm font-semibold text-[var(--ink)]">Total: {formatMoney((parseInt(vQtd) || 0) * modalVender.precoVenda)} MT</p>
            <Campo label="Como pagou?">
              <select className="campo" value={vModo} onChange={(e) => setVModo(e.target.value)}>
                <option value="pronto">A pronto</option>
                <option value="fiado">A fiado</option>
              </select>
            </Campo>
            {vModo === 'pronto' && (
              <Campo label="Recebido em">
                <select className="campo" value={vMetodo} onChange={(e) => setVMetodo(e.target.value)}>
              {METODOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
              </Campo>
            )}
            {vModo === 'fiado' && (
              <>
                <Campo label="Nome do cliente">
                  <input className="campo" maxLength={30} placeholder="Ex: Dona Berta" value={vCliente} onChange={(e) => setVCliente(e.target.value)} />
                </Campo>
                <Campo label="WhatsApp do cliente (opcional)">
                  <input className="campo" type="tel" inputMode="tel" placeholder="Ex: 84 123 4567" value={vTelefone} onChange={(e) => setVTelefone(e.target.value)} />
                </Campo>
                <Campo label="Pagar até">
                  <input className="campo" type="date" value={vVenc} onChange={(e) => setVVenc(e.target.value)} />
                </Campo>
              </>
            )}
            <div className="flex gap-2 pt-1">
              <Botao variante="secundario" onClick={() => setModalVender(null)}>Cancelar</Botao>
              <Botao onClick={confirmarVender}>Confirmar venda</Botao>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Repor Stock */}
      <Modal titulo={modalRepor ? `Repor Stock — ${modalRepor.nome}` : ''} aberto={!!modalRepor} aoFechar={() => setModalRepor(null)}>
        <div className="space-y-4">
          <Campo label="Quantidade a Adicionar">
            <input className="campo" type="number" min="1" step="1" placeholder="0" value={reporQtd} onChange={(e) => setReporQtd(e.target.value)} />
          </Campo>
          <Campo label="Novo Preço de Custo — opcional (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="deixa em branco para manter o atual" value={reporCusto} onChange={(e) => setReporCusto(e.target.value)} />
          </Campo>
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setModalRepor(null)}>Cancelar</Botao>
            <Botao onClick={confirmarRepor}>Confirmar</Botao>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
