import { createFileRoute } from "@tanstack/react-router";

// Rendering is handled by <LegacyHost /> in __root.tsx; these routes exist so
// every URL resolves with HTTP 200 and the legacy React Router takes over.
export const Route = createFileRoute("/")({ component: () => null });
