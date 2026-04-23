import DownloadForm from '../../components/DownloadForm';
import Link from 'next/link';
import AppHeader from '../../components/AppHeader';

export default function DownloadPage() {
  return (
    <>
      <AppHeader />
      {/* Botão de voltar fixo no topo à esquerda, acima do conteúdo principal */}
      <Link
        href="/"
        className="fixed left-6 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-zinc-900/90 shadow border border-zinc-200 dark:border-zinc-700 text-blue-700 hover:bg-blue-50 dark:hover:bg-zinc-800 font-semibold transition backdrop-blur"
        style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.06)', top: 'calc(1.5rem + 56px)' }}
        aria-label="Voltar para a página inicial"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        <span className="hidden sm:inline">Voltar</span>
      </Link>
      <main className="flex flex-col items-center justify-center min-h-screen py-16 px-4">
        <h1 className="text-3xl font-bold mb-4 text-blue-700">Download de Imagens</h1>
        <p className="mb-8 text-zinc-600 dark:text-zinc-300 text-center max-w-xl">
          Insira o link de um post, reel, story ou área da rede social para baixar as imagens.
        </p>
        <DownloadForm />
      </main>
    </>
  );
}
