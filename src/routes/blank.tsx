import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/blank")({
  component: ToolsPage,
});

const tools = [
  {
    title: "VEO3",
    description: "Qualité cinématique avec mouvements et éclairages naturels",
    image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=900&q=85",
    to: "/ai-video-generator",
  },
  {
    title: "Eleven Labs",
    description: "Composez des musiques originales de qualité studio en quelques secondes avec Eleven Labs Music.",
    image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=900&q=85",
    to: "/voice",
  },
  {
    title: "Motion Control",
    description: "Remplacez n’importe qui dans une vidéo par un visage de référence grâce au transfert IA",
    image: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=900&q=85",
    to: "/character-swap",
  },
  {
    title: "Tripo",
    description: "Recréez des objets du monde réel en 3D à partir d’une seule photo avec Tripo.",
    image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=900&q=85",
    to: "/apidot-media",
  },
  {
    title: "WAN",
    description: "Génération vidéo stylisée rapide et économique",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=85",
    to: "/",
  },
  {
    title: "Masho 3D",
    description: "Modelez et texturez des personnages et environnements immersifs avec Masho 3D.",
    image: "https://images.unsplash.com/photo-1635322966219-b75ed372eb01?auto=format&fit=crop&w=900&q=85",
    to: "/apidot-media",
  },
];

function ToolsPage() {
  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#15141b] px-3 py-2 text-white sm:px-6 sm:py-5">
      <div className="mx-auto max-w-[1050px]">
        <section className="grid grid-cols-2 gap-3 sm:gap-5" aria-label="Outils IA">
          {tools.map((tool) => (
            <Link
              key={tool.title}
              to={tool.to}
              className="group relative aspect-[1.04] overflow-hidden rounded-[1rem] border border-white/10 bg-black shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
            >
              <img
                src={tool.image}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/0" />
              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-6">
                <h2 className="text-[clamp(1.25rem,3.5vw,2.8rem)] font-bold leading-none tracking-tight drop-shadow-md">{tool.title}</h2>
                <p className="mt-2 max-w-[26rem] text-[clamp(.7rem,1.55vw,1.25rem)] leading-[1.35] text-white/85">{tool.description}</p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
