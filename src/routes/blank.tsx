import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/blank")({
  component: ToolsPage,
});

const tools = [
  {
    title: "VEO3",
    description: "Qualité cinématique avec mouvements et éclairages naturels",
    image: "/tools-reference-1.png",
    position: "0% 0%",
    to: "/ai-video-generator",
  },
  {
    title: "SORA2",
    description: "Scènes réalistes avec une compréhension précise du prompt",
    image: "/tools-reference-2.png",
    position: "100% 0%",
    to: "/ai-video-generator",
  },
  {
    title: "Eleven Labs",
    description: "Composez des musiques originales de qualité studio en quelques secondes avec Eleven Labs Music.",
    image: "/tools-reference-1.png",
    position: "100% 0%",
    to: "/voice",
  },
  {
    title: "Motion Control",
    description: "Remplacez n’importe qui dans une vidéo par un visage de référence grâce au transfert IA",
    image: "/tools-reference-1.png",
    position: "0% 50%",
    to: "/character-swap",
  },
  {
    title: "Kling Video",
    description: "Image vers vidéo avec cadres début/fin, multi-shot et audio avec Kling Video",
    image: "/tools-reference-2.png",
    position: "100% 50%",
    to: "/ai-video-generator",
  },
  {
    title: "Tripo",
    description: "Recréez des objets du monde réel en 3D à partir d’une seule photo avec Tripo.",
    image: "/tools-reference-1.png",
    position: "100% 50%",
    to: "/apidot-media",
  },
  {
    title: "WAN",
    description: "Génération vidéo stylisée rapide et économique",
    image: "/tools-reference-1.png",
    position: "0% 100%",
    to: "/",
  },
  {
    title: "Nano Banana",
    description: "Génération d’images IA avec jusqu’à 14 images de référence",
    image: "/tools-reference-2.png",
    position: "100% 100%",
    to: "/ai-image",
  },
  {
    title: "Masho 3D",
    description: "Modelez et texturez des personnages et environnements immersifs avec Masho 3D.",
    image: "/tools-reference-1.png",
    position: "100% 100%",
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
              aria-label={`${tool.title}: ${tool.description}`}
              className="group relative aspect-[1.04] overflow-hidden rounded-[1rem] border border-white/10 bg-black shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
            >
              <div
                aria-hidden="true"
                style={{ backgroundImage: `url(${tool.image})`, backgroundPosition: tool.position }}
                className="absolute inset-0 bg-[length:200%_300%] bg-no-repeat transition duration-500 group-hover:scale-105"
              />
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
