"use client";
import { useEffect, useState, type ReactNode } from "react";
import { cloudClient } from "../cloud/client";
import { languages } from "../i18n";
import type { Language } from "../domain/model";

const words = {
  en: {
    title: "Set a new password",
    password: "New password",
    confirm: "Confirm password",
    save: "Save new password",
    mismatch: "Passwords do not match",
    short: "Use at least 8 characters",
    expired:
      "This recovery link is invalid or expired. Request a new reset email using Forgot password on the sign-in screen.",
    done: "Password updated. Sign in with your new password in your original Liyanna browser.",
    back: "Continue to Liyanna",
    checking: "Checking recovery link…",
  },
  si: {
    title: "නව මුරපදයක් සකසන්න",
    password: "නව මුරපදය",
    confirm: "මුරපදය තහවුරු කරන්න",
    save: "නව මුරපදය සුරකින්න",
    mismatch: "මුරපද නොගැළපේ",
    short: "අවම වශයෙන් අක්ෂර 8ක් භාවිතා කරන්න",
    expired:
      "මෙම ප්‍රතිසාධන සබැඳිය වලංගු නැත හෝ කල් ඉකුත් වී ඇත. පිවිසුම් තිරයේ මුරපදය අමතකද යන්නෙන් නව ඊමේල් පණිවිඩයක් ඉල්ලන්න.",
    done: "මුරපදය යාවත්කාලීන විය. මුල් Liyanna බ්‍රවුසරයේ නව මුරපදයෙන් පිවිසෙන්න.",
    back: "Liyanna වෙත යන්න",
    checking: "සබැඳිය පරීක්ෂා කරමින්…",
  },
  ta: {
    title: "புதிய கடவுச்சொல்லை அமைக்கவும்",
    password: "புதிய கடவுச்சொல்",
    confirm: "கடவுச்சொல்லை உறுதிப்படுத்தவும்",
    save: "புதிய கடவுச்சொல்லைச் சேமி",
    mismatch: "கடவுச்சொற்கள் பொருந்தவில்லை",
    short: "குறைந்தது 8 எழுத்துகளைப் பயன்படுத்தவும்",
    expired:
      "இந்த மீட்பு இணைப்பு செல்லாது அல்லது காலாவதியாகிவிட்டது. உள்நுழைவுத் திரையில் கடவுச்சொல் மறந்துவிட்டதா என்பதைப் பயன்படுத்தி புதிய மின்னஞ்சலைக் கோரவும்.",
    done: "கடவுச்சொல் புதுப்பிக்கப்பட்டது. உங்கள் அசல் Liyanna உலாவியில் புதிய கடவுச்சொல்லுடன் உள்நுழையவும்.",
    back: "Liyanna தொடரவும்",
    checking: "மீட்பு இணைப்பைச் சரிபார்க்கிறது…",
  },
};
const marker = "liyanna-password-recovery";
function remember(value: boolean) {
  try {
    if (value) sessionStorage.setItem(marker, "1");
    else sessionStorage.removeItem(marker);
  } catch {
    /* Recovery also works when session storage is unavailable. */
  }
}
export function AccountRecovery({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"checking" | "app" | "recovery">("checking");
  const [language, setLanguage] = useState<Language>("en");
  const [ready, setReady] = useState(false),
    [invalid, setInvalid] = useState(false),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false);
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState("");
  const t = words[language];
  useEffect(() => {
    const hash = new URLSearchParams(location.hash.slice(1));
    let remembered = false;
    try {
      remembered = sessionStorage.getItem(marker) === "1";
    } catch {}
    if (
      new URLSearchParams(location.search).get("account") !== "recovery" &&
      hash.get("type") !== "recovery" &&
      !remembered
    ) {
      setMode("app");
      return;
    }
    setMode("recovery");
    remember(true);
    if (hash.has("error")) {
      history.replaceState(null, "", "?account=recovery");
      setInvalid(true);
      return;
    }
    let alive = true;
    async function validate() {
      try {
        const { data, error } = await cloudClient().auth.getUser();
        if (alive) {
          if (error || !data.user) setInvalid(true);
          else setReady(true);
        }
      } catch {
        if (alive) setInvalid(true);
      }
    }
    void validate();
    return () => {
      alive = false;
    };
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t.short);
      return;
    }
    if (password !== confirm) {
      setError(t.mismatch);
      return;
    }
    setBusy(true);
    try {
      const result = await cloudClient().auth.updateUser({ password });
      if (result.error) throw result.error;
      setPassword("");
      setConfirm("");
      remember(false);
      setDone(true);
      // End this browser's recovery session without signing out other devices.
      await cloudClient().auth.signOut({ scope: "local" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (mode === "app") return children;
  if (mode === "checking")
    return (
      <div className="loading">
        <img src="/brand/liyanna.png" className="brand" alt="Liyanna" />
        Opening Liyanna…
      </div>
    );
  return (
    <main
      style={{ maxWidth: 480, margin: "10vh auto", padding: 28 }}
      lang={language}
    >
      <img src="/brand/liyanna.png" className="brand" alt="Liyanna" />
      <select
        aria-label="Language"
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        style={{ marginTop: 25 }}
      >
        {languages.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
      <h1 style={{ marginTop: 28 }}>{t.title}</h1>
      {invalid ? (
        <p role="alert">{t.expired}</p>
      ) : done ? (
        <p role="status">{t.done}</p>
      ) : ready ? (
        <form onSubmit={save} className="stack">
          <fieldset
            disabled={busy}
            style={{ border: 0, padding: 0 }}
            className="stack"
          >
            <label className="field">
              <span>{t.password}</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t.confirm}</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <button className="btn primary" type="submit">
              {t.save}
            </button>
          </fieldset>
        </form>
      ) : (
        <p>{t.checking}</p>
      )}
      {error && <p role="alert">{error}</p>}
      {(done || invalid) && (
        <a className="btn" href="/" onClick={() => remember(false)}>
          {t.back}
        </a>
      )}
    </main>
  );
}

