import type { ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DecisionSources } from "../components/decision-sources";
import { FlowLayout } from "../components/flow-layout";
import { Glossary } from "../components/glossary";
import { ApiError } from "../lib/api";
import { formatDate, localToday } from "../lib/dates";
import { useRequireUser } from "../lib/queries";
import { useDay, useWorkout, type Fact, type StepView, type WorkoutDetailResponse } from "../lib/training";
import { useErrorText } from "../lib/use-error-text";
import { zoneUpTo } from "../lib/zone";

export const Route = createFileRoute("/treino/$id")({
  component: WorkoutPage,
});

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-lg font-bold tracking-tight text-[#0F172A]">{title}</h2>
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
          <Link to="/painel" className="mt-3 inline-block text-sm font-semibold text-[#C2410C] hover:underline">
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
  const canLog = session.date <= today;
  const ladder = session.ladder;
  const isRun = session.kind !== "forca" && session.kind !== "mobilidade";

  // A decisão do motor só existe para hoje e os vizinhos; mostramos a de hoje, que é a que importa.
  const day = useDay(session.date, isToday && !session.optional);

  const { how, intensity } = detail;
  const hasHow = !!(how.warmup || how.main || how.cooldown);
  const hasIntensity = !!intensity && (intensity.groups.length > 0 || intensity.notes.length > 0 || intensity.studies.length > 0);

  return (
    <FlowLayout width="max-w-[760px]">
      <Link to="/painel" className="mb-3 inline-block text-sm font-semibold text-[#C2410C] hover:underline">
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
            {isRun && <div>{zoneUpTo(t, session.maxZone)}</div>}
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
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#C2410C] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#9A3412]"
            >
              {session.log ? t("panel.logEdit") : t("panel.logCta")}
            </Link>
          )}
        </section>

        {day.data && (
          <Card title={t("workout.todayTitle")}>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-700">
              {day.data.decision.message}
            </p>
            <DecisionSources sources={day.data.decision.sources ?? []} />
          </Card>
        )}

        {detail.summary && (
          <Card title={t("workout.reasonTitle")}>
            <p className="text-[15px] leading-relaxed text-gray-700">
              {detail.summary}
            </p>
          </Card>
        )}

        {hasHow && (
          <Card title={t("workout.howTitle")}>
            <div className="space-y-5">
              <Step title={t("workout.warmup")} step={how.warmup} />
              <Step title={t("workout.main")} step={how.main} />
              <Step title={t("workout.cooldown")} step={how.cooldown} />
            </div>
          </Card>
        )}

        {hasIntensity && intensity && (
          <Card title={t("workout.intensityTitle")}>
            <div className="space-y-5">
              {intensity.groups.map((g, i) => (
                <div key={i}>
                  {g.title && <h3 className="text-sm font-bold text-[#0F172A]">{g.title}</h3>}
                  {g.zone && <p className="text-base font-extrabold text-[#0F172A]">{g.zone}</p>}
                  <Facts facts={g.facts} />
                  {g.watch.length > 0 && (
                    <div className="mt-2 rounded-xl bg-[#F5F6F8] p-3">
                      <p className="text-xs font-bold text-gray-600">{t("workout.watch")}</p>
                      <Facts facts={g.watch} />
                    </div>
                  )}
                </div>
              ))}
              {intensity.notes.length > 0 && (
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
                  {intensity.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
              {intensity.studies.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500">{t("workout.studiesTitle")}</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
                    {intensity.studies.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}

        {detail.level && detail.level.length > 0 && (
          <Card title={t("workout.levelTitle")}>
            <Facts facts={detail.level} />
          </Card>
        )}

        {detail.frequency.length > 0 && (
          <Card title={t("workout.frequencyTitle")}>
            <Facts facts={detail.frequency} />
          </Card>
        )}

        {detail.limits.length > 0 && (
          <Card title={t("workout.limitsTitle")}>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
              {detail.limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t("workout.limitsNote")}</p>
          </Card>
        )}

        {(detail.progression.length > 0 || detail.regression.length > 0) && (
          <Card title={t("workout.nextTitle")}>
            <div className="space-y-4 text-sm">
              <Lines title={t("workout.progression")} items={detail.progression} />
              <Lines title={t("workout.regression")} items={detail.regression} />
            </div>
          </Card>
        )}

        <Evidence evidence={detail.evidence} references={references} />

        <Glossary />
      </div>
    </FlowLayout>
  );
}

function Facts({ facts }: { facts: Fact[] }) {
  if (facts.length === 0) return null;
  return (
    <dl className="divide-y divide-gray-100">
      {facts.map((f) => (
        <div key={`${f.label}-${f.value}`} className="py-2">
          <dt className="text-xs font-semibold text-gray-500">{f.label}</dt>
          <dd className="mt-0.5 text-sm leading-relaxed text-gray-800">
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Step({ title, step }: { title: string; step: StepView | null }) {
  if (!step) return null;
  return (
    <div>
      <h3 className="text-sm font-bold text-[#0F172A]">
        {title}
        {step.minutes && <span className="ml-2 font-semibold text-gray-500">{step.minutes} min</span>}
      </h3>
      {step.text && (
        <p className="mt-1 text-sm leading-relaxed text-gray-700">
          {step.text}
        </p>
      )}
      <Facts facts={step.facts} />
    </div>
  );
}

function Lines({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500">{title}</p>
      <ul className="mt-1 space-y-1 text-gray-800">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Evidence({ evidence, references }: { evidence: WorkoutDetailResponse["detail"]["evidence"]; references: WorkoutDetailResponse["references"] }) {
  const { t } = useTranslation();
  const has = evidence.direct.length + evidence.initial.length + evidence.insufficient.length > 0;
  if (!has && references.length === 0) return null;
  return (
    <Card title={t("workout.evidenceTitle")}>
      <div className="space-y-5">
        <List title={t("workout.evidenceDirect")} items={evidence.direct} />
        <List title={t("workout.evidenceProvisional")} hint={t("workout.evidenceProvisionalHint")} items={evidence.initial} />
        <List title={t("workout.evidenceInsufficient")} items={evidence.insufficient} />
        {references.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">{t("workout.referencesTitle")}</h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
              {references.map((r) => {
                const candidate = r.doi ? `https://doi.org/${r.doi}` : r.url;
                // Só https: o endereço vem do catálogo; qualquer outro esquema (javascript:, data:) é ignorado.
                const href = candidate && /^https:\/\//i.test(candidate) ? candidate : null;
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
                          className="whitespace-nowrap font-semibold text-[#C2410C] hover:underline"
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
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-700">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
