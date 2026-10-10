import type { ReactNode } from "react";
import { useForm, type DefaultValues, type FieldValues } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";
import { PrimaryButton, SecondaryButton } from "../../components/auth-ui";
import { stepResolver } from "../../lib/step-form";

/** O que cada etapa recebe da tela da entrevista. */
export type StepProps = {
  /** Resposta já salva desta etapa (do rascunho no servidor), se houver. */
  saved: unknown;
  /** Respostas das etapas anteriores (ex.: o sexo, para a pergunta de gravidez). */
  all: Record<string, unknown>;
  onSubmit: (payload: unknown) => void;
  onBack?: () => void;
  pending: boolean;
  last: boolean;
  error?: string;
};

/** Formulário de uma etapa: validação com o esquema compartilhado e envio do payload pronto. */
export function useStepForm<F extends FieldValues>(opts: {
  schema: z.ZodTypeAny;
  toPayload: (values: F) => unknown;
  fieldOf?: (path: string) => string;
  defaults: DefaultValues<F>;
  onSubmit: (payload: unknown) => void;
}) {
  const form = useForm<F>({
    resolver: stepResolver<F>(opts.schema, opts.toPayload, opts.fieldOf),
    defaultValues: opts.defaults,
  });
  const submit = form.handleSubmit((values) => opts.onSubmit(opts.toPayload(values)));
  return { form, submit };
}

export function StepActions({ onBack, pending, last, error }: Pick<StepProps, "onBack" | "pending" | "last" | "error">) {
  const { t } = useTranslation();
  return (
    <div className="mt-5 space-y-3">
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        {onBack && (
          <div className="w-1/3">
            <SecondaryButton onClick={onBack} disabled={pending}>
              {t("interview.back")}
            </SecondaryButton>
          </div>
        )}
        <div className="flex-1">
          <PrimaryButton type="submit" disabled={pending}>
            {pending ? t(last ? "interview.finishing" : "interview.saving") : t(last ? "interview.finish" : "interview.next")}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/** Corpo de uma etapa: campos empilhados com espaçamento regular. */
export function StepFields({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

/** Dois campos lado a lado a partir de telas médias. */
export function Row({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 items-end gap-4 min-[480px]:grid-cols-2">{children}</div>;
}

/** Resposta salva (do rascunho) com tipo solto: os esquemas validam de novo ao enviar. */
export function savedObject(saved: unknown): Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return saved && typeof saved === "object" ? (saved as Record<string, any>) : {}; // eslint-disable-line @typescript-eslint/no-explicit-any
}
