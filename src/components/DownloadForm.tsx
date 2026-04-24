 
"use client";

import { useState } from "react";
import JSZip from "jszip";

function isBase64(str: string) {
  return /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/.test(str);
}

function downloadBlob(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function downloadImage(url: string, filename: string) {
  if (isBase64(url)) {
    downloadBlob(url, filename);
    return;
  }
  // Se não for base64, baixa via proxy para evitar CORS
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error('Erro ao baixar imagem.');
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  downloadBlob(blobUrl, filename);
  URL.revokeObjectURL(blobUrl);
}


async function downloadBulk(urls: string[], prefix = "img") {
  if (urls.length === 1) {
    await downloadImage(urls[0], `${prefix}-1`);
    return;
  }
  // Se mais de uma imagem, baixa como zip
  const zip = new JSZip();
  const fetchAndAdd = async (url: string, idx: number) => {
    let data: Blob;
    let ext = "jpg";
    if (isBase64(url)) {
      // data:image/png;base64,...
      const match = url.match(/^data:image\/(\w+);base64,(.*)$/);
      if (match) {
        ext = match[1];
        data = await (await fetch(url)).blob();
      } else {
        data = await (await fetch(url)).blob();
      }
    } else {
      const res = await fetch(url);
      data = await res.blob();
      const type = data.type.split("/")[1];
      if (type) ext = type;
    }
    zip.file(`${prefix}-${idx + 1}.${ext}`, data);
  };
  await Promise.all(urls.map((url, i) => fetchAndAdd(url, i)));
  const blob = await zip.generateAsync({ type: "blob" });
  const blobUrl = URL.createObjectURL(blob);
  downloadBlob(blobUrl, `${prefix}-imagens.zip`);
  URL.revokeObjectURL(blobUrl);
}


async function fetchImages(url: string): Promise<string[]> {
  const res = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro ao buscar imagens.");
  return data.images;
}

export default function DownloadForm() {
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [images, setImages] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [errored, setErrored] = useState<Set<number>>(new Set());
  // Para retry automático
  const [retries, setRetries] = useState<{ [key: number]: number }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setImages([]);
    setSelected(new Set());
    setErrored(new Set());
    setRetries({});
    setLoading(true);
    if (!url.match(/^https?:\/\//)) {
      setError("Insira uma URL válida.");
      setLoading(false);
      return;
    }
    try {
      const imgs = await fetchImages(url);
      // Remove duplicatas ignorando query strings
      const seen = new Set<string>();
      const uniqueImgs = imgs.filter((url) => {
        // Para base64, considera o valor inteiro
        if (url.startsWith('data:image')) {
          if (seen.has(url)) return false;
          seen.add(url);
          return true;
        }
        // Remove query string para comparação
        const base = url.split('?')[0];
        if (seen.has(base)) return false;
        seen.add(base);
        return true;
      });
      setImages(uniqueImgs);
      setSuccess("Imagens encontradas:");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelected((prev: Set<number>) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Tenta recarregar a imagem até 2 vezes antes de marcar como erro
  const handleImgError = (idx: number) => {
    // Se já está marcado como erro, não faz nada
    if (errored.has(idx)) return;
    // Se já tentou 2 vezes, marca como erro
    if ((retries[idx] || 0) >= 2) {
      setErrored(prevErr => new Set(prevErr).add(idx));
      return;
    }
    // Tenta recarregar
    setRetries(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
    const imgEl = document.getElementById(`img-preview-${idx}`) as HTMLImageElement | null;
    if (imgEl) {
      imgEl.src = images[idx] + (images[idx].includes('?') ? '&' : '?') + 'retry=' + ((retries[idx] || 0) + 1);
    }
  };

  const selectAll = () => setSelected(new Set(images.map((_: string, i: number) => i)));
  const deselectAll = () => setSelected(new Set());

  const handleDownloadSelected = async () => {
    const sel = Array.from(selected).map(i => images[i]);
    await downloadBulk(sel, "img");
  };

  const handleDownloadAll = async () => {
    await downloadBulk(images, "img");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
      <input
        type="url"
        placeholder="Cole o link aqui..."
        value={url}
        onChange={e => setUrl(e.target.value)}
        className="border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      <button
        type="submit"
        className="bg-blue-700 text-white rounded px-4 py-2 font-semibold hover:bg-blue-800 transition disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Processando..." : "Baixar imagem"}
      </button>
      {error && <span className="text-red-600">{error}</span>}
      {success && <span className="text-green-600">{success}</span>}
      {images.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex gap-2 mb-2">
            <button type="button" className="px-2 py-1 bg-blue-600 text-white rounded text-xs" onClick={selectAll}>Selecionar tudo</button>
            <button type="button" className="px-2 py-1 bg-gray-400 text-white rounded text-xs" onClick={deselectAll}>Limpar seleção</button>
            <button type="button" className="px-2 py-1 bg-green-600 text-white rounded text-xs" onClick={handleDownloadSelected} disabled={selected.size === 0}>Baixar selecionadas</button>
            <button type="button" className="px-2 py-1 bg-blue-800 text-white rounded text-xs" onClick={handleDownloadAll}>Baixar todas</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {images.map((img: string, i: number) => (
              <div key={i} className={`relative flex flex-col items-center border rounded p-2 hover:shadow-lg transition bg-white dark:bg-zinc-800 ${selected.has(i) ? 'ring-2 ring-blue-600' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggleSelect(i)}
                  className="absolute top-2 left-2 z-10"
                  aria-label="Selecionar imagem"
                />
                {errored.has(i) ? (
                  <div className="w-full h-32 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 text-red-500 text-xs mb-2">Erro ao carregar imagem</div>
                ) : (
                  <picture>
                    {img.endsWith('.webp') && (
                      <source srcSet={`/api/proxy?url=${encodeURIComponent(img)}`} type="image/webp" />
                    )}
                    <img
                      id={`img-preview-${i}`}
                      src={img.startsWith('data:image') ? img : `/api/proxy?url=${encodeURIComponent(img)}`}
                      alt={`preview-${i}`}
                      className="w-full h-32 object-contain mb-2 bg-zinc-100 dark:bg-zinc-900"
                      onError={() => handleImgError(i)}
                    />
                  </picture>
                )}
                <span className="text-xs break-all text-blue-700 underline mb-1">{img.slice(0, 60)}{img.length > 60 ? '...' : ''}</span>
                <button
                  type="button"
                  className="px-2 py-1 bg-blue-700 text-white rounded text-xs mt-1"
                  onClick={() => downloadImage(img, `img-${i + 1}`)}
                >
                  Baixar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

