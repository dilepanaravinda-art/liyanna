import type { ReactNode } from "react";
import { currencies } from "../domain/money";
import type { Language } from "../domain/model";
import { languages, type Copy } from "../i18n";
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function CurrencySelect({
  value,
  onChange,
  t,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  t: Copy;
  label?: string;
}) {
  const names = new Intl.DisplayNames(["en"], { type: "currency" });
  return (
    <Field label={label ?? t.currency}>
      <select
        aria-label={label ?? t.currency}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      >
        <option value="" disabled>
          {t.chooseCurrency}
        </option>
        {currencies.map((c) => (
          <option value={c} key={c}>
            {c} — {names.of(c)}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function LanguageSelect({
  value,
  onChange,
  label,
}: {
  value: Language;
  onChange: (v: Language) => void;
  label: string;
}) {
  return (
    <Field label={label}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
      >
        {languages.map((l) => (
          <option value={l.value} key={l.value}>
            {l.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function ErrorBox({
  message,
  onClose,
}: {
  message: string;
  onClose?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
export const formatDate = (date: string, language = "en") =>
  date
    ? new Date(date + "T12:00:00").toLocaleDateString(language, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
