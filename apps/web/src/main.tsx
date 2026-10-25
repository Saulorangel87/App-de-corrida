import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import "@fontsource-variable/inter";
import i18n from "./i18n";
import { setupPwa } from "./lib/pwa";
import "./index.css";

const queryClient = new QueryClient();
setupPwa();

// Os textos calculados pelo servidor vêm no idioma da tela: trocar o idioma refaz as consultas.
i18n.on("languageChanged", () => void queryClient.invalidateQueries());

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: "intent",
  // Since we're using React Query, we don't want loader calls to ever be stale
  // This will ensure that the loader is always called when the route is preloaded or visited
  defaultPreloadStaleTime: 0,
  // Troca de página com fade (View Transitions); quem pede menos movimento fica sem. Navegador sem
  // suporte simplesmente troca a página, como antes.
  defaultViewTransition: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
