import { useState } from 'react';
import { Link } from 'react-router-dom';
import Campo from '../components/Campo';
import Botao from '../components/Botao';
import MensagemErro from '../components/MensagemErro';
import { entrarFuncionario, lerCodigoGuardado, limparCodigo } from '../utils/funcionarioSessao';
import { limparPin, pinValido } from '../utils/acessoFuncionarios';

function IconeOlho({ aberto }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {!aberto && <path d="M4 4l16 16" />}
    </svg>
  );
}

// Ecrã de entrada do funcionário: código da loja (6 caracteres) + PIN (4 a 6 números).
export default function FuncionarioEntrar({ aoEntrar, aviso = '' }) {
  const [codigo, setCodigo] = useState(() => lerCodigoGuardado());
  const [pin, setPin] = useState('');
  const [verPin, setVerPin] = useState(false);
  const [erro, setErro] = useState('');
  const [aEnviar, setAEnviar] = useState(false);

  async function aoSubmeter(e) {
    e.preventDefault();
    setErro('');
    if (codigo.length !== 6) return setErro('O código da loja tem 6 caracteres.');
    if (!pinValido(pin)) return setErro('O PIN tem de ter de 4 a 6 números.');
    setAEnviar(true);
    const r = await entrarFuncionario(codigo, pin);
    setAEnviar(false);
    if (r.erro) { setPin(''); setErro(r.erro); return; }
    aoEntrar(r.sessao);
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mango)] font-display text-xl font-bold text-[var(--mango-ink)]">
            MC
          </div>
          <h1 className="font-display text-xl font-bold text-[var(--ink)]">Entrada do funcionário</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Escreve o código da loja e o teu PIN. Pede-os ao dono.</p>
        </div>

        <form onSubmit={aoSubmeter} className="space-y-3.5" autoComplete="off">
          {aviso && !erro && (
            <p className="rounded-lg bg-[var(--amber-soft)] px-3 py-2 text-sm text-[var(--ink)]" role="status">{aviso}</p>
          )}
          <Campo label="Código da loja">
            <input
              className="campo font-mono-ref text-center text-xl font-bold uppercase tracking-[0.25em]"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              maxLength={6}
              placeholder="------"
              value={codigo}
              onChange={(e) => setCodigo(limparCodigo(e.target.value))}
            />
          </Campo>
          <Campo label="PIN">
            <div className="relative">
              <input
                className="campo font-mono-ref pr-12 text-center text-xl font-bold tracking-[0.3em]"
                type={verPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="----"
                value={pin}
                onChange={(e) => setPin(limparPin(e.target.value))}
              />
              <button
                type="button"
                onClick={() => setVerPin((v) => !v)}
                aria-label={verPin ? 'Esconder o PIN' : 'Mostrar o PIN'}
                className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[var(--ink-soft)]"
              >
                <IconeOlho aberto={verPin} />
              </button>
            </div>
          </Campo>

          {erro && <MensagemErro>{erro}</MensagemErro>}

          <div className="pt-2">
            <Botao type="submit" disabled={aEnviar}>{aEnviar ? 'A entrar...' : 'Entrar'}</Botao>
          </div>
          <Link to="/" className="block w-full rounded-full px-4 py-3 text-center text-sm font-semibold text-[var(--mango)] hover:bg-black/[0.04]">
            Sou o dono — Entrar com a minha conta
          </Link>
        </form>
      </div>
    </div>
  );
}
