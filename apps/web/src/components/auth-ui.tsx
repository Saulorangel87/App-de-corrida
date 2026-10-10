import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

/** Cabeçalho das telas de acesso: título e parágrafo. O título é o único h1 da página. */
export function AuthHead({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A] mb-2">{title}</h1>
      <p className="text-[15px] leading-relaxed text-gray-600">{text}</p>
    </div>
  );
}

/** Marca de estado (sucesso, erro ou e-mail). Decorativa: o título já diz o que aconteceu. */
export function StatusBadge({ kind }: { kind: "ok" | "error" | "mail" }) {
  const tone = kind === "ok" ? "bg-green-100 text-green-600" : kind === "mail" ? "bg-orange-100 text-[#FF5A1F]" : "bg-red-100 text-red-600";
  return (
    <div aria-hidden="true" className={`mb-5 grid h-14 w-14 place-items-center rounded-full ${tone}`}>
      {kind === "ok" && (
        <svg width="22" height="16" viewBox="0 0 22 16" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 8.5 8 14.5 20 2" />
        </svg>
      )}
      {kind === "mail" && (
        <svg width="28" height="22" viewBox="0 0 28 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1.5" y="1.5" width="25" height="19" rx="4" />
          <path d="m3 5 11 9 11-9" />
        </svg>
      )}
      {kind === "error" && <span className="text-3xl font-extrabold leading-none">!</span>}
    </div>
  );
}

export function InfoBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`mt-4 rounded-xl px-3.5 py-3 text-xs leading-snug ${
        tone === "error" ? "border border-red-200 bg-red-50 text-red-700" : "bg-[#F5F6F8] text-gray-600"
      }`}
    >
      {children}
    </div>
  );
}

const primary =
  "w-full bg-[#FF5A1F] hover:bg-[#e6511a] disabled:opacity-70 text-white font-bold py-3 px-4 rounded-xl transition-colors text-[15px] flex justify-center items-center";
const secondary =
  "w-full bg-white hover:bg-gray-50 border border-gray-200 text-[#0F172A] font-bold py-3 px-4 rounded-xl transition-colors text-[15px] flex justify-center items-center";

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`${primary} ${props.className ?? ""}`} />;
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${secondary} ${props.className ?? ""}`} />;
}

/** Botão de ação em forma de link (navegação), com a aparência do botão principal. */
export function PrimaryLink({ to, children }: { to: "/entrar" | "/esqueci-a-senha"; children: ReactNode }) {
  return (
    <Link to={to} className={primary}>
      {children}
    </Link>
  );
}

export function BackToLogin() {
  const { t } = useTranslation();
  return (
    <div className="mt-4 text-center">
      <Link to="/entrar" className="text-sm font-semibold text-gray-600 hover:text-[#FF5A1F] transition-colors">
        ← {t("auth.backToLogin")}
      </Link>
    </div>
  );
}
