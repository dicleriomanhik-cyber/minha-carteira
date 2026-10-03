import { useMemo, useState } from 'react';
import Modal from './Modal';
import { useData } from '../context/DataContext';
import { agruparClientes } from '../utils/clientesFiado';
import { formatMoney, iniciais, semEmoji } from '../utils/format';

function Estado({ estado }) {
  if (estado === 'passou') return <span className="rounded-full bg-[var(--brick-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--brick)]">Passou o limite</span>;
  if (estado === 'perto') return <span className="rounded-full bg-[var(--amber-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--amber)]">Perto do limite</span>;
  return null;
}

export default function ClientesFiadoModal({ aberto, aoFechar, aoEscolher }) {
  const { fiados, limitesFiado, saldoFiado } = useData();
  const [filtro, setFiltro] = useState('');

  const clientes = useMemo(() => (aberto ? agruparClientes(fiados, limitesFiado, saldoFiado) : []), [aberto, fiados, limitesFiado, saldoFiado]);
  const f = filtro.trim().toLowerCase();
  const lista = f ? clientes.filter((c) => c.nome.toLowerCase().includes(f)) : clientes;

  return (
    <Modal titulo="Clientes" subtitulo="Toca num cliente para ver a ficha" aberto={aberto} aoFechar={aoFechar} tamanho="larga">
      <div className="space-y-3">
        {clientes.length > 6 && (
          <input className="campo" placeholder="Procurar cliente" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        )}
        {clientes.length === 0 ? (
          <p className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm text-[var(--ink-soft)]">Ainda não há clientes com fiado. Quando registares um fiado, o cliente aparece aqui.</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">Nenhum cliente com esse nome.</p>
        ) : (
          <div>
            {lista.map((c) => (
              <button key={c.chave} type="button" onClick={() => aoEscolher(c.chave)} className="flex w-full items-center gap-3 border-b border-dashed border-[var(--ink)]/10 py-3 text-left last:border-none">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] font-display text-sm font-bold text-[var(--ink)]">{iniciais(c.nome)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--ink)]">
                    <span className="truncate">{semEmoji(c.nome)}</span>
                    <Estado estado={c.estado} />
                  </span>
                  <span className="font-mono-ref block truncate text-[11.5px] text-[var(--ink-soft)]">
                    {c.deve > 0 ? `deve ${formatMoney(c.deve)} MT` : 'não deve nada'}
                    {c.limite ? ` · limite ${formatMoney(c.limite)} MT` : ''}
                  </span>
                </span>
                <span aria-hidden="true" className="text-[var(--ink)]">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
