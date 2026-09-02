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
    to: '/poupanca',
    label: 'Poupança',
    icone: (ativo) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={ativo ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M4 12.5c0-3.6 3.1-6.5 7.4-6.5 3.6 0 6.1 1.6 7.1 3.5H20a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1.2l-.9 2.2a1 1 0 0 1-.93.8H15v1.5a1 1 0 0 1-1 1h-1.2a1 1 0 0 1-1-.86l-.13-1a8 8 0 0 1-2.2-.4L8 18.5a1 1 0 0 1-.86.5H6a1 1 0 0 1-1-1v-1.8C4.4 15.4 4 14 4 12.5Z" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="16.5" cy="9.7" r="0.6" fill="currentColor" stroke="none" />
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
              className="flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10.5px] font-medium transition-colors"
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
