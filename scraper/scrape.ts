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
  // Para debug, pode rodar com headless: false
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  // Fecha modal do Instagram se aparecer (por classe e SVG)
  try {
    // Espera o modal aparecer
    await page.waitForSelector('div[aria-modal="true"][role="dialog"]', { timeout: 8000 });
    // Tenta clicar no botão de fechar pelo SVG com title="Fechar"
    const closeBtn = await page.$('div[aria-modal="true"] [role="button"] svg[aria-label="Fechar"], div[aria-modal="true"] [role="button"] svg[title="Fechar"]');
    if (closeBtn) {
      await closeBtn.click();
      await wait(1000);
    } else {
      // Alternativa: tenta clicar no primeiro botão role=button dentro do modal
      const fallbackBtn = await page.$('div[aria-modal="true"] [role="button"]');
      if (fallbackBtn) {
        await fallbackBtn.click();
        await wait(1000);
      }
    }
  } catch {}

  // Simula movimento do mouse para evitar bloqueios de automação
  await page.mouse.move(100, 100);
  await wait(500);
  await page.mouse.move(200, 200);
  await wait(500);

  // Se precisar logar, implemente aqui (exemplo para Facebook)
  if (username && password && url.includes('facebook.com')) {
    await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle2' });
    await page.type('#email', username);
    await page.type('#pass', password);
    await page.click('button[name="login"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }


  // Carrega a página alvo
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(3000);

  // Instagram: aguarda posts carregarem (divs dos posts)
  try {
    await page.waitForSelector('article img', { timeout: 20000 });
  } catch {}

  // Monitora elementos que aparecem após o carregamento inicial
  // e fecha overlays/modais de forma recursiva até restar só o body principal
  await page.exposeFunction('wait', wait);
  await page.evaluate(async () => {
    // Função para fechar overlays/modais recursivamente
    async function closeOverlaysRecursively(maxDepth = 10) {
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
      let closed = false;
      for (const sel of closeSelectors) {
        document.querySelectorAll(sel).forEach(btn => {
          try {
            (btn as HTMLElement).click();
            closed = true;
          } catch {}
        });
      }
      // Remove overlays que cobrem o body
      const overlaySelectors = [
        '[aria-modal="true"]', '[role="dialog"]', '[class*="modal"]', '[class*="popup"]', '[class*="overlay"]', '[class*="portal"]', '[id*="modal"]', '[id*="popup"]', '[id*="overlay"]', '[id*="portal"]'
      ];
      for (const sel of overlaySelectors) {
        document.querySelectorAll(sel).forEach(el => {
          // Só remove se estiver visível e cobrindo o body
          if (el instanceof HTMLElement && el.offsetParent !== null) {
            el.parentNode?.removeChild(el);
            closed = true;
          }
        });
      }
      // Repete até não encontrar mais overlays ou atingir profundidade máxima
      if (closed && maxDepth > 0) {
        await new Promise(res => setTimeout(res, 500));
        await closeOverlaysRecursively(maxDepth - 1);
      }
    }
    await closeOverlaysRecursively();
  });

  // Rola a página até o final para carregar todas as imagens (scroll infinito mais longo)
  let previousHeight: number | undefined;
  for (let i = 0; i < 20; i++) {
    previousHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await wait(2500);
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight === previousHeight) break;
  }
  await wait(3000);



  // Extrai imagens de posts do Instagram (img, srcset, background-image)
  const images: string[] = await page.evaluate(() => {
    // Extrai src e srcset de <img> visíveis em toda a página (não só <article>)
    const imgSrcs: string[] = [];
    document.querySelectorAll('img').forEach(img => {
      if ((img as HTMLImageElement).src) imgSrcs.push((img as HTMLImageElement).src);
      const srcset = (img as HTMLImageElement).srcset;
      if (srcset) {
        srcset.split(',').forEach(s => {
          const url = s.trim().split(' ')[0];
          if (url) imgSrcs.push(url);
        });
      }
    });
    // Extrai background-image de todos os elementos
    const bgImgs: string[] = [];
    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      const bg = style.getPropertyValue('background-image');
      if (bg && bg !== 'none') {
        const matches = Array.from(bg.matchAll(/url\(['"]?([^'")]+)['"]?\)/g));
        matches.forEach(m => bgImgs.push(m[1]));
      }
    });
    // Remove duplicatas
    return Array.from(new Set([...imgSrcs, ...bgImgs]));
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
