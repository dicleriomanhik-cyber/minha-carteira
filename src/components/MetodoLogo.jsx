const LOGOS = {
  dinheiro: '/metodos/dinheiro.png',
  mpesa: '/metodos/mpesa.png',
  emola: '/metodos/emola.png',
  mkesh: '/metodos/mkesh.png',
};

// Logo do método de pagamento. "dinheiro" usa a moeda de 10 MT.
export default function MetodoLogo({ id, className = 'h-7 w-7' }) {
  const src = LOGOS[id];
  if (!src) return null;
  const forma = id === 'dinheiro' ? 'rounded-full' : 'rounded-lg';
  return <img src={src} alt="" aria-hidden="true" className={`${className} shrink-0 object-cover ${forma}`} />;
}
