import { useEffect, useRef, useState } from "react";

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");
const PAYPAL_SDK_URL = PAYPAL_CLIENT_ID
  ? `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=EUR&intent=capture`
  : null;

type PayPalButtons = {
  render: (container: HTMLElement) => Promise<void>;
  close?: () => Promise<void>;
};

type PayPalNamespace = {
  Buttons: (options: {
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError: (error: unknown) => void;
    onCancel: () => void;
  }) => PayPalButtons;
};

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

async function readApiResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function apiError(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const detail = record.detail ?? record.message ?? record.error;
    if (typeof detail === "string" && detail.trim()) {
      return `Erreur HTTP ${status} : ${detail}`;
    }
  }
  if (typeof body === "string" && body.trim()) {
    return `Erreur HTTP ${status} : ${body}`;
  }
  return `Erreur HTTP ${status} lors de la communication avec le serveur PayPal.`;
}

function loadPayPalSdk(): Promise<void> {
  if (window.paypal) return Promise.resolve();
  if (!PAYPAL_SDK_URL) {
    return Promise.reject(new Error("VITE_PAYPAL_CLIENT_ID n'est pas configurée."));
  }

  const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk="true"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Le SDK PayPal n'a pas pu être chargé.")), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PAYPAL_SDK_URL;
    script.async = true;
    script.dataset.paypalSdk = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Le SDK PayPal n'a pas pu être chargé.")), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

export function PayPalCheckout({
  plan,
  amount,
}: {
  plan: "basic" | "premium";
  amount: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<PayPalButtons | null>(null);
  const [status, setStatus] = useState("Chargement de PayPal…");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderButtons() {
      if (!containerRef.current) return;
      if (!API_BASE_URL) {
        setStatus("VITE_API_BASE_URL n'est pas configurée dans Vercel.");
        return;
      }

      try {
        await loadPayPalSdk();
        if (cancelled || !containerRef.current || !window.paypal) return;

        const buttons = window.paypal.Buttons({
          createOrder: async () => {
            const url = `${API_BASE_URL}/paypal/create-order`;
            console.info("[PayPal] POST", url);
            const response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ plan, amount, currency: "EUR" }),
            });
            const body = await readApiResponse(response);
            console.info("[PayPal] response", response.status, body);
            if (!response.ok) throw new Error(apiError(response.status, body));

            const orderId =
              body && typeof body === "object" && typeof (body as Record<string, unknown>).id === "string"
                ? (body as Record<string, string>).id
                : null;
            if (!orderId) throw new Error("Le backend n'a pas retourné de order_id valide.");
            setStatus("Commande créée. Finalisez l'approbation dans PayPal.");
            return orderId;
          },
          onApprove: async ({ orderID }) => {
            const url = `${API_BASE_URL}/paypal/capture-order/${encodeURIComponent(orderID)}`;
            console.info("[PayPal] POST", url);
            const response = await fetch(url, { method: "POST" });
            const body = await readApiResponse(response);
            console.info("[PayPal] response", response.status, body);
            if (!response.ok) throw new Error(apiError(response.status, body));

            const paypalStatus =
              body && typeof body === "object"
                ? (body as Record<string, unknown>).status
                : undefined;
            if (paypalStatus !== "COMPLETED") {
              throw new Error(`Capture non confirmée (statut PayPal : ${String(paypalStatus ?? "inconnu")}).`);
            }
            setSuccess(true);
            setStatus("Paiement réussi");
          },
          onError: (error) => {
            console.error("[PayPal] SDK error", error);
            setStatus(`Erreur de paiement : ${error instanceof Error ? error.message : "erreur PayPal"}`);
          },
          onCancel: () => setStatus("Paiement annulé."),
        });

        buttonsRef.current = buttons;
        await buttons.render(containerRef.current);
      } catch (error) {
        if (!cancelled) {
          console.error("[PayPal] initialization error", error);
          setStatus(error instanceof Error ? error.message : "Impossible de charger PayPal.");
        }
      }
    }

    void renderButtons();
    return () => {
      cancelled = true;
      void buttonsRef.current?.close?.();
    };
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-5 backdrop-blur sm:p-7">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">PayPal Sandbox</p>
        <h2 className="mt-1 text-xl font-semibold">Payer {amount.toFixed(2).replace(".", ",")} €</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le paiement est confirmé uniquement après capture réussie par le backend.
        </p>
      </div>
      <div ref={containerRef} className="min-h-11 max-w-md" />
      <p className={success ? "mt-3 text-sm font-semibold text-green-400" : "mt-3 text-sm text-muted-foreground"}>
        {status}
      </p>
    </section>
  );
}
