import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/blank")({
  component: () => <main className="min-h-[calc(100vh-73px)] bg-background" />,
});
