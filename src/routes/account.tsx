import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});

function AccountPage() {
  return (
    <main className="min-h-[calc(100vh-73px)] bg-background px-5 py-12 text-foreground" style={{ backgroundImage: "var(--gradient-studio)" }}>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Client account</p>
        <h1 className="mt-3 text-4xl font-semibold">Mon compte</h1>
        <section className="mt-8 rounded-2xl border border-border bg-card/80 p-6 backdrop-blur">
          <p className="text-sm text-muted-foreground">Gérez votre profil et vos préférences depuis cet espace.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Statut</p>
              <p className="mt-2 font-medium">Compte client actif</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Plan</p>
              <p className="mt-2 font-medium">À sélectionner</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
