import { useData } from '../context/DataContext';
import { formatMoney } from '../utils/format';

// Aviso no Caixa quando entram vendas registadas pelos funcionários. Some ao tocar em "Ok".
export default function VendasFuncionariosAviso() {
  const { vendasFuncionariosNovas, limparVendasFuncionariosNovas } = useData();
  if (!vendasFuncionariosNovas) return null;
  const { n, total } = vendasFuncionariosNovas;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[var(--teal-soft)] px-4 py-3" role="status">
      <p className="min-w-0 flex-1 text-[13px] text-[var(--ink)]">
        <span className="font-semibold text-[var(--teal)]">{n === 1 ? 'Entrou 1 venda' : `Entraram ${n} vendas`} de funcionários</span>
        {' '}no Caixa e no Stock: {formatMoney(total)} MT.
      </p>
      <button type="button" onClick={limparVendasFuncionariosNovas} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--teal)]">Ok</button>
    </div>
  );
}
