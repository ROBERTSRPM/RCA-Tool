"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "./icons";

/* ---------- Fields ---------- */

export function Field({
  label,
  help,
  children,
  htmlFor,
  className = "",
}: {
  label: string;
  help?: string;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {help && <p className="help">{help}</p>}
    </div>
  );
}

export function TextField({
  label,
  help,
  value,
  onChange,
  placeholder,
  className,
  type = "text",
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: "text" | "date";
}) {
  const id = useId();
  return (
    <Field label={label} help={help} htmlFor={id} className={className}>
      <input
        id={id}
        type={type}
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  help,
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const id = useId();
  return (
    <Field label={label} help={help} htmlFor={id} className={className}>
      <textarea
        id={id}
        className="input"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function parseNum(text: string): number | null {
  if (text.trim() === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function NumberField({
  label,
  help,
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  className,
}: {
  label: string;
  help?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value === null ? "" : String(value));
  // Show what the user typed while it still means the stored number;
  // otherwise (e.g. data reset elsewhere) show the stored number.
  const shown = parseNum(text) === value ? text : value === null ? "" : String(value);
  return (
    <Field label={label} help={help} htmlFor={id} className={className}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="input"
          style={{
            paddingLeft: prefix ? `${12 + prefix.length * 9 + 6}px` : undefined,
            paddingRight: suffix ? `${12 + suffix.length * 8 + 8}px` : undefined,
          }}
          value={shown}
          placeholder={placeholder}
          onChange={(e) => {
            const t = e.target.value;
            if (!/^\d*\.?\d*$/.test(t)) return;
            setText(t);
            onChange(parseNum(t));
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  help,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  help?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  const id = useId();
  return (
    <Field label={label} help={help} htmlFor={id} className={className}>
      <select
        id={id}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/* ---------- Cards ---------- */

export function SectionCard({
  title,
  help,
  children,
  right,
  className = "",
}: {
  title?: string;
  help?: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-4 sm:p-6 ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-bold text-slate-900">{title}</h2>}
            {help && <p className="mt-0.5 max-w-prose text-sm text-slate-500">{help}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white/60 p-6 text-center sm:p-10">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {children && (
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{children}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/* ---------- Confirm dialog ---------- */

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}
type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error("useConfirm must be used inside ConfirmProvider");
  return fn;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  }, []);

  useEffect(() => {
    if (!opts) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-msg"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-lg font-bold text-slate-900">
              {opts.title}
            </h2>
            <p id="confirm-msg" className="mt-2 text-sm text-slate-600">
              {opts.message}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button ref={cancelRef} className="btn btn-secondary" onClick={() => close(false)}>
                Cancel
              </button>
              <button
                className={`btn ${opts.danger ? "btn-danger-solid" : "btn-dark"}`}
                onClick={() => close(true)}
              >
                {opts.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function IconButton({
  label,
  icon,
  onClick,
  disabled,
  danger,
  className = "",
}: {
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white transition-colors disabled:opacity-40 ${
        danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100"
      } ${className}`}
    >
      <Icon name={icon} />
    </button>
  );
}
