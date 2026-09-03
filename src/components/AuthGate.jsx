import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import Cadastro from '../pages/Cadastro';
import Login from '../pages/Login';

export default function AuthGate({ children }) {
  const { carregando, autenticado } = useAuth();
  const { carregandoDados } = useData();
  const [tela, setTela] = useState('cadastro'); // 'cadastro' | 'login'

  if (carregando || (autenticado && carregandoDados)) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mango)] font-display text-sm font-bold text-[var(--mango-ink)] animate-pulse">
          MC
        </div>
      </div>
    );
  }

  if (!autenticado) {
    return tela === 'cadastro'
      ? <Cadastro aoIrParaLogin={() => setTela('login')} />
      : <Login aoIrParaCadastro={() => setTela('cadastro')} />;
  }

  return children;
}
