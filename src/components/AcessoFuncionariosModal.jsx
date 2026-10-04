import { useCallback, useEffect, useState } from 'react';
import Modal from './Modal';
import Botao from './Botao';
import Campo from './Campo';
import MensagemErro from './MensagemErro';
import { useDialog } from './DialogProvider';
import { semEmoji } from '../utils/format';
import {
  ENTRADA_FUNCIONARIO_ATIVA, obterCodigoLoja, gerarNovoCodigo, listarFuncionarios, criarFuncionario,
  mudarPin, definirAtivo, apagarFuncionario, pinValido, limparPin, gerarPin, formatarUltimoAcesso, textoAcesso,
} from '../utils/acessoFuncionarios';

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch { return false; }
}

// Janela do dono: código da loja e acesso (PIN) de cada funcionário. Os PINs nunca ficam visíveis depois de guardados.
export default function AcessoFuncionariosModal({ aberto, aoFechar }) {
  const { confirmar, avisar } = useDialog();
  const [codigo, setCodigo] = useState('');
  const [lista, setLista] = useState([]);
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState(null); // { id, nome, pin } (id null = novo)
  const [editar, setEditar] = useState(null); // funcionário aberto para gerir
  const [pinEdit, setPinEdit] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [criado, setCriado] = useState(null); // { nome, pin } mostrado uma única vez

  const carregar = useCallback(async () => {
    setACarregar(true);
    setErro('');
    const [c, l] = await Promise.all([obterCodigoLoja(), listarFuncionarios()]);
    if (c.erro) setErro(c.erro); else setCodigo(c.dados || '');
    if (l.erro) setErro((e) => e || l.erro); else setLista(l.dados || []);
    setACarregar(false);
  }, []);

  useEffect(() => {
    if (aberto) { carregar(); } else { setForm(null); setEditar(null); setCriado(null); setPinEdit(''); setErroForm(''); }
  }, [aberto, carregar]);

  async function copiarCodigo() {
    const ok = await copiar(codigo);
    await avisar(ok ? 'Código copiado.' : `Não foi possível copiar. O código é ${codigo}.`);
  }

  async function novoCodigo() {
    const ok = await confirmar('Gerar um código novo? O código antigo deixa de funcionar e todos os funcionários que estão com a app aberta saem. Depois tens de lhes dar o código novo.', { perigo: true, textoOk: 'Gerar código novo' });
    if (!ok) return;
    const r = await gerarNovoCodigo();
    if (r.erro) { await avisar(r.erro); return; }
    setCodigo(r.dados || '');
  }

  async function guardarNovo() {
    const nome = form.nome.trim();
    if (!nome) { setErroForm('Escreve o nome do funcionário.'); return; }
    if (!pinValido(form.pin)) { setErroForm('O PIN tem de ter de 4 a 6 números.'); return; }
    setAGuardar(true); setErroForm('');
    const r = await criarFuncionario(nome, form.pin);
    setAGuardar(false);
    if (r.erro) { setErroForm(r.erro); return; }
    setCriado({ nome, pin: form.pin });
    setForm(null);
    carregar();
  }

  async function guardarPin() {
    if (!pinValido(pinEdit)) { setErroForm('O PIN tem de ter de 4 a 6 números.'); return; }
    setAGuardar(true); setErroForm('');
    const r = await mudarPin(editar.id, pinEdit);
    setAGuardar(false);
    if (r.erro) { setErroForm(r.erro); return; }
    setCriado({ nome: editar.nome, pin: pinEdit, mudou: true });
    setEditar(null); setPinEdit('');
    carregar();
  }

  async function alternarAtivo() {
    const ativar = !editar.ativo;
    if (!ativar) {
      const ok = await confirmar(`Desligar o acesso de "${editar.nome}"? Ele sai logo e deixa de poder entrar até o voltares a ligar.`, { textoOk: 'Desligar' });
      if (!ok) return;
    }
    setAGuardar(true);
    const r = await definirAtivo(editar.id, ativar);
    setAGuardar(false);
    if (r.erro) { setErroForm(r.erro); return; }
    setEditar(null); setPinEdit('');
    carregar();
  }

  async function apagar() {
    const ok = await confirmar(`Apagar o acesso de "${editar.nome}"? As vendas que já registou continuam guardadas.`, { perigo: true, textoOk: 'Apagar' });
    if (!ok) return;
    setAGuardar(true);
    const r = await apagarFuncionario(editar.id);
    setAGuardar(false);
    if (r.erro) { setErroForm(r.erro); return; }
    setEditar(null); setPinEdit('');
    carregar();
  }

  async function copiarAcesso() {
    const ok = await copiar(textoAcesso({ codigo, pin: criado.pin, nome: criado.nome }));
    await avisar(ok ? 'Copiado. Cola na conversa com o funcionário.' : 'Não foi possível copiar. Anota o código e o PIN.');
  }

  const abrirGerir = (f) => { setEditar(f); setPinEdit(''); setErroForm(''); };

  return (
    <>
      <Modal titulo="Acesso dos funcionários" subtitulo="Entram com o código da loja e um PIN" aberto={aberto} aoFechar={aoFechar} tamanho="larga">
        <div className="space-y-4">
          <p className="text-sm text-[var(--ink-soft)]">
            Cada funcionário tem o seu PIN. Só pode registar vendas: não vê lucros, poupança, relatórios nem preços de custo.
          </p>
          {!ENTRADA_FUNCIONARIO_ATIVA && (
            <p className="rounded-2xl bg-[var(--amber-soft)] px-4 py-3 text-xs text-[var(--ink)]">
              O ecrã de entrada dos funcionários ainda não está activo. Já podes preparar os PINs; vais avisar os funcionários quando estiver pronto.
            </p>
          )}
          <MensagemErro>{erro}</MensagemErro>

          <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
            <p className="text-xs text-[var(--ink-soft)]">Código da loja</p>
            <p className="font-mono-ref mt-0.5 text-2xl font-bold tracking-[0.25em] text-[var(--ink)]">{codigo || (aCarregar ? '...' : '------')}</p>
            <div className="mt-2 flex gap-4">
              <button type="button" disabled={!codigo} onClick={copiarCodigo} className="text-xs font-semibold text-[var(--mango)] disabled:opacity-50">Copiar</button>
              <button type="button" disabled={!codigo} onClick={novoCodigo} className="text-xs font-semibold text-[var(--brick)] disabled:opacity-50">Gerar código novo</button>
            </div>
          </div>

          {aCarregar && lista.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">A carregar...</p>
          ) : lista.length === 0 ? (
            <p className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm text-[var(--ink-soft)]">Ainda não tens funcionários com acesso. Carrega em "+ Funcionário" para criar o primeiro.</p>
          ) : (
            <div>
              {lista.map((f) => (
                <button key={f.id} type="button" onClick={() => abrirGerir(f)} className="flex w-full items-center gap-3 border-b border-dashed border-[var(--ink)]/10 py-3 text-left last:border-none">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--ink)]">
                      <span className="truncate">{semEmoji(f.nome)}</span>
                      {f.ativo
                        ? <span className="rounded-full bg-[var(--teal-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--teal)]">Activo</span>
                        : <span className="rounded-full bg-[var(--bg-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--ink-soft)]">Desligado</span>}
                    </span>
                    <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">{formatarUltimoAcesso(f.ultimo_acesso)}</span>
                  </span>
                  <span aria-hidden="true" className="text-[var(--ink)]">›</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Botao variante="secundario" onClick={aoFechar}>Fechar</Botao>
            <Botao disabled={!codigo} onClick={() => { setErroForm(''); setForm({ id: null, nome: '', pin: gerarPin() }); }}>+ Funcionário</Botao>
          </div>
        </div>
      </Modal>

      <Modal titulo="+ Funcionário" aberto={!!form} aoFechar={() => setForm(null)}>
        {form && (
          <div className="space-y-4">
            <Campo label="Nome do funcionário">
              <input className="campo" maxLength={60} placeholder="Nome" value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} />
            </Campo>
            <Campo label="PIN (4 a 6 números)">
              <div className="flex gap-2">
                <input className="campo font-mono-ref tracking-[0.3em]" type="text" inputMode="numeric" autoComplete="off" maxLength={6} value={form.pin} onChange={(e) => setForm((c) => ({ ...c, pin: limparPin(e.target.value) }))} />
                <button type="button" onClick={() => setForm((c) => ({ ...c, pin: gerarPin() }))} className="shrink-0 rounded-full px-3 text-xs font-semibold text-[var(--mango)]">Outro PIN</button>
              </div>
            </Campo>
            <p className="-mt-2 text-xs text-[var(--ink-soft)]">Depois de guardar, o PIN não volta a aparecer. Se o funcionário o esquecer, defines um novo.</p>
            <MensagemErro>{erroForm}</MensagemErro>
            <div className="flex gap-2 pt-1">
              <Botao variante="secundario" onClick={() => setForm(null)}>Cancelar</Botao>
              <Botao disabled={aGuardar} onClick={guardarNovo}>{aGuardar ? 'A guardar...' : 'Guardar'}</Botao>
            </div>
          </div>
        )}
      </Modal>

      <Modal titulo={editar ? semEmoji(editar.nome) : ''} subtitulo="Gerir acesso" aberto={!!editar} aoFechar={() => { setEditar(null); setPinEdit(''); }}>
        {editar && (
          <div className="space-y-4">
            <Campo label="Novo PIN (4 a 6 números)">
              <div className="flex gap-2">
                <input className="campo font-mono-ref tracking-[0.3em]" type="text" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="----" value={pinEdit} onChange={(e) => setPinEdit(limparPin(e.target.value))} />
                <button type="button" onClick={() => setPinEdit(gerarPin())} className="shrink-0 rounded-full px-3 text-xs font-semibold text-[var(--mango)]">Gerar</button>
              </div>
            </Campo>
            <MensagemErro>{erroForm}</MensagemErro>
            <Botao disabled={aGuardar || !pinEdit} onClick={guardarPin}>Mudar PIN</Botao>
            <p className="-mt-2 text-xs text-[var(--ink-soft)]">Ao mudar o PIN, o funcionário sai e tem de entrar com o novo.</p>
            <div className="flex gap-2 pt-1">
              <Botao variante="secundario" disabled={aGuardar} onClick={alternarAtivo}>{editar.ativo ? 'Desligar acesso' : 'Ligar acesso'}</Botao>
              <Botao variante="perigo" disabled={aGuardar} onClick={apagar}>Apagar</Botao>
            </div>
          </div>
        )}
      </Modal>

      <Modal titulo={criado?.mudou ? 'PIN mudado' : 'Funcionário criado'} aberto={!!criado} aoFechar={() => setCriado(null)}>
        {criado && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--ink)]">Dá estes dados a {semEmoji(criado.nome)}. O PIN só aparece agora.</p>
            <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
              <p className="text-xs text-[var(--ink-soft)]">Código da loja</p>
              <p className="font-mono-ref text-xl font-bold tracking-[0.25em] text-[var(--ink)]">{codigo}</p>
              <p className="mt-2 text-xs text-[var(--ink-soft)]">PIN</p>
              <p className="font-mono-ref text-xl font-bold tracking-[0.3em] text-[var(--ink)]">{criado.pin}</p>
            </div>
            <div className="flex gap-2">
              <Botao variante="secundario" onClick={copiarAcesso}>Copiar mensagem</Botao>
              {ENTRADA_FUNCIONARIO_ATIVA && (
                <a
                  className="w-full rounded-full bg-[var(--mango)] px-4 py-3 text-center text-sm font-semibold text-[var(--mango-ink)]"
                  target="_blank" rel="noopener noreferrer"
                  href={`https://wa.me/?text=${encodeURIComponent(textoAcesso({ codigo, pin: criado.pin, nome: criado.nome }))}`}
                >WhatsApp</a>
              )}
            </div>
            <Botao onClick={() => setCriado(null)}>Feito</Botao>
          </div>
        )}
      </Modal>
    </>
  );
}
