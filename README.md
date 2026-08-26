# Minha Carteira — Publicar Online (GitHub → Vercel)

App 100% estático (sem servidor, sem backend). Só precisa de hospedagem
de ficheiros com HTTPS para ficar instalável e funcionar offline.

## Passo 1 — Criar o repositório no GitHub

1. Acede a https://github.com/new
2. Nome do repositório: `minha-carteira` (ou o que preferires)
3. Deixa **Public**, não marques nenhuma opção extra
4. Clica **Create repository**

## Passo 2 — Subir os ficheiros

Na pasta onde extraíste este zip, corre:

```bash
git init
git add .
git commit -m "Primeira versão do Minha Carteira"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/minha-carteira.git
git push -u origin main
```

(Substitui `SEU-USUARIO` pelo teu nome de utilizador do GitHub.)

## Passo 3 — Ligar ao Vercel

1. Acede a https://vercel.com e entra com a tua conta GitHub
2. Clica **Add New → Project**
3. Escolhe o repositório `minha-carteira`
4. Em **Framework Preset**, escolhe **Other** (é site estático, sem build)
5. Deixa "Build Command" e "Output Directory" em branco
6. Clica **Deploy**

Em menos de 1 minuto o Vercel dá-te um link tipo:
`https://minha-carteira-teu-usuario.vercel.app`

## Passo 4 — Testar a instalação

1. Abre o link do Vercel no telemóvel (Chrome no Android, Safari no iPhone)
2. Android: aparece um banner ou usas o menu → **Adicionar à tela inicial**
3. iPhone: botão Partilhar → **Adicionar ao Ecrã Principal**
4. Depois de instalado, ativa o modo avião e confirma que o app continua a abrir normalmente

## Sempre que fizeres alterações

```bash
git add .
git commit -m "Descrição da alteração"
git push
```

O Vercel publica a nova versão automaticamente a cada `push` — não precisas de repetir o passo 3.

## Ficheiros deste projeto

| Ficheiro | Função |
|---|---|
| `index.html` | O app inteiro (Caixa do Dia, Xitique, Poupança) |
| `manifest.json` | Torna o app instalável no telemóvel |
| `service-worker.js` | Faz o app funcionar offline |
| `icon-192.png` / `icon-512.png` / `icon-512-maskable.png` | Ícones do app |
