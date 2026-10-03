import { dateKey, formatMoney } from './format';

const arred = (n) => Math.round(n * 100) / 100;

// Os fiados guardam o cliente só pelo nome. Esta chave junta "Maria", "maria " e "MARIA" no mesmo cliente.
export const chaveCliente = (nome) => String(nome || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Um cliente "perto do limite" já usou pelo menos 80% do que pode dever.
const PERTO = 0.8;

// Junta os fiados por cliente e calcula a ficha de cada um.
export function agruparClientes(fiados, limites, saldoFiado) {
  const mapa = new Map();
  [...fiados].sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0)).forEach((f) => {
    const chave = chaveCliente(f.cliente);
    if (!chave) return;
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave).push(f); // do mais recente para o mais antigo
  });

  const fichas = [...mapa.entries()].map(([chave, lista]) => {
    const ativos = lista.filter((f) => saldoFiado(f) > 0);
    const pagos = lista.filter((f) => saldoFiado(f) <= 0);
    const deve = arred(ativos.reduce((s, f) => s + saldoFiado(f), 0));
    const venc = ativos.filter((f) => f.vencimento && f.vencimento < dateKey(new Date()));
    const vencidoValor = arred(venc.reduce((s, f) => s + saldoFiado(f), 0));

    // Pontualidade: um fiado pago conta como "a tempo" se o último pagamento foi até ao vencimento.
    let aTempo = 0;
    let contados = 0;
    pagos.forEach((f) => {
      const pags = f.pagamentos || [];
      if (!f.vencimento || pags.length === 0) return;
      const ultimo = Math.max(...pags.map((p) => p.timestamp || 0));
      contados += 1;
      if (dateKey(new Date(ultimo)) <= f.vencimento) aTempo += 1;
    });

    const limite = limites && limites[chave] > 0 ? limites[chave] : null;
    let estado = 'sem_limite';
    if (limite) estado = deve > limite + 0.001 ? 'passou' : deve >= limite * PERTO ? 'perto' : 'ok';

    return {
      chave,
      nome: String(lista[0].cliente || '').trim(),
      telefone: (lista.find((f) => f.telefone) || {}).telefone || '',
      fiados: lista,
      ativos,
      pagos,
      deve,
      vencidoValor,
      vencidoCount: venc.length,
      totalFiado: arred(lista.reduce((s, f) => s + (f.valorTotal || 0), 0)),
      totalPago: arred(lista.reduce((s, f) => s + (f.valorPago || 0), 0)),
      aTempo,
      contados,
      limite,
      estado,
      uso: limite ? deve / limite : null,
      desde: Math.min(...lista.map((f) => f.criadoEm || Date.now())),
    };
  });

  // Quem deve mais primeiro; quem não deve nada no fim.
  return fichas.sort((a, b) => b.deve - a.deve || a.nome.localeCompare(b.nome));
}

// Antes de lançar uma dívida nova: o cliente passaria do limite? Devolve null se não passa ou se não tem limite.
export function verificarLimite(fiados, limites, cliente, novaDivida, saldoFiado) {
  const chave = chaveCliente(cliente);
  const limite = limites && limites[chave] > 0 ? limites[chave] : null;
  if (!limite || !(novaDivida > 0)) return null;
  const deve = arred(fiados.filter((f) => chaveCliente(f.cliente) === chave).reduce((s, f) => s + saldoFiado(f), 0));
  const depois = arred(deve + novaDivida);
  if (depois <= limite + 0.001) return null;
  return { limite, deve, depois, excesso: arred(depois - limite) };
}

export function textoLimite(cliente, a) {
  return `${cliente} ficaria a dever ${formatMoney(a.depois)} MT, acima do limite de ${formatMoney(a.limite)} MT (passa ${formatMoney(a.excesso)} MT). Queres continuar mesmo assim?`;
}
