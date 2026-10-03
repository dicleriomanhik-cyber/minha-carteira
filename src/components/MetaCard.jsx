import { useMemo, useState } from 'react';
import Modal from './Modal';
import Botao from './Botao';
import Campo from './Campo';
import { IconeMeta } from './Icons';
import { useData } from '../context/DataContext';
import { useDialog } from './DialogProvider';
import { calcResultado } from '../utils/resultado';
import { progressoMeta, chaveMes } from '../utils/metas';
import { formatMoney } from '../utils/format';

// Cartão da meta de vendas do mês, no Caixa. Tocar abre o ecrã para definir ou mudar a meta.
export default function MetaCard() {
  const { transacoes, metaVendas, definirMetaVendas } = useData();
  const { avisar } = useDialog();
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState('');

  const hoje = new Date();
  const mes = chaveMes(hoje);
  const prog = useMemo(() => {
    const doMes = transacoes.filter((t) => typeof t.dateKey === 'string' && t.dateKey.startsWith(mes));
    return progressoMeta(metaVendas, calcResultado(doMes).receita, new Date());
  }, [transacoes, metaVendas, mes]);

  function abrir() {
    setValor(metaVendas ? String(metaVendas) : '');
    setAberto(true);
  }

  async function guardar() {
    const v = parseFloat(String(valor).replace(',', '.'));
    if (!v || v <= 0) { await avisar('Introduz um valor válido para a meta.'); return; }
    definirMetaVendas(v);
    setAberto(false);
  }

  function remover() {
    definirMetaVendas(null);
    setAberto(false);
  }

  return (
    <>
      {!prog.temMeta ? (
        <button onClick={abrir} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--paper)] py-3 text-[13px] font-semibold text-[var(--ink)] active:scale-[0.98]">
          <IconeMeta className="h-5 w-5 text-[var(--mango)]" />Definir meta de vendas do mês
        </button>
      ) : (
        <button onClick={abrir} className="mt-3 block w-full rounded-2xl bg-[var(--paper)] p-4 text-left active:scale-[0.99]">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              <IconeMeta className="h-5 w-5 text-[var(--mango)]" />Meta de vendas do mês
            </p>
            <span className="font-mono-ref text-sm font-bold text-[var(--ink)]">{prog.pct}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--bg-soft)]">
            <div
              className={`h-full rounded-full ${prog.atingida || prog.noRitmo ? 'bg-[var(--teal)]' : 'bg-[var(--mango)]'}`}
              style={{ width: `${prog.pct}%` }}
            />
          </div>
          <p className="font-mono-ref mt-2 text-sm font-semibold text-[var(--ink)]">
            {formatMoney(prog.vendido)} <span className="text-xs font-medium text-[var(--ink-soft)]">de {formatMoney(prog.meta)} MT</span>
          </p>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            {prog.atingida
              ? 'Meta atingida. Parabéns!'
              : `Faltam ${formatMoney(prog.falta)} MT. ${prog.diasRestantes === 1 ? 'Hoje é o último dia do mês' : `Restam ${prog.diasRestantes} dias`}: dá ${formatMoney(prog.porDia)} MT por dia. ${prog.noRitmo ? 'Estás acima do ritmo.' : 'Estás abaixo do ritmo.'}`}
          </p>
        </button>
      )}

      <Modal titulo="Meta de vendas do mês" subtitulo="Fica igual em todos os meses até a mudares" aberto={aberto} aoFechar={() => setAberto(false)}>
        <div className="space-y-4">
          <Campo label="Meta (MT)" hint="Conta as vendas e serviços do mês, sem trocos, o mesmo valor que vês no Relatório.">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
          <div className="flex gap-2">
            <Botao variante="secundario" onClick={() => setAberto(false)}>Cancelar</Botao>
            <Botao onClick={guardar}>Guardar</Botao>
          </div>
          {metaVendas > 0 && <Botao variante="fantasma" onClick={remover}>Remover meta</Botao>}
        </div>
      </Modal>
    </>
  );
}
