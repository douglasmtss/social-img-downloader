import Link from "next/link";
import { FaInstagram, FaTwitter, FaFacebook } from "react-icons/fa";
import AppHeader from "../components/AppHeader";

const socialNetworks = [
  {
    name: "Instagram",
    icon: <FaInstagram className="text-pink-500" size={32} />,
    href: "/download?network=instagram",
  },
  {
    name: "Twitter",
    icon: <FaTwitter className="text-blue-400" size={32} />,
    href: "/download?network=twitter",
  },
  {
    name: "Facebook",
    icon: <FaFacebook className="text-blue-700" size={32} />,
    href: "/download?network=facebook",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black">
      <AppHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <h1 className="text-4xl font-bold mb-4 text-blue-700 text-center">Social img Downloader</h1>
        <p className="mb-8 text-zinc-600 dark:text-zinc-300 text-center max-w-xl">
          Baixe imagens de posts, stories e reels das principais redes sociais de forma fácil, rápida e segura.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
          {socialNetworks.map((net) => (
            <Link
              href={net.href}
              key={net.name}
              className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg shadow hover:shadow-lg bg-white dark:bg-zinc-800 transition cursor-pointer border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-zinc-700"
            >
              {net.icon}
              <span className="font-semibold text-lg text-zinc-800 dark:text-zinc-100">{net.name}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
