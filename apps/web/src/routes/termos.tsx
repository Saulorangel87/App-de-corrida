import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "../components/legal-page";
import { PRIVACY_POLICY, TERMS_OF_USE } from "../lib/legal";

export const Route = createFileRoute("/termos")({
  component: TermsPage,
});

function TermsPage() {
  return <LegalPage document={TERMS_OF_USE} other={{ to: "/privacidade", label: PRIVACY_POLICY.title }} />;
}
