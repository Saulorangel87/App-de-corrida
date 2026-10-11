import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../lib/queries";

// Raiz do app: quem já entrou vai para o painel; quem não entrou, para o login.
export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const auth = useAuth();
  const navigate = useNavigate();
  const settled = !auth.isLoading;
  const loggedIn = !!auth.data;
  useEffect(() => {
    if (settled) void navigate({ to: loggedIn ? "/painel" : "/entrar", replace: true });
  }, [settled, loggedIn, navigate]);
  return null;
}
