import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Campo from '../components/Campo';
import Botao from '../components/Botao';
import MensagemErro from '../components/MensagemErro';

export default function Login({ aoIrParaCadastro }) {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [aEnviar, setAEnviar] = useState(false);

  async function aoSubmeter(e) {
    e.preventDefault();
    setErro('');
    if (!email.trim() || !senha) return setErro('Preenche o email e a senha.');
    setAEnviar(true);
    const { error } = await entrar({ email: email.trim(), senha });
    setAEnviar(false);
    if (error) {
      if (error.message?.toLowerCase().includes('invalid')) {
        setErro('Email ou senha incorretos.');
      } else if (error.message?.toLowerCase().includes('confirm')) {
        setErro('Confirma primeiro o teu email — verifica a caixa de entrada.');
      } else {
        setErro(error.message || 'Não foi possível entrar. Tenta novamente.');
      }
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mango)] font-display text-xl font-bold text-[var(--mango-ink)]">
            MC
          </div>
          <h1 className="font-display text-xl font-bold text-[var(--ink)]">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Entra com a tua conta do Minha Carteira.</p>
        </div>

        <form onSubmit={aoSubmeter} className="space-y-3.5">
          <Campo label="Email">
            <input className="campo" type="email" placeholder="teuemail@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Campo>
          <Campo label="Senha">
            <input className="campo" type="password" placeholder="A tua senha" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
          </Campo>

          {erro && <MensagemErro>{erro}</MensagemErro>}

          <div className="pt-2">
            <Botao type="submit" disabled={aEnviar}>{aEnviar ? 'A entrar...' : 'Entrar'}</Botao>
          </div>
          <Botao type="button" variante="fantasma" onClick={aoIrParaCadastro}>Não tenho conta — Criar conta</Botao>
        </form>
      </div>
    </div>
  );
}
