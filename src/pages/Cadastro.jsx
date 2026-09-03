import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Campo from '../components/Campo';
import Botao from '../components/Botao';
import MensagemErro from '../components/MensagemErro';

export default function Cadastro({ aoIrParaLogin }) {
  const { cadastrar } = useAuth();
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [aEnviar, setAEnviar] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function aoSubmeter(e) {
    e.preventDefault();
    setErro('');
    if (!nome.trim()) return setErro('Escreve o teu nome.');
    if (!whatsapp.trim()) return setErro('Escreve o teu número de WhatsApp.');
    if (!email.trim()) return setErro('Escreve o teu email.');
    if (senha.length < 6) return setErro('A senha precisa de pelo menos 6 caracteres.');
    if (senha !== confirmarSenha) return setErro('As senhas não coincidem.');

    setAEnviar(true);
    const { error } = await cadastrar({ nome: nome.trim(), whatsapp: whatsapp.trim(), email: email.trim(), senha });
    setAEnviar(false);
    if (error) {
      if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('registered')) {
        setErro('Já existe uma conta com este email. Toca em "Já tenho conta" para entrar.');
      } else {
        setErro(error.message || 'Não foi possível criar a conta. Tenta novamente.');
      }
      return;
    }
    setSucesso(true);
  }

  if (sucesso) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">📩</div>
        <h1 className="font-display text-xl font-bold text-[var(--ink)]">Confirma o teu email</h1>
        <p className="max-w-xs text-sm text-[var(--ink-soft)]">
          Enviámos um link de confirmação para <strong>{email}</strong>. Abre o email e toca no link para ativares a tua conta, depois volta aqui e entra.
        </p>
        <div className="mt-2 w-full max-w-xs">
          <Botao onClick={aoIrParaLogin}>Ir para o Login</Botao>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mango)] font-display text-xl font-bold text-[var(--mango-ink)]">
            MC
          </div>
          <h1 className="font-display text-xl font-bold text-[var(--ink)]">Criar conta</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Cria a tua conta para começares a usar o Minha Carteira.</p>
        </div>

        <form onSubmit={aoSubmeter} className="space-y-3.5">
          <Campo label="Nome completo">
            <input className="campo" placeholder="O teu nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
          </Campo>
          <Campo label="Número de WhatsApp">
            <input className="campo" type="tel" placeholder="+258 84..." value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} autoComplete="tel" />
          </Campo>
          <Campo label="Email">
            <input className="campo" type="email" placeholder="teuemail@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Campo>
          <Campo label="Senha">
            <input className="campo" type="password" placeholder="Pelo menos 6 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
          </Campo>
          <Campo label="Confirmar senha">
            <input className="campo" type="password" placeholder="Repete a senha" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} autoComplete="new-password" />
          </Campo>

          {erro && <MensagemErro>{erro}</MensagemErro>}

          <div className="pt-2">
            <Botao type="submit" disabled={aEnviar}>{aEnviar ? 'A criar conta...' : 'Criar conta'}</Botao>
          </div>
          <Botao type="button" variante="fantasma" onClick={aoIrParaLogin}>Já tenho conta — Entrar</Botao>
        </form>
      </div>
    </div>
  );
}
