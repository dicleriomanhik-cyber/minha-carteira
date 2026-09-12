import { diasRecentes, DIAS_BACKDATE_PERMITIDOS } from '../utils/format';

// Fila de chips com os últimos N dias (hoje incluído) para escolher a que dia
// pertence um registo — usado para permitir lançar movimentos esquecidos.
export default function SeletorDia({ value, onChange, dias = DIAS_BACKDATE_PERMITIDOS }) {
  const opcoes = diasRecentes(dias);
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
      {opcoes.map((o) => (
        <button
          key={o.dateKey}
          type="button"
          onClick={() => onChange(o.dateKey)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            value === o.dateKey ? 'bg-[var(--mango)] text-[var(--mango-ink)]' : 'bg-[var(--bg-soft)] text-[var(--ink-soft)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
