import MetodoLogo from './MetodoLogo';
import { useData, METODOS } from '../context/DataContext';
import { formatMoney } from '../utils/format';

// Escolha do método de pagamento com os logos. Com "saldo", mostra quanto há em cada método.
export default function SeletorMetodo({ value, onChange, saldo = false }) {
  const { saldoPorMetodo } = useData();
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup">
      {METODOS.map((m) => {
        const ativo = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(m.id)}
            className={`flex items-center gap-2.5 rounded-xl border-2 px-2.5 py-2 text-left transition active:scale-[0.98] ${ativo ? 'border-[var(--mango)] bg-[var(--mango-soft)]' : 'border-transparent bg-[var(--bg-soft)]'}`}
          >
            <MetodoLogo id={m.id} className="h-8 w-8" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">{m.label}</span>
              {saldo && <span className="font-mono-ref block text-[10.5px] text-[var(--ink-soft)]">{formatMoney(saldoPorMetodo[m.id] || 0)} MT</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
