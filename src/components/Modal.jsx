export default function Modal({ titulo, subtitulo, children, aberto, aoFechar, tamanho = 'normal' }) {
  if (!aberto) return null;
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={aoFechar}
    >
      <div
        className={`max-h-[92vh] w-full ${tamanho === 'larga' ? 'sm:max-w-md' : 'sm:max-w-sm'} overflow-y-auto rounded-t-2xl bg-[var(--paper)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--ink)]">{titulo}</h2>
            {subtitulo && <p className="mt-1 text-sm text-[var(--ink-soft)]">{subtitulo}</p>}
          </div>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="shrink-0 rounded-full p-1.5 text-[var(--ink-soft)] transition hover:bg-black/5"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
