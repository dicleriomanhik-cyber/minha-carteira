import { useMemo, useState } from 'react';
import RelatorioModal from './RelatorioModal';
import { useData } from '../context/DataContext';
import { lucroDoMes } from '../utils/graficos';
import { chaveMes } from '../utils/metas';
import { formatMoney } from '../utils/format';

// Cartão do Caixa com o lucro líquido do mês (o mesmo número do Relatório mensal) e a comparação com o mês passado.
export default function LucroMesCard() {
  const { transacoes } = useData();
  const [aberto, setAberto] = useState(false);
  const mesChave = chaveMes(new Date());
  const l = useMemo(() => lucroDoMes(transacoes, new Date()), [transacoes, mesChave]); // eslint-disable-line react-hooks/exhaustive-deps

  const positivo = l.lucro >= 0;
  const cor = positivo ? 'var(--teal)' : 'var(--brick)';
  const comparacao = l.diferenca === null
    ? 'Ainda não há dados do mês passado para comparar.'
    : l.diferenca === 0
      ? 'Igual ao mês passado.'
      : `${l.diferenca > 0 ? 'Mais' : 'Menos'} ${formatMoney(Math.abs(l.diferenca))} MT do que no mês passado.`;

  return (
    <>
      <button onClick={() => setAberto(true)} className="mt-3 block w-full rounded-2xl p-4 text-left active:scale-[0.99]" style={{ background: !l.temDados || positivo ? 'var(--teal-soft)' : 'var(--brick-soft)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: cor }}>
          {!l.temDados || positivo ? 'Lucro do mês' : 'Prejuízo do mês'}
        </p>
        {l.temDados ? (
          <>
            <p className="font-display mt-0.5 text-2xl font-bold" style={{ color: cor }}>
              {formatMoney(l.lucro)} <span className="text-sm">MT</span>
            </p>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">{comparacao}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Ainda sem movimentos este mês.</p>
        )}
        <p className="mt-1.5 text-[11px] font-semibold text-[var(--mango)]">Ver Relatório do mês</p>
      </button>
      <RelatorioModal aberto={aberto} aoFechar={() => setAberto(false)} periodoInicial="mes" />
    </>
  );
}
