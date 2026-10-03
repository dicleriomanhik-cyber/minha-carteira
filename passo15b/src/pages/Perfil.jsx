import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useDialog } from '../components/DialogProvider';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import MensagemErro from '../components/MensagemErro';
import { formatMoney } from '../utils/format';
import DossieModal from '../components/DossieModal';
import ReciboModal from '../components/ReciboModal';
import { IconeCamara, IconeCaneta, IconeBackup } from '../components/Icons';

function PillButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-[var(--bg-soft)] px-2 py-3 text-center transition active:scale-[0.97]"
    >
      <Icon className="h-5 w-5 text-[var(--mango)]" />
      <span className="text-xs font-medium leading-tight text-[var(--ink)]">{label}</span>
    </button>
  );
}

function InfoCard({ label, valor }) {
  if (!valor) return null;
  return (
    <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
      <p className="text-sm text-[var(--ink)]">{valor}</p>
      <p className="mt-0.5 text-xs text-[var(--ink-soft)]">{label}</p>
    </div>
  );
}

const TERMOS = [
  ["1. O que é esta aplicação", 'Uma ferramenta para registares o teu caixa, fiados, stock, xitique, poupança, salários e despesas. Não substitui um contabilista e não dá aconselhamento financeiro, fiscal ou jurídico.'],
  ["2. A tua conta e os teus dados", 'Os teus registos ficam guardados na tua conta, para os poderes ver em vários aparelhos, e também neste telemóvel. Servem para a aplicação funcionar para ti. Só tu deves ter acesso à tua conta, por isso guarda bem a tua palavra-passe.'],
  ["3. Backup", 'Podes exportar uma cópia dos teus dados a qualquer momento. Recomendamos que o faças com regularidade.'],
  ["4. Dados de outras pessoas", 'Ao guardares nomes e números de clientes, de participantes do xitique ou de funcionários, deves ter o consentimento deles e usar esses dados apenas para a tua atividade, como cobrar um fiado, lembrar um pagamento ou registar um salário.'],
  ["5. Lembretes por WhatsApp", 'A aplicação apenas abre o WhatsApp com uma mensagem de lembrete já escrita. O envio é sempre feito por ti, e nada é enviado automaticamente. Usa os lembretes com respeito e só com clientes que te conhecem e te deram o número.'],
  ["6. Fiados", 'Podes aumentar, receber e editar uma dívida (valor, produto ou serviço, data de vencimento). O relatório mostra o dia em que a dívida foi feita e o dia em que foi paga. Os valores recebidos entram no Caixa na data do recebimento.'],
  ["7. Poupança", 'A Poupança é um registo de controlo dentro da aplicação. Ela não é uma conta bancária e não guarda dinheiro real, nem paga juros. O que guardas sai do saldo total do Caixa. Ao retirar, o dinheiro não volta ao Caixa; fica só o registo.'],
  ["8. Salários e despesas", 'Os pagamentos de salários (o teu e os dos funcionários) e as despesas operacionais saem do saldo total e aparecem no relatório. Estes registos servem para o teu controlo e não substituem a folha de salários, os descontos legais (como a segurança social) nem as declarações de impostos, que são da tua responsabilidade.'],
  ["9. Exatidão dos registos", 'Os totais são calculados a partir do que registas. Se houver erros nos registos, haverá erros nos totais. Confere os valores antes de tomares decisões.'],
  ["10. Limite de responsabilidade", 'A aplicação é fornecida tal como está, sem garantia de funcionamento contínuo ou livre de erros. Na medida permitida pela lei, a SmartMetrics Limitada não se responsabiliza por perdas resultantes do seu uso.'],
  ["11. Alterações", 'Estes termos podem mudar quando a aplicação evoluir. A versão em vigor é a que aparece aqui. Última atualização: outubro de 2026.'],
  ["12. Contacto", 'Para dúvidas, usa a secção Suporte no teu Perfil.'],
];

const GUIA = [
  ["Caixa", 'É a base da aplicação. Regista as entradas (vendas de produtos, serviços, outras entradas) e as saídas do dia, escolhendo se foi dinheiro, M-Pesa, e-Mola ou mKesh. O saldo total é a soma automática dos saldos de Produtos e de Serviços, e acumula de um dia para o outro. Para corrigir um erro, apaga o registo com o ✕ e faz de novo.'],
  ["Saldos iniciais", 'No Perfil, define uma só vez quanto tinhas em Produtos e em Serviços quando começaste a usar a aplicação. Depois disso não precisas de mexer.'],
  ["Fiados", 'Regista quem te deve: nome, produto ou serviço, valor, data de vencimento e, se quiseres, o WhatsApp do cliente. Toca em "Receber" quando o cliente pagar (podes receber só uma parte), em "Aumentar" quando ele levar mais coisas, e em "Lembrar" para abrir o WhatsApp com a mensagem de cobrança já escrita. Toca no nome do cliente para ver os detalhes e editar o valor, o produto ou serviço e a data.'],
  ["Stock", 'Regista os teus produtos com o preço de custo e o preço de venda. Quando vendes um produto ligado ao stock, a quantidade desce sozinha e o relatório mostra o lucro real.'],
  ["Xitique", 'Regista os participantes e quanto cada um combinou pagar. Marca quem já pagou no dia e regista a entrega a quem recebe a vez.'],
  ["Despesas", 'Aqui registas salários (o teu e os dos funcionários, com o nome da pessoa) e as despesas do negócio: renda, luz, água, internet, marketing, transporte, taxas bancárias, licenças e outras. Cada pagamento sai do saldo total do Caixa.'],
  ["Poupança", 'Cria metas, por exemplo "Comprar um Terreno", e vai guardando dinheiro nelas. O que guardas sai do saldo total do Caixa. O anel de cada meta mostra o quanto já conseguiste.'],
  ["Relatório", 'Toca em "Relatório" no topo para ver o resumo do dia, da semana, do mês ou de tudo: entradas, saídas, salários e despesas, fiados feitos e pagos, xitique e poupança.'],
  ["Dossiê para crédito", 'No Perfil, em "Dossiê para pedir crédito", escolhes 3, 6 ou 12 meses e a app cria um PDF com vendas, lucro, despesas, fiados cobrados, stock e poupança, com gráfico mês a mês. Podes descarregar ou enviar por WhatsApp. Confere os registos antes de o entregares.'],
  ["Comprovativos", 'No Perfil, em "Comprovativos de pagamento", escolhes um salário, a renda ou outra despesa que já registaste, confirmas o nome de quem recebeu e escolhes PDF ou imagem. Depois envias por WhatsApp ou descarregas. É um comprovativo interno e não substitui factura nem recibo fiscal.'],
  ["Backup", 'No Perfil, exporta regularmente uma cópia dos teus dados. A tua conta também sincroniza os dados entre aparelhos.'],
];

export default function Perfil() {
  const navigate = useNavigate();
  const { user, profile, sair, atualizarPerfil, excluirConta, recarregarPerfil } = useAuth();
  const { exportarBackup, importarBackup, saldoInicialGlobal, setSaldoInicialGlobal } = useData();
  const { confirmar, avisar } = useDialog();
  const fileFotoRef = useRef(null);
  const fileBackupRef = useRef(null);

  const [aEditar, setAEditar] = useState(false);
  const [nome, setNome] = useState(profile?.nome || '');
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || '');
  const [erro, setErro] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [aEnviarFoto, setAEnviarFoto] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [setorSaldo, setSetorSaldo] = useState(null);
  const [valorSaldo, setValorSaldo] = useState('');
  const [termosAberto, setTermosAberto] = useState(false);
  const [guiaAberto, setGuiaAberto] = useState(false);
  const [dossieAberto, setDossieAberto] = useState(false);
  const [reciboAberto, setReciboAberto] = useState(false);
  const [ultimoBackup, setUltimoBackup] = useState(() => { try { return localStorage.getItem('carteira_ultimo_backup') || ''; } catch { return ''; } });
  function fazerExport() {
    exportarBackup();
    const d = new Date().toISOString();
    try { localStorage.setItem('carteira_ultimo_backup', d); } catch { /* sem armazenamento */ }
    setUltimoBackup(d);
  }
  const diasBackup = ultimoBackup ? Math.floor((Date.now() - new Date(ultimoBackup).getTime()) / 86400000) : null;
  const corBackup = diasBackup === null ? 'var(--brick)' : diasBackup > 7 ? '#E3A72F' : 'var(--teal)';
  const textoBackup = diasBackup === null ? 'Ainda sem backup' : `Último backup: ${diasBackup === 0 ? 'hoje' : new Date(ultimoBackup).toLocaleDateString('pt-PT')}`;

  async function guardarSaldoInicial() {
    const v = parseFloat(valorSaldo);
    if (isNaN(v) || v < 0) { await avisar('Introduz um valor válido (pode ser 0).'); return; }
    setSaldoInicialGlobal(setorSaldo, v);
    setSetorSaldo(null);
  }

  const iniciais = (profile?.nome || user?.email || '?')
    .trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  async function aoEscolherFoto(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAEnviarFoto(true);
    setErro('');
    const ext = file.name.split('.').pop();
    const caminho = `${user.id}/avatar.${ext}`;
    const { error: erroUpload } = await supabase.storage.from('avatars').upload(caminho, file, { upsert: true });
    if (erroUpload) {
      setErro('Não foi possível carregar a foto. Tenta novamente.');
      setAEnviarFoto(false);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(caminho);
    const foto_url = `${data.publicUrl}?t=${Date.now()}`;
    await atualizarPerfil({ foto_url });
    setAEnviarFoto(false);
    e.target.value = '';
  }

  async function aoGuardarInfo() {
    if (!nome.trim()) { setErro('O nome não pode ficar vazio.'); return; }
    setAGuardar(true);
    const { error } = await atualizarPerfil({ nome: nome.trim(), whatsapp: whatsapp.trim() });
    setAGuardar(false);
    if (error) { setErro('Não foi possível guardar. Tenta novamente.'); return; }
    setAEditar(false);
  }

  function aoImportarBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const dados = JSON.parse(ev.target.result);
        const ok = await confirmar('Isto vai substituir os dados atuais deste aparelho pelos dados deste ficheiro. Continuar?', { perigo: true, textoOk: 'Continuar' });
        if (!ok) {
          e.target.value = '';
          return;
        }
        importarBackup(dados);
      } catch {
        await avisar('Não foi possível ler este ficheiro. Verifica se é um backup válido do Minha Carteira.');
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  async function aoConfirmarExclusao() {
    const { error } = await excluirConta();
    if (error && error.message !== 'not_configured') {
      setErro('Não foi possível excluir a conta agora. Tenta novamente.');
      return;
    }
    setConfirmarExclusao(false);
  }

  return (
    <Layout titulo="Perfil" aoVoltar={() => navigate(-1)}>
      <div className="flex flex-col items-center px-4 pt-4">
        <div className="relative">
          {profile?.foto_url ? (
            <img src={profile.foto_url} alt="Foto de perfil" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--mango)] font-display text-2xl font-bold text-[var(--mango-ink)]">
              {iniciais || <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>}
            </div>
          )}
          {aEnviarFoto && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs text-white">A enviar...</div>
          )}
        </div>
        <h1 className="mt-3 font-display text-lg font-bold text-[var(--ink)]">{profile?.nome || 'Sem nome'}</h1>
        <p className="text-xs text-[var(--ink-soft)]">{user?.email}</p>
        <p className="mt-1 text-[11px] text-[var(--ink-soft)]">Powered by SmartMetrics Limitada</p>

        <div className="mt-5 flex w-full gap-2.5">
          <PillButton icon={IconeCamara} label="Definir Foto" onClick={() => fileFotoRef.current?.click()} />
          <PillButton icon={IconeCaneta} label="Editar Informações" onClick={() => { setNome(profile?.nome || ''); setWhatsapp(profile?.whatsapp || ''); setErro(''); setAEditar(true); }} />
          <PillButton icon={IconeBackup} label="Backup" onClick={() => setAEditar('backup')} />
        </div>
        <input ref={fileFotoRef} type="file" accept="image/*" className="hidden" onChange={aoEscolherFoto} />

        <div className="mt-5 w-full space-y-2.5">
          <InfoCard label="WhatsApp" valor={profile?.whatsapp} />
          <InfoCard label="Email" valor={user?.email} />
        </div>

        <div className="mt-6 w-full">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Comprovativos</p>
          <button onClick={() => setReciboAberto(true)} className="flex w-full items-center justify-between rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-left">
            <span>
              <span className="block text-sm font-semibold text-[var(--ink)]">Comprovativos de pagamento</span>
              <span className="mt-0.5 block text-xs text-[var(--ink-soft)]">Salário, renda e outras despesas, em PDF ou imagem</span>
            </span>
            <span aria-hidden="true" className="text-[var(--ink)]">›</span>
          </button>
        </div>

        <div className="mt-6 w-full">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Crédito e financiamento</p>
          <button onClick={() => setDossieAberto(true)} className="flex w-full items-center justify-between rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-left">
            <span>
              <span className="block text-sm font-semibold text-[var(--ink)]">Dossiê para pedir crédito</span>
              <span className="mt-0.5 block text-xs text-[var(--ink-soft)]">PDF com vendas, lucro, despesas, fiados, stock e poupança</span>
            </span>
            <span aria-hidden="true" className="text-[var(--ink)]">›</span>
          </button>
        </div>

        <div className="mt-6 w-full">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Saldos iniciais</p>
          <div className="space-y-2.5">
            {['produtos', 'maquina'].map((st) => (
              <div key={st} className="flex items-center justify-between rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">{formatMoney(saldoInicialGlobal[st])} MT</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Saldo {st === 'produtos' ? 'Produtos' : 'Serviços'}</p>
                </div>
                <button onClick={() => { setValorSaldo(saldoInicialGlobal[st] ? String(saldoInicialGlobal[st]) : ''); setSetorSaldo(st); }} className="rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--mango)]">Definir</button>
              </div>
            ))}
            <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--ink)]">{formatMoney(saldoInicialGlobal.produtos + saldoInicialGlobal.maquina)} MT</p>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Saldo total inicial (soma dos dois). O Caixa soma a isto as entradas e saídas de todos os dias.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 w-full">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Suporte</p>
          <div className="space-y-2.5">
            <a href="mailto:smartmetrics11@gmail.com" className="block rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
              <p className="text-sm text-[var(--ink)]">smartmetrics11@gmail.com</p>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Email</p>
            </a>
            <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
              <p className="text-sm text-[var(--ink)]"><a href="tel:+258840225411">840 225 411</a> / <a href="tel:+258860143730">860 143 730</a></p>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Contacto (chamada ou WhatsApp)</p>
            </div>
            <a href="https://wa.me/258840225411?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20a%20app." target="_blank" rel="noopener noreferrer" className="block rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm font-semibold text-[var(--mango)]">Falar no WhatsApp</a>
            <button onClick={() => setGuiaAberto(true)} className="flex w-full items-center justify-between rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm font-semibold text-[var(--ink)]"><span>Como usar a aplicação</span><span aria-hidden="true">›</span></button>
            <button onClick={() => setTermosAberto(true)} className="flex w-full items-center justify-between rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm font-semibold text-[var(--ink)]"><span>Termos e condições</span><span aria-hidden="true">›</span></button>
          </div>
        </div>

        <div className="mt-6 w-full space-y-2.5">
          <Botao variante="secundario" onClick={sair}>Sair da conta</Botao>
          <Botao variante="fantasma" className="!text-[var(--brick)]" onClick={() => setConfirmarExclusao(true)}>Excluir conta</Botao>
        </div>
      </div>

      <DossieModal aberto={dossieAberto} aoFechar={() => setDossieAberto(false)} />
      <ReciboModal aberto={reciboAberto} aoFechar={() => setReciboAberto(false)} />

      {/* Editar informações */}
      <Modal titulo="Editar Informações" aberto={aEditar === true} aoFechar={() => setAEditar(false)}>
        <div className="space-y-3.5">
          <Campo label="Nome completo">
            <input className="campo" value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo label="Número de WhatsApp">
            <input className="campo" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </Campo>
          {erro && <MensagemErro>{erro}</MensagemErro>}
          <Botao onClick={aoGuardarInfo} disabled={aGuardar}>{aGuardar ? 'A guardar...' : 'Guardar'}</Botao>
        </div>
      </Modal>

      {/* Definições e backup (movido do Header para dentro do Perfil) */}
      <Modal titulo="Definições e Backup" aberto={aEditar === 'backup'} aoFechar={() => setAEditar(false)}>
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] px-4 py-3">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: corBackup }} />
          <p className="text-sm font-bold text-[var(--ink)]">{textoBackup}</p>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--ink-soft)]">
          A tua conta sincroniza os dados entre aparelhos. O backup local continua disponível como cópia extra dos dados deste telemóvel.
        </p>
        <div className="space-y-3">
          <button onClick={fazerExport} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--mango)] text-base font-bold text-white transition active:scale-[0.98]"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" /></svg>Exportar backup</button>
          <button onClick={() => fileBackupRef.current?.click()} className="flex h-14 w-full items-center justify-center gap-2 rounded-full border-2 border-[var(--mango)] text-base font-bold text-[var(--mango)] transition active:scale-[0.98]"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3m0 0L8 7m4-4 4 4M5 21h14" /></svg>Importar backup</button>
          <input ref={fileBackupRef} type="file" accept="application/json" className="hidden" onChange={aoImportarBackup} />
        </div>
      </Modal>

      {/* Saldo inicial (definido uma vez, aqui no Perfil) */}
      <Modal titulo={setorSaldo ? `Saldo inicial — ${setorSaldo === 'produtos' ? 'Produtos' : 'Serviços'}` : ''} aberto={!!setorSaldo} aoFechar={() => setSetorSaldo(null)}>
        <p className="mb-3 text-sm text-[var(--ink-soft)]">Quanto tinhas neste setor quando começaste a usar a app. Defines isto uma só vez; depois o saldo acumula todos os dias no Caixa.</p>
        <Campo label="Valor (MT)">
          <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorSaldo} onChange={(e) => setValorSaldo(e.target.value)} />
        </Campo>
        <div className="mt-4 flex gap-2">
          <Botao variante="secundario" onClick={() => setSetorSaldo(null)}>Cancelar</Botao>
          <Botao onClick={guardarSaldoInicial}>Guardar</Botao>
        </div>
      </Modal>

      {/* Como usar */}
      <Modal titulo="Como usar a aplicação" aberto={guiaAberto} aoFechar={() => setGuiaAberto(false)}>
        <div className="space-y-3 text-sm leading-relaxed text-[var(--ink-soft)]">
          {GUIA.map(([t, x]) => (
            <div key={t}><p className="font-semibold text-[var(--ink)]">{t}</p><p>{x}</p></div>
          ))}
        </div>
      </Modal>

      {/* Termos e condições */}
      <Modal titulo="Termos e condições" aberto={termosAberto} aoFechar={() => setTermosAberto(false)}>
        <div className="space-y-3 text-sm leading-relaxed text-[var(--ink-soft)]">
          {TERMOS.map(([t, x]) => (
            <div key={t}><p className="font-semibold text-[var(--ink)]">{t}</p><p>{x}</p></div>
          ))}
        </div>
      </Modal>

      {/* Confirmar exclusão de conta */}
      <Modal titulo="Excluir conta" aberto={confirmarExclusao} aoFechar={() => setConfirmarExclusao(false)}>
        <p className="mb-4 text-sm leading-relaxed text-[var(--ink-soft)]">
          Isto apaga a tua conta e todos os dados associados de forma permanente. Não é possível desfazer. Tens a certeza?
        </p>
        {erro && <div className="mb-3"><MensagemErro>{erro}</MensagemErro></div>}
        <div className="space-y-2.5">
          <Botao variante="perigo" onClick={aoConfirmarExclusao}>Sim, excluir a minha conta</Botao>
          <Botao variante="fantasma" onClick={() => setConfirmarExclusao(false)}>Cancelar</Botao>
        </div>
      </Modal>
    </Layout>
  );
}
