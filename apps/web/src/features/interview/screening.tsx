import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { PARQ_FOLLOW_UP, PARQ_GENERAL, PARQ_INSTRUMENT, PARQ_TEXT_PT_BR, screeningStep } from "@passo/shared";
import { YesNoField } from "../../components/choice";
import { StepActions, StepFields, savedObject, useStepForm, type StepProps } from "./common";

// Triagem PAR-Q+ (R-TRI-02): o texto oficial é mostrado inteiro, sem encurtar nem reescrever.
// As chaves do formulário são planas (g1..g7, h1..h10, a1a...) para não virarem índices de lista.

type Form = Record<string, boolean | undefined>;
const SECTIONS = Object.entries(PARQ_FOLLOW_UP) as [string, readonly string[]][];

const parq = (key: string) => PARQ_TEXT_PT_BR[key] ?? "";

function toPayload(v: Form) {
  const general = Object.fromEntries(PARQ_GENERAL.map((q) => [String(q), v[`g${q}`]]));
  const anyYes = Object.values(general).some((x) => x === true);
  const followUp = anyYes
    ? Object.fromEntries(
        SECTIONS.map(([section, ids]) => [
          section,
          v[`h${section}`] === true
            ? { has: true, answers: Object.fromEntries(ids.map((id) => [id, v[`a${id}`]])) }
            : { has: v[`h${section}`], answers: {} },
        ]),
      )
    : undefined;
  return { general, followUp, pregnant: v.pregnant };
}

function fieldOf(path: string): string {
  const p = path.split(".");
  if (p[0] === "general") return `g${p[1]}`;
  if (p[0] === "pregnant") return "pregnant";
  if (p[0] === "followUp") {
    if (p[2] === "answers") return `a${p[3]}`;
    return `h${p[1]}`;
  }
  return "g1";
}

function defaultsFrom(saved: unknown, sex: unknown): Form {
  const s = savedObject(saved);
  const d: Form = {};
  for (const q of PARQ_GENERAL) d[`g${q}`] = s.general?.[String(q)];
  for (const [section, ids] of SECTIONS) {
    const f = s.followUp?.[section];
    d[`h${section}`] = f?.has;
    for (const id of ids) d[`a${id}`] = f?.answers?.[id];
  }
  // Homens não são perguntados sobre gravidez; o esquema exige o campo.
  d.pregnant = sex === "M" ? false : s.pregnant;
  return d;
}

/** Texto oficial de uma pergunta: a primeira linha é a pergunta, as outras são as instruções. */
function splitQuestion({ number, text }: { number: string; text: string }) {
  const [first = "", ...rest] = text.split("\n");
  return { legend: `${number}. ${first}`, hint: rest.length ? rest.join("\n") : undefined };
}

export function ScreeningStep({ saved, all, onSubmit, ...actions }: StepProps) {
  const { t, i18n } = useTranslation();
  const sex = savedObject(all.basicos).sex;
  const { form, submit } = useStepForm<Form>({
    schema: screeningStep,
    toPayload,
    fieldOf,
    defaults: defaultsFrom(saved, sex),
    onSubmit,
  });
  const { control } = form;
  const values = useWatch({ control });
  const anyYes = PARQ_GENERAL.some((q) => values[`g${q}`] === true);
  const [headTitle = "", headText = ""] = parq("pagina1.cabecalho_perguntas").split("\n");

  return (
    <form noValidate onSubmit={submit}>
      <StepFields>
        <details className="rounded-xl bg-[#F5F6F8] px-4 py-3 text-sm text-gray-700">
          <summary className="cursor-pointer font-semibold text-[#111827]">{t("interview.triagem.intro")}</summary>
          <p lang="pt-BR" className="mt-3 whitespace-pre-line leading-relaxed">
            {parq("pagina1.introducao")}
          </p>
        </details>
        <p className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs leading-snug text-gray-700">
          {t("interview.triagem.note")}
          {i18n.language === "en" && <span className="mt-1 block">{t("interview.triagem.english")}</span>}
        </p>

        <div lang="pt-BR" className="space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#111827]">{headTitle}</h3>
            <p className="text-xs text-gray-600">{headText}</p>
          </div>
          {PARQ_GENERAL.map((q) => {
            const { legend, hint } = splitQuestion({ number: String(q), text: parq(`geral.${q}`) });
            return <YesNoField key={q} control={control} name={`g${q}`} legend={legend} hint={hint} />;
          })}

          {anyYes && (
            <div className="space-y-6 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#111827]">{parq("seguimento.cabecalho")}</h3>
              {SECTIONS.map(([section, ids]) => {
                const head = splitQuestion({ number: section, text: parq(`seguimento.${section}`) });
                return (
                  <div key={section} className="space-y-4">
                    <YesNoField control={control} name={`h${section}`} legend={head.legend} hint={head.hint} />
                    {values[`h${section}`] === true && (
                      <div className="space-y-4 border-l-2 border-orange-200 pl-4">
                        {ids.map((id) => {
                          const q = splitQuestion({ number: id, text: parq(`seguimento.${id}`) });
                          return <YesNoField key={id} control={control} name={`a${id}`} legend={q.legend} hint={q.hint} />;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {sex !== "M" && (
          <YesNoField control={control} name="pregnant" legend={t("interview.triagem.pregnant")} hint={t("interview.triagem.pregnantHint")} />
        )}

        <p className="text-[11px] leading-snug text-gray-500">
          {t("interview.triagem.attribution")}: {PARQ_INSTRUMENT.attribution}
        </p>
      </StepFields>
      <StepActions {...actions} />
    </form>
  );
}
