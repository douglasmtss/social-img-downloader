import { chromium } from 'playwright';

export async function scrapeInstagramImages(url: string): Promise<string[]> {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Fecha modal se aparecer
  try {
    await page.waitForSelector('div[aria-modal="true"][role="dialog"]', { timeout: 8000 });
    const closeBtn = await page.$('div[aria-modal="true"] [role="button"] svg[aria-label="Fechar"], div[aria-modal="true"] [role="button"] svg[title="Fechar"]');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    } else {
      const fallbackBtn = await page.$('div[aria-modal="true"] [role="button"]');
      if (fallbackBtn) {
        await fallbackBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  } catch {}

  // Rola a página para carregar imagens
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(1500);
  }

  // Extrai imagens de todos os <img> e background-image
  const images = await page.evaluate(() => {
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
    const bgImgs: string[] = [];
    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      const bg = style.getPropertyValue('background-image');
      if (bg && bg !== 'none') {
        const matches = Array.from(bg.matchAll(/url\(['"]?([^'")]+)['"]?\)/g));
        matches.forEach(m => bgImgs.push(m[1]));
      }
    });
    return Array.from(new Set([...imgSrcs, ...bgImgs]));
  });

  await browser.close();
  return images;
}

// CLI usage example
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: ts-node scrapeInstagramPlaywright.ts <instagram_url>');
    process.exit(1);
  }
  scrapeInstagramImages(url).then(imgs => {
    console.log(JSON.stringify(imgs, null, 2));
  }).catch(err => {
    console.error('Erro:', err);
    process.exit(1);
  });
}
