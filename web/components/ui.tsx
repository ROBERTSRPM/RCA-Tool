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
          <span className="pointer-events-none absolute inset-y-0 left-3 flex max-w-[25%] items-center truncate text-slate-500">
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
            paddingLeft: prefix ? `min(${12 + prefix.length * 9 + 6}px, 30%)` : undefined,
            paddingRight: suffix ? `min(${12 + suffix.length * 8 + 8}px, 45%)` : undefined,
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
          <span className="pointer-events-none absolute inset-y-0 right-3 flex max-w-[40%] items-center truncate text-sm text-slate-500">
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
  collapseOnMobile = false,
}: {
  title?: string;
  help?: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
  /** On phones the body starts closed and the title toggles it. From the sm breakpoint up it is always open. */
  collapseOnMobile?: boolean;
}) {
  const [open, setOpen] = useState(!collapseOnMobile);
  const bodyId = useId();
  const header = (
    <>
      <div className="min-w-0">
        {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
        {help && (
          <p className={`mt-0.5 max-w-prose text-sm text-slate-500 ${collapseOnMobile && !open ? "hidden sm:block" : ""}`}>
            {help}
          </p>
        )}
      </div>
      {right}
    </>
  );
  return (
    <section className={`card p-4 sm:p-5 ${className}`}>
      {(title || right) &&
        (collapseOnMobile ? (
          <div className="mb-0 flex flex-wrap items-start justify-between gap-3 sm:mb-4">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen((o) => !o)}
              className="-m-1 flex w-full items-start justify-between gap-3 rounded p-1 text-left sm:pointer-events-none sm:m-0 sm:w-auto sm:p-0"
            >
              <span className="min-w-0">{header}</span>
              <span className="mt-0.5 text-slate-500 sm:hidden" aria-hidden="true">
                <Icon name={open ? "up" : "down"} size={18} />
              </span>
            </button>
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">{header}</div>
        ))}
      <div id={bodyId} className={collapseOnMobile && !open ? "hidden sm:block" : collapseOnMobile ? "mt-4 sm:mt-0" : ""}>
        {children}
      </div>
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
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center sm:p-10">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    const active = document.activeElement;
    returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
    const back = returnFocus.current;
    returnFocus.current = null;
    // Wait for the dialog to unmount, then put focus back where it was.
    if (back) {
      back.focus();
      setTimeout(() => back.isConnected && back.focus(), 0);
    }
  }, []);

  useEffect(() => {
    if (!opts) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close(false);
        return;
      }
      if (e.key !== "Tab") return;
      // Keep Tab and Shift+Tab inside the dialog.
      const items = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      if (!items || items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!dialogRef.current?.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center"
          onClick={() => close(false)}
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-msg"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-base font-semibold text-slate-900">
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
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white transition-colors disabled:opacity-40 ${
        danger ? "text-red-700 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100"
      } ${className}`}
    >
      <Icon name={icon} />
    </button>
  );
}

/* ---------- Searchable list with free text ---------- */

/**
 * A text box that suggests items from a list as you type. Whatever is typed is
 * kept, so anything not on the list is simply your own free-text entry. Choosing
 * "Other" from the list clears the box so you can type your own wording.
 */
export function ComboField({
  label,
  help,
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const exact = options.some((o) => o.toLowerCase() === value.trim().toLowerCase());
  const q = value.trim().toLowerCase();
  const shown = !q || exact ? options : options.filter((o) => o.toLowerCase().includes(q));
  const choose = (o: string) => {
    onChange(o === "Other" ? "" : o);
    setOpen(false);
    setActive(-1);
  };
  return (
    <Field label={label} help={help} htmlFor={id} className={className}>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          className="input"
          value={value}
          placeholder={placeholder ?? "Search the list or type your own"}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setActive(-1);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, shown.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && open && active >= 0 && shown[active]) {
              e.preventDefault();
              choose(shown[active]);
            } else if (e.key === "Escape" && open) {
              e.preventDefault();
              setOpen(false);
            }
          }}
        />
        {open && shown.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Suggestions"
            className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-300 bg-white py-1 shadow-lg"
          >
            {shown.map((o, i) => (
              <li
                key={o}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={o.toLowerCase() === value.trim().toLowerCase()}
                // mouse down would blur the input and close the list before the click lands
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                className={`flex min-h-11 cursor-pointer items-center px-3 text-sm text-slate-800 ${
                  i === active ? "bg-slate-100" : "hover:bg-slate-50"
                }`}
              >
                {o === "Other" ? "Other (type your own)" : o}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}

/** A row of big choice buttons, each with a one-line explanation. Tap the chosen one again to clear it. */
export function ChoiceGroup<T extends string>({
  label,
  help,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  help?: string;
  value: T | "";
  onChange: (v: T | "") => void;
  options: { value: T; label: string; help?: string }[];
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="label">{label}</legend>
      <div
        role="radiogroup"
        aria-label={label}
        className={`grid gap-1.5 ${options.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
      >
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(on ? "" : o.value)}
              className={`min-h-11 rounded-lg border px-3 py-2 text-left ${
                on
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              <span className="block text-sm font-semibold leading-tight">{o.label}</span>
              {o.help && (
                <span className={`mt-0.5 block text-xs leading-snug ${on ? "text-slate-200" : "text-slate-600"}`}>
                  {o.help}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {help && <p className="help">{help}</p>}
    </fieldset>
  );
}
