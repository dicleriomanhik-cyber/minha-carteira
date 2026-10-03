import { useMemo, useState } from 'react';
import Modal from './Modal';
import Botao from './Botao';
import Campo from './Campo';
import { useData } from '../context/DataContext';
import { useDialog } from './DialogProvider';
import { statusSalario, chaveNome } from '../utils/funcionarios';
import { formatMoney, semEmoji } from '../utils/format';

const VAZIO = { id: null, nome: '', salario: '', dia: '' };

function Estado({ st }) {
  if (st.estado === 'pago') return <span className="rounded-full bg-[var(--teal-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--teal)]">Pago</span>;
  if (st.estado === 'parcial') return <span className="rounded-full bg-[var(--amber-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--amber)]">Falta pagar</span>;
  if (st.chegou) return <span className="rounded-full bg-[var(--brick-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--brick)]">Por pagar</span>;
  return <span className="rounded-full bg-[var(--bg-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--ink-soft)]">Ainda não é dia</span>;
}

export default function FuncionariosModal({ aberto, aoFechar, aoPagar }) {
  const { funcionarios, transacoes, salvarFuncionario, deleteFuncionario } = useData();
  const { confirmar, avisar } = useDialog();
  const [form, setForm] = useState(null); // null = fechado

  const linhas = useMemo(
    () => funcionarios.map((f) => ({ f, st: statusSalario(f, transacoes) })).sort((a, b) => a.f.nome.localeCompare(b.f.nome)),
    [funcionarios, transacoes],
  );
  const porPagar = linhas.reduce((s, l) => s + l.st.falta, 0);
  const totalFixo = linhas.reduce((s, l) => s + (l.f.salario || 0), 0);

  async function guardar() {
    const nome = form.nome.trim();
    const salario = parseFloat(form.salario);
    const dia = parseInt(form.dia, 10);
    if (!nome) { await avisar('Escreve o nome do funcionário.'); return; }
    if (!salario || salario <= 0) { await avisar('Introduz um salário válido.'); return; }
    if (!dia || dia < 1 || dia > 31) { await avisar('Escolhe o dia do mês em que pagas (de 1 a 31).'); return; }
    if (funcionarios.some((x) => x.id !== form.id && chaveNome(x.nome) === chaveNome(nome))) {
      await avisar('Já tens um funcionário com esse nome.');
      return;
    }
    salvarFuncionario({ id: form.id, nome, salario, dia });
    setForm(null);
  }

  async function apagar() {
    const ok = await confirmar(`Tirar "${form.nome}" da lista? Os pagamentos já registados continuam nas Despesas.`, { perigo: true, textoOk: 'Tirar' });
    if (!ok) return;
    deleteFuncionario(form.id);
    setForm(null);
  }

  return (
    <>
      <Modal titulo="Funcionários" subtitulo="Salário fixo de cada um" aberto={aberto} aoFechar={aoFechar} tamanho="larga">
        <div className="space-y-4">
          {linhas.length > 0 && (
            <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
              <p className="text-xs text-[var(--ink-soft)]">Por pagar este mês</p>
              <p className="font-mono-ref text-lg font-bold text-[var(--ink)]">{formatMoney(porPagar)} MT</p>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Salários fixos no total: {formatMoney(totalFixo)} MT</p>
            </div>
          )}

          {linhas.length === 0 ? (
            <p className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm text-[var(--ink-soft)]">
              Ainda não tens funcionários na lista. Adiciona cada um com o salário e o dia do mês em que pagas, e a app avisa-te no Caixa quando for dia de pagar.
            </p>
          ) : (
            <div>
              {linhas.map(({ f, st }) => (
                <div key={f.id} className="flex items-center gap-3 border-b border-dashed border-[var(--ink)]/10 py-3 last:border-none">
                  <button type="button" onClick={() => setForm({ id: f.id, nome: f.nome, salario: String(f.salario), dia: String(f.dia) })} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--ink)]">
                      <span className="truncate">{semEmoji(f.nome)}</span>
                      <Estado st={st} />
                    </span>
                    <span className="font-mono-ref block truncate text-[11.5px] text-[var(--ink-soft)]">
                      {formatMoney(f.salario)} MT · paga dia {f.dia}
                      {st.estado === 'parcial' ? ` · falta ${formatMoney(st.falta)}` : ''}
                    </span>
                  </button>
                  {st.falta > 0 && (
                    <button type="button" onClick={() => aoPagar(f, st.falta)} className="shrink-0 rounded-full bg-[var(--mango)] px-3 py-1.5 text-xs font-semibold text-[var(--mango-ink)]">Pagar</button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={aoFechar}>Fechar</Botao>
            <Botao onClick={() => setForm({ ...VAZIO })}>+ Funcionário</Botao>
          </div>
        </div>
      </Modal>

      <Modal titulo={form && form.id ? 'Editar funcionário' : '+ Funcionário'} aberto={!!form} aoFechar={() => setForm(null)}>
        {form && (
          <div className="space-y-4">
            <Campo label="Nome do funcionário">
              <input className="campo" maxLength={40} placeholder="Nome" value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} />
            </Campo>
            {form.id && <p className="-mt-2 text-xs text-[var(--ink-soft)]">Se mudares o nome, os pagamentos antigos deixam de contar para este mês.</p>}
            <Campo label="Salário fixo (MT)">
              <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={form.salario} onChange={(e) => setForm((c) => ({ ...c, salario: e.target.value }))} />
            </Campo>
            <Campo label="Dia do mês em que pagas">
              <input className="campo" type="number" inputMode="numeric" min="1" max="31" step="1" placeholder="1 a 31" value={form.dia} onChange={(e) => setForm((c) => ({ ...c, dia: e.target.value }))} />
            </Campo>
            <div className="flex gap-2 pt-1">
              {form.id && <Botao variante="perigo" onClick={apagar}>Tirar</Botao>}
              <Botao variante="secundario" onClick={() => setForm(null)}>Cancelar</Botao>
              <Botao onClick={guardar}>Guardar</Botao>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
