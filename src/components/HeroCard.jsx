import { formatMoney } from '../utils/format';

export default function HeroCard({ label, valor, sub, children, acao }) {
  return (
    <section className="rounded-2xl bg-[var(--ink)] p-5 text-[var(--paper)]">
      {acao}
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--paper)]/60">{label}</p>
      <p className="font-display mt-1 text-3xl font-bold leading-none">
        {formatMoney(valor)}
        <span className="ml-1.5 text-sm font-semibold text-[var(--paper)]/50">MT</span>
      </p>
      {sub && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--paper)]/70">{sub}</div>}
      {children}
    </section>
  );
}
