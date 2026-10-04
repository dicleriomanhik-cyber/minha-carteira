import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Botao from './Botao';

// Dias que faltam até a conta ser apagada (0 = hoje ou já passou o prazo).
export function diasParaApagar(apagarEm, agora = new Date()) {
  if (!apagarEm) return null;
  const ms = new Date(apagarEm).getTime() - agora.getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86400000));
}

export function textoPrazo(dias) {
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'em 1 dia';
  return `em ${dias} dias`;
}

export default function ContaEmExclusaoAviso() {
  const { profile, cancelarExclusao } = useAuth();
  const [aRecuperar, setARecuperar] = useState(false);
  const [erro, setErro] = useState('');
  const dias = diasParaApagar(profile?.apagar_em);
  if (dias === null) return null;

  async function aoRecuperar() {
    setErro('');
    setARecuperar(true);
    const { error } = await cancelarExclusao();
    setARecuperar(false);
    if (error) setErro('Não foi possível recuperar a conta agora. Tenta novamente.');
  }

  return (
    <div className="mb-4 rounded-2xl border border-[var(--brick)] bg-[var(--brick-soft)] p-4">
      <p className="text-sm font-semibold text-[var(--brick)]">A tua conta vai ser apagada {textoPrazo(dias)}.</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--ink-soft)]">
        Se não queres perder os teus dados, recupera a conta agora. Depois do prazo, tudo é apagado de forma permanente.
      </p>
      {erro && <p className="mt-2 text-sm text-[var(--brick)]">{erro}</p>}
      <div className="mt-3">
        <Botao onClick={aoRecuperar} disabled={aRecuperar}>{aRecuperar ? 'A recuperar...' : 'Recuperar a conta'}</Botao>
      </div>
    </div>
  );
}
