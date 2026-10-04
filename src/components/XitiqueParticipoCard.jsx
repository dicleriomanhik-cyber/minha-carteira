import { useState } from 'react';
import Botao from './Botao';
import Campo from './Campo';
import Modal from './Modal';
import SeletorDia from './SeletorDia';
import PagarParteModal from './PagarParteModal';
import XitiqueFormModal from './XitiqueFormModal';
import { useData } from '../context/DataContext';
import { useDialog } from './DialogProvider';
import { formatMoney, HOJE_KEY } from '../utils/format';

const soma = (arr) => Math.round(arr.reduce((s, m) => s + m.valor, 0) * 100) / 100;

// Cartão de um xitique em que só participas: pagas a tua parte (sai do Caixa) e recebes a tua vez (vai para o Xitique da Poupança).
// Usado na aba Xitique e na parte Xitique da Poupança, para o comportamento ser igual nos dois sítios.
export default function XitiqueParticipoCard({ x, aoApagar }) {
  const { xitiquePessoal, salvarXitique, deleteXitique, pagarMinhaParte, receberMinhaVez } = useData();
  const { confirmar, avisar } = useDialog();
  const [editar, setEditar] = useState(false);
  const [pagar, setPagar] = useState(false);
  const [vez, setVez] = useState(false);
  const [valorVez, setValorVez] = useState('');
  const [diaVez, setDiaVez] = useState(HOJE_KEY);

  const pago = soma(xitiquePessoal.filter((m) => m.tipo === 'pago' && m.xitiqueId === x.id));
  const recebido = soma(xitiquePessoal.filter((m) => m.tipo === 'recebido' && m.xitiqueId === x.id));

  function abrirVez() {
    setValorVez('');
    setDiaVez(HOJE_KEY);
    setVez(true);
  }

  async function confirmarVez() {
    const v = parseFloat(valorVez);
    if (!v || v <= 0) { await avisar('Introduz um valor válido.'); return; }
    receberMinhaVez(x.id, v, diaVez);
    setVez(false);
  }

  async function apagar() {
    const ok = await confirmar(
      `Apagar o xitique "${x.nome}"? Os pagamentos que fizeste saem do histórico e o dinheiro volta ao saldo do Caixa. O que já recebeste na tua vez continua no teu Xitique.`,
      { perigo: true, textoOk: 'Apagar' },
    );
    if (!ok) return;
    deleteXitique(x.id);
    setEditar(false);
    if (aoApagar) aoApagar();
  }

  return (
    <>
      <section className="rounded-2xl bg-[var(--paper)] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-[var(--ink)]">{x.nome}</p>
            <p className="font-mono-ref mt-0.5 text-xs text-[var(--ink-soft)]">Pagas {formatMoney(x.valor)} MT por ronda</p>
          </div>
          <button onClick={() => setEditar(true)} className="shrink-0 text-[11px] font-semibold text-[var(--ink-soft)]">Editar</button>
        </div>
        <div className="font-mono-ref mt-2 flex gap-4 text-xs text-[var(--ink)]">
          <span>Já pagaste <b>{formatMoney(pago)}</b></span>
          <span>Recebeste <b>{formatMoney(recebido)}</b></span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-dashed border-[var(--ink)]/10 pt-3">
          <button onClick={() => setPagar(true)} className="rounded-full bg-[var(--mango-soft)] px-3 py-2 text-xs font-semibold text-[var(--mango)]">Paguei a minha parte</button>
          <button onClick={abrirVez} className="rounded-full bg-[var(--teal-soft)] px-3 py-2 text-xs font-semibold text-[var(--teal)]">Recebi a minha vez</button>
        </div>
      </section>

      <XitiqueFormModal
        aberto={editar}
        aoFechar={() => setEditar(false)}
        titulo="Editar xitique"
        inicial={{ nome: x.nome, valor: x.valor }}
        ajuda="Para um xitique em que não giras o dinheiro: só registas o que tu pagas e o que tu recebes."
        aoGuardar={({ nome, valor }) => { salvarXitique({ id: x.id, nome, papel: 'participa', valor }); setEditar(false); }}
        aoApagar={apagar}
      />

      <PagarParteModal
        aberto={pagar}
        aoFechar={() => setPagar(false)}
        titulo={`A tua parte em ${x.nome}`}
        valorInicial={x.valor}
        aoConfirmar={({ valor, dia, setor, metodo }) => { pagarMinhaParte(x.id, valor, dia, { setor, metodo }); setPagar(false); }}
      />

      <Modal titulo={`A tua vez em ${x.nome}`} aberto={vez} aoFechar={() => setVez(false)}>
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-[var(--ink-soft)]">Este valor vai para o Xitique da tua Poupança. Não entra no Caixa nem nas vendas.</p>
          <Campo label="Dia">
            <SeletorDia value={diaVez} onChange={setDiaVez} />
          </Campo>
          <Campo label="Valor recebido (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorVez} onChange={(e) => setValorVez(e.target.value)} />
          </Campo>
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setVez(false)}>Cancelar</Botao>
            <Botao onClick={confirmarVez}>Guardar</Botao>
          </div>
        </div>
      </Modal>
    </>
  );
}
