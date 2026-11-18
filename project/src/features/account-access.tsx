"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { cloudClient, cloudConfigured } from "../cloud/client";
import { languages } from "../i18n";
import type { Language } from "../domain/model";
import { accessCopy } from "./access-copy";
import { Field, ErrorBox } from "./components";
export function AccountAccess({
  children,
}: {
  children: (user: User, signOut: () => Promise<void>) => ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null),
    [checking, setChecking] = useState(true),
    [language, setLanguage] = useState<Language>("en"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const epoch = useRef(0),
    current = useRef<User | null>(null),
    alive = useRef(true);
  const t = accessCopy(language);
  const validate = useCallback(
    async (suspend = false) => {
      const token = ++epoch.current;
      if (suspend) setChecking(true);
      try {
        if (!cloudConfigured) throw Error("Cloud not connected");
        const result = await cloudClient().auth.getUser();
        const latestSession = await cloudClient().auth.getSession();
        if (!alive.current || token !== epoch.current) return;
        const next =
          result.error ||
          latestSession.data.session?.user.id !== result.data.user?.id
            ? null
            : result.data.user;
        current.current = next;
        setUser((previous) => (previous?.id === next?.id ? previous : next));
        if (result.error && result.error.name !== "AuthSessionMissingError")
          setError(accessCopy(language).verifyError);
      } catch {
        if (alive.current && token === epoch.current) {
          current.current = null;
          setUser(null);
          setError(accessCopy(language).verifyError);
        }
      } finally {
        if (alive.current && token === epoch.current) setChecking(false);
      }
    },
    [language],
  );
  useEffect(() => {
    alive.current = true;
    void validate(true);
    if (!cloudConfigured)
      return () => {
        alive.current = false;
        epoch.current++;
      };
    const { data } = cloudClient().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        epoch.current++;
        current.current = null;
        setUser(null);
        setChecking(false);
        setPassword("");
        return;
      }
      if (event === "INITIAL_SESSION") return;
      if (current.current?.id !== session?.user.id) {
        epoch.current++;
        current.current = null;
        setUser(null);
        setChecking(true);
      }
      setTimeout(() => {
        if (alive.current) void validate();
      }, 0);
    });
    const check = () => void validate();
    const timer = setInterval(check, 60000);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    return () => {
      alive.current = false;
      epoch.current++;
      data.subscription.unsubscribe();
      clearInterval(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
    };
  }, [validate]);
  const signOut = useCallback(async () => {
    const result = await cloudClient().auth.signOut({ scope: "local" });
    if (result.error) throw result.error;
    epoch.current++;
    current.current = null;
    setUser(null);
    setChecking(false);
  }, []);
  if (checking)
    return (
      <div className="loading">
        <img className="brand" src="/brand/liyanna.png" alt="Liyanna" />
        {t.checking}
      </div>
    );
  if (user) return children(user, signOut);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await cloudClient().auth.signInWithPassword({
        email,
        password,
      });
      if (result.error) throw result.error;
      setPassword("");
      await validate(true);
    } catch (e) {
      setError((e as Error).message);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await cloudClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/?account=recovery`,
      });
      if (result.error) throw result.error;
      setMessage(t.sent);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="access-page" lang={language}>
      <div className="access-card">
        <img className="brand" src="/brand/liyanna.png" alt="Liyanna" />
        <label className="field">
          <span>{t.language}</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            {languages.map((l) => (
              <option value={l.value} key={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <h1>{t.title}</h1>
        <p>{t.hint}</p>
        {error && <ErrorBox message={error} />}
        {message && <p role="status">{message}</p>}
        <form className="stack" onSubmit={submit}>
          <Field label={t.email}>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={t.password}>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <button className="btn primary" disabled={busy || !cloudConfigured}>
            {t.signIn}
          </button>
          <button
            className="btn text"
            type="button"
            disabled={busy || !email || !cloudConfigured}
            onClick={() => void reset()}
          >
            {t.forgot}
          </button>
          {error && (
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={() => void validate(true)}
            >
              {t.retry}
            </button>
          )}
        </form>
        <p className="muted">{t.localHint}</p>
      </div>
    </main>
  );
}
