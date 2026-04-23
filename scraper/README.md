# Scraper Puppeteer

Este diretório contém um exemplo de scraper Node.js usando Puppeteer para extrair imagens de páginas dinâmicas (ex: Facebook).

## Como usar

1. Instale as dependências:
   ```bash
   npm install puppeteer
   ```
2. Execute o scraper passando a URL:
   ```bash
   node scraper/scrape.js "https://www.facebook.com/profile.php?id=..."
   ```
3. Para páginas que exigem login (ex: Facebook), adapte o código para preencher usuário e senha.

## Observações
- Não execute este código em ambientes serverless ou Next.js API routes.
- Use apenas para fins educacionais e respeite os Termos de Uso das plataformas.
