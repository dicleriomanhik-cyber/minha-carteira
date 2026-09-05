import { useEffect, useRef } from 'react';

export default function Modal({ titulo, subtitulo, children, aberto, aoFechar, tamanho = 'normal' }) {
  const conteudoRef = useRef(null);

  // O index.html já pede ao telemóvel para redimensionar o próprio conteúdo
  // quando o teclado abre (meta viewport "interactive-widget=resizes-content").
  // Por isso a janela usa apenas `100dvh` (unidade que já acompanha essa
  // mudança sozinha) — nada de recalcular a altura à mão em JavaScript, que
  // competia com o redimensionamento nativo e fazia a janela "não se mover"
  // ou parecer fechar quando o teclado aparecia.
  useEffect(() => {
    if (!aberto) return undefined;
    const el = conteudoRef.current;
    if (!el) return undefined;
    function aoFocar(e) {
      if (e.target.matches?.('input, textarea, select')) {
        // Espera o teclado (e o redimensionamento nativo) assentar antes de
        // rolar o campo para o centro da janela ainda visível.
        setTimeout(() => {
          e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 300);
      }
    }
    el.addEventListener('focusin', aoFocar);
    return () => el.removeEventListener('focusin', aoFocar);
  }, [aberto]);

  if (!aberto) return null;
  return (
    <div
      className="fixed inset-x-0 top-0 z-30 flex h-[100dvh] items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={aoFechar}
    >
      <div
        ref={conteudoRef}
        className={`max-h-[92%] w-full ${tamanho === 'larga' ? 'sm:max-w-md' : 'sm:max-w-sm'} overflow-y-auto rounded-t-2xl bg-[var(--paper)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl`}
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
