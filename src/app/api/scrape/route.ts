import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

import { scrapeImages } from '../../../../scraper/scrape';


export async function POST(req: NextRequest) {
  try {
    const { url, username, password, usePuppeteer } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL inválida.' }, { status: 400 });
    }

    // Força uso do Puppeteer para Facebook
    const isFacebook = url.includes('facebook.com');
    // Bloqueia scraping de Instagram em produção
    if (url.includes('instagram.com')) {
      return NextResponse.json({ error: 'Scraping de Instagram não suportado em produção. Use um servidor próprio.' }, { status: 501 });
    }
    if (isFacebook || usePuppeteer) {
      try {
        const images = await scrapeImages(url, { username, password });
        return NextResponse.json({ images });
      } catch (err: unknown) {
        let message = 'Erro no scraper headless.';
        if (
          typeof err === 'object' &&
          err !== null &&
          'message' in err &&
          typeof (err as { message?: unknown }).message === 'string'
        ) {
          message = (err as { message: string }).message;
        }
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    // Antes de buscar imagens, verifica se há modal, popup, shadow DOM ou overlay visível na frente
    const hasBlockingOverlay = () => {
      // Seletores comuns de modal/popup/overlay
      const selectors = [
        '[role="dialog"]',
        '.modal',
        '.popup',
        '[data-testid*="modal"]',
        '[aria-modal="true"]',
        '[data-modal]',
        '[class*="modal"]',
        '[class*="popup"]',
        '[class*="portal"]',
        '[id*="portal"]',
        '[data-portal]',
        '[class*="overlay"]',
        '[id*="overlay"]',
        '[data-overlay]',
        '[class*="backdrop"]',
        '[id*="backdrop"]',
        '[data-backdrop]',
      ];
      // Verifica overlays normais
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && (el instanceof HTMLElement) && el.offsetParent !== null && getComputedStyle(el).zIndex !== 'auto') {
          // Se está visível e tem z-index, provavelmente está na frente
          return true;
        }
      }
      // Verifica shadow roots abertas
      const allElements = Array.from(document.querySelectorAll('*'));
      for (const el of allElements) {
        if ((el as HTMLElement).shadowRoot) {
          const shadow = (el as HTMLElement).shadowRoot;
          if (shadow && shadow.childNodes.length > 0) {
            return true;
          }
        }
      }
      // Verifica React portals (heurística: divs fora do fluxo principal, z-index alto)
      const portalDivs = Array.from(document.querySelectorAll('body > div'));
      for (const div of portalDivs) {
        if (
          div instanceof HTMLElement &&
          div.offsetParent !== null &&
          getComputedStyle(div).zIndex !== 'auto' &&
          getComputedStyle(div).zIndex !== '0' &&
          div.childElementCount > 0
        ) {
          return true;
        }
      }
      return false;
    };

    if (typeof window !== 'undefined' && hasBlockingOverlay()) {
      return NextResponse.json({ error: 'Overlay/modal/popup detectado na página. Feche para continuar.' }, { status: 409 });
    }

    // Busca o HTML da página
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SocialImgDownloader/1.0)',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Erro ao acessar a URL.' }, { status: 400 });
    }
    const html = await res.text();

    // Carrega o HTML no cheerio
    const $ = cheerio.load(html);
    // Busca imagens em todos os atributos possíveis
    const images = [
      // <img src> e <img srcset>
      ...$('img').map((_, el) => {
        // Tenta pegar src, data-src, data-img-url, etc.
        const srcs = [];
        const src = $(el).attr('src');
        if (src) srcs.push(src);
        const dataSrc = $(el).attr('data-src');
        if (dataSrc) srcs.push(dataSrc);
        const dataImgUrl = $(el).attr('data-img-url');
        if (dataImgUrl) srcs.push(dataImgUrl);
        return srcs;
      }).get().flat().filter(Boolean),
      ...$('img').map((_, el) => {
        const srcset = $(el).attr('srcset');
        if (!srcset) return null;
        // srcset pode ter múltiplas URLs separadas por vírgula
        return srcset.split(',').map(s => s.trim().split(' ')[0]);
      }).get().flat().filter(Boolean),
      // <meta property="og:image">, <meta name="twitter:image">
      ...$('meta[property="og:image"]').map((_, el) => $(el).attr('content')).get(),
      ...$('meta[name="twitter:image"]').map((_, el) => $(el).attr('content')).get(),
      // <link rel="image_src"> e <link rel="icon|shortcut icon|apple-touch-icon">
      ...$('link[rel="image_src"]').map((_, el) => $(el).attr('href')).get(),
      ...$('link[rel="icon"]').map((_, el) => $(el).attr('href')).get(),
      ...$('link[rel="shortcut icon"]').map((_, el) => $(el).attr('href')).get(),
      ...$('link[rel="apple-touch-icon"]').map((_, el) => $(el).attr('href')).get(),
      // <video poster>
      ...$('video').map((_, el) => $(el).attr('poster')).get(),
      // <source src> e <source srcset>
      ...$('source').map((_, el) => $(el).attr('src')).get(),
      ...$('source').map((_, el) => {
        const srcset = $(el).attr('srcset');
        if (!srcset) return null;
        return srcset.split(',').map(s => s.trim().split(' ')[0]);
      }).get().flat().filter(Boolean),
      // <a href> que parece imagem
      ...$('a').map((_, el) => {
        const href = $(el).attr('href');
        if (href && (href.startsWith('http') || href.startsWith('//') || href.startsWith('data:image/'))) return href;
        return null;
      }).get().filter(Boolean),
      // <div style="background-image:url(...)"> e outros elementos com background-image
      ...$('[style*="background-image"]').map((_, el) => {
        const style = $(el).attr('style');
        const matches = [];
        if (style) {
          // Pode haver múltiplas urls em background-image
          const regex = /background-image:\s*url\(['"]?([^'")]+)['"]?\)/g;
          let match;
          while ((match = regex.exec(style))) {
            matches.push(match[1]);
          }
        }
        return matches;
      }).get().flat().filter(Boolean),
      // <svg image xlink:href> e <svg use xlink:href>
      ...$('image').map((_, el) => $(el).attr('xlink:href')).get(),
      ...$('use').map((_, el) => $(el).attr('xlink:href')).get(),
      // <object data>
      ...$('object').map((_, el) => $(el).attr('data')).get(),
      // <embed src>
      ...$('embed').map((_, el) => $(el).attr('src')).get(),
    ].flat().filter(Boolean);

    // Remove duplicatas e normaliza URLs relativas
    const baseUrl = new URL(url);
    const allImages = Array.from(new Set(images.map(src => {
      if (!src) return null;
      if (src.startsWith('data:image/')) return src; // base64, não normaliza
      if (src.startsWith('http')) return src;
      if (src.startsWith('//')) return baseUrl.protocol + src;
      if (src.startsWith('/')) return baseUrl.origin + src;
      return baseUrl.origin + '/' + src.replace(/^\/?/, '');
    }).filter(Boolean)));

    if (allImages.length === 0) {
      return NextResponse.json({ error: 'Nenhuma imagem encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ images: allImages });
  } catch {
    return NextResponse.json({ error: 'Erro ao processar a requisição.' }, { status: 500 });
  }
}
