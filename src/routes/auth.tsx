import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Studio vidéo IA" },
      {
        name: "description",
        content:
          "Connectez-vous ou créez un compte pour générer des vidéos IA avec Kling, Veo et Sora et suivre vos crédits.",
      },
      { property: "og:title", content: "Connexion — Studio vidéo IA" },
      {
        property: "og:description",
        content: "Accédez au générateur vidéo IA et à votre solde de crédits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/ai-video-generator" });
    });
  }, [navigate]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/ai-video-generator` },
        });
        if (error) throw error;
        setMessage("Compte créé. Vérifiez votre e-mail si une confirmation est demandée.");
        const { data } = await supabase.auth.getSession();
        if (data.session) navigate({ to: "/ai-video-generator" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/ai-video-generator" });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#09051a] px-5 py-10 text-white" style={{ backgroundImage: "radial-gradient(circle at 50% 5%, oklch(0.36 0.18 285 / 0.7), transparent 38%), linear-gradient(145deg, #09051a, #160936 55%, #29105d)" }}>
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-violet-300/20 bg-black/20 shadow-[0_30px_100px_-30px_#7c3aed] backdrop-blur-xl lg:grid-cols-2">
        <div className="relative hidden min-h-[650px] overflow-hidden border-r border-white/10 bg-[radial-gradient(circle_at_center,rgba(132,45,255,.35),transparent_45%)] lg:flex lg:flex-col lg:items-center lg:justify-end lg:p-12">
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(190,130,255,.35) 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
          <div className="relative mb-auto mt-24 flex size-72 items-center justify-center rounded-full border border-violet-300/20 bg-violet-500/10 shadow-[0_0_100px_30px_rgba(124,58,237,.28)]">
            <div className="flex size-36 items-center justify-center rounded-full bg-violet-500/20 shadow-[0_0_70px_25px_rgba(168,85,247,.35)]">
              <Sparkles className="size-16 text-violet-300" />
            </div>
          </div>
          <div className="relative text-center">
            <h2 className="text-2xl font-semibold">Découvrez l'intelligence créative</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-violet-100/65">Créez des images, des vidéos et des expériences IA avec votre studio personnel.</p>
          </div>
        </div>

        <div className="flex min-h-[650px] flex-col justify-center p-7 sm:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
                <Sparkles className="size-6" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight">
                {mode === "signin" ? "Connectez-vous à votre compte" : "Créez votre compte"}
              </h1>
              <p className="mt-3 text-sm text-violet-100/55">Accédez à votre studio créatif et à vos crédits.</p>
            </div>

            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-medium text-violet-100/75">E-mail</label>
                <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.com" className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3.5 text-sm outline-none transition placeholder:text-violet-100/25 focus:border-violet-400/70 focus:ring-2 focus:ring-violet-400/20" />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-medium text-violet-100/75">Mot de passe</label>
                <div className="relative">
                  <input id="password" type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3.5 pr-12 text-sm outline-none transition placeholder:text-violet-100/25 focus:border-violet-400/70 focus:ring-2 focus:ring-violet-400/20" />
                  <button type="button" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-100/45 hover:text-white">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {message && <p className="text-sm text-violet-100/70">{message}</p>}
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_#a855f7] transition hover:brightness-110 disabled:opacity-50">
                {loading ? "Veuillez patienter…" : mode === "signin" ? "Commencer" : "Créer mon compte"}
                {!loading && <ArrowRight className="size-4" />}
              </button>
            </form>

            <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-7 w-full text-center text-sm text-violet-100/60 hover:text-white">
              {mode === "signin" ? <>Pas encore de compte ? <span className="font-medium text-violet-300">Inscrivez-vous</span></> : <>Déjà inscrit ? <span className="font-medium text-violet-300">Se connecter</span></>}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
