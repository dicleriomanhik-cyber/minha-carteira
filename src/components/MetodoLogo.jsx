const LOGOS = {
  mpesa: '/metodos/mpesa.png',
  emola: '/metodos/emola.png',
  mkesh: '/metodos/mkesh.png',
};

// Logo do método de pagamento. "dinheiro" usa um ícone de notas.
export default function MetodoLogo({ id, className = 'h-7 w-7' }) {
  if (LOGOS[id]) {
    return <img src={LOGOS[id]} alt="" aria-hidden="true" className={`${className} shrink-0 rounded-lg object-cover`} />;
  }
  return (
    <span className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-[var(--teal-soft)] text-[var(--teal)]`}>
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M6 9.5v.01M18 14.5v.01" />
      </svg>
    </span>
  );
}
