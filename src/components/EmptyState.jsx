export default function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--ink-soft)]/25 px-4 py-8 text-center text-sm leading-relaxed text-[var(--ink-soft)]">
      {children}
    </div>
  );
}
