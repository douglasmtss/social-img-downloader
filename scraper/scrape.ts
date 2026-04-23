import puppeteer from 'puppeteer';

export interface ScrapeOptions {
  username?: string;
  password?: string;
}

export async function scrapeImages(
  url: string,
  options: ScrapeOptions = {}
): Promise<string[]> {
  const { username, password } = options;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (compatible; SocialImgDownloader/1.0)');

  // Se precisar logar, implemente aqui (exemplo para Facebook)
  if (username && password && url.includes('facebook.com')) {
    await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle2' });
    await page.type('#email', username);
    await page.type('#pass', password);
    await page.click('button[name="login"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  // Carrega a página alvo, tenta fechar popup antes de buscar imagens
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(2000); // aguarda possíveis popups carregarem
  try {
    // Tenta clicar em botões de fechar modais comuns do Instagram e Facebook
    // Instagram: <div role="dialog"> ... <div role="button" aria-label="Fechar">
    const closeBtns = await page.$$('div[role="dialog"] [role="button"][aria-label="Fechar"], div[role="dialog"] [aria-label="Fechar"], div[role="dialog"] [aria-label="Close"]');
    for (const btn of closeBtns) {
      try {
        await btn.click();
        await wait(1000);
      } catch {}
    }
  } catch {}

  // Rola a página até o final para carregar todas as imagens (scroll infinito)
  let previousHeight: number | undefined;
  for (let i = 0; i < 10; i++) {
    previousHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await wait(2000);
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight === previousHeight) break;
  }
  await wait(3000);


  // Extrai imagens relevantes ignorando ícones, avatares e imagens de background
  const images: string[] = await page.evaluate(() => {
    // Função para checar se o elemento está visível
    function isVisible(el: Element) {
      if (!(el instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(el);
      return style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    }
    // Heurística para ignorar ícones e avatares
    function isProbablyContentImage(img: HTMLImageElement) {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      // Ignora imagens muito pequenas (ícones, avatares pequenos)
      if (w < 80 || h < 80) return false;
      // Ignora imagens SVG ou base64 pequenas
      if (img.src.startsWith('data:image/svg') || (img.src.startsWith('data:image/') && w < 120 && h < 120)) return false;
      // Ignora imagens de avatar pelo alt
      if (img.alt && img.alt.toLowerCase().includes('avatar')) return false;
      return true;
    }
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.filter(img => isVisible(img) && isProbablyContentImage(img as HTMLImageElement)).map(img => (img as HTMLImageElement).src);
  });

  await browser.close();
  return images;
}

// Exemplo de uso via CLI
if (require.main === module) {
  const [,, url, username, password] = process.argv;
  scrapeImages(url, { username, password }).then(imgs => {
    console.log(JSON.stringify(imgs, null, 2));
  }).catch(err => {
    console.error('Erro:', err);
    process.exit(1);
  });
}

// Substitui page.waitForTimeout por await new Promise(res => setTimeout(res, ms))
function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
