// Dicas curtas de gestão. Uma dica por dia, igual para todos os utilizadores:
// a dica é escolhida pelo número do dia (data local), por isso muda sozinha à meia-noite
// e só se repete depois de passarem todas. Para acrescentar dicas, juntar linhas ao fim da lista.
// Sem emojis (regra da app). Tratamento por "tu".

export const DICAS = [
  { cat: 'Caixa', texto: 'Regista cada venda no momento em que acontece. O que deixas para o fim do dia esquece-se, e o dinheiro que não aparece no caderno costuma desaparecer.' },
  { cat: 'Caixa', texto: 'Separa o dinheiro do negócio do dinheiro de casa. Quando tiras da caixa para as despesas da família, regista como saída para saberes o que o negócio realmente rende.' },
  { cat: 'Caixa', texto: 'Faz o fecho do dia todos os dias, mesmo quando o dia foi fraco. Contar o dinheiro e comparar com a app apanha os erros ainda no mesmo dia.' },
  { cat: 'Caixa', texto: 'Vender muito não é o mesmo que ganhar muito. O que sobra depois de pagar a mercadoria e as despesas é o teu lucro, e é esse que conta.' },
  { cat: 'Caixa', texto: 'Confere o dinheiro do M-Pesa, do e-Mola e do mKesh no telemóvel com o que a app mostra. Uma diferença pequena hoje pode ser uma grande no fim do mês.' },
  { cat: 'Caixa', texto: 'Guarda os talões e as mensagens de pagamento até acertares as contas do dia. Se alguém disser que pagou, tens a prova.' },
  { cat: 'Caixa', texto: 'Escolhe uma hora fixa para fechar o caixa, por exemplo logo depois de fechares a loja. Um hábito com hora marcada é mais difícil de falhar.' },
  { cat: 'Caixa', texto: 'Quando sobra dinheiro na caixa e não sabes de onde veio, não o gastes logo. Procura primeiro o erro: pode ser um troco que faltou dar ou uma venda registada duas vezes.' },
  { cat: 'Caixa', texto: 'Dá um nome claro a cada movimento. Daqui a um mês, "venda" não te diz nada, mas "açúcar, 5 sacos" ajuda-te a perceber o que realmente vende.' },
  { cat: 'Caixa', texto: 'Vê o Relatório pelo menos uma vez por semana. Quem só olha para as contas quando há problema chega tarde.' },

  { cat: 'Fiados', texto: 'Antes de vender fiado, pergunta a ti mesmo se aceitavas perder aquele valor. Se a resposta for não, vende só a pronto.' },
  { cat: 'Fiados', texto: 'Combina sempre a data de pagamento no momento em que dás o fiado e regista-a na app. Dívida sem data fica esquecida.' },
  { cat: 'Fiados', texto: 'Define um limite de fiado para cada cliente. Assim a dívida não cresce sem controlo e não deixas ninguém dever mais do que podes aguentar.' },
  { cat: 'Fiados', texto: 'Cobra cedo e com respeito. Uma mensagem educada pelo WhatsApp um dia antes do vencimento resolve mais do que uma cobrança zangada uma semana depois.' },
  { cat: 'Fiados', texto: 'Quem não pagou o fiado anterior não deve levar outro. Primeiro acerta o que está em aberto, depois voltas a vender fiado.' },
  { cat: 'Fiados', texto: 'Aceita pagamentos parciais e regista cada um. Uma dívida paga aos poucos é melhor do que uma dívida que ninguém paga.' },
  { cat: 'Fiados', texto: 'Mostra o valor da dívida ao cliente sempre que ele levar mais mercadoria. Quem vê o total não se esquece e não se surpreende depois.' },
  { cat: 'Fiados', texto: 'Dá atenção aos bons pagadores: um cliente que paga sempre a tempo merece um limite maior e boa conversa.' },
  { cat: 'Fiados', texto: 'Todas as semanas olha para a lista de quem deve e liga ou escreve a quem está atrasado. Os atrasos pequenos são fáceis de cobrar, os antigos não.' },
  { cat: 'Fiados', texto: 'Se vendes muito a fiado, o teu dinheiro está parado nas mãos dos clientes. Lembra-te que tens de pagar os teus fornecedores com dinheiro vivo.' },

  { cat: 'Stock', texto: 'Conta a mercadoria da prateleira com regularidade e compara com a app. Faltas inexplicáveis são sinal de perdas, erros ou furtos.' },
  { cat: 'Stock', texto: 'Não compres produtos só porque estão baratos. Mercadoria que não sai fica parada e o dinheiro que lá meteste não trabalha para ti.' },
  { cat: 'Stock', texto: 'Descobre quais são os 5 produtos que mais lucro dão e nunca os deixes acabar. Perder uma venda por falta de stock é perder dinheiro certo.' },
  { cat: 'Stock', texto: 'Define para cada produto uma quantidade mínima. Quando chegar lá, é hora de repor, antes de a prateleira ficar vazia.' },
  { cat: 'Stock', texto: 'Põe à frente os produtos com validade mais curta. O que passa da validade é lucro deitado fora.' },
  { cat: 'Stock', texto: 'Vê na app os produtos parados. Se um produto não vende há muito tempo, faz uma promoção para recuperar o dinheiro e compra outro que saia.' },
  { cat: 'Stock', texto: 'Compra em maior quantidade só o que vendes todos os dias. Para o resto, compra pouco e mais vezes.' },
  { cat: 'Stock', texto: 'Quando repões mercadoria, guarda o dinheiro da reposição à parte do dinheiro das vendas. Misturar os dois faz parecer que lucras mais do que lucras.' },
  { cat: 'Stock', texto: 'Anota o preço de custo sempre que o fornecedor mudar o preço. Se o custo sobe e o preço de venda fica igual, o teu lucro encolhe sem tu veres.' },
  { cat: 'Stock', texto: 'Arruma a loja para se ver o que há. Um cliente que não vê o produto não o pede, e tu perdes a venda.' },

  { cat: 'Preços', texto: 'Calcula o preço de venda a partir do custo, não do preço do vizinho. Se ele vende abaixo do teu custo, deixa-o: não vale a pena imitar quem perde dinheiro.' },
  { cat: 'Preços', texto: 'Quando o custo da mercadoria sobe, sobe também o preço. Esperar pelo cliente reclamar é pagar do teu bolso.' },
  { cat: 'Preços', texto: 'Um produto com margem pequena precisa de muita saída para compensar. Um produto com margem boa precisa de menos vendas para o mesmo lucro.' },
  { cat: 'Preços', texto: 'Arredonda os preços para valores fáceis de dar o troco, como 130 em vez de 127. Menos trocos, menos erros e mais rapidez.' },
  { cat: 'Preços', texto: 'Se o teu serviço demora tempo, inclui o teu tempo no preço. O teu trabalho também é um custo.' },
  { cat: 'Preços', texto: 'Não baixes o preço só para fechar uma venda. Primeiro faz as contas: vender sem lucro cansa e não deixa nada.' },
  { cat: 'Preços', texto: 'Oferece pacotes ou quantidades maiores com um pequeno desconto. Vendes mais de uma vez e o cliente sente que ganhou.' },
  { cat: 'Preços', texto: 'Na época de mais procura, como festas, abertura das aulas ou fim do mês, podes ajustar os preços. Prepara o stock antes, não depois.' },

  { cat: 'Poupança', texto: 'Guarda uma parte do lucro todas as semanas, mesmo que pequena. Quem espera sobrar dinheiro para poupar nunca poupa.' },
  { cat: 'Poupança', texto: 'Define uma meta concreta para a poupança, como comprar um terreno ou uma máquina nova. É mais fácil poupar quando sabes para quê.' },
  { cat: 'Poupança', texto: 'Cria um fundo de emergência com o valor de uma a duas semanas de despesas do negócio. Quando houver um imprevisto, não precisas de pedir emprestado.' },
  { cat: 'Poupança', texto: 'Usa o xitique com um grupo de confiança e regista cada entrega na app. Contas claras entre amigos evitam discussões.' },
  { cat: 'Poupança', texto: 'Antes de mexer na poupança, pensa duas vezes: é para uma necessidade ou é para um desejo? Se for desejo, espera uns dias.' },
  { cat: 'Poupança', texto: 'Quando tiveres um mês muito bom, guarda uma parte extra. Os meses fracos vão chegar e a poupança ajuda-te a passar por eles.' },
  { cat: 'Poupança', texto: 'Paga a ti próprio um salário fixo e regista-o como despesa. Assim sabes quanto o negócio aguenta e não tiras dinheiro a mais.' },

  { cat: 'Despesas', texto: 'Regista todas as despesas, mesmo as pequenas. Muitas pequenas saídas juntas pesam mais do que uma grande.' },
  { cat: 'Despesas', texto: 'Cria lembretes para a renda, a luz, a água e a licença. Pagar a tempo evita multas e cortes que param o negócio.' },
  { cat: 'Despesas', texto: 'Uma vez por mês, olha para as tuas despesas e pergunta a ti mesmo: qual posso cortar sem prejudicar as vendas?' },
  { cat: 'Despesas', texto: 'Dá um recibo ou comprovativo ao funcionário quando pagas o salário. Fica registado para os dois e evita dúvidas.' },
  { cat: 'Despesas', texto: 'Paga o salário dos funcionários no dia combinado. Um funcionário pago a tempo trabalha com mais vontade e cuida melhor do teu negócio.' },
  { cat: 'Despesas', texto: 'Antes de comprar um equipamento, calcula em quanto tempo ele se paga. Se a conta não fecha, espera.' },
  { cat: 'Despesas', texto: 'Compara preços de transporte, embalagem e electricidade. Pequenas poupanças repetidas todos os dias somam-se ao fim do mês.' },

  { cat: 'Clientes', texto: 'Trata bem cada cliente: quem é bem atendido volta e traz mais gente. Um cliente satisfeito é a melhor publicidade que existe.' },
  { cat: 'Clientes', texto: 'Guarda o contacto dos teus clientes mais fiéis. Podes avisar quando chegar um produto novo ou quando houver uma promoção.' },
  { cat: 'Clientes', texto: 'Pergunta aos clientes o que procuram e não encontram na tua loja. É a forma mais barata de saber o que passar a vender.' },
  { cat: 'Clientes', texto: 'Cumpre sempre o que prometes: prazo, preço e qualidade. A confiança demora a construir e perde-se depressa.' },
  { cat: 'Clientes', texto: 'Resolve as reclamações com calma e depressa. Um cliente que vê o problema resolvido costuma ficar mais fiel do que antes.' },
  { cat: 'Clientes', texto: 'Usa o WhatsApp Business ou o teu estado para mostrar produtos e preços. Muitos clientes preferem ver e pedir sem sair de casa.' },
  { cat: 'Clientes', texto: 'Dá o troco certo e confere o dinheiro à frente do cliente. Evita discussões e protege a tua caixa.' },

  { cat: 'Crescimento', texto: 'Um negócio cresce quando reinvestes parte do lucro nele. Pega numa parte do que ganhas e compra mais do que mais vende.' },
  { cat: 'Crescimento', texto: 'Define uma meta de vendas para o mês e acompanha-a todos os dias. O que se mede melhora.' },
  { cat: 'Crescimento', texto: 'Não tentes crescer em todos os lados ao mesmo tempo. Escolhe um passo de cada vez: um produto novo, uma hora a mais ou um cliente novo.' },
  { cat: 'Crescimento', texto: 'Se queres pedir crédito, junta pelo menos três meses de registos organizados. Os bancos e as microfinanças confiam em quem mostra números.' },
  { cat: 'Crescimento', texto: 'Aprende com os dias fracos. Olha para o que mudou: o tempo, o dia do mês, o stock. Cada dia mau ensina qualquer coisa.' },
  { cat: 'Crescimento', texto: 'Treina alguém de confiança para te substituir em alguns momentos. Um negócio que só funciona quando estás lá não consegue crescer.' },
  { cat: 'Crescimento', texto: 'Compara o lucro deste mês com o do mês passado. Se baixou, procura já a razão; se subiu, descobre o que fizeste bem e repete.' },
  { cat: 'Crescimento', texto: 'Conhece o teu ponto de equilíbrio, o mínimo que tens de vender para cobrir as despesas. Tudo o que vendes acima disso é lucro.' },
  { cat: 'Crescimento', texto: 'Aceita pagamentos por M-Pesa, e-Mola e mKesh. Quem não tem dinheiro na mão também compra, e tu não perdes a venda.' },
  { cat: 'Crescimento', texto: 'Olha para o que os melhores negócios da tua zona fazem diferente. Copia o que é bom e adapta ao teu estilo.' },
  { cat: 'Crescimento', texto: 'Mantém o teu espaço limpo e arrumado. A primeira impressão decide se o cliente entra ou continua a andar.' },
  { cat: 'Crescimento', texto: 'Escreve no início do mês o que queres alcançar e no fim do mês confere. Quem não escreve a meta, esquece-a.' },
  { cat: 'Crescimento', texto: 'Cuida da tua saúde e do teu descanso. O dono cansado comete erros nas contas, e erros nas contas custam dinheiro.' },
];

// Número do dia pela data local (não pelo UTC), para a dica mudar à meia-noite de Moçambique.
export function numeroDoDia(d = new Date()) {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

export function dicaDoDia(d = new Date()) {
  return DICAS[numeroDoDia(d) % DICAS.length];
}
