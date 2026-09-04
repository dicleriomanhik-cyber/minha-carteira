// Ícones em linha (mesmo estilo dos SVGs já usados no Header/Modal),
// para substituir os emojis por algo mais consistente com o design.

export function IconeCamara({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconeCaneta({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13.5 6.5 17.5 10.5 8 20H4v-4L13.5 6.5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconeBackup({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 4v11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11.5 12 15l4-3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 16v1.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
