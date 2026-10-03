import { NavLink } from 'react-router-dom';

const ITENS = [
  {
    to: '/',
    label: 'Caixa',
    icone: (ativo) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={ativo ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
        <path d="M3 12h18" />
      </svg>
    ),
  },
  {
    to: '/fiados',
    label: 'Fiados',
    icone: (ativo) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={ativo ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M6 3.5h9l3 3V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5Z" strokeLinejoin="round" />
        <path d="M9 9h6M9 12.5h6M9 16h3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/produtos',
    label: 'Stock',
    icone: (ativo) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={ativo ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M3.5 8 12 4l8.5 4-8.5 4-8.5-4Z" strokeLinejoin="round" />
        <path d="M3.5 8v8L12 20l8.5-4V8" strokeLinejoin="round" />
        <path d="M12 12v8" />
      </svg>
    ),
  },
  {
    to: '/xitique',
    label: 'Xitique',
    icone: (ativo) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={ativo ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <circle cx="8.5" cy="8.5" r="3.2" />
        <circle cx="16" cy="10" r="2.6" />
        <path d="M3.2 19c.8-3.2 2.9-5 5.3-5s4.5 1.8 5.3 5" strokeLinecap="round" />
        <path d="M14.3 14.3c1.9.3 3.4 1.9 4 4.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/despesas',
    label: 'Despesas',
    icone: (ativo) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={ativo ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6.5 9.5v.01M17.5 14.5v.01" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/poupanca',
    label: 'Poupança',
    icone: (ativo) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={ativo ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="6.5" rx="6.5" ry="2.8" />
        <path d="M5.5 6.5v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5" strokeLinejoin="round" />
        <path d="M5.5 11.5v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-black/10 bg-[var(--bg-soft)] px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]"
      aria-label="Navegação principal"
    >
      {ITENS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className="flex flex-1 flex-col items-center py-1"
        >
          {({ isActive }) => (
            <span
              className="flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-medium transition-colors"
              style={{
                background: isActive ? 'var(--mango-soft)' : 'transparent',
                color: isActive ? 'var(--mango)' : 'var(--cream-soft)',
              }}
            >
              {item.icone(isActive)}
              {item.label}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
