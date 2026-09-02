export default function PillButton({ children, ativo, ...props }) {
  return (
    <button
      {...props}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        ativo
          ? 'bg-[var(--mango)] text-[var(--mango-ink)]'
          : 'border border-[var(--ink-soft)]/25 text-[var(--ink-soft)] hover:bg-black/5'
      }`}
    >
      {children}
    </button>
  );
}
