import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchApi } from "../lib/api";
import { isIos, isStandalone } from "../lib/pwa";
import {
  currentSubscription,
  disableReminder,
  enableReminder,
  pushSupported,
  saveReminder,
  type PushConfig,
  type ServerSubscription,
} from "../lib/reminder";
import { useErrorText } from "../lib/use-error-text";

const DEFAULT_TIME = "07:00";
const SUBS_KEY = ["push-subscriptions"] as const;

/** Configurações: lembrete do treino neste aparelho (opcional, no horário escolhido pela pessoa). */
export function ReminderCard() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const queryClient = useQueryClient();
  const config = useQuery({ queryKey: ["push-config"], queryFn: () => fetchApi<PushConfig>("/push/config"), retry: false });
  const enabled = !!config.data?.enabled;
  const subs = useQuery({
    queryKey: SUBS_KEY,
    queryFn: () => fetchApi<{ subscriptions: ServerSubscription[] }>("/push/subscriptions").then((r) => r.subscriptions),
    enabled,
    retry: false,
  });
  const [endpoint, setEndpoint] = useState<string | null | undefined>(undefined);
  const [time, setTime] = useState(DEFAULT_TIME);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(() => ("Notification" in window ? Notification.permission : null));

  useEffect(() => {
    void currentSubscription().then((s) => setEndpoint(s?.endpoint ?? null));
  }, []);
  const mine = subs.data?.find((s) => s.endpoint === endpoint) ?? null;
  useEffect(() => {
    if (mine) setTime(mine.time);
  }, [mine]);

  // Sem o lembrete no servidor (chaves não configuradas), a área nem aparece.
  if (!enabled) return null;

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await task();
      await queryClient.invalidateQueries({ queryKey: SUBS_KEY });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const turnOn = () =>
    run(async () => {
      const result = await enableReminder(config.data!.publicKey!, time);
      setPermission(result);
      if (result === "granted") {
        setEndpoint((await currentSubscription())?.endpoint ?? null);
        setSaved(true);
      }
    });
  const changeTime = () =>
    run(async () => {
      const sub = await currentSubscription();
      if (sub) await saveReminder(sub, time);
      setSaved(true);
    });
  const turnOff = () =>
    run(async () => {
      await disableReminder();
      setEndpoint(null);
    });

  const unsupported = !pushSupported();
  const needsInstall = isIos() && !isStandalone();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight text-[#0F172A]">
        <Bell size={20} className="text-[#C2410C]" aria-hidden="true" />
        {t("reminder.title")}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-gray-700">
        <p>{t("reminder.text")}</p>
        {needsInstall ? (
          <p className="text-sm text-gray-600">{t("reminder.iosInstall")}</p>
        ) : unsupported ? (
          <p className="text-sm text-gray-600">{t("reminder.unsupported")}</p>
        ) : permission === "denied" ? (
          <p role="alert" className="rounded-xl bg-orange-50 p-3 text-sm text-gray-800">
            {t("reminder.blocked")}
          </p>
        ) : (
          <>
            {mine && <p className="font-semibold text-[#0F172A]">{t("reminder.on", { time: mine.time })}</p>}
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="block text-xs font-semibold text-[#111827]">{t("reminder.time")}</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value);
                    setSaved(false);
                  }}
                  className="h-11 rounded-xl border border-gray-300 px-3 text-[15px] text-[#0F172A]"
                />
              </label>
              {mine ? (
                <>
                  <button
                    type="button"
                    onClick={() => void changeTime()}
                    disabled={busy || !time || time === mine.time}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[#C2410C] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#9A3412] disabled:opacity-50"
                  >
                    {t("reminder.save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void turnOff()}
                    disabled={busy}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 px-5 text-sm font-semibold text-[#0F172A] hover:bg-gray-50"
                  >
                    {t("reminder.off")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void turnOn()}
                  disabled={busy || !time}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#C2410C] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#9A3412] disabled:opacity-50"
                >
                  {t("reminder.turnOn")}
                </button>
              )}
            </div>
            {saved && (
              <p role="status" className="text-sm font-semibold text-green-700">
                {t("reminder.saved")}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <p className="text-sm text-gray-500">{t("reminder.privacy")}</p>
          </>
        )}
      </div>
    </section>
  );
}
