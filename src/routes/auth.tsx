import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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
    <main
      className="flex min-h-screen items-center justify-center bg-background px-5 py-16 text-foreground"
      style={{ backgroundImage: "var(--gradient-studio)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-7 backdrop-blur"
        style={{ boxShadow: "var(--shadow-panel)" }}
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          100 crédits offerts à l'inscription pour tester le générateur vidéo IA.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            />
          </div>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            {loading ? "Veuillez patienter…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "signin" ? "Pas encore de compte ? S'inscrire" : "Déjà inscrit ? Se connecter"}
        </button>
      </div>
    </main>
  );
}
