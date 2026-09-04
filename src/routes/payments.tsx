import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PayPalCheckout } from "@/components/PayPalCheckout";

export const Route = createFileRoute("/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const [selectedPlan, setSelectedPlan] = useState<"free" | "basic" | "premium">("basic");
  return (
    <main className="min-h-[calc(100vh-73px)] bg-background px-5 py-12 text-foreground" style={{ backgroundImage: "var(--gradient-studio)" }}>
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pricing plan</p>
          <h1 className="mt-3 text-4xl font-semibold">Accédez aux fonctionnalités Premium</h1>
          <p className="mt-3 text-sm text-muted-foreground">Choisissez votre formule avant de continuer vers PayPal Sandbox.</p>
        </header>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <PlanCard name="Free" amount="0 €" description="Pour découvrir le studio" selected={selectedPlan === "free"} onSelect={() => setSelectedPlan("free")} features={["Accès limité aux fonctionnalités", "Support standard"]} />
          <PlanCard name="Basic" amount="5 €" description="Pour les petits projets" selected={selectedPlan === "basic"} onSelect={() => setSelectedPlan("basic")} features={["Génération vidéo Wan 2.2", "Support prioritaire"]} />
          <PlanCard name="Premium" amount="10 €" description="Pour un accès complet" selected={selectedPlan === "premium"} onSelect={() => setSelectedPlan("premium")} features={["Toutes les fonctionnalités", "Support prioritaire"]} />
        </div>
        {selectedPlan !== "free" && (
          <div className="mt-8">
            <PayPalCheckout plan={selectedPlan} amount={selectedPlan === "basic" ? 5 : 10} />
          </div>
        )}
      </div>
    </main>
  );
}

function PlanCard({ name, amount, description, features, selected, onSelect }: { name: string; amount: string; description: string; features: string[]; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={`rounded-2xl border p-5 text-left transition ${selected ? "border-primary bg-primary/10 shadow-[var(--shadow-glow)]" : "border-border bg-background/40 hover:border-primary/60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-lg font-semibold">{name}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
        {selected && <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">Choisi</span>}
      </div>
      <p className="mt-6 text-3xl font-semibold">{amount}<span className="text-sm font-normal text-muted-foreground"> / mois</span></p>
      <ul className="mt-5 space-y-2 text-sm text-muted-foreground">{features.map((feature) => <li key={feature}>+ {feature}</li>)}</ul>
    </button>
  );
}
