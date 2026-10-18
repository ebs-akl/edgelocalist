import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";

// The original single-page app (React Router) is mounted client-only so none of
// its browser-only code (window, localStorage, Mapbox) runs during SSR.
const LegacyApp = lazy(() => import("../App"));

export function LegacyHost() {
  return (
    <ClientOnly fallback={null}>
      <Suspense fallback={null}>
        <LegacyApp />
      </Suspense>
    </ClientOnly>
  );
}
