import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, previewData, supabase } from "./lib";
import type { Dataset, Entry, Judge, Score } from "./types";
type State = "pending" | "saving" | "saved" | "error";
type Pending = { score: Score; revision: number; failures: number };
type Store = {
  ready: boolean;
  configured: boolean;
  previewAllowed: boolean;
  preview: boolean;
  judge: Judge | null;
  admin: boolean;
  entries: Entry[];
  scores: Score[];
  judges: Judge[];
  loading: boolean;
  error: string;
  states: Record<string, State>;
  loginJudge: (username: string, pin: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  startPreview: (role: "judge" | "admin") => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  stage: (score: Score) => void;
  getDraft: (id: string) => Score | undefined;
  flush: () => Promise<boolean>;
  updateJudge: (id: string, body: unknown) => Promise<void>;
  addJudge: (body: unknown) => Promise<void>;
  editEntry: (
    id: string,
    body: { title: string; participant_name: string },
  ) => Promise<void>;
};
const Context = createContext<Store | null>(null);
export const usePortal = () => {
  const value = useContext(Context);
  if (!value) throw new Error("Portal context missing");
  return value;
};
export function PortalProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false),
    [configured, setConfigured] = useState(false),
    [previewAllowed, setPreviewAllowed] = useState(false),
    [preview, setPreview] = useState(false);
  const [judge, setJudge] = useState<Judge | null>(null),
    [admin, setAdmin] = useState(false),
    [entries, setEntries] = useState<Entry[]>([]),
    [scores, setScores] = useState<Score[]>([]),
    [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [states, setStates] = useState<Record<string, State>>({});
  const pending = useRef(new Map<string, Pending>()),
    revision = useRef(0),
    busy = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const identity = useRef({
    preview: false,
    judge: null as Judge | null,
    admin: false,
  });
  identity.current = { preview, judge, admin };
  const draftKey = (id: string) => `uthsob:drafts:${id}`;
  function persist() {
    const who = identity.current;
    if (who.preview || !who.judge) return;
    try {
      if (pending.current.size)
        localStorage.setItem(
          draftKey(who.judge.id),
          JSON.stringify([...pending.current.values()].map((p) => p.score)),
        );
      else localStorage.removeItem(draftKey(who.judge.id));
    } catch {
      setError(
        "Draft recovery is unavailable on this browser. Keep this page open until your changes are saved.",
      );
    }
  }
  async function drain(): Promise<boolean> {
    if (busy.current) return false;
    busy.current = true;
    clearTimeout(timer.current);
    try {
      while (pending.current.size) {
        const [id, item] = pending.current.entries().next().value!;
        setStates((s) => ({ ...s, [id]: "saving" }));
        try {
          const who = identity.current;
          if (!who.judge)
            throw new ApiError("Please log in again to save your draft.", 401);
          const saved = who.preview
            ? { ...item.score, judge_id: who.judge.id }
            : (await api<{ score: Score }>("/judge/score", item.score, "PUT"))
                .score;
          if (pending.current.get(id)?.revision === item.revision) {
            pending.current.delete(id);
            setScores((list) => [
              ...list.filter((s) => s.entry_id !== id),
              saved,
            ]);
            setStates((s) => ({ ...s, [id]: "saved" }));
          }
          persist();
        } catch (e) {
          item.failures++;
          setStates((s) => ({ ...s, [id]: "error" }));
          const failure = e as ApiError;
          if (
            failure.status === 401 ||
            failure.status === 403 ||
            failure.status === 400
          ) {
            setError(failure.message);
            return false;
          }
          timer.current = setTimeout(
            () => void drain(),
            Math.min(30000, 1000 * 2 ** Math.min(item.failures, 5)),
          );
          return false;
        }
      }
      return true;
    } finally {
      busy.current = false;
    }
  }
  function stage(score: Score) {
    pending.current.set(score.entry_id, {
      score,
      revision: ++revision.current,
      failures: 0,
    });
    setStates((s) => ({ ...s, [score.entry_id]: "pending" }));
    persist();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void drain(), 450);
  }
  async function flush() {
    clearTimeout(timer.current);
    while (busy.current)
      await new Promise((resolve) => setTimeout(resolve, 50));
    return drain();
  }
  async function load(role: "judge" | "admin", isPreview = false) {
    setLoading(true);
    setError("");
    try {
      const data = isPreview
        ? await previewData()
        : await api<Dataset>(
            `/${role}/data`,
            undefined,
            "GET",
            role === "admin",
          );
      setEntries(data.entries);
      setScores(data.scores);
      setJudges(data.judges || []);
      if (role === "judge" && !isPreview && identity.current.judge) {
        let drafts: Score[] = [];
        try {
          drafts = JSON.parse(
            localStorage.getItem(draftKey(identity.current.judge.id)) || "[]",
          );
        } catch {}
        for (const draft of drafts)
          if (data.entries.some((e) => e.id === draft.entry_id)) stage(draft);
      }
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const config = await api<{ configured: boolean; preview: boolean }>(
          "/config",
        );
        if (!active) return;
        setConfigured(config.configured);
        setPreviewAllowed(config.preview);
        if (config.configured) {
          const isAdmin = window.location.pathname.startsWith("/admin");
          if (isAdmin) {
            try {
              await api("/admin/me", undefined, "GET", true);
              if (active) {
                setAdmin(true);
                identity.current.admin = true;
                await load("admin");
              }
            } catch (e) {
              if (!(e instanceof ApiError && [401, 403].includes(e.status)))
                throw e;
            }
          } else {
            try {
              const session = await api<{ judge: Judge }>("/judge/me");
              if (active) {
                setJudge(session.judge);
                identity.current.judge = session.judge;
                await load("judge");
              }
            } catch (e) {
              if (!(e instanceof ApiError && e.status === 401)) throw e;
            }
          }
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setReady(true);
      }
    })();
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current.size) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const online = () => void drain();
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("online", online);
    return () => {
      active = false;
      clearTimeout(timer.current);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("online", online);
    };
  }, []);
  useEffect(() => {
    if (preview || (!judge && !admin)) return;
    const interval = setInterval(
      () =>
        void api<Dataset>(
          admin ? "/admin/data" : "/judge/data",
          undefined,
          "GET",
          admin,
        )
          .then((data) => setEntries(data.entries))
          .catch((e) => setError(e.message)),
      45 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [judge, admin, preview]);
  async function loginJudge(username: string, pin: string) {
    const result = await api<{ judge: Judge }>(
      "/judge/login",
      { username, pin },
      "POST",
    );
    setPreview(false);
    setAdmin(false);
    setJudge(result.judge);
    identity.current = { preview: false, judge: result.judge, admin: false };
    await load("judge");
  }
  async function loginAdmin(email: string, password: string) {
    if (!supabase)
      throw new Error("The portal is awaiting its Supabase connection.");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      throw new Error("Unable to sign in. Check your email and password.");
    try {
      await api("/admin/me", undefined, "GET", true);
    } catch (e) {
      await supabase.auth.signOut();
      throw e;
    }
    setPreview(false);
    setJudge(null);
    setAdmin(true);
    identity.current = { preview: false, judge: null, admin: true };
    await load("admin");
  }
  async function startPreview(role: "judge" | "admin") {
    if (!previewAllowed)
      throw new Error("Preview is disabled. Sign in with your real account.");
    const who =
      role === "judge"
        ? {
            id: "preview-1",
            name: "Preview Judge",
            username: "preview",
            active: true,
          }
        : null;
    setPreview(true);
    setJudge(who);
    setAdmin(role === "admin");
    identity.current = { preview: true, judge: who, admin: role === "admin" };
    await load(role, true);
  }
  async function logout() {
    if (!(await flush()))
      throw new Error(
        "Your changes are still unsaved. Please retry before logging out.",
      );
    if (!preview) {
      if (judge) await api("/judge/logout", {}, "POST");
      if (admin) {
        const result = await supabase?.auth.signOut();
        if (result?.error) throw result.error;
      }
    }
    setJudge(null);
    setAdmin(false);
    setPreview(false);
    setEntries([]);
    setScores([]);
    setJudges([]);
    setStates({});
    setError("");
  }
  async function reload() {
    await load(admin ? "admin" : "judge", preview);
  }
  async function updateJudge(id: string, body: unknown) {
    if (preview)
      throw new Error(
        "Account management is available after Supabase is connected.",
      );
    const data = await api<{ judge: Judge }>(
      `/admin/judges/${id}`,
      body,
      "PATCH",
      true,
    );
    setJudges((list) => list.map((j) => (j.id === id ? data.judge : j)));
  }
  async function addJudge(body: unknown) {
    if (preview)
      throw new Error(
        "Account management is available after Supabase is connected.",
      );
    const data = await api<{ judge: Judge }>(
      "/admin/judges",
      body,
      "POST",
      true,
    );
    setJudges((list) => [...list, data.judge]);
  }
  async function editEntry(
    id: string,
    body: { title: string; participant_name: string },
  ) {
    if (preview)
      throw new Error(
        "Entry editing is available after Supabase is connected.",
      );
    await api(`/admin/entries/${id}`, body, "PATCH", true);
    setEntries((list) =>
      list.map((e) => (e.id === id ? { ...e, ...body } : e)),
    );
  }
  return (
    <Context.Provider
      value={{
        ready,
        configured,
        previewAllowed,
        preview,
        judge,
        admin,
        entries,
        scores,
        judges,
        loading,
        error,
        states,
        loginJudge,
        loginAdmin,
        startPreview,
        logout,
        reload,
        stage,
        getDraft: (id) => pending.current.get(id)?.score,
        flush,
        updateJudge,
        addJudge,
        editEntry,
      }}
    >
      {children}
    </Context.Provider>
  );
}
