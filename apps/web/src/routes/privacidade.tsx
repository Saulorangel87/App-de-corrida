import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "../components/legal-page";
import { PRIVACY_POLICY, TERMS_OF_USE } from "../lib/legal";

export const Route = createFileRoute("/privacidade")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return <LegalPage document={PRIVACY_POLICY} other={{ to: "/termos", label: TERMS_OF_USE.title }} />;
}
