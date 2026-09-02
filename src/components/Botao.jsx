export default function Botao({ children, variante = 'primario', className = '', ...props }) {
  const base = 'w-full rounded-full px-4 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100';
  const variantes = {
    primario: 'bg-[var(--mango)] text-[var(--mango-ink)] hover:brightness-110',
    secundario: 'bg-transparent text-[var(--mango)] border border-[var(--mango)] hover:bg-[var(--mango)]/10',
    perigo: 'bg-[var(--brick)] text-white hover:brightness-110',
    fantasma: 'text-[var(--mango)] hover:bg-black/[0.04]',
  };
  return (
    <button className={`${base} ${variantes[variante]} ${className}`} {...props}>
      {children}
    </button>
  );
}
