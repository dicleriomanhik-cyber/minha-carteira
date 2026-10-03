import { useEffect, useState } from 'react';
import Modal from './Modal';
import Botao from './Botao';
import Campo from './Campo';
import MetodoLogo from './MetodoLogo';
import { useData, METODOS } from '../context/DataContext';
import { lerSms } from '../utils/smsPagamento';
import { formatMoney, formatDataCurta, HOJE_KEY } from '../utils/format';

// Ecrã "Registar por SMS": o utilizador cola o SMS, a app lê valor, método e data,
// e depois abre a Nova Entrada já preenchida para ele confirmar.
export default function SmsModal({ aberto, aoFechar, aoConfirmar }) {
  const { transacoes } = useData();
  const [texto, setTexto] = useState('');
  const [res, setRes] = useState(null);

  useEffect(() => {
    if (aberto) { setTexto(''); setRes(null); }
  }, [aberto]);

  function mudar(v) {
    setTexto(v);
    setRes(null);
  }

  async function colar() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) mudar(t);
    } catch {
      // Sem permissão para ler a área de transferência: o utilizador cola à mão no campo.
    }
  }

  function ler() {
    setRes(lerSms(texto));
  }

  const dk = res?.ok ? (res.dateKey || HOJE_KEY) : null;
  const metodoInfo = res?.ok ? METODOS.find((m) => m.id === res.metodo) : null;
  const jaRegistado = !!(res?.ok && res.referencia && transacoes.some((t) => t.referencia && t.metodo === res.metodo && t.referencia === res.referencia));

  return (
    <Modal titulo="Registar por SMS" subtitulo="Cola o SMS de dinheiro recebido" aberto={aberto} aoFechar={aoFechar}>
      <div className="space-y-4">
        <Campo label="SMS" hint="Cola um SMS de cada vez, do M-Pesa, e-Mola ou mKesh.">
          <textarea className="campo min-h-[110px]" value={texto} onChange={(e) => mudar(e.target.value)} />
        </Campo>

        <div className="flex gap-2">
          <Botao variante="secundario" onClick={colar}>Colar</Botao>
          <Botao onClick={ler} disabled={!texto.trim()}>Ler SMS</Botao>
        </div>

        {res && !res.ok && (
          <p className="rounded-xl bg-[var(--brick)]/10 p-3 text-sm text-[var(--brick)]">{res.erro}</p>
        )}

        {res?.ok && (
          <div className="space-y-3">
            <div className="rounded-xl bg-[var(--bg-soft)] p-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                <MetodoLogo id={res.metodo} className="h-6 w-6" />{metodoInfo?.label}
              </p>
              <p className="font-mono-ref mt-1.5 text-xl font-bold text-[var(--teal)]">+ {formatMoney(res.valor)} <span className="text-xs font-semibold text-[var(--ink-soft)]">MT</span></p>
              <p className="mt-1 text-[13px] text-[var(--ink)]">
                {dk === HOJE_KEY ? 'Hoje' : formatDataCurta(dk)}{res.dateKey && res.hora ? ` · ${res.hora}` : ''}
              </p>
              {res.de && <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">De {res.de}</p>}
              {res.referencia && <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">Referência {res.referencia}</p>}
            </div>

            {res.aviso && <p className="text-xs text-[var(--mango)]">{res.aviso}</p>}

            {jaRegistado && (
              <p className="rounded-xl bg-[var(--mango)]/15 p-3 text-sm text-[var(--ink)]">
                Este pagamento já foi registado antes (mesma referência). O mKesh manda o mesmo SMS em português e em inglês; só regista outra vez se for mesmo outro pagamento.
              </p>
            )}

            <Botao onClick={() => aoConfirmar(res)}>{jaRegistado ? 'Registar mesmo assim' : 'Continuar'}</Botao>
            <p className="text-center text-[11px] text-[var(--ink-soft)]">No passo seguinte escolhes a categoria e o setor e guardas.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
