import { useData } from '../context/DataContext';

export default function Header({ aoAbrirRelatorio, aoAbrirConfig }) {
  const { usuarioNome, setUsuarioNome } = useData();

  function editarNome() {
    const nome = window.prompt('Como te chamas?', usuarioNome || '');
    if (nome === null) return;
    setUsuarioNome(nome.trim());
  }

  const iniciais = usuarioNome
    ? usuarioNome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
    : null;

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-[var(--bg)]/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--mango)] font-display text-sm font-bold text-[var(--mango-ink)]">
            MC
          </div>
          <div>
            <span className="block font-display text-base font-semibold leading-tight text-[var(--cream)]">Minha Carteira</span>
            <span className="block text-[10px] leading-tight text-[var(--cream-soft)]">Powered by SmartMetrics</span>
          </div>
        </div>
        <button
          onClick={aoAbrirConfig}
          aria-label="Definições e backup"
          className="rounded-full p-2 text-[var(--ink-soft)] transition hover:bg-black/5"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.6a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-1.5">
        <button onClick={editarNome} className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-[var(--cream-soft)]">
          {usuarioNome || 'Toca para pores o teu nome'}
        </button>
        <button
          onClick={aoAbrirRelatorio}
          aria-label="Ver relatórios"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-sm font-bold text-[var(--ink-soft)]"
        >
          {iniciais || '👤'}
        </button>
      </div>
    </header>
  );
}
