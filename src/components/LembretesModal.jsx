import { useState } from 'react';
import Modal from './Modal';
import Botao from './Botao';
import Campo from './Campo';
import SeletorMetodo from './SeletorMetodo';
import { useData, METODOS } from '../context/DataContext';
import { useDialog } from './DialogProvider';
import { formatMoney, formatDataCurta, HOJE_KEY } from '../utils/format';
import { TIPOS_LEMBRETE, RECORRENCIAS, MESES_NOMES, proximaOcorrencia, textoPrazo } from '../utils/lembretes';

const SETORES = [
  { id: 'produtos', label: 'Produtos' },
  { id: 'maquina', label: 'Serviços' },
];

function Chip({ ativo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${ativo ? 'bg-[var(--mango)] text-[var(--mango-ink)]' : 'bg-[var(--bg-soft)] text-[var(--ink)]'}`}
    >
      {children}
    </button>
  );
}

export default function LembretesModal({ aberto, aoFechar }) {
  const { lembretes, addLembrete, deleteLembrete, marcarLembretePago, registarDespesa, saldoFechamentoDiaSetor, saldoPorMetodo } = useData();
  const { confirmar, avisar } = useDialog();

  const [vista, setVista] = useState('lista'); // lista | novo | pagar
  // formulário novo
  const [tipo, setTipo] = useState('renda');
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [recorrencia, setRecorrencia] = useState('mensal');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('1');
  const [data, setData] = useState('');
  const [avisarDias, setAvisarDias] = useState('3');
  // pagamento
  const [pagando, setPagando] = useState(null); // { lembrete, ocorrencia }
  const [valorPago, setValorPago] = useState('');
  const [metodo, setMetodo] = useState('dinheiro');
  const [setor, setSetor] = useState('produtos');

  function fechar() {
    setVista('lista');
    setPagando(null);
    aoFechar();
  }

  function abrirNovo() {
    setTipo('renda'); setNome(''); setValor(''); setRecorrencia('mensal'); setDia(''); setMes('1'); setData(''); setAvisarDias('3');
    setVista('novo');
  }

  async function guardarNovo() {
    const v = valor === '' ? 0 : parseFloat(valor);
    if (isNaN(v) || v < 0) { await avisar('Verifica o valor.'); return; }
    const av = parseInt(avisarDias, 10);
    const dados = { tipo, nome: nome.trim(), valor: v, recorrencia, avisarDias: isNaN(av) || av < 0 ? 3 : av };
    if (recorrencia === 'unico') {
      if (!data) { await avisar('Escolhe a data do pagamento.'); return; }
      dados.data = data;
    } else {
      const d = parseInt(dia, 10);
      if (!d || d < 1 || d > 31) { await avisar('Escreve o dia do mês (de 1 a 31).'); return; }
      dados.dia = d;
      if (recorrencia === 'anual') dados.mes = parseInt(mes, 10);
    }
    addLembrete(dados);
    setVista('lista');
  }

  function abrirPagar(l, o) {
    setPagando({ lembrete: l, ocorrencia: o });
    setValorPago(l.valor > 0 ? String(l.valor) : '');
    setMetodo('dinheiro');
    setSetor('produtos');
    setVista('pagar');
  }

  async function confirmarPagamento() {
    const { lembrete: l, ocorrencia: o } = pagando;
    const v = valorPago === '' ? 0 : parseFloat(valorPago);
    if (isNaN(v) || v < 0) { await avisar('Verifica o valor.'); return; }
    if (v > 0) {
      const saldoSetor = saldoFechamentoDiaSetor(HOJE_KEY, setor);
      if (v > saldoSetor + 0.01) { await avisar(`Esse valor é maior que o saldo de ${SETORES.find((x) => x.id === setor).label} (${formatMoney(saldoSetor)} MT).`); return; }
      const saldoMetodo = saldoPorMetodo[metodo] || 0;
      if (v > saldoMetodo + 0.01) { await avisar(`Só tens ${formatMoney(saldoMetodo)} MT em ${METODOS.find((m) => m.id === metodo).label}.`); return; }
      const t = TIPOS_LEMBRETE.find((x) => x.id === l.tipo) || TIPOS_LEMBRETE[TIPOS_LEMBRETE.length - 1];
      registarDespesa({ categoria: t.categoria, valor: v, nota: (l.nome || t.label).slice(0, 40), setor, metodo, dateKey: HOJE_KEY });
    }
    marcarLembretePago(l.id, o.periodo);
    setPagando(null);
    setVista('lista');
  }

  if (!aberto) return null;

  const itens = lembretes
    .map((l) => ({ l, o: proximaOcorrencia(l) }))
    .sort((a, b) => (a.o ? a.o.dias : 99999) - (b.o ? b.o.dias : 99999));

  if (vista === 'novo') {
    return (
      <Modal titulo="Novo lembrete" aberto={aberto} aoFechar={fechar}>
        <div className="space-y-4">
          <Campo label="O que tens de pagar">
            <div className="flex flex-wrap gap-2">
              {TIPOS_LEMBRETE.map((t) => <Chip key={t.id} ativo={tipo === t.id} onClick={() => setTipo(t.id)}>{t.label}</Chip>)}
            </div>
          </Campo>
          <Campo label="Nome (opcional)">
            <input className="campo" type="text" maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo label="Valor (MT, opcional)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
          <Campo label="Quando se paga">
            <div className="flex flex-wrap gap-2">
              {RECORRENCIAS.map((r) => <Chip key={r.id} ativo={recorrencia === r.id} onClick={() => setRecorrencia(r.id)}>{r.label}</Chip>)}
            </div>
          </Campo>
          {recorrencia === 'unico' ? (
            <Campo label="Data">
              <input className="campo" type="date" min={HOJE_KEY} value={data} onChange={(e) => setData(e.target.value)} />
            </Campo>
          ) : (
            <div className="flex gap-3">
              {recorrencia === 'anual' && (
                <div className="flex-1">
                  <Campo label="Mês">
                    <select className="campo" value={mes} onChange={(e) => setMes(e.target.value)}>
                      {MESES_NOMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                  </Campo>
                </div>
              )}
              <div className="flex-1">
                <Campo label="Dia do mês">
                  <input className="campo" type="number" inputMode="numeric" min="1" max="31" step="1" value={dia} onChange={(e) => setDia(e.target.value)} />
                </Campo>
              </div>
            </div>
          )}
          <Campo label="Avisar quantos dias antes" hint="O aviso aparece no ecrã do Caixa.">
            <input className="campo" type="number" inputMode="numeric" min="0" max="30" step="1" value={avisarDias} onChange={(e) => setAvisarDias(e.target.value)} />
          </Campo>
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setVista('lista')}>Voltar</Botao>
            <Botao onClick={guardarNovo}>Guardar</Botao>
          </div>
        </div>
      </Modal>
    );
  }

  if (vista === 'pagar' && pagando) {
    const { lembrete: l, ocorrencia: o } = pagando;
    const nomeL = l.nome || (TIPOS_LEMBRETE.find((t) => t.id === l.tipo) || {}).label || 'Pagamento';
    return (
      <Modal titulo={`Pagar: ${nomeL}`} subtitulo={`Vencimento: ${formatDataCurta(o.dk)}`} aberto={aberto} aoFechar={fechar}>
        <div className="space-y-4">
          <Campo label="Valor pago (MT)" hint="Se já registaste esta saída na aba Despesas, deixa vazio e só marcas como pago.">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorPago} onChange={(e) => setValorPago(e.target.value)} />
          </Campo>
          {valorPago !== '' && parseFloat(valorPago) > 0 && (
            <>
              <Campo label="Setor">
                <div className="flex gap-2">
                  {SETORES.map((s) => <Chip key={s.id} ativo={setor === s.id} onClick={() => setSetor(s.id)}>{s.label}</Chip>)}
                </div>
              </Campo>
              <Campo label="Método">
                <SeletorMetodo value={metodo} onChange={setMetodo} saldo />
              </Campo>
            </>
          )}
          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={() => setVista('lista')}>Voltar</Botao>
            <Botao onClick={confirmarPagamento}>{valorPago !== '' && parseFloat(valorPago) > 0 ? 'Registar pagamento' : 'Marcar como pago'}</Botao>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal titulo="Lembretes de pagamentos" subtitulo="Renda, licenças e outros pagamentos que não podes esquecer." aberto={aberto} aoFechar={fechar}>
      <div className="space-y-3">
        {itens.length === 0 ? (
          <p className="rounded-xl bg-[var(--bg-soft)] px-3 py-4 text-center text-sm text-[var(--ink-soft)]">Ainda não tens lembretes. Cria o primeiro para a renda ou para a licença.</p>
        ) : (
          itens.map(({ l, o }) => {
            const tipoL = TIPOS_LEMBRETE.find((t) => t.id === l.tipo);
            const nomeL = l.nome || (tipoL && tipoL.label) || 'Pagamento';
            const urgente = o && o.dias <= (l.avisarDias ?? 3);
            return (
              <div key={l.id} className="rounded-xl bg-[var(--bg-soft)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-[var(--ink)]">{nomeL}</p>
                    <p className="text-[11.5px] text-[var(--ink-soft)]">
                      {RECORRENCIAS.find((r) => r.id === l.recorrencia)?.label}
                      {l.valor > 0 ? ` · ${formatMoney(l.valor)} MT` : ''}
                    </p>
                    <p className="mt-1 text-[12.5px] font-semibold" style={{ color: o ? (o.atrasado ? 'var(--brick)' : urgente ? 'var(--amber)' : 'var(--ink-soft)') : 'var(--teal)' }}>
                      {o ? `${formatDataCurta(o.dk)} · ${textoPrazo(o.dias)}` : 'Pago'}
                    </p>
                  </div>
                  <button
                    aria-label="Apagar lembrete"
                    onClick={async () => { const ok = await confirmar(`Apagar o lembrete "${nomeL}"?`, { perigo: true, textoOk: 'Apagar' }); if (ok) deleteLembrete(l.id); }}
                    className="shrink-0 p-1 text-[var(--ink-soft)] opacity-50 hover:opacity-100"
                  >✕</button>
                </div>
                {o && (
                  <button onClick={() => abrirPagar(l, o)} className="mt-2 w-full rounded-full bg-[var(--mango)] py-2 text-[13px] font-semibold text-[var(--mango-ink)] active:scale-[0.98]">Pagar</button>
                )}
              </div>
            );
          })
        )}
        <div className="flex gap-2 pt-1">
          <Botao variante="secundario" onClick={fechar}>Fechar</Botao>
          <Botao onClick={abrirNovo}>+ Novo lembrete</Botao>
        </div>
      </div>
    </Modal>
  );
}
