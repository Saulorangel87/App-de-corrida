import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { forwardRef } from "react";
import { useController, type Control, type FieldValues, type Path } from "react-hook-form";
import { useTranslation } from "react-i18next";

/** Erro de campo da entrevista: o resolver devolve "required" ou "invalid"; o texto vem do i18n. */
export function useFieldError() {
  const { t } = useTranslation();
  return (message?: string) => {
    if (!message) return undefined;
    return message === "required" ? t("interview.errors.required") : t("interview.errors.invalid");
  };
}

const pill =
  "flex min-h-11 cursor-pointer select-none items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition-colors " +
  "peer-focus-visible:ring-2 peer-focus-visible:ring-[#FF5A1F]/40 peer-focus-visible:border-[#FF5A1F]";
const pillOff = "border-gray-300 bg-white text-[#111827] hover:border-gray-400";
const pillOn = "border-[#FF5A1F] bg-orange-50 text-[#FF5A1F]";

type Option<V extends string | number | boolean> = { value: V; label: string; hint?: string };

type GroupProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  legend: ReactNode;
  hint?: ReactNode;
  /** Quebra o enunciado em "pergunta" e "instruções" (o texto oficial do PAR-Q+ é mostrado inteiro). */
  lang?: string;
};

type GroupViewProps<V extends string | number | boolean> = {
  name: string;
  legend: ReactNode;
  hint?: ReactNode;
  lang?: string;
  options: Option<V>[];
  value: V | undefined;
  onChange: (value: V) => void;
  onBlur?: () => void;
  /** Ref do primeiro item marcado (ou do primeiro, se nada está marcado): foco no erro. */
  inputRef?: (el: HTMLInputElement | null) => void;
  error?: string;
  columns?: string;
};

/** Grupo de escolha única, sem react-hook-form (radio nativo, com a aparência de botões). */
export function ChoiceGroup<V extends string | number | boolean>({
  name,
  legend,
  hint,
  lang,
  options,
  value,
  onChange,
  onBlur,
  inputRef,
  error,
  columns = "grid-cols-2",
}: GroupViewProps<V>) {
  const id = useId();
  const errorId = `${id}-erro`;
  const hintId = `${id}-ajuda`;
  return (
    <fieldset
      className="space-y-2"
      lang={lang}
      aria-invalid={error ? true : undefined}
      aria-describedby={[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined}
    >
      <legend className="text-sm font-semibold text-[#111827] leading-snug">{legend}</legend>
      {hint && (
        <div id={hintId} className="text-xs text-gray-500 leading-snug whitespace-pre-line">
          {hint}
        </div>
      )}
      <div className={`grid gap-2 ${columns}`}>
        {options.map((o, index) => {
          const checked = value === o.value;
          return (
            <label key={String(o.value)} className="relative block">
              <input
                type="radio"
                className="peer sr-only"
                name={name}
                checked={checked}
                onChange={() => onChange(o.value)}
                onBlur={onBlur}
                ref={checked || (value === undefined && index === 0) ? inputRef : undefined}
              />
              <span className={`${pill} ${checked ? pillOn : pillOff} flex-col text-center`}>
                <span>{o.label}</span>
                {o.hint && <span className="text-xs font-normal text-gray-500">{o.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Grupo de escolha única ligado ao react-hook-form. */
export function ChoiceField<T extends FieldValues, V extends string | number | boolean>({
  control,
  name,
  legend,
  hint,
  options,
  columns,
  lang,
}: GroupProps<T> & { options: Option<V>[]; columns?: string }) {
  const { field, fieldState } = useController({ control, name });
  const fieldError = useFieldError();
  return (
    <ChoiceGroup
      name={field.name}
      legend={legend}
      hint={hint}
      lang={lang}
      options={options}
      columns={columns}
      value={field.value as V | undefined}
      onChange={field.onChange}
      onBlur={field.onBlur}
      inputRef={field.ref}
      error={fieldError(fieldState.error?.message)}
    />
  );
}

/** Pergunta de sim ou não. */
export function YesNoField<T extends FieldValues>(props: GroupProps<T>) {
  const { t } = useTranslation();
  return (
    <ChoiceField
      {...props}
      options={[
        { value: true, label: t("interview.yes") },
        { value: false, label: t("interview.no") },
      ]}
    />
  );
}

/** Vários itens marcáveis (ex.: terreno). O valor do campo é uma lista. */
export function MultiChoiceField<T extends FieldValues, V extends string>({
  control,
  name,
  legend,
  hint,
  options,
}: GroupProps<T> & { options: Option<V>[] }) {
  const { field } = useController({ control, name });
  const id = useId();
  const value = (field.value ?? []) as V[];
  return (
    <fieldset className="space-y-2" aria-describedby={hint ? `${id}-ajuda` : undefined}>
      <legend className="text-sm font-semibold text-[#111827]">{legend}</legend>
      {hint && (
        <p id={`${id}-ajuda`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        {options.map((o) => {
          const checked = value.includes(o.value);
          return (
            <label key={o.value} className="relative block">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={checked}
                onChange={() => field.onChange(checked ? value.filter((v) => v !== o.value) : [...value, o.value])}
                onBlur={field.onBlur}
              />
              <span className={`${pill} ${checked ? pillOn : pillOff}`}>{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  options: { value: string | number; label: string }[];
  placeholder: string;
};

/** Lista suspensa nativa (acessível por teclado e leitor de tela). */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, options, placeholder, ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-erro`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold text-[#111827]">
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        defaultValue=""
        className={`w-full rounded-xl border bg-white px-3 py-2 text-gray-900 focus:border-[#FF5A1F] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/20 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
        {...rest}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});
