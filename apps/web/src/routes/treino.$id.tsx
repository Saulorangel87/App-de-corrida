import type { ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CatalogFacts } from "../components/catalog-facts";
import { FlowLayout } from "../components/flow-layout";
import { ApiError } from "../lib/api";
import { formatDate, localToday } from "../lib/dates";
import { useRequireUser } from "../lib/queries";
import { useDay, useWorkout, type CatalogObject, type WorkoutDetailResponse } from "../lib/training";
import { useErrorText } from "../lib/use-error-text";

export const Route = createFileRoute("/treino/$id")({
  component: WorkoutPage,
});

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-[#0F172A]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function WorkoutPage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { user, loading } = useRequireUser();
  const workout = useWorkout(id, !loading && !!user);

  if (loading || !user || workout.isLoading) {
    return (
      <FlowLayout>
        <p role="status" className="text-gray-600">
          {t("common.loading")}
        </p>
      </FlowLayout>
    );
  }

  if (workout.error || !workout.data) {
    const notFound = workout.error instanceof ApiError && workout.error.status === 404;
    return (
      <FlowLayout>
        <div role="alert" className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-gray-700">
            {notFound ? t("workout.notFound") : workout.error ? errorText(workout.error) : t("workout.loadError")}
          </p>
          <Link to="/painel" className="mt-3 inline-block text-sm font-semibold text-[#FF5A1F] hover:underline">
            {t("workout.back")}
          </Link>
        </div>
      </FlowLayout>
    );
  }
  return <WorkoutView data={workout.data} />;
}

function WorkoutView({ data }: { data: WorkoutDetailResponse }) {
  const { t, i18n } = useTranslation();
  const { session, detail, references } = data;
  const today = localToday();
  const isToday = session.date === today;
  const name = session.name ? (i18n.language === "en" ? session.name.en : session.name["pt-BR"]) : session.slug;
  const state = session.log ? (session.log.completed ? "completed" : "skipped") : "pending";
  const stateTone =
    state === "completed" ? "bg-green-100 text-green-700" : state === "skipped" ? "bg-gray-100 text-gray-600" : "bg-orange-100 text-orange-800";
  const canLog = !session.optional && session.date <= today;
  const ladder = session.ladder;

  // A decisão do motor só existe para hoje e os vizinhos; mostramos a de hoje, que é a que importa.
  const day = useDay(session.date, isToday && !session.optional);

  return (
    <FlowLayout width="max-w-[760px]">
      <Link to="/painel" className="mb-3 inline-block text-sm font-semibold text-[#FF5A1F] hover:underline">
        ← {t("workout.back")}
      </Link>

      <div className="space-y-4">
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${stateTone}`}>{t(`workout.status.${state}`)}</span>
            {session.optional && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{t("workout.optional")}</span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0F172A]">{name}</h1>
          <p className="text-sm text-gray-500">{formatDate(session.date, i18n.language, { dateStyle: "full" })}</p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold text-gray-700">
            <div>{t("panel.minutes", { count: session.minutes })}</div>
            {session.kind !== "forca" && session.kind !== "mobilidade" && <div>{t("panel.zone", { zone: session.maxZone })}</div>}
            {session.targetRpe != null && <div>{t("panel.rpe", { rpe: session.targetRpe })}</div>}
          </dl>

          {ladder && (
            <div className="mt-4 rounded-xl bg-[#F5F6F8] p-4 text-sm text-gray-800">
              <p className="font-semibold text-[#111827]">{t("workout.ladderTitle", { etapa: ladder.etapa })}</p>
              <p>
                {ladder.continua
                  ? t("workout.ladderContinuous", { run: ladder.corridaMin })
                  : t("workout.ladderRepeat", { reps: ladder.repeticoes, run: ladder.corridaMin, walk: ladder.caminhadaMin })}
              </p>
            </div>
          )}

          {canLog && (
            <Link
              to="/registro/$id"
              params={{ id: session.id }}
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#FF5A1F] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#e6511a]"
            >
              {session.log ? t("panel.logEdit") : t("panel.logCta")}
            </Link>
          )}
        </section>

        {day.data && (
          <Card title={t("workout.todayTitle")}>
            <p lang="pt-BR" className="whitespace-pre-line text-[15px] leading-relaxed text-gray-700">
              {day.data.decision.message}
            </p>
          </Card>
        )}

        {detail.reason && (
          <Card title={t("workout.reasonTitle")}>
            <p lang="pt-BR" className="text-[15px] leading-relaxed text-gray-700">
              {detail.reason}
            </p>
          </Card>
        )}

        {(detail.warmup || detail.main || detail.cooldown) && (
          <Card title={t("workout.howTitle")}>
            <div className="space-y-5">
              <Step title={t("workout.warmup")} data={detail.warmup} />
              <Step title={t("workout.main")} data={detail.main} />
              <Step title={t("workout.cooldown")} data={detail.cooldown} />
            </div>
          </Card>
        )}

        {detail.intensity && Object.keys(detail.intensity).length > 0 && (
          <Card title={t("workout.intensityTitle")}>
            <CatalogFacts data={detail.intensity} />
          </Card>
        )}

        {detail.levelParams && (
          <Card title={t("workout.levelTitle")}>
            <CatalogFacts data={detail.levelParams} />
          </Card>
        )}

        {detail.frequency && (
          <Card title={t("workout.frequencyTitle")}>
            <CatalogFacts data={detail.frequency} />
          </Card>
        )}

        {detail.limits.length > 0 && (
          <Card title={t("workout.limitsTitle")}>
            <ul lang="pt-BR" className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
              {detail.limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t("workout.limitsNote")}</p>
          </Card>
        )}

        {(detail.progression || detail.regression) && (
          <Card title={t("workout.nextTitle")}>
            <dl className="space-y-3 text-sm">
              {detail.progression && (
                <div>
                  <dt className="text-xs font-semibold text-gray-500">{t("workout.progression")}</dt>
                  <dd lang="pt-BR" className="text-gray-800">
                    {detail.progression}
                  </dd>
                </div>
              )}
              {detail.regression && (
                <div>
                  <dt className="text-xs font-semibold text-gray-500">{t("workout.regression")}</dt>
                  <dd lang="pt-BR" className="text-gray-800">
                    {detail.regression}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        )}

        <Evidence evidence={detail.evidence} references={references} />
      </div>
    </FlowLayout>
  );
}

function Step({ title, data }: { title: string; data: CatalogObject | null }) {
  if (!data) return null;
  const { minutos, descricao, formato, ...rest } = data;
  const minutes = Array.isArray(minutos) ? minutos.join("–") : typeof minutos === "number" ? String(minutos) : null;
  return (
    <div>
      <h3 className="text-sm font-bold text-[#0F172A]">
        {title}
        {minutes && <span className="ml-2 font-semibold text-gray-500">{minutes} min</span>}
      </h3>
      {typeof formato === "string" && (
        <p lang="pt-BR" className="mt-1 text-sm font-medium text-gray-800">
          {formato}
        </p>
      )}
      {typeof descricao === "string" && (
        <p lang="pt-BR" className="mt-1 text-sm leading-relaxed text-gray-700">
          {descricao}
        </p>
      )}
      <CatalogFacts data={rest} />
    </div>
  );
}

function Evidence({ evidence, references }: { evidence: WorkoutDetailResponse["detail"]["evidence"]; references: WorkoutDetailResponse["references"] }) {
  const { t } = useTranslation();
  const has = evidence.direct.length + evidence.provisional.length + evidence.insufficient.length > 0;
  if (!has && references.length === 0) return null;
  return (
    <Card title={t("workout.evidenceTitle")}>
      <div className="space-y-5">
        <List title={t("workout.evidenceDirect")} items={evidence.direct} />
        <List title={t("workout.evidenceProvisional")} hint={t("workout.evidenceProvisionalHint")} items={evidence.provisional} />
        <List title={t("workout.evidenceInsufficient")} items={evidence.insufficient} />
        {references.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">{t("workout.referencesTitle")}</h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
              {references.map((r) => {
                const href = r.doi ? `https://doi.org/${r.doi}` : r.url;
                return (
                  <li key={r.citation}>
                    <span lang="en">{r.citation}</span>
                    {href && (
                      <>
                        {" "}
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whitespace-nowrap font-semibold text-[#FF5A1F] hover:underline"
                        >
                          {t("workout.openSource")}
                        </a>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </Card>
  );
}

function List({ title, hint, items }: { title: string; hint?: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-bold text-[#0F172A]">{title}</h3>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <ul lang="pt-BR" className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-700">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
