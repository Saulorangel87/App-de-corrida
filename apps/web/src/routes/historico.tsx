import { useState, type ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { baseRegionId, GENERAL_REGION } from "@passo/shared";
import { ColumnChart, type Column } from "../components/column-chart";
import { FlowLayout } from "../components/flow-layout";
import { HistorySkeleton } from "../components/skeletons";
import { useMinDuration } from "../lib/use-min-duration";
import { addDays, formatDate } from "../lib/dates";
import { useRequireUser } from "../lib/queries";
import { useHistory, type HistoryResponse } from "../lib/training";
import { useErrorText } from "../lib/use-error-text";

export const Route = createFileRoute("/historico")({
  component: History,
});

const PERIODS = [4, 8, 12] as const;
const DEFAULT_WEEKS = 8;

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-bold tracking-tight text-[#0F172A]">{title}</h2>
      {hint ? <p className="mb-4 mt-1 text-sm text-gray-500">{hint}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#0F172A]">{value}</p>
    </div>
  );
}

function History() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { user, loading } = useRequireUser();
  const [weeks, setWeeks] = useState<number>(DEFAULT_WEEKS);
  const history = useHistory(weeks * 7, !loading && !!user);
  const showSkeleton = useMinDuration(loading || !user || history.isLoading);

  return (
    <FlowLayout width="max-w-[960px]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">{t("history.title")}</h1>
        <div role="group" aria-label={t("history.periodLabel")} className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          {PERIODS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={weeks === w}
              onClick={() => setWeeks(w)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                weeks === w ? "bg-[#C2410C] text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t("history.period", { weeks: w })}
            </button>
          ))}
        </div>
      </div>

      {showSkeleton ? (
        <HistorySkeleton />
      ) : history.error || !history.data ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {history.error ? errorText(history.error) : t("history.loadError")}
        </div>
      ) : (
        <HistoryBody data={history.data} />
      )}
    </FlowLayout>
  );
}

function HistoryBody({ data }: { data: HistoryResponse }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const number = (n: number, digits = 0) => new Intl.NumberFormat(lang, { maximumFractionDigits: digits }).format(n);
  const shortDate = (iso: string) => formatDate(iso, lang, { day: "2-digit", month: "2-digit" });

  const pain = data.pain.filter((p) => p.region !== GENERAL_REGION).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (data.weekly.length === 0 && data.sleep.length === 0 && pain.length === 0) {
    return (
      <Card title={t("history.emptyTitle")}>
        <p className="text-[15px] leading-relaxed text-gray-700">{t("history.emptyText")}</p>
        <Link to="/painel" className="mt-4 inline-block text-sm font-semibold text-[#C2410C] hover:underline">
          {t("history.emptyCta")}
        </Link>
      </Card>
    );
  }

  // Resumo do período (somas e média do que a API devolveu).
  const done = data.weekly.reduce((s, w) => s + w.completedSessions, 0);
  const planned = data.weekly.reduce((s, w) => s + w.plannedSessions, 0);
  const minutes = data.weekly.reduce((s, w) => s + w.minutes, 0);
  const sleepHours = data.sleep.flatMap((s) => (s.hours === null ? [] : [s.hours]));
  const sleepAvg = sleepHours.length ? sleepHours.reduce((s, h) => s + h, 0) / sleepHours.length : null;

  // Colunas semanais
  const weekLabelEvery = data.weekly.length > 8 ? 2 : 1;
  const adherence: Column[] = data.weekly.map((w) => ({
    key: w.weekStart,
    value: w.adherencePct,
    label: shortDate(w.weekStart),
    readout:
      w.adherencePct === null
        ? t("history.adherenceEmpty", { date: shortDate(w.weekStart) })
        : t("history.adherenceReadout", {
            date: shortDate(w.weekStart),
            done: w.completedSessions,
            total: w.plannedSessions,
            pct: w.adherencePct,
          }),
  }));
  const load: Column[] = data.weekly.map((w) => ({
    key: w.weekStart,
    value: w.srpeLoad,
    label: shortDate(w.weekStart),
    readout: t("history.loadReadout", { date: shortDate(w.weekStart), load: number(w.srpeLoad), minutes: number(w.minutes) }),
  }));
  const loadMax = Math.max(1, ...data.weekly.map((w) => w.srpeLoad));

  // Sono: todos os dias do período, com lacuna onde não houve check-in.
  const sleepByDate = new Map(data.sleep.map((s) => [s.date, s]));
  const days: string[] = [];
  for (let d = data.from; d <= data.to; d = addDays(d, 1)) days.push(d);
  const sleep: Column[] = days.map((date) => {
    const s = sleepByDate.get(date);
    const hours = s?.hours ?? null;
    return {
      key: date,
      value: hours,
      label: shortDate(date),
      readout:
        hours === null
          ? t("history.sleepNoData", { date: shortDate(date) })
          : s?.quality != null
            ? t("history.sleepReadoutQuality", { date: shortDate(date), hours: number(hours, 1), quality: s.quality })
            : t("history.sleepReadout", { date: shortDate(date), hours: number(hours, 1) }),
    };
  });
  const sleepMax = Math.ceil(Math.max(8, ...sleepHours));
  const sleepRows = data.sleep.filter((s) => s.hours !== null || s.quality !== null);

  const regionLabel = (region: string) => {
    const side = region.endsWith("_d") ? "d" : region.endsWith("_e") ? "e" : "x";
    return t(`body.regions.${baseRegionId(region)}.${side}`, { defaultValue: region });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
        <Tile
          label={t("history.summaryDone")}
          value={planned > 0 ? t("history.summaryDoneValue", { done, total: planned }) : t("history.summaryNone")}
        />
        <Tile label={t("history.summaryMinutes")} value={planned > 0 ? t("panel.minutes", { count: minutes }) : t("history.summaryNone")} />
        <Tile
          label={t("history.summarySleep")}
          value={sleepAvg === null ? t("history.summaryNone") : t("history.summarySleepValue", { hours: number(sleepAvg, 1) })}
        />
      </div>

      {data.weekly.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title={t("history.adherenceTitle")} hint={t("history.adherenceHint")}>
            <ColumnChart
              columns={adherence}
              max={100}
              maxLabel="100%"
              color="text-[#C2410C]"
              gap="px-1"
              labelEvery={weekLabelEvery}
              tableLabel={t("history.showTable")}
              table={
                <DataTable
                  head={[t("history.tableWeek"), t("history.tableDone"), t("history.tablePlanned"), t("history.tableAdherence")]}
                  rows={data.weekly.map((w) => [
                    shortDate(w.weekStart),
                    String(w.completedSessions),
                    String(w.plannedSessions),
                    w.adherencePct === null ? "—" : `${w.adherencePct}%`,
                  ])}
                />
              }
            />
          </Card>
          <Card title={t("history.loadTitle")} hint={t("history.loadHint")}>
            <ColumnChart
              columns={load}
              max={loadMax}
              maxLabel={`${number(loadMax)} ${t("history.loadUnit")}`}
              color="text-[#2A78D6]"
              gap="px-1"
              labelEvery={weekLabelEvery}
              tableLabel={t("history.showTable")}
              table={
                <DataTable
                  head={[t("history.tableWeek"), t("history.tableLoad"), t("history.tableMinutes")]}
                  rows={data.weekly.map((w) => [shortDate(w.weekStart), number(w.srpeLoad), number(w.minutes)])}
                />
              }
            />
          </Card>
        </div>
      )}

      <Card title={t("history.sleepTitle")} hint={t("history.sleepHint")}>
        <ColumnChart
          columns={sleep}
          max={sleepMax}
          maxLabel={`${sleepMax} h`}
          color="text-[#6250D6]"
          gap="px-px"
          labelEvery={days.length > 28 ? 14 : 7}
          tableLabel={t("history.showTable")}
          table={
            <DataTable
              head={[t("history.tableDate"), t("history.tableHours"), t("history.tableQuality")]}
              rows={sleepRows.map((s) => [
                shortDate(s.date),
                s.hours === null ? "—" : number(s.hours, 1),
                s.quality === null ? "—" : `${s.quality}/5`,
              ])}
            />
          }
        />
      </Card>

      <Card title={t("history.painTitle")}>
        {pain.length === 0 ? (
          <p className="text-sm text-gray-600">{t("history.painEmpty")}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pain.map((p, i) => (
              <li key={`${p.date}-${p.region}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 text-sm">
                <span className="font-semibold text-[#0F172A]">
                  {shortDate(p.date)} · {regionLabel(p.region)}
                </span>
                <span className="text-gray-600">
                  {p.intensity !== null ? t("history.painIntensity", { value: p.intensity }) : ""}
                  {p.moment ? ` · ${t(`history.moments.${p.moment}`, { defaultValue: p.moment })}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-gray-500">{t("history.painNote")}</p>
      </Card>
    </div>
  );
}

function DataTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-left text-sm tabular-nums">
      <thead className="sticky top-0 bg-gray-50 text-xs font-semibold text-gray-500">
        <tr>
          {head.map((h) => (
            <th key={h} scope="col" className="px-3 py-2">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td key={j} className="px-3 py-1.5 text-gray-700">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
