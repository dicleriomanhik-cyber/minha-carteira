import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';

export default function AlertBanner() {
  const { computeAlertas } = useData();
  const navigate = useNavigate();
  const alertas = computeAlertas();
  if (alertas.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {alertas.map((a, i) => (
        <button
          key={i}
          onClick={() => navigate(a.tipo === 'stock' ? '/produtos' : '/fiados')}
          className="block w-full rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium leading-snug"
          style={{ background: a.tipo === 'stock' ? 'var(--amber-soft)' : 'var(--brick-soft)', color: a.tipo === 'stock' ? 'var(--amber)' : 'var(--brick)' }}
        >
          {a.texto}
        </button>
      ))}
    </div>
  );
}
