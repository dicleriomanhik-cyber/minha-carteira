import { useEffect, useState } from 'react';
import Modal from './Modal';
import Campo from './Campo';
import Botao from './Botao';
import SeletorDia from './SeletorDia';
import SeletorMetodo from './SeletorMetodo';
import { HOJE_KEY } from '../utils/format';

// De onde sai a tua parte. O utilizador escolhe sempre; nada sai do Caixa sem ele dizer.
const ORIGENS = [
  { id: 'caixa', label: 'Do Caixa', ajuda: 'Sai do Caixa como saída, no setor e método que escolheres.' },
  { id: 'salario', label: 'Do meu salário', ajuda: 'Fica registado nas Despesas como salário próprio.' },
  { id: 'poupanca', label: 'Da Poupança', ajuda: 'Sai da Poupança. Não mexe no Caixa.' },
  { id: 'outro', label: 'Outro fim', ajuda: 'Só fica registado o motivo. Não mexe no Caixa nem na Poupança.' },
];

const SETORES = [
  { id: 'produtos', label: 'Produtos' },
  { id: 'maquina', label: 'Serviços' },
];

export default function PagarParteModal({ aberto, aoFechar, titulo, valorInicial, aoConfirmar }) {
  const [valor, setValor] = useState('');
  const [dia, setDia] = useState(HOJE_KEY);
  const [origem, setOrigem] = useState('caixa');
  const [setor, setSetor] = useState('produtos');
  const [metodo, setMetodo] = useState('dinheiro');
  const [nota, setNota] = useState('');
  const [erro, setErro] = useState('');

  // Ao abrir, começa limpo com o valor combinado.
  useEffect(() => {
    if (aberto) {
      setValor(valorInicial != null ? String(valorInicial) : '');
      setDia(HOJE_KEY);
      setOrigem('caixa');
      setSetor('produtos');
      setMetodo('dinheiro');
      setNota('');
      setErro('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const origemAtual = ORIGENS.find((o) => o.id === origem);
  const usaCaixa = origem === 'caixa' || origem === 'salario';

  function confirmar() {
    const v = parseFloat(String(valor).replace(',', '.'));
    if (!v || v <= 0) { setErro('Introduz um valor válido.'); return; }
    if (origem === 'outro' && !nota.trim()) { setErro('Escreve o motivo.'); return; }
    setErro('');
    aoConfirmar({ valor: v, dia, origem, setor, metodo, nota: nota.trim() });
  }

  return (
    <Modal titulo={titulo} aberto={aberto} aoFechar={aoFechar}>
      <div className="space-y-4">
        <Campo label="Dia">
          <SeletorDia value={dia} onChange={setDia} />
        </Campo>
        <Campo label="Valor pago (MT)">
          <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
        </Campo>
        <Campo label="De onde sai o dinheiro">
          <div className="grid grid-cols-2 gap-2">
            {ORIGENS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOrigem(o.id)}
                className={`rounded-xl border-2 px-2.5 py-2 text-left text-[13px] font-semibold transition active:scale-[0.98] ${origem === o.id ? 'border-[var(--mango)] bg-[var(--mango-soft)] text-[var(--ink)]' : 'border-transparent bg-[var(--bg-soft)] text-[var(--ink-soft)]'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <span className="mt-2 block text-xs text-[var(--ink-soft)]">{origemAtual.ajuda}</span>
        </Campo>
        {usaCaixa && (
          <>
            <Campo label="Setor">
              <div className="flex gap-2">
                {SETORES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSetor(s.id)}
                    className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold ${setor === s.id ? 'bg-[var(--mango)] text-[var(--mango-ink)]' : 'bg-[var(--bg-soft)] text-[var(--ink-soft)]'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Campo>
            <Campo label="Método">
              <SeletorMetodo value={metodo} onChange={setMetodo} />
            </Campo>
          </>
        )}
        {origem === 'outro' && (
          <Campo label="Motivo">
            <input className="campo" maxLength={40} value={nota} onChange={(e) => setNota(e.target.value)} />
          </Campo>
        )}
        {erro && <p className="text-xs font-semibold text-[var(--brick)]">{erro}</p>}
        <div className="flex gap-2 pt-1">
          <Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao>
          <Botao onClick={confirmar}>Guardar</Botao>
        </div>
      </div>
    </Modal>
  );
}
