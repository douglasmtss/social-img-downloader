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

  // Tenta fechar overlays/modais do Instagram de forma mais agressiva
  try {
    // Seletores comuns de botões de fechar em modais/overlays
    const closeSelectors = [
      'div[role="dialog"] [role="button"][aria-label*="Fechar"]',
      'div[role="dialog"] [aria-label*="Fechar"]',
      'div[role="dialog"] [role="button"][tabindex="0"]',
      '[aria-modal="true"] [role="button"][aria-label*="Fechar"]',
      '[aria-modal="true"] [role="button"][tabindex="0"]',
      '[aria-modal="true"] [aria-label*="Fechar"]',
      '[role="dialog"] [role="button"]',
      '[role="dialog"] [tabindex="0"]',
      '[aria-label*="Fechar"]',
      '[aria-label*="Close"]',
      '[data-testid*="close"]',
      '[class*="close"]',
      '[class*="Fechar"]',
      '[class*="closeButton"]',
    ];
    for (const sel of closeSelectors) {
      const btns = await page.$$(sel);
      for (const btn of btns) {
        try {
          await btn.click();
          await wait(1000);
        } catch {}
      }
    }
  } catch {}

  // Após tentar fechar overlays, role e aguarde novamente
  await wait(1000);

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
      return style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null && style.opacity !== '0';
    }
    // Heurística para ignorar ícones e avatares
    function isProbablyContentImage(img: HTMLImageElement) {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      // Ignora imagens muito pequenas (ícones, avatares pequenos)
      if (w < 80 || h < 80) return false;
      // Ignora imagens SVG ou base64 pequenas
      if (img.src.startsWith('data:image/svg') || (img.src.startsWith('data/image/') && w < 120 && h < 120)) return false;
      // Ignora imagens de avatar pelo alt, mas permite outros casos
      if (img.alt && img.alt.toLowerCase().includes('avatar')) return false;
      // Permite imagens de perfil e conteúdo, desde que não sejam ícones
      return true;
    }

    // Busca imagens em toda a árvore DOM, inclusive em modais e overlays
    function getAllImagesFromNode(node: Element | ShadowRoot): HTMLImageElement[] {
      let imgs: HTMLImageElement[] = [];
      if ((node as Element).nodeType === 1) {
        if ((node as Element).tagName === 'IMG') imgs.push(node as HTMLImageElement);
        // Busca em shadow roots
        if ((node as Element).shadowRoot) {
          imgs = imgs.concat(getAllImagesFromNode((node as Element).shadowRoot!));
        }
        // Busca recursiva em filhos
        if ((node as Element).children) {
          for (const child of (node as Element).children) {
            imgs = imgs.concat(getAllImagesFromNode(child));
          }
        }
      }
      return imgs;
    }
    // Busca imagens em toda a página
    let imgs: HTMLImageElement[] = getAllImagesFromNode(document.body);
    // Busca imagens em modais/overlays visíveis
    const modalSelectors = [
      '[aria-modal="true"]', '[role="dialog"]', '[class*="modal"]', '[class*="popup"]', '[class*="overlay"]', '[class*="portal"]', '[id*="modal"]', '[id*="popup"]', '[id*="overlay"]', '[id*="portal"]'
    ];
    for (const sel of modalSelectors) {
      document.querySelectorAll(sel).forEach((modal: Element) => {
        imgs = imgs.concat(getAllImagesFromNode(modal));
      });
    }
    // Remove duplicatas
    imgs = Array.from(new Set(imgs));
    return imgs.filter((img: HTMLImageElement) => isVisible(img) && isProbablyContentImage(img)).map((img: HTMLImageElement) => img.src);
  });

  await browser.close();
  // Remove duplicatas preservando ordem
  const uniqueImages = Array.from(new Set(images));
  return uniqueImages;
}

// Exemplo de uso via CLI para ES module
if (import.meta.url === `file://${process.argv[1]}`) {
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
