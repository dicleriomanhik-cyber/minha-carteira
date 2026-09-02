export default function Linha({ avatar, aoTocarMeio, titulo, subtitulo, badge, acao, aoApagar }) {
  return (
    <div className="flex items-center gap-3 border-b border-dashed border-[var(--ink)]/10 py-3 last:border-none">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] font-display text-sm font-bold text-[var(--ink)]">
        {avatar}
      </div>
      <button type="button" onClick={aoTocarMeio} className="min-w-0 flex-1 text-left" disabled={!aoTocarMeio}>
        <div className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-[var(--ink)]">
          <span className="truncate">{titulo}</span>
          {badge}
        </div>
        {subtitulo && <div className="font-mono-ref truncate text-[11.5px] text-[var(--ink-soft)]">{subtitulo}</div>}
      </button>
      {acao}
      {aoApagar && (
        <button onClick={aoApagar} aria-label="Apagar" className="shrink-0 p-1 text-[var(--ink-soft)] opacity-50 transition hover:opacity-100">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
