import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';

const ESTILOS = {
  stock: { background: 'var(--amber-soft)', color: 'var(--amber)' },
  lembrete: { background: 'var(--amber-soft)', color: 'var(--amber)' },
  fiado: { background: 'var(--brick-soft)', color: 'var(--brick)' },
  fecho: { background: 'var(--mango-soft)', color: 'var(--mango)' },
};

export default function AlertBanner({ aoAbrirFecho, aoAbrirLembretes }) {
  const { computeAlertas } = useData();
  const navigate = useNavigate();
  const alertas = computeAlertas();
  if (alertas.length === 0) return null;

  function abrir(a) {
    if (a.tipo === 'stock') navigate('/produtos');
    else if (a.tipo === 'fiado') navigate('/fiados');
    else if (a.tipo === 'lembrete') aoAbrirLembretes?.();
    else if (a.tipo === 'fecho') aoAbrirFecho?.();
  }

  return (
    <div className="mb-4 space-y-2">
      {alertas.map((a, i) => (
        <button
          key={i}
          onClick={() => abrir(a)}
          className="block w-full rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium leading-snug"
          style={ESTILOS[a.tipo] || ESTILOS.fiado}
        >
          {a.texto}
        </button>
      ))}
    </div>
  );
}
