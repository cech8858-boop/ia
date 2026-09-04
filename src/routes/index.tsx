import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ImageIcon, Mic, Sparkles, Video } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Remakeit — AI Creative Studio" },
      { name: "description", content: "Create images, videos and voice content with AI." },
    ],
  }),
  component: HomeDashboard,
});

function HomeDashboard() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6fbff] text-[#17191d]">
      <div className="relative mx-auto min-h-screen max-w-[760px] overflow-hidden bg-[radial-gradient(circle_at_10%_0%,#c9f0ff_0%,transparent_35%),linear-gradient(145deg,#eefaff_0%,#d6f3ff_45%,#f9fcff_100%)] px-5 pb-28 pt-6 sm:px-10">
        <div className="pointer-events-none absolute -left-28 -top-28 size-80 rounded-full bg-[#7cd8ff]/25 blur-3xl" />
        <div className="relative">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-pink-200 to-orange-200 text-sm font-bold shadow-sm">
                A
              </div>
              <div>
                <p className="text-xs text-slate-500">Hello Ankur</p>
                <p className="text-sm font-bold">Welcome Back</p>
              </div>
            </div>
            <Link
              to="/payments"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#4f9ef0] to-[#168ad9] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(31,144,224,0.3)]"
            >
              <Sparkles className="size-3.5" /> Try premium
            </Link>
          </header>

          <h1 className="mt-8 max-w-[300px] text-[clamp(1.55rem,5vw,2.2rem)] font-semibold leading-[1.08] tracking-tight">
            How can I support you
            <br />
            today, Ankur?
          </h1>

          <Link
            to="/blank"
            className="group relative mt-5 block overflow-hidden rounded-[1.25rem] border border-white/70 bg-gradient-to-br from-[#53bfff] via-[#8bd7ff] to-[#c4eaff] p-4 shadow-[0_12px_30px_rgba(54,154,220,0.22)]"
          >
            <div className="absolute -right-5 -top-10 size-36 rounded-full bg-white/35 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#3aa9ed] text-white shadow-inner">
                  <Sparkles className="size-4" />
                </span>
                <h2 className="text-base font-semibold">AI Assistants</h2>
              </div>
              <p className="mt-2 max-w-[280px] text-[11px] leading-snug text-slate-700">
                Use AI assistant to help you automate translation, answer questions, and more.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#39a9ec] px-4 py-2 text-[11px] font-semibold text-white shadow-md">
                <Sparkles className="size-3" /> Access Now
              </span>
            </div>
          </Link>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <QuickCard icon={<ImageIcon />} title="Image" subtitle="Image Generator" to="/ai-image" />
            <QuickCard icon={<Video />} title="Video" subtitle="Video Generator" to="/ai-video-generator" />
          </div>

          <div className="mt-3 rounded-[1.15rem] border border-white/80 bg-white/85 p-4 shadow-[0_8px_22px_rgba(72,151,190,0.12)]">
            <div className="flex items-center gap-2">
              <Mic className="size-4 text-slate-600" />
              <h2 className="text-base font-semibold">Voice</h2>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Let&apos;s Explore New Recordings</p>
            <div className="mt-3 flex items-center justify-between rounded-full bg-[#edf5fa] px-4 py-2 text-[10px] font-semibold text-slate-700">
              <Link to="/voice">Eleven Labs</Link>
              <Link to="/apidot-media" className="text-[#318fd0]" onClick={(event) => event.stopPropagation()}>
                Eleven Labs Music
              </Link>
            </div>
          </div>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent Chat</h2>
              <button type="button" className="text-[11px] text-slate-500">See all</button>
            </div>
            <div className="divide-y divide-slate-200/80 overflow-hidden rounded-2xl bg-white/60">
              <RecentItem icon={<Sparkles />} text="Make Creative image" to="/ai-image" />
              <RecentItem icon={<Sparkles />} text="Make Creative video" to="/ai-video-generator" />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function QuickCard({ icon, title, subtitle, to }: { icon: React.ReactNode; title: string; subtitle: string; to: string }) {
  return (
    <Link to={to} className="group rounded-[1.15rem] border border-white/80 bg-white/90 p-4 shadow-[0_8px_22px_rgba(72,151,190,0.12)] transition hover:-translate-y-0.5">
      <div className="flex items-center gap-2">
        <span className="text-slate-600">{icon}</span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="mt-6 flex items-end justify-between gap-2">
        <p className="text-[11px] leading-tight text-slate-500">{subtitle}</p>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f4f8fa] text-slate-600">
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

function RecentItem({ icon, text, to }: { icon: React.ReactNode; text: string; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3 text-xs transition hover:bg-white">
      <span className="text-slate-500">{icon}</span>
      <span className="flex-1">{text}</span>
      <ArrowUpRight className="size-3.5 text-slate-500" />
    </Link>
  );
}
