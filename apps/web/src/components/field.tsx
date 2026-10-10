import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

const input =
  "w-full px-3 py-2 rounded-xl border bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/20 focus:border-[#FF5A1F] transition-all";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  /** Conteúdo à direita do rótulo (ex.: "Esqueci minha senha"). */
  aside?: ReactNode;
  /** Ajuda curta sob o rótulo (faixa de valores, unidade). */
  hint?: string;
};

/** Campo de texto com rótulo ligado ao input e erro anunciado por leitor de tela. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, aside, hint, className, ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-erro`;
  const hintId = `${id}-ajuda`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="text-xs font-semibold text-[#111827]">
          {label}
        </label>
        {aside}
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${input} ${error ? "border-red-500" : "border-gray-300"} ${className ?? ""}`}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="text-red-600 text-xs">
          {error}
        </p>
      )}
    </div>
  );
});

type CheckFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  error?: string;
};

export const CheckField = forwardRef<HTMLInputElement, CheckFieldProps>(function CheckField(
  { label, error, ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-erro`;
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-2 cursor-pointer">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#FF5A1F] focus:ring-[#FF5A1F] cursor-pointer"
          {...rest}
        />
        <span className={`text-[13px] font-medium leading-snug ${error ? "text-red-600" : "text-[#111827]"}`}>{label}</span>
      </label>
      {error && (
        <p id={errorId} role="alert" className="text-red-600 text-xs ml-6">
          {error}
        </p>
      )}
    </div>
  );
});
