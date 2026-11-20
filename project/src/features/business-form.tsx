"use client";
import { useState, useEffect } from "react";
import { ArrowRight, Upload, ShieldCheck, ImagePlus } from "lucide-react";
import type { Business, Language } from "../domain/model";
import { copy, languages } from "../i18n";
import { businessSchema } from "../domain/validation";
import { readLogo } from "../storage/backup";
import { CurrencySelect, Field, LanguageSelect, ErrorBox } from "./components";
export function BusinessForm({
  business,
  setup = false,
  onSave,
  onDirty,
}: {
  business: Business;
  setup?: boolean;
  onSave: (b: Business) => Promise<void>;
  onDirty?: (dirty: boolean) => void;
}) {
  const [value, setValue] = useState(business),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const t = copy(value.language);
  const patch = (v: Partial<Business>) => {
    setValue((p) => ({
      ...p,
      ...v,
      ...(v.language ? { documentLanguage: v.language } : {}),
    }));
    setDirty(true);
  };
  useEffect(() => {
    onDirty?.(dirty);
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) setValue(business);
  }, [business, dirty]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const checked = businessSchema.safeParse(value);
    if (!checked.success) {
      setError(checked.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await onSave(checked.data);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  const fields = (
    <>
      <Field label={t.businessName}>
        <input
          value={value.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="e.g. Serendib Studio"
          required
          maxLength={200}
        />
      </Field>
      <div className="grid2">
        <CurrencySelect
          t={t}
          label={t.preferredCurrency}
          value={value.currency}
          onChange={(currency) => patch({ currency })}
        />
        <LanguageSelect
          label={t.defaultDocLanguage}
          value={value.documentLanguage}
          onChange={(documentLanguage) => patch({ documentLanguage })}
        />
      </div>
    </>
  );
  if (setup)
    return (
      <div className="setup-page">
        <section className="setup-story">
          <img className="brand" src="/brand/liyanna.png" alt="Liyanna" />
          <div className="eyebrow">MADE FOR YOUR NEXT CHAPTER</div>
          <h1>{t.welcome}</h1>
          <p>{t.welcomeHint}</p>
          <div className="setup-art" aria-hidden="true">
            <div className="mini-paper">
              <b>Invoice</b>
              <div className="line short" />
              <div className="line" />
              <div className="line" />
              <div className="line" />
              <div className="line accent" />
            </div>
            <div className="mini-paper">
              <b>Quotation</b>
              <div className="line short" />
              <div className="line" />
              <div className="line" />
              <div className="line" />
              <div className="line accent" />
            </div>
          </div>
        </section>
        <form className="setup-form" onSubmit={save}>
          <div className="row spread">
            <span className="eyebrow">WELCOME TO LIYANNA</span>
            <select
              aria-label={t.appLanguage}
              style={{ width: 110, border: 0, fontSize: 11 }}
              value={value.language}
              onChange={(e) => patch({ language: e.target.value as Language })}
            >
              {languages.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <h2>{t.setup}</h2>
          {error && <ErrorBox message={error} />}
          <div className="stack">{fields}</div>
          <button
            className="btn primary"
            disabled={busy}
            style={{ marginTop: 25 }}
          >
            {t.createWorkspace}
            <ArrowRight size={15} />
          </button>
          <p className="privacy-note">
            <ShieldCheck size={12} /> {t.privacy}
            <br />
            {t.backupReminder}
          </p>
        </form>
      </div>
    );
  return (
    <form onSubmit={save}>
      {error && <ErrorBox message={error} />}
      <fieldset className="settings-layout form-fields" disabled={busy}>
        <div className="settings-main">
          <section className="panel stack">
            <h2>{t.details}</h2>
            {fields}
            <Field label={t.address}>
              <textarea
                value={value.address}
                onChange={(e) => patch({ address: e.target.value })}
              />
            </Field>
            <div className="grid2">
              <Field label={t.email}>
                <input
                  type="email"
                  value={value.email}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </Field>
              <Field label={t.phone}>
                <input
                  value={value.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                />
              </Field>
            </div>
            <LanguageSelect
              label={t.appLanguage}
              value={value.language}
              onChange={(language) => patch({ language })}
            />
          </section>
          <section className="panel">
            <h2>{t.paymentDetails}</h2>
            <Field label={t.paymentDetails}>
              <textarea
                value={value.paymentDetails}
                onChange={(e) => patch({ paymentDetails: e.target.value })}
                placeholder="Bank name, account number…"
              />
            </Field>
          </section>
          <div>
            <button className="btn primary" disabled={busy}>
              {t.save}
            </button>
          </div>
        </div>
        <aside className="settings-aside stack">
          <section className="panel logo-uploader">
            <h3>{t.logo}</h3>
            <div className="logo-box">
              {value.logo ? (
                <img src={value.logo} alt={value.name} />
              ) : (
                <span>
                  <ImagePlus size={24} />
                  <br />
                  {t.noLogo}
                </span>
              )}
            </div>
            <label className="btn">
              <Upload size={14} />
              {t.upload}
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    patch({ logo: await readLogo(f) });
                  } catch (err) {
                    setError((err as Error).message);
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <small>{t.logoHint}</small>
            {value.logo && (
              <button
                className="btn text"
                type="button"
                onClick={() => patch({ logo: "" })}
              >
                {t.removeLogo}
              </button>
            )}
          </section>
          <div className="notice">
            <ShieldCheck size={15} />
            {t.refreshHint}
          </div>
        </aside>
      </fieldset>
    </form>
  );
}
