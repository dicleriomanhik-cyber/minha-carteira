# Minha Carteira — Contexto completo do projecto

> Cola este ficheiro no início de uma conversa nova com o Claude, junto com o zip `Carteira-completo.zip`, para continuar o trabalho sem perder nada.

## 1. O que é
App web (PWA) para pequenos negócios em Moçambique. Objectivo: ajudar o pequeno comerciante a organizar o dinheiro, crescer e tornar-se um grande empreendedor/empresário. Quer-se que a app seja **indispensável** no dia a dia do dono.
- Publicada em: https://minha-carteira-kappa.vercel.app (GitHub -> Vercel)
- Feita por: SmartMetrics Limitada (suporte: smartmetrics11@gmail.com)
- Moeda: MT (Metical). Idioma: português de Moçambique, tratamento por "tu".

## 2. Stack
React 19 + Vite 8 + React Router 7 + Tailwind 4 + vite-plugin-pwa; Supabase (auth, tabela `profiles`, tabela `dados_financeiros`, bucket `avatars`). Variáveis de ambiente (ficheiro `.env`, NÃO está no zip): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. SQL de configuração: `supabase-setup.sql`.

## 3. Estrutura
- `src/App.jsx` — rotas: `/` Caixa, `/fiados`, `/produtos` (Stock), `/xitique`, `/despesas`, `/poupanca`, `/perfil`.
- `src/context/DataContext.jsx` — TODA a lógica de dados e regras (ver secção 4). `AuthContext.jsx` — sessão e perfil.
- `src/pages/` — Caixa, Fiados, Produtos, Xitique, Despesas, Poupanca, Perfil, Login, Cadastro.
- `src/components/` — Layout, Header (botão "Relatório"), BottomNav (menu de 6 abas), RelatorioModal, Modal, Campo, Botao, HeroCard, SeletorDia, Icons (inclui `IconeWhatsApp`), Footer, etc.
- `src/utils/format.js` — formatação, datas, `semEmoji`. `src/utils/whatsapp.js` — `linkWhatsApp(telefone, mensagem)` (wa.me, aceita números de Moçambique, junta 258).

## 4. Regras de negócio importantes
- Dados guardados em `localStorage` e sincronizados (instantâneo JSON) para `dados_financeiros` no Supabase, um registo por utilizador. Chaves: transacoes, saldo_inicial, participantes, pagamentos, entregas, movimentos_poupanca, fiados, produtos. Metas da poupança e saldos iniciais ficam dentro de `saldo_inicial` (`__metas`, `__global`).
- **Saldo total = saldo Produtos + saldo Serviços** (nunca definido à mão). Saldos iniciais definem-se uma vez no Perfil; depois acumulam dia a dia.
- Todas as saídas/entradas são `transacoes` (tipo, categoria, valor, setor produtos|maquina, metodo dinheiro|mpesa|emola|mkesh, dateKey). O saldo por método também é controlado.
- **Poupança:** guardar cria uma saída no Caixa (categoria `poupanca`, ligada por `txId`) + movimento na Poupança; sai do saldo total. Retirar NÃO devolve ao Caixa (só fica o registo). Apagar um depósito devolve o dinheiro ao Caixa. Existe migração de depósitos antigos sem saída.
- **Fiados:** cliente, produto/serviço, valor, vencimento, telefone, pagamentos parciais, aumentos de dívida, edição (valor, produto, vencimento, telefone). Recebimentos entram no Caixa na data em que são recebidos. O relatório mostra "Fiados feitos" e "Fiados pagos" (data em que a dívida foi feita e em que foi paga). Botão "Lembrar" abre o WhatsApp com mensagem pronta.
- **Despesas (passo 4):** grupos Salários (Meu salário; Salário de funcionário com nome da pessoa), Administrativas, Comerciais e Vendas, Tecnologia e Ferramentas, Financeiras, Legais e Regulatórias (definidos em `DESPESA_GRUPOS`). Cada pagamento é uma saída (`registarDespesa`), sai do saldo total e aparece na secção "Salários e Despesas" do relatório. Decisão tomada: registar cada pagamento com o nome (sugestões de nomes já pagos); NÃO há lista de funcionários com salário fixo (pode vir depois).
- Stock: venda ligada ao produto desconta quantidade e calcula lucro real (custo vs receita).

## 5. Regras de estilo pedidas pelo dono do projecto
- Sem emojis na app, excepto no rodapé. Sem "Ex:" nos placeholders. Ícones em SVG. O botão do cabeçalho mostra o ícone + a palavra "Relatório".
- Trabalhar **passo a passo**, um passo de cada vez, e perguntar quando houver dúvida. Entregar zips só com os ficheiros alterados (estrutura `src/...`) para extrair por cima do projecto.
- Português de Moçambique, tom simples e directo.

## 6. Estado dos passos
FEITOS: passo 3 (fiados editáveis, relatório de fiados, WhatsApp, poupança ligada ao saldo, remoção de emojis/porcos, relatório); passo 4 (aba Despesas + relatório); passo 5 (redesign da Poupança com anéis de progresso, ícone de moedas no menu, `semEmoji`); passo 6 (lembrete WhatsApp com `utils/whatsapp.js`, "Como usar a aplicação" no Perfil, Termos e condições revistos, 12 pontos).
Passo 7: tema azul claro restaurado (`--bg #EEF4FC`, classe `.cartao-azul` em `index.css`), exemplos dos placeholders limpos (excepto 'Comprar um Terreno'). Passo 9: o método Dinheiro usa a imagem da nota de 1000 MT (`public/metodos/dinheiro.jpg`). Passo 8: logos de M-Pesa, e-Mola e mKesh (`public/metodos/*.png`, componentes `MetodoLogo` e `SeletorMetodo`) nos cartões do Caixa, na lista de movimentos e nos seletores de método de pagamento.
Este zip já tem TODOS estes passos aplicados.

## 7. Pontos em aberto / a verificar
1. **Nada foi compilado ainda** nas últimas sessões (sem acesso à rede). Primeiro passo: `npm install` e `npm run dev`, corrigir erros se houver.
2. O rodapé (`Footer.jsx`) está vazio e o dono decidiu deixá-lo assim.
3. Termos e condições são texto genérico; um jurista deve rever os pontos 8 (salários) e 10 (responsabilidade).
4. O SQL de `supabase-setup.sql` não precisa de alterações para as despesas (usam `transacoes`).

## 8. Roadmap de ideias (para tornar a app indispensável), por prioridade
1. **Lucro líquido e ponto de equilíbrio** (vendas - custo da mercadoria - salários - despesas; comparação com o mês anterior; quanto vender por dia para não ter prejuízo). Usa dados que já existem. SUGERIDO COMO PRÓXIMO PASSO.
2. **Alertas e resumo diário / fecho do dia** (stock baixo, fiados a vencer, renda e licenças; conferência do dinheiro contado vs saldo).
3. **Dossiê para pedir crédito** (PDF com 6-12 meses de vendas, lucro, despesas, fiados cobrados).
4. Recibos e comprovativos de salário em PDF/imagem para enviar por WhatsApp.
5. Funcionários com acesso limitado (registar vendas sem ver lucros/poupança) — exige perfis e permissões.
6. Extras: registar vendas M-Pesa/e-Mola colando o SMS; ficha e limite de fiado por cliente; produtos mais lucrativos e sugestor de preço; metas do negócio; vários negócios na mesma conta; dicas curtas de gestão; lista de funcionários com salário fixo.

## 9. Como retomar numa conversa nova
1. Anexar `Carteira-completo.zip` e este ficheiro.
2. Dizer: "Continuamos o Minha Carteira. Lê o CONTEXTO-PROJECTO.md, trabalha passo a passo e pergunta quando tiveres dúvidas. Próximo passo: <o que queres>."
