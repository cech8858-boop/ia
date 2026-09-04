import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, Check, FileText, PlusSquare } from "lucide-react";
import { PayPalCheckout } from "@/components/PayPalCheckout";

export const Route = createFileRoute("/payments")({
  component: PaymentsPage,
});

type Plan = "free" | "basic" | "premium";

const plans: Array<{
  id: Plan;
  name: string;
  price: string;
  description: string;
  features: string[];
}> = [
  {
    id: "free",
    name: "Free",
    price: "€0",
    description: "Have design to build? Or small budget?",
    features: ["Standard customer support during business hours", "Up to 5 drafts usable only one time for a user", "Consistently publishing is never possible monthly", "Connect 1 social media business account"],
  },
  {
    id: "basic",
    name: "Basic",
    price: "€5",
    description: "Have design to build? Or small budget?",
    features: ["Unlimited social media profiles across all platforms", "Publish 80 posts monthly across all platforms", "Create unlimited posts, threads effortlessly", "Visual content calendar view of scheduled posts"],
  },
  {
    id: "premium",
    name: "Premium",
    price: "€10",
    description: "Have design to build? Or small budget?",
    features: ["Access to basic AI tools and features on dashboard", "Up to 500 active drafts stored securely online", "Unlimited drafts per plan for maximum flexibility", "Zapier integration for automated workflows"],
  },
];

function PaymentsPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>("basic");
  const activePlan = plans.find((plan) => plan.id === selectedPlan) ?? plans[1];
  const amount = selectedPlan === "basic" ? 5 : 10;

  return (
    <main className="relative min-h-[calc(100vh-73px)] overflow-hidden bg-[#7650d5] px-4 py-7 text-white sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(226,206,255,0.96),transparent_37%),radial-gradient(circle_at_85%_32%,rgba(105,37,214,0.92),transparent_43%),linear-gradient(135deg,#c4a4ff_0%,#8d68e7_48%,#4820a9_100%)]" />
      <div className="relative mx-auto max-w-[1180px]">
        <div className="mb-6 flex items-center justify-between px-1 text-[10px] font-semibold tracking-wide text-white/80">
          <span className="rounded-full bg-black/75 px-2.5 py-1">Pricing Plan</span>
          <div className="flex items-center gap-1.5" aria-label="Étape de sélection">
            <span className="h-0.5 w-4 rounded-full bg-fuchsia-300" />
            <span className="h-0.5 w-4 rounded-full bg-white/50" />
            <span className="h-0.5 w-4 rounded-full bg-white/50" />
          </div>
        </div>

        <header className="mb-7">
          <h1 className="max-w-xs text-2xl font-bold leading-[1.05] tracking-tight sm:text-3xl">
            Access Premium
            <br />
            Features on Every Plan
          </h1>
        </header>

        <div className="mb-6 grid grid-cols-3 gap-2.5 sm:max-w-xl">
          <FeatureIcon icon={<FileText />} label="Documents" />
          <FeatureIcon icon={<PlusSquare />} label="New Posts" />
          <FeatureIcon icon={<CalendarDays />} label="Scheduled" />
        </div>

        <div className="mb-5 flex w-full max-w-[265px] rounded-full border border-white/20 bg-black/20 p-1 text-[10px] font-medium">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              aria-pressed={selectedPlan === plan.id}
              className={`flex-1 rounded-full px-3 py-1.5 transition ${selectedPlan === plan.id ? "bg-[#a436ff] text-white shadow-[0_0_18px_rgba(180,55,255,0.75)]" : "text-white/70 hover:text-white"}`}
            >
              {plan.name}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
          <PlanCard plan={activePlan} selectedPlan={selectedPlan} onSelect={setSelectedPlan} />
          {selectedPlan !== "free" && (
            <div className="rounded-[1.6rem] border border-white/20 bg-black/35 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
              <PayPalCheckout key={selectedPlan} plan={selectedPlan} amount={amount} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function FeatureIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex h-[62px] flex-col items-center justify-center gap-1 rounded-2xl border border-violet-200/25 bg-black/45 text-[9px] text-white/75 shadow-[inset_0_0_18px_rgba(164,80,255,0.35)] backdrop-blur-md">
      <span className="text-white">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function PlanCard({
  plan,
  selectedPlan,
  onSelect,
}: {
  plan: (typeof plans)[number];
  selectedPlan: Plan;
  onSelect: (plan: Plan) => void;
}) {
  return (
    <article className="relative overflow-hidden rounded-[1.45rem] border border-white/35 bg-gradient-to-b from-black/75 via-black/80 to-[#17101f]/95 p-4 shadow-[0_20px_40px_rgba(31,5,78,0.42)] sm:p-5">
      <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <p className="mt-1 text-[10px] text-white/70">{plan.description}</p>
          </div>
          {selectedPlan === plan.id && <span className="rounded-full bg-fuchsia-500/20 px-2 py-1 text-[9px] text-fuchsia-200">Selected</span>}
        </div>
        <div className="mt-5 rounded-[1.15rem] border border-white/30 bg-black/75 p-4 shadow-[inset_0_0_28px_rgba(255,255,255,0.06)]">
          <p className="text-4xl font-semibold tracking-tight">
            {plan.price}
            <span className="ml-1 text-sm font-normal text-white/80">/month</span>
          </p>
          <button
            type="button"
            onClick={() => onSelect(plan.id)}
            className="mt-7 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#a52eff] to-[#c04eff] px-3 py-1.5 text-[10px] font-semibold shadow-[0_0_16px_rgba(173,48,255,0.65)]"
          >
            Get started <ArrowUpRight className="size-3" />
          </button>
        </div>
        <ul className="mt-4 space-y-2 text-[10px] leading-snug text-white/65">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-1.5">
              <Check className="mt-0.5 size-3 shrink-0 text-fuchsia-300" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-3 text-[9px] text-white/65">
          <span>↗ For Custom Requests</span>
          <button type="button" onClick={() => onSelect(plan.id)} className="font-semibold text-fuchsia-200">
            Get started ↗
          </button>
        </div>
      </div>
    </article>
  );
}
