import { dicaDoDia, numeroDoDia } from '../utils/dicas';

// Cartão do Caixa com a dica de gestão do dia. Muda sozinha todos os dias.
export default function DicaDoDia() {
  const dica = dicaDoDia(new Date());
  return (
    <div className="mt-3 rounded-2xl bg-[var(--paper)] p-4" key={numeroDoDia(new Date())}>
      <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide">
        <span className="text-[var(--mango)]">Dica do dia</span>
        <span className="text-[var(--ink-soft)]">{dica.cat}</span>
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink)]">{dica.texto}</p>
    </div>
  );
}
