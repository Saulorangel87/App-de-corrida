import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BarChart3, CalendarDays, LayoutDashboard, LogOut, Route as RouteIcon, Settings, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppFooter } from "./app-footer";
import { LanguageSwitch } from "./language-switch";
import { fetchApi } from "../lib/api";
import { useAuth, useLogout } from "../lib/queries";

type Chrome = "app" | "focus";

/**
 * Moldura das telas do atleta logado. `app` (padrão): menu lateral no desktop e cabeçalho no
 * celular, como no desenho do painel. `focus`: só o cabeçalho, para a entrevista (sem menu que
 * leve a telas que ainda não têm dados).
 */
export function FlowLayout({ children, width = "max-w-[640px]", chrome = "app" }: { children: ReactNode; width?: string; chrome?: Chrome }) {
  const { t } = useTranslation();
  const logout = useLogout();
  const withSidebar = chrome === "app";
  return (
    <div className="min-h-dvh bg-[#F5F6F8] text-[#111827] lg:flex">
      {withSidebar && <Sidebar />}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className={`w-full border-b border-gray-200 bg-white ${withSidebar ? "lg:hidden" : ""}`}>
          <div className="mx-auto flex max-w-[960px] items-center justify-between gap-4 px-5 py-2 text-sm">
            <Link to="/painel" className="shrink-0 whitespace-nowrap text-lg font-bold tracking-tight">
              {t("common.appName")}
            </Link>
            <div className="flex items-center gap-3 sm:gap-6">
              {withSidebar && (
                <>
                  <Link to="/plano" className="hidden font-medium text-gray-500 transition-colors hover:text-[#111827] min-[420px]:inline">
                    {t("plan.link")}
                  </Link>
                  <Link to="/historico" className="hidden font-medium text-gray-500 transition-colors hover:text-[#111827] min-[420px]:inline">
                    {t("history.link")}
                  </Link>
                  <Link to="/configuracoes" className="font-medium text-gray-500 transition-colors hover:text-[#111827]">
                    {t("settings.link")}
                  </Link>
                </>
              )}
              <LanguageSwitch />
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="font-medium text-gray-500 hover:text-[#111827] transition-colors"
              >
                {t("common.logout")}
              </button>
            </div>
          </div>
        </header>
        <main className={`flex-1 w-full ${width} mx-auto px-5 py-3 sm:py-4`}>{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}

const itemBase = "flex items-center gap-3 rounded-[10px] px-3 py-[11px] text-sm font-medium transition-colors";
const itemIdle = "text-[#cbd5e1] hover:bg-white/5 hover:text-white";
const itemActive = "bg-[rgba(255,90,31,0.14)] text-white";

function NavItem({ to, icon: Icon, label }: { to: "/painel" | "/plano" | "/historico" | "/resultado" | "/configuracoes"; icon: typeof LayoutDashboard; label: string }) {
  return (
    <Link to={to} className={`${itemBase} ${itemIdle}`} activeProps={{ className: `${itemBase} ${itemActive}`, "aria-current": "page" }}>
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .slice(0, 2)
    .join("");

/** Menu lateral (a partir de 1024 px): só leva a telas que existem no app. */
function Sidebar() {
  const { t } = useTranslation();
  const logout = useLogout();
  const auth = useAuth();
  const user = auth.data ?? undefined;
  // Mesmo cache das telas (["profile"]); sem perfil (404) a linha do nível some.
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchApi<{ profile: { level: "iniciante" | "intermediario" | "avancado" } }>("/profile").then((r) => r.profile),
    enabled: !!user,
    retry: false,
  });
  const level = profile.data?.level;

  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-8 overflow-y-auto bg-[#111827] px-[18px] py-7 lg:flex">
      <Link to="/painel" className="flex items-center gap-[10px] px-[10px]">
        <span className="grid size-9 place-items-center rounded-[10px] bg-[#FF5A1F] text-white">
          <RouteIcon size={20} aria-hidden="true" />
        </span>
        <span className="text-xl font-extrabold tracking-tight text-white">{t("common.appName")}</span>
      </Link>

      <nav aria-label={t("nav.label")} className="flex flex-col gap-1">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[1px] text-[#6b7280]">{t("nav.menu")}</p>
        <NavItem to="/painel" icon={LayoutDashboard} label={t("nav.panel")} />
        <NavItem to="/plano" icon={CalendarDays} label={t("nav.plan")} />
        <NavItem to="/historico" icon={BarChart3} label={t("nav.history")} />
        <NavItem to="/resultado" icon={Target} label={t("nav.profile")} />
      </nav>

      <nav aria-label={t("nav.account")} className="flex flex-col gap-1">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[1px] text-[#6b7280]">{t("nav.account")}</p>
        <NavItem to="/configuracoes" icon={Settings} label={t("nav.settings")} />
      </nav>

      <div className="mt-auto space-y-4">
        <div className="flex items-center justify-between gap-3 px-2 text-sm">
          <LanguageSwitch onDark />
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="flex items-center gap-1.5 font-medium text-[#94a3b8] transition-colors hover:text-white"
          >
            <LogOut size={16} aria-hidden="true" />
            {t("common.logout")}
          </button>
        </div>
        {user && (
          <div className="flex items-center gap-3 px-2">
            <span
              aria-hidden="true"
              className="grid size-[38px] shrink-0 place-items-center rounded-full bg-linear-to-br from-orange-400 to-rose-500 text-sm font-bold text-white"
            >
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              {level && (
                <p className="truncate text-xs text-[#94a3b8]">
                  {t("nav.level", { level: t(`result.levels.${level}`).toLowerCase() })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
