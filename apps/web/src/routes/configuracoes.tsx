import { useState, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PrimaryButton, SecondaryButton } from "../components/auth-ui";
import { ChoiceGroup } from "../components/choice";
import { CheckField, TextField } from "../components/field";
import { FlowLayout } from "../components/flow-layout";
import { HealthChangeCard } from "../components/health-change";
import { LanguageSwitch } from "../components/language-switch";
import { ApiError, fetchApi } from "../lib/api";
import { formatDate, localToday } from "../lib/dates";
import { AUTH_KEY, useRequireUser } from "../lib/queries";
import { useErrorText } from "../lib/use-error-text";

export const Route = createFileRoute("/configuracoes")({
  component: SettingsPage,
});

type Cause = "dor" | "lesao" | "doenca";
type Profile = {
  nextEvaluationDate: string;
  pause: { cause: Cause | null; declaredOn: string | null; clearedByProfessionalOn: string | null };
  screening: { allowsTraining: boolean } | null;
};
type SessionItem = { id: string; createdAt: string; lastSeenAt: string; userAgent: string | null; current: boolean };

const PROFILE_KEY = ["profile"] as const;
const SESSIONS_KEY = ["sessions"] as const;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-lg font-bold tracking-tight text-[#0F172A]">{title}</h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

/** Nome curto do aparelho a partir do User-Agent (só para a pessoa reconhecer o que é dela). */
function deviceLabel(ua: string | null, fallback: string): string {
  if (!ua) return fallback;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : null;
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : null;
  return [browser, os].filter(Boolean).join(" · ") || fallback;
}

function SettingsPage() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { user, loading } = useRequireUser();

  const profile = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => fetchApi<{ profile: Profile }>("/profile").then((r) => r.profile),
    enabled: !loading,
    retry: false,
  });
  const noProfile = profile.error instanceof ApiError && profile.error.status === 404;

  if (loading || !user || profile.isLoading) {
    return (
      <FlowLayout>
        <p role="status" className="text-gray-600">
          {t("common.loading")}
        </p>
      </FlowLayout>
    );
  }
  if (profile.isError && !noProfile) {
    return (
      <FlowLayout>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {errorText(profile.error) || t("settings.loadError")}
        </div>
      </FlowLayout>
    );
  }

  return (
    <FlowLayout>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-[#0F172A]">{t("settings.title")}</h1>
      <div className="space-y-4">
        <AccountCard name={user.name} email={user.email} />
        <DevicesCard />
        {profile.data && <HealthCard profile={profile.data} />}
        <DataCard />
      </div>
    </FlowLayout>
  );
}

function AccountCard({ name, email }: { name: string; email: string }) {
  const { t } = useTranslation();
  return (
    <Card title={t("settings.accountTitle")}>
      <dl className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t("settings.name")}</dt>
          <dd className="font-semibold text-[#0F172A]">{name}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t("settings.email")}</dt>
          <dd className="break-all font-semibold text-[#0F172A]">{email}</dd>
        </div>
      </dl>
      <div className="flex items-center gap-4 text-sm">
        <span className="font-semibold text-gray-600">{t("settings.language")}</span>
        <LanguageSwitch />
      </div>
    </Card>
  );
}

function DevicesCard() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: () => fetchApi<{ sessions: SessionItem[] }>("/auth/sessions").then((r) => r.sessions),
    retry: false,
  });
  const end = useMutation({
    mutationFn: (id: string) => fetchApi(`/auth/sessions/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
  if (!list.data) return null;
  return (
    <Card title={t("settings.devicesTitle")}>
      <p className="text-sm text-gray-600">{t("settings.devicesText")}</p>
      <ul className="divide-y divide-gray-100">
        {list.data.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="font-semibold text-[#0F172A]">
                {deviceLabel(s.userAgent, t("settings.unknownDevice"))}
                {s.current && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">{t("settings.thisDevice")}</span>}
              </p>
              <p className="text-xs text-gray-500">
                {t("settings.lastSeen", { date: formatDate(s.lastSeenAt.slice(0, 10), i18n.language, { dateStyle: "medium" }) })}
              </p>
            </div>
            {!s.current && (
              <button
                type="button"
                onClick={() => end.mutate(s.id)}
                disabled={end.isPending}
                className="shrink-0 text-sm font-semibold text-gray-600 hover:text-[#FF5A1F]"
              >
                {t("settings.endSession")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function HealthCard({ profile }: { profile: Profile }) {
  const { t, i18n } = useTranslation();
  const errorText = useErrorText();
  const queryClient = useQueryClient();
  const [cause, setCause] = useState<Cause | undefined>();
  const [date, setDate] = useState("");
  const today = localToday();
  const d = (iso: string) => formatDate(iso, i18n.language);
  const { pause } = profile;
  const waiting = pause.cause !== null && (pause.clearedByProfessionalOn === null || pause.clearedByProfessionalOn < (pause.declaredOn ?? ""));
  const cleared = pause.cause !== null && !waiting;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    void queryClient.invalidateQueries({ queryKey: ["day"] });
    void queryClient.invalidateQueries({ queryKey: ["week"] });
    void queryClient.invalidateQueries({ queryKey: ["overview"] });
  };
  const declarePause = useMutation({
    mutationFn: (c: Cause) => fetchApi("/profile/pause", { method: "PUT", body: JSON.stringify({ cause: c, date: localToday() }) }),
    onSuccess: refresh,
  });
  const clearance = useMutation({
    mutationFn: (value: string) => fetchApi("/profile/professional-clearance", { method: "POST", body: JSON.stringify({ date: value }) }),
    onSuccess: refresh,
  });

  return (
    <Card title={t("settings.healthTitle")}>
      <div className="space-y-1">
        <Link to="/resultado" className="font-semibold text-[#FF5A1F] hover:underline">
          {t("settings.screeningLink")}
        </Link>
        <p className="text-sm text-gray-600">{t("settings.nextEvaluation", { date: d(profile.nextEvaluationDate) })}</p>
      </div>

      {waiting && pause.cause && pause.declaredOn && (
        <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="font-semibold text-[#0F172A]">
            {t("settings.pauseActive", { cause: t(`settings.causes.${pause.cause}`).toLowerCase(), date: d(pause.declaredOn) })}
          </p>
          <h3 className="text-sm font-bold text-[#0F172A]">{t("settings.clearanceTitle")}</h3>
          <p className="text-sm">{t("settings.clearanceText")}</p>
          {clearance.isError && (
            <p role="alert" className="text-sm text-red-700">
              {errorText(clearance.error)}
            </p>
          )}
          <form
            className="space-y-3"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (date) clearance.mutate(date);
            }}
          >
            <TextField label={t("settings.clearanceDate")} type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
            <PrimaryButton disabled={clearance.isPending || !date}>
              {clearance.isPending ? t("settings.clearanceSaving") : t("settings.clearanceCta")}
            </PrimaryButton>
          </form>
        </div>
      )}

      {cleared && pause.clearedByProfessionalOn && (
        <p role="status" className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">
          {t("settings.pauseDone", { date: d(pause.clearedByProfessionalOn) })}
        </p>
      )}

      {!waiting && (
        <div className="space-y-3 rounded-xl bg-[#F5F6F8] p-4">
          <h3 className="text-sm font-bold text-[#0F172A]">{t("settings.pauseTitle")}</h3>
          <p className="text-sm">{t("settings.pauseText")}</p>
          {declarePause.isError && (
            <p role="alert" className="text-sm text-red-700">
              {errorText(declarePause.error)}
            </p>
          )}
          <ChoiceGroup
            name="pause-cause"
            legend={t("settings.pauseCause")}
            value={cause}
            onChange={setCause}
            columns="grid-cols-3"
            options={(["dor", "lesao", "doenca"] as const).map((c) => ({ value: c, label: t(`settings.causes.${c}`) }))}
          />
          <SecondaryButton disabled={!cause || declarePause.isPending} onClick={() => cause && declarePause.mutate(cause)}>
            {declarePause.isPending ? t("settings.pausing") : t("settings.pauseCta")}
          </SecondaryButton>
        </div>
      )}

      {profile.screening?.allowsTraining && <HealthChangeCard variant="inline" />}

      <div className="space-y-2 rounded-xl bg-[#F5F6F8] p-4">
        <h3 className="text-sm font-bold text-[#0F172A]">{t("settings.redoTitle")}</h3>
        <p className="text-sm">{t("settings.redoText")}</p>
        <Link to="/entrevista" className="inline-block text-sm font-semibold text-[#FF5A1F] hover:underline">
          {t("settings.redoCta")}
        </Link>
      </div>
    </Card>
  );
}

function DataCard() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [sure, setSure] = useState(false);

  // Baixa o JSON no aparelho (nada passa por terceiros).
  const exporting = useMutation({
    mutationFn: async () => {
      const data = await fetchApi<unknown>("/account/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meus-dados-lets-go-run.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });

  const remove = useMutation({
    mutationFn: () => fetchApi("/auth/account", { method: "DELETE", body: JSON.stringify({ password }) }),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(AUTH_KEY, null);
      void navigate({ to: "/entrar" });
    },
  });

  return (
    <Card title={t("settings.dataTitle")}>
      <p>{t("settings.dataText")}</p>
      {exporting.isError && (
        <p role="alert" className="text-sm text-red-700">
          {t("settings.exportError")}
        </p>
      )}
      <SecondaryButton disabled={exporting.isPending} onClick={() => exporting.mutate()}>
        {exporting.isPending ? t("settings.exporting") : t("settings.exportCta")}
      </SecondaryButton>

      <div className="space-y-3 rounded-xl border border-red-200 p-4">
        <h3 className="text-sm font-bold text-red-700">{t("settings.deleteTitle")}</h3>
        <p className="text-sm">{t("settings.deleteText")}</p>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-50"
          >
            {t("settings.deleteOpen")}
          </button>
        ) : (
          <form
            className="space-y-3"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (password && sure) remove.mutate();
            }}
          >
            {remove.isError && (
              <p role="alert" className="text-sm text-red-700">
                {errorText(remove.error)}
              </p>
            )}
            <TextField
              label={t("settings.deletePassword")}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <CheckField label={t("settings.deleteSure")} checked={sure} onChange={(e) => setSure(e.target.checked)} />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!password || !sure || remove.isPending}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {remove.isPending ? t("settings.deleting") : t("settings.deleteCta")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setPassword("");
                  setSure(false);
                }}
                className="text-sm font-semibold text-gray-600 hover:text-[#111827]"
              >
                {t("settings.deleteCancel")}
              </button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
