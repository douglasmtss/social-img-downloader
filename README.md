# Social Image Downloader

Landing page PWA para baixar imagens de redes sociais.

## Funcionalidades
- Landing page responsiva com cards para Instagram, Twitter, Facebook, etc.
- Cada card leva à página de download da respectiva rede social.
- Formulário para inserir links de posts, reels, stories, etc.
- Download seguro de imagens usando scraping ou APIs públicas.
- PWA: instalável, funciona offline, service worker configurado.
- Testes unitários com Jest.
- Código limpo com ESLint, Prettier e TypeScript.

## Tecnologias
- Next.js
- TypeScript
- Tailwind CSS
- ESLint
- Prettier
- Jest
- Node.js 24
- Yarn


## Como rodar
```bash
# Instale as dependências
npm install

# Rode em modo desenvolvimento
npm run dev

# Rode os testes
npm test
```

## Service Worker (PWA)
O Service Worker (sw.js) é registrado automaticamente apenas em produção. Em ambiente de desenvolvimento (localhost), ele não será registrado para evitar conflitos e erros de escopo.

Se você encontrar problemas de Service Worker, limpe SW antigos em DevTools > Application > Service Workers > Unregister.

## Estrutura
- `src/` - Código fonte
- `docs/` - Documentação técnica

## Documentação
Veja a pasta `docs/` para detalhes técnicos, arquitetura e manual do usuário.
