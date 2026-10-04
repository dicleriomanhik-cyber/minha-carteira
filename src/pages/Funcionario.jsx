import { useState } from 'react';
import FuncionarioEntrar from './FuncionarioEntrar';
import FuncionarioVendas from './FuncionarioVendas';
import { lerSessao, limparSessao, sairFuncionario } from '../utils/funcionarioSessao';

// Página /funcionario: ecrã de entrada (código da loja + PIN) e, depois de entrar, o registo de vendas.
// Não precisa de conta no Supabase: a segurança é o token devolvido por func_entrar.
export default function Funcionario() {
  const [sessao, setSessao] = useState(() => lerSessao());
  const [aviso, setAviso] = useState('');

  if (!sessao) {
    return <FuncionarioEntrar aviso={aviso} aoEntrar={(s) => { setAviso(''); setSessao(s); }} />;
  }

  return (
    <FuncionarioVendas
      sessao={sessao}
      aoSair={async () => { await sairFuncionario(sessao.token); setAviso(''); setSessao(null); }}
      aoSessaoTerminou={() => { limparSessao(); setAviso('A tua sessão terminou. Entra outra vez.'); setSessao(null); }}
    />
  );
}
