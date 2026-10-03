const LOGOS = {
  mpesa: '/metodos/mpesa.png',
  emola: '/metodos/emola.png',
  mkesh: '/metodos/mkesh.png',
};

// Logo do método de pagamento. "dinheiro" usa a nota de 100 MT.
export default function MetodoLogo({ id, className = 'h-7 w-7' }) {
  if (id === 'dinheiro') {
    // A nota é larga: mantém a proporção e só usa a altura da classe.
    return (
      <img
        src="/metodos/dinheiro.jpg"
        alt=""
        aria-hidden="true"
        style={{ aspectRatio: '2.27 / 1' }}
        className={`${className.replace(/\bw-\S+/g, '')} w-auto shrink-0 rounded-md object-cover shadow-sm`}
      />
    );
  }
  if (LOGOS[id]) {
    return <img src={LOGOS[id]} alt="" aria-hidden="true" className={`${className} shrink-0 rounded-lg object-cover`} />;
  }
  return null;
}
