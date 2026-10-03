import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Aperture,
  LayoutDashboard,
  Smartphone,
  Camera,
  Images,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Check,
  LoaderCircle,
  Search,
  Download,
  Users,
  ListChecks,
  X,
  RefreshCw,
  LockKeyhole,
  Plus,
  Pencil,
  AlertCircle,
} from "lucide-react";
import { usePortal } from "./store";
import { average, completed, downloadCsv } from "./lib";
import { categories, type Category, type Entry, type Score } from "./types";

const categoryIcon = { mobile: Smartphone, device: Camera, story: Images };
const percentage = (count: number, total: number) =>
  total ? Math.round((count / total) * 100) : 0;
function Progress({ count, total }: { count: number; total: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={count}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label="Judging progress"
    >
      <span style={{ width: `${percentage(count, total)}%` }} />
    </div>
  );
}
function Brand() {
  return (
    <Link
      to="/"
      className="brand"
      aria-label="Lens-e Uthsob judging portal home"
    >
      <img className="brand-logo" src="/2.0-logo.png" alt="Lens-e Uthsob 2.0" />
      <span className="brand-title">
        Lens-e Uthsob<span className="brand-sub">2.0 · JUDGING PORTAL</span>
      </span>
    </Link>
  );
}
function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={18} />
      <span>{children}</span>
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Login({ admin = false }: { admin?: boolean }) {
  const p = usePortal(),
    navigate = useNavigate();
  const [username, setUsername] = useState(""),
    [secret, setSecret] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (admin ? p.admin : !!p.judge)
    return <Navigate to={admin ? "/admin" : "/judge/dashboard"} replace />;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (admin) await p.loginAdmin(username, secret);
      else await p.loginJudge(username, secret);
      navigate(admin ? "/admin" : "/judge/dashboard");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function preview() {
    setBusy(true);
    setError("");
    try {
      await p.startPreview(admin ? "admin" : "judge");
      navigate(admin ? "/admin" : "/judge/dashboard");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <header>
        <Brand />
        <span className="muted">Photography · Perspective · Stories</span>
      </header>
      <main className="login-content">
        <div className="login-intro">
          <img
            className="festival-logo"
            src="/2.0-logo.png"
            alt="Lens-e Uthsob 2.0 festival logo"
          />
          <span className="eyebrow">PHOTOGRAPHY JUDGING PORTAL</span>
          <h1>
            Lens-e Uthsob <span className="edition">2.0</span>
          </h1>
          <p>East Delta University Photography Club</p>
          <div className="login-note">
            <Aperture size={20} />
            <span>The judging room is yours.</span>
          </div>
        </div>
        <section className="login-card">
          <span className="small-icon">
            <LockKeyhole size={22} />
          </span>
          <h2>{admin ? "Admin sign in" : "Welcome, judge."}</h2>
          <p className="muted">
            {admin
              ? "Sign in to manage judging and review results."
              : "Sign in to continue where you left off."}
          </p>
          <form onSubmit={submit}>
            <label htmlFor="username">
              {admin ? "Email address" : "Username or email"}
            </label>
            <input
              id="username"
              type={admin ? "email" : "text"}
              autoComplete={admin ? "email" : "username"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={admin ? "you@example.com" : "Your username or email"}
              required
              disabled={!p.configured}
            />
            <label htmlFor="secret">{admin ? "Password" : "4-digit PIN"}</label>
            <input
              id="secret"
              type="password"
              inputMode={admin ? undefined : "numeric"}
              pattern={admin ? undefined : "[0-9]{4}"}
              minLength={admin ? undefined : 4}
              maxLength={admin ? undefined : 4}
              autoComplete="current-password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={admin ? "Your password" : "••••"}
              required
              disabled={!p.configured}
            />
            {error && <ErrorBox>{error}</ErrorBox>}
            {p.error && <ErrorBox>{p.error}</ErrorBox>}
            <button className="primary full" disabled={busy || !p.configured}>
              {busy ? <LoaderCircle className="spin" size={18} /> : "Sign in"}
            </button>
          </form>
          {!p.configured && (
            <div className="connection-note">
              Live judging will be available once the portal is connected.
            </div>
          )}
          {p.previewAllowed && (
            <button
              className="secondary full"
              onClick={preview}
              disabled={busy}
            >
              Explore {admin ? "admin" : "judge"} preview
            </button>
          )}
          <div className="login-switch">
            <Link to={admin ? "/judge/login" : "/admin/login"}>
              {admin ? "Judge sign in" : "Administrator sign in"}
            </Link>
          </div>
        </section>
      </main>
      <footer>
        Lens-e Uthsob 2.0 <span>Photography Judging Portal</span>
      </footer>
    </div>
  );
}
function Shell({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const p = usePortal(),
    navigate = useNavigate(),
    [error, setError] = useState("");
  const total = p.entries.length,
    count = p.scores.filter((s) => s.score !== null).length;
  async function logout() {
    try {
      await p.logout();
      navigate(admin ? "/admin/login" : "/judge/login");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <span className="nav-label">
          {admin ? "ADMINISTRATION" : "YOUR WORKSPACE"}
        </span>
        <nav>
          {admin ? (
            <>
              <NavLink to="/admin" end>
                <LayoutDashboard size={19} />
                Overview
              </NavLink>
              <NavLink to="/admin/results">
                <ListChecks size={19} />
                Results
              </NavLink>
              <NavLink to="/admin/entries">
                <Images size={19} />
                Entries
              </NavLink>
              <NavLink to="/admin/judges">
                <Users size={19} />
                Judges
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/judge/dashboard">
                <LayoutDashboard size={19} />
                Dashboard
              </NavLink>
              <span className="nav-label category-label">CATEGORIES</span>
              {categories.map((c) => {
                const Icon = categoryIcon[c.id];
                return (
                  <NavLink key={c.id} to={`/judge/${c.id}`}>
                    <Icon size={19} />
                    {c.name}
                    <span className="nav-count">
                      {p.entries.filter((e) => e.category === c.id).length}
                    </span>
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>
        {!admin && (
          <div className="sidebar-progress">
            <div>
              <span>Overall progress</span>
              <span>{percentage(count, total)}%</span>
            </div>
            <Progress count={count} total={total} />
            <p>
              {count} of {total} entries judged
            </p>
          </div>
        )}
        <div className="sidebar-user">
          <div className="avatar">{admin ? "A" : p.judge?.name[0]}</div>
          <div>
            <strong>{admin ? "Administrator" : p.judge?.name}</strong>
            <span>{admin ? "Event management" : "Jury member"}</span>
          </div>
          <button className="icon-button" onClick={logout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="main-column">
        {p.preview && (
          <div className="preview-banner">
            Local preview · Changes are for trying the interface and reset when
            you leave.
          </div>
        )}
        {(p.error || error) && (
          <div className="global-error">
            <ErrorBox>{error || p.error}</ErrorBox>
            <button
              className="secondary"
              onClick={() => void p.reload().catch(() => {})}
            >
              Retry
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
function JudgeDashboard() {
  const p = usePortal(),
    total = p.entries.length,
    count = p.scores.filter((s) => s.score !== null).length;
  return (
    <Shell>
      <header className="page-header">
        <div>
          <span className="eyebrow">THE JUDGING ROOM</span>
          <h1>Welcome, {p.judge?.name.split(" ")[0]}.</h1>
          <p>
            Your perspective makes the difference. Pick a category to continue.
          </p>
        </div>
        <span className="event-badge">
          <Aperture size={16} />
          Lens-e Uthsob 2.0
        </span>
      </header>
      <main className="page-content">
        <section className="overall-card">
          <div>
            <span className="eyebrow">YOUR JUDGING PROGRESS</span>
            <h2>
              {count}
              <span> / {total} entries</span>
            </h2>
            <p>
              {total - count
                ? `${total - count} entries waiting for your perspective.`
                : "All entries judged. You can still review and edit your scores."}
            </p>
            <Progress count={count} total={total} />
          </div>
          <div
            className="progress-ring"
            style={{
              background: `conic-gradient(var(--accent) ${percentage(count, total) * 3.6}deg, var(--line) 0deg)`,
            }}
          >
            <div>
              <strong>
                {percentage(count, total)}
                <small>%</small>
              </strong>
              <span>COMPLETE</span>
            </div>
          </div>
        </section>
        <div className="section-heading">
          <h2>Choose a category</h2>
          <span>3 categories · {total} entries</span>
        </div>
        <section className="category-grid">
          {categories.map((c) => {
            const list = p.entries.filter((e) => e.category === c.id),
              done = completed(p.scores, new Set(list.map((e) => e.id))),
              Icon = categoryIcon[c.id],
              photo = list.find((e) => e.image_url || e.story_images.length);
            return (
              <article className="category-card" key={c.id}>
                <div className="category-cover">
                  {photo && (
                    <img
                      src={photo.image_url || photo.story_images[0]?.image_url}
                      alt=""
                    />
                  )}
                  <span className="cover-badge">
                    <Icon size={16} />
                    {c.name}
                  </span>
                  <span className="cover-count">
                    {list.length} {c.id === "story" ? "stories" : "photographs"}
                  </span>
                </div>
                <div className="category-body">
                  <h3>{c.name}</h3>
                  <p>{c.description}</p>
                  <div className="category-progress">
                    <span>
                      <strong>{done}</strong> / {list.length} completed
                    </span>
                    <span>{percentage(done, list.length)}%</span>
                  </div>
                  <Progress count={done} total={list.length} />
                  <Link className="secondary full" to={`/judge/${c.id}`}>
                    {done === list.length
                      ? "Review scores"
                      : "Continue judging"}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
        <div className="dashboard-note">
          <Check size={19} />
          <div>
            <strong>
              {p.preview
                ? "Try the judging experience"
                : "Your work is saved as you go."}
            </strong>
            <p>
              {p.preview
                ? "Preview changes stay in memory only. Live scores will be saved to your account."
                : "Scores and remarks save automatically. You can leave and return whenever you need."}
            </p>
          </div>
        </div>
      </main>
    </Shell>
  );
}
function PhotoView({
  src,
  title,
  onExpand,
}: {
  src: string;
  title: string;
  onExpand: () => void;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading"),
    [attempt, setAttempt] = useState(0);
  return (
    <div className={`photo-view ${state}`}>
      {state === "loading" && (
        <div className="photo-placeholder">
          <LoaderCircle className="spin" />
          <span>Loading photograph…</span>
        </div>
      )}
      {state === "error" && (
        <div className="photo-placeholder">
          <AlertCircle />
          <span>Photograph could not be loaded.</span>
          <button
            className="secondary"
            onClick={() => {
              setState("loading");
              setAttempt((a) => a + 1);
            }}
          >
            Retry image
          </button>
        </div>
      )}
      <img
        key={`${src}:${attempt}`}
        src={src}
        alt={title}
        onLoad={() => setState("ready")}
        onError={() => setState("error")}
        onClick={onExpand}
      />
      {state === "ready" && (
        <button
          className="expand-button"
          onClick={onExpand}
          aria-label="View large photograph"
        >
          <Maximize2 size={18} />
          <span>View larger</span>
        </button>
      )}
    </div>
  );
}
function Review() {
  const p = usePortal(),
    { category } = useParams(),
    [index, setIndex] = useState(0),
    lastCategory = useRef("");
  const list = p.entries
    .filter((e) => e.category === category)
    .sort((a, b) =>
      a.serial.localeCompare(b.serial, undefined, { numeric: true }),
    );
  const valid = categories.some((c) => c.id === category);
  useEffect(() => {
    if (lastCategory.current !== category && list.length) {
      const first = list.findIndex(
        (e) => !p.scores.some((s) => s.entry_id === e.id && s.score !== null),
      );
      setIndex(first < 0 ? 0 : first);
      lastCategory.current = category || "";
    }
  }, [category, list.length]);
  const entry = list[Math.min(index, list.length - 1)];
  useEffect(() => {
    const next = list[index + 1];
    if (next) {
      const url = next.image_url || next.story_images[0]?.image_url;
      if (url) {
        const img = new Image();
        img.src = url;
      }
    }
  }, [index, category]);
  if (!valid) return <Navigate to="/judge/dashboard" replace />;
  return (
    <Shell>
      {!entry ? (
        <div className="empty-state">
          <Images size={38} />
          <h1>{p.loading ? "Loading entries…" : "No entries yet"}</h1>
          <p>This category will appear when its photographs are added.</p>
          <Link className="secondary" to="/judge/dashboard">
            Back to dashboard
          </Link>
        </div>
      ) : (
        <ReviewEntry
          key={entry.id}
          entry={entry}
          index={index}
          total={list.length}
          move={(next) =>
            setIndex(Math.max(0, Math.min(list.length - 1, next)))
          }
        />
      )}
    </Shell>
  );
}
function ReviewEntry({
  entry,
  index,
  total,
  move,
}: {
  entry: Entry;
  index: number;
  total: number;
  move: (index: number) => void;
}) {
  const p = usePortal(),
    initial =
      p.getDraft(entry.id) || p.scores.find((s) => s.entry_id === entry.id);
  const [score, setScore] = useState(
      initial?.score == null ? "" : String(initial.score),
    ),
    [remark, setRemark] = useState(initial?.remark || ""),
    [expanded, setExpanded] = useState<{ src: string; title: string } | null>(
      null,
    );
  const valid =
    score === "" ||
    (/^\d+(?:\.\d{1,2})?$/.test(score) &&
      Number(score) >= 0 &&
      Number(score) <= 10);
  function change(nextScore: string, nextRemark: string) {
    setScore(nextScore);
    setRemark(nextRemark);
    if (
      nextScore === "" ||
      (/^\d+(?:\.\d{1,2})?$/.test(nextScore) &&
        Number(nextScore) >= 0 &&
        Number(nextScore) <= 10)
    )
      p.stage({
        entry_id: entry.id,
        score: nextScore === "" ? null : Number(nextScore),
        remark: nextRemark,
      });
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (expanded) return;
      const target = event.target as HTMLElement;
      if (target.closest("input,textarea,select,button,[contenteditable]"))
        return;
      if (valid && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        move(index + (event.key === "ArrowLeft" ? -1 : 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, valid, expanded]);
  const state = p.states[entry.id],
    saved = p.scores.some((s) => s.entry_id === entry.id && s.score !== null);
  const count = completed(
    p.scores,
    new Set(
      p.entries.filter((e) => e.category === entry.category).map((e) => e.id),
    ),
  );
  const hasImages =
    entry.category === "story"
      ? entry.story_images.length > 0
      : !!entry.image_url;
  return (
    <>
      <header className="review-header">
        <Link to="/judge/dashboard" className="back-link">
          <ChevronLeft size={18} />
          Dashboard
        </Link>
        <div>
          <span className="category-pill">
            {categories.find((c) => c.id === entry.category)?.name}
          </span>
          <span className="muted">
            {entry.category === "story" ? "Story" : "Photo"} {index + 1} of{" "}
            {total}
          </span>
        </div>
        <span className="review-completed">
          <Check size={16} />
          {count} / {total} completed
        </span>
      </header>
      <main className="review-workspace">
        <section className="image-panel">
          <div className="entry-heading">
            <span className="serial">{entry.serial}</span>
            <h1>{entry.title}</h1>
            <p>{entry.participant_name}</p>
          </div>
          {!hasImages ? (
            <div className="missing-photo">
              <Images size={38} />
              <h2>Photographs not yet available</h2>
              <p>
                This entry is awaiting its images. Please continue to the next
                entry.
              </p>
            </div>
          ) : entry.category === "story" ? (
            <div className="story-grid">
              {entry.story_images.map((image, i) => (
                <div className="story-frame" key={image.id}>
                  <PhotoView
                    src={image.image_url}
                    title={`${entry.title} — image ${i + 1}`}
                    onExpand={() =>
                      setExpanded({
                        src: image.original_url || image.image_url,
                        title: `${entry.serial} · Photograph ${i + 1}`,
                      })
                    }
                  />
                  <span>{String(i + 1).padStart(2, "0")}</span>
                </div>
              ))}
            </div>
          ) : (
            <PhotoView
              src={entry.image_url!}
              title={entry.title}
              onExpand={() =>
                setExpanded({
                  src: entry.original_url || entry.image_url!,
                  title: `${entry.serial} · ${entry.title}`,
                })
              }
            />
          )}
          <div className="image-caption">
            <span>
              {entry.category === "story"
                ? `${entry.story_images.length} photographs · Score the story as one complete entry`
                : "Take a closer look. Click the photograph to enlarge."}
            </span>
            <span>{saved ? "Judged" : "Not yet judged"}</span>
          </div>
        </section>
        <aside className="scoring-panel">
          <div className="scoring-heading">
            <span className="eyebrow">YOUR PERSPECTIVE</span>
            <h2>
              {entry.category === "story"
                ? "Score this story"
                : "Score this photograph"}
            </h2>
          </div>
          <label htmlFor="score">
            Score <span>out of 10</span>
          </label>
          <div className={`score-input ${!valid ? "invalid" : ""}`}>
            <input
              id="score"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={score}
              placeholder="—"
              aria-invalid={!valid}
              aria-describedby="score-help"
              disabled={!hasImages}
              onChange={(e) => change(e.target.value, remark)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && valid) {
                  e.preventDefault();
                  move(index + 1);
                }
              }}
            />
            <span>/ 10</span>
          </div>
          <p className={!valid ? "field-error" : "input-help"} id="score-help">
            {!valid
              ? "Enter 0–10 with up to two decimal places."
              : "Decimals are welcome, e.g. 8.5 or 9.25."}
          </p>
          <label htmlFor="remark" className="remark-label">
            Remarks <span>optional</span>
          </label>
          <textarea
            id="remark"
            value={remark}
            maxLength={5000}
            rows={6}
            placeholder="What stands out to you?"
            disabled={!hasImages}
            onChange={(e) => change(score, e.target.value)}
          />
          <div
            className={`save-status ${state === "error" ? "failed" : ""}`}
            role="status"
          >
            {state === "saving" || state === "pending" ? (
              <>
                <LoaderCircle className="spin" size={16} />
                Saving…
              </>
            ) : state === "error" ? (
              <>
                <AlertCircle size={16} />
                Save failed — retrying{" "}
                <button onClick={() => void p.flush()}>Retry now</button>
              </>
            ) : state === "saved" ? (
              <>
                <Check size={16} />
                {p.preview ? "Preview change recorded" : "Saved"}
              </>
            ) : (
              <>
                <LockKeyhole size={15} />
                {p.preview
                  ? "Preview only"
                  : "Only you and the admin can see your score"}
              </>
            )}
          </div>
          <div className="score-navigation">
            <button
              className="secondary"
              disabled={index === 0 || !valid}
              onClick={() => move(index - 1)}
            >
              <ChevronLeft size={17} />
              Previous
            </button>
            <button
              className="primary"
              disabled={index === total - 1 || !valid}
              onClick={() => move(index + 1)}
            >
              Next
              <ChevronRight size={17} />
            </button>
          </div>
          {index === total - 1 && (
            <Link className="secondary full" to="/judge/dashboard">
              Back to dashboard
            </Link>
          )}
          <div className="keyboard-help">
            <span>
              <kbd>←</kbd>
              <kbd>→</kbd> Navigate
            </span>
            <span>
              <kbd>Enter</kbd> Next photo
            </span>
          </div>
        </aside>
      </main>
      {expanded && (
        <Modal wide title={expanded.title} onClose={() => setExpanded(null)}>
          <div className="full-image">
            <img src={expanded.src} alt={expanded.title} />
          </div>
        </Modal>
      )}
    </>
  );
}
function AdminOverview() {
  const p = usePortal(),
    expected = p.entries.length * p.judges.length,
    count = p.scores.filter((s) => s.score !== null).length;
  return (
    <Shell admin>
      <header className="page-header">
        <div>
          <span className="eyebrow">EVENT OVERVIEW</span>
          <h1>The bigger picture.</h1>
          <p>Follow judging progress across every category.</p>
        </div>
        <button
          className="secondary"
          onClick={() => void p.reload().catch(() => {})}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>
      <main className="page-content">
        <section className="stats-grid">
          <div className="stat-card">
            <Images />
            <span>Competition entries</span>
            <strong>{p.entries.length}</strong>
            <small>Across 3 categories</small>
          </div>
          <div className="stat-card">
            <Users />
            <span>Judges</span>
            <strong>{p.judges.length}</strong>
            <small>
              {p.judges.filter((j) => j.active).length} active accounts
            </small>
          </div>
          <div className="stat-card">
            <ListChecks />
            <span>Scores submitted</span>
            <strong>
              {count}
              <em> / {expected}</em>
            </strong>
            <small>
              {percentage(count, expected)}% of all judging complete
            </small>
          </div>
        </section>
        <div className="section-heading">
          <h2>Judge progress</h2>
          <Link to="/admin/judges">Manage judges</Link>
        </div>
        <section className="panel judge-progress-list">
          {p.judges.map((j) => {
            const scores = p.scores.filter((s) => s.judge_id === j.id),
              done = scores.filter((s) => s.score !== null).length;
            return (
              <div className="judge-progress-row" key={j.id}>
                <div className="judge-name">
                  <span className="avatar">{j.name[0]}</span>
                  <div>
                    <strong>{j.name}</strong>
                    <span>{j.active ? "Active" : "Disabled"}</span>
                  </div>
                </div>
                <div className="judge-category-counts">
                  {categories.map((c) => {
                    const ids = new Set(
                      p.entries
                        .filter((e) => e.category === c.id)
                        .map((e) => e.id),
                    );
                    return (
                      <div key={c.id}>
                        <span>{c.name}</span>
                        <strong>
                          {completed(scores, ids)} <small>/ {ids.size}</small>
                        </strong>
                      </div>
                    );
                  })}
                </div>
                <div className="judge-total">
                  <div>
                    <strong>
                      {done} / {p.entries.length}
                    </strong>
                    <span>{percentage(done, p.entries.length)}%</span>
                  </div>
                  <Progress count={done} total={p.entries.length} />
                </div>
              </div>
            );
          })}
        </section>
        <div className="section-heading">
          <h2>Categories</h2>
          <Link to="/admin/results">View all results</Link>
        </div>
        <section className="stats-grid">
          {categories.map((c) => {
            const Icon = categoryIcon[c.id];
            return (
              <Link
                className="stat-card category-stat"
                key={c.id}
                to={`/admin/results?category=${c.id}`}
              >
                <Icon />
                <span>{c.name}</span>
                <strong>
                  {p.entries.filter((e) => e.category === c.id).length}
                </strong>
                <small>{c.id === "story" ? "Stories" : "Photographs"}</small>
              </Link>
            );
          })}
        </section>
      </main>
    </Shell>
  );
}
function AdminResults({ entriesOnly = false }: { entriesOnly?: boolean }) {
  const p = usePortal();
  const [category, setCategory] = useState(
      new URLSearchParams(window.location.search).get("category") || "all",
    ),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("serial"),
    [incomplete, setIncomplete] = useState(false),
    [selected, setSelected] = useState<Entry | null>(null),
    [editing, setEditing] = useState<Entry | null>(null);
  const filtered = p.entries
    .filter(
      (e) =>
        (category === "all" || e.category === category) &&
        `${e.serial} ${e.participant_name} ${e.title}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!incomplete ||
          p.scores.filter((s) => s.entry_id === e.id && s.score !== null)
            .length < p.judges.length),
    )
    .sort((a, b) =>
      sort === "average"
        ? (average(p.scores.filter((s) => s.entry_id === b.id)) ?? -1) -
            (average(p.scores.filter((s) => s.entry_id === a.id)) ?? -1) ||
          a.serial.localeCompare(b.serial)
        : a.serial.localeCompare(b.serial, undefined, { numeric: true }),
    );
  function exportResults() {
    downloadCsv("lens-e-uthsob-results.csv", [
      [
        "Serial",
        "Participant Name",
        "Photo Title",
        "Category",
        ...p.judges.flatMap((j) => [`${j.name} — Score`, `${j.name} — Remark`]),
        "Average Score",
        "Scores Submitted",
        "Scores Expected",
        "Status",
      ],
      ...filtered.map((e) => {
        const scores = p.scores.filter((s) => s.entry_id === e.id),
          done = scores.filter((s) => s.score !== null).length;
        return [
          e.serial,
          e.participant_name,
          e.title,
          e.category,
          ...p.judges.flatMap((j) => {
            const s = scores.find((s) => s.judge_id === j.id);
            return [s?.score, s?.remark];
          }),
          average(scores)?.toFixed(2),
          done,
          p.judges.length,
          done === p.judges.length ? "Complete" : "Incomplete",
        ];
      }),
    ]);
  }
  return (
    <Shell admin>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            {entriesOnly ? "COMPETITION LIBRARY" : "JUDGING RESULTS"}
          </span>
          <h1>
            {entriesOnly
              ? "Every entry, in one place."
              : "The scores behind the stories."}
          </h1>
          <p>
            {entriesOnly
              ? "Review entry information and photographs."
              : "Averages use submitted scores. Incomplete results are marked."}
          </p>
        </div>
        {!entriesOnly && (
          <button className="primary" onClick={exportResults}>
            <Download size={17} />
            Export CSV
          </button>
        )}
      </header>
      <main className="page-content">
        <div className="table-toolbar">
          <div className="category-tabs">
            {[{ id: "all", name: "All entries" }, ...categories].map((c) => (
              <button
                key={c.id}
                className={category === c.id ? "active" : ""}
                onClick={() => setCategory(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="table-controls">
            <div className="search-input">
              <Search size={17} />
              <input
                aria-label="Search entries"
                placeholder="Search name, title, serial…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {!entriesOnly && (
              <>
                <select
                  aria-label="Sort results"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="serial">Serial order</option>
                  <option value="average">Highest average</option>
                </select>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={incomplete}
                    onChange={(e) => setIncomplete(e.target.checked)}
                  />
                  Incomplete only
                </label>
              </>
            )}
          </div>
        </div>
        <div className="panel table-panel">
          <div className="table-summary">
            <span>{filtered.length} entries</span>
            {!entriesOnly && (
              <span>{p.judges.length} judges · Scores out of 10</span>
            )}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Serial</th>
                  <th>Participant & title</th>
                  <th>Category</th>
                  {!entriesOnly && (
                    <>
                      {p.judges.map((j, i) => (
                        <th className="number" key={j.id} title={j.name}>
                          J{i + 1}
                        </th>
                      ))}
                      <th className="number">Average</th>
                      <th>Status</th>
                    </>
                  )}
                  <th>{entriesOnly ? "Edit" : "Remarks"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const scores = p.scores.filter((s) => s.entry_id === e.id),
                    done = scores.filter((s) => s.score !== null).length;
                  return (
                    <tr key={e.id}>
                      <td>
                        <button
                          className="serial table-link"
                          onClick={() => setSelected(e)}
                        >
                          {e.serial}
                        </button>
                      </td>
                      <td className="entry-cell">
                        <strong>{e.participant_name}</strong>
                        <span>{e.title}</span>
                      </td>
                      <td>
                        <span className="table-category">
                          {categories.find((c) => c.id === e.category)?.name}
                        </span>
                      </td>
                      {!entriesOnly && (
                        <>
                          {p.judges.map((j) => (
                            <td className="number" key={j.id}>
                              {scores.find((s) => s.judge_id === j.id)
                                ?.score ?? (
                                <span className="missing-score">—</span>
                              )}
                            </td>
                          ))}
                          <td className="number average">
                            {average(scores)?.toFixed(2) ?? "—"}
                          </td>
                          <td>
                            <span
                              className={`status-badge ${done === p.judges.length && done > 0 ? "complete" : "incomplete"}`}
                            >
                              {done === p.judges.length && done > 0
                                ? "Complete"
                                : `${done}/${p.judges.length} scored`}
                            </span>
                          </td>
                        </>
                      )}
                      <td>
                        <button
                          className="icon-button"
                          aria-label={
                            entriesOnly
                              ? `Edit ${e.serial}`
                              : `View remarks for ${e.serial}`
                          }
                          onClick={() =>
                            entriesOnly ? setEditing(e) : setSelected(e)
                          }
                        >
                          {entriesOnly ? (
                            <Pencil size={16} />
                          ) : (
                            <ListChecks size={17} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <div className="empty-state">
              <Search />
              <h2>No matching entries</h2>
              <p>Try another search or category.</p>
            </div>
          )}
        </div>
        {!entriesOnly && (
          <p className="table-footnote">
            {p.judges.map((j, i) => `J${i + 1}: ${j.name}`).join(" · ")}
          </p>
        )}
      </main>
      {selected && (
        <Modal
          wide
          title={`${selected.serial} · ${selected.title}`}
          onClose={() => setSelected(null)}
        >
          <div className="entry-detail">
            <p className="muted">{selected.participant_name}</p>
            {selected.image_url ? (
              <PhotoView
                src={selected.image_url}
                title={selected.title}
                onExpand={() => {}}
              />
            ) : (
              <div className="detail-story">
                {selected.story_images.map((i) => (
                  <img
                    key={i.id}
                    src={i.image_url}
                    alt={`Photograph ${i.image_order}`}
                    loading="lazy"
                  />
                ))}
              </div>
            )}
            <h3>Judge scores & remarks</h3>
            {p.judges.map((j) => {
              const score = p.scores.find(
                (s) => s.entry_id === selected.id && s.judge_id === j.id,
              );
              return (
                <div className="remark-row" key={j.id}>
                  <div>
                    <strong>{j.name}</strong>
                    <span>
                      {score?.score == null
                        ? "Not scored"
                        : `${score.score} / 10`}
                    </span>
                  </div>
                  <p>{score?.remark || "No remark"}</p>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
      {editing && (
        <EntryEdit entry={editing} onClose={() => setEditing(null)} />
      )}
    </Shell>
  );
}
function EntryEdit({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const p = usePortal(),
    [name, setName] = useState(entry.participant_name),
    [title, setTitle] = useState(entry.title),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await p.editEntry(entry.id, { participant_name: name, title });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Edit ${entry.serial}`} onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <label htmlFor="edit-name">Participant name</label>
        <input
          id="edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={150}
        />
        <label htmlFor="edit-title">Title</label>
        <textarea
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={2000}
          rows={4}
        />
        {error && <ErrorBox>{error}</ErrorBox>}
        <button className="primary full" disabled={busy}>
          Save changes
        </button>
      </form>
    </Modal>
  );
}
function AdminJudges() {
  const p = usePortal(),
    [adding, setAdding] = useState(false),
    [reset, setReset] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState<string | null>(null);
  async function toggle(id: string, active: boolean) {
    setBusy(id);
    setError("");
    try {
      await p.updateJudge(id, { active });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <Shell admin>
      <header className="page-header">
        <div>
          <span className="eyebrow">THE JURY</span>
          <h1>Meet the perspectives.</h1>
          <p>Manage judge access and monitor completion.</p>
        </div>
        <button className="primary" onClick={() => setAdding(true)}>
          <Plus size={17} />
          Add judge
        </button>
      </header>
      <main className="page-content">
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="judge-grid">
          {p.judges.map((j) => {
            const done = p.scores.filter(
              (s) => s.judge_id === j.id && s.score !== null,
            ).length;
            return (
              <article className="panel judge-card" key={j.id}>
                <div className="judge-card-top">
                  <span className="avatar large">{j.name[0]}</span>
                  <span
                    className={`status-badge ${j.active ? "complete" : "incomplete"}`}
                  >
                    {j.active ? "Active" : "Disabled"}
                  </span>
                </div>
                <h2>{j.name}</h2>
                <p className="muted">
                  {j.username.startsWith("email_")
                    ? "Email login"
                    : `@${j.username}`}
                </p>
                <div className="category-progress">
                  <span>
                    {done} / {p.entries.length} scored
                  </span>
                  <span>{percentage(done, p.entries.length)}%</span>
                </div>
                <Progress count={done} total={p.entries.length} />
                <div className="judge-actions">
                  <button className="secondary" onClick={() => setReset(j.id)}>
                    Reset PIN
                  </button>
                  <button
                    className="text-button"
                    disabled={busy === j.id}
                    onClick={() => void toggle(j.id, !j.active)}
                  >
                    {j.active ? "Disable" : "Enable"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>
      {(adding || reset) && (
        <JudgeForm
          id={reset}
          onClose={() => {
            setAdding(false);
            setReset(null);
          }}
        />
      )}
    </Shell>
  );
}
function JudgeForm({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const p = usePortal(),
    [name, setName] = useState(""),
    [username, setUsername] = useState(""),
    [pin, setPin] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (id) await p.updateJudge(id, { pin });
      else await p.addJudge({ name, username, pin });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={id ? "Reset judge PIN" : "Add a judge"} onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        {!id && (
          <>
            <label htmlFor="judge-name">Full name</label>
            <input
              id="judge-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={150}
            />
            <label htmlFor="judge-username">Username or email</label>
            <input
              id="judge-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={254}
              required
            />
          </>
        )}
        <label htmlFor="judge-pin">
          {id ? "New 4-digit PIN" : "4-digit PIN"}
        </label>
        <input
          id="judge-pin"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          pattern="[0-9]{4}"
          maxLength={4}
          required
          autoComplete="new-password"
        />
        {id && (
          <p className="muted">
            Resetting the PIN signs this judge out of existing sessions.
          </p>
        )}
        {error && <ErrorBox>{error}</ErrorBox>}
        <button className="primary full" disabled={busy}>
          {id ? "Reset PIN" : "Create judge"}
        </button>
      </form>
    </Modal>
  );
}
function Protected({
  admin = false,
  children,
}: {
  admin?: boolean;
  children: ReactNode;
}) {
  const p = usePortal();
  return (admin ? p.admin : !!p.judge) ? (
    children
  ) : (
    <Navigate to={admin ? "/admin/login" : "/judge/login"} replace />
  );
}
export default function App() {
  const p = usePortal();
  const current = useRef(p);
  current.current = p;
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "get_judging_progress",
            title: "Get my judging progress",
            description:
              "Read the signed-in judge’s own saved completion counts for Mobile, Device, and Story.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: false },
            execute(input: unknown) {
              if (
                !input ||
                typeof input !== "object" ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error("Provide an empty object.");
              const state = current.current;
              if (!state.judge) throw new Error("Sign in as a judge first.");
              return {
                preview: state.preview,
                categories: categories.map((c) => {
                  const ids = new Set(
                    state.entries
                      .filter((e) => e.category === c.id)
                      .map((e) => e.id),
                  );
                  return {
                    category: c.id,
                    completed: completed(state.scores, ids),
                    total: ids.size,
                  };
                }),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  if (!p.ready)
    return (
      <div className="app-loading">
        <Aperture size={40} />
        <span>Opening the judging room…</span>
      </div>
    );
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={
              p.admin ? "/admin" : p.judge ? "/judge/dashboard" : "/judge/login"
            }
            replace
          />
        }
      />
      <Route path="/judge/login" element={<Login />} />
      <Route path="/admin/login" element={<Login admin />} />
      <Route
        path="/judge/dashboard"
        element={
          <Protected>
            <JudgeDashboard />
          </Protected>
        }
      />
      <Route
        path="/judge/:category"
        element={
          <Protected>
            <Review />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected admin>
            <AdminOverview />
          </Protected>
        }
      />
      <Route
        path="/admin/results"
        element={
          <Protected admin>
            <AdminResults key="results" />
          </Protected>
        }
      />
      <Route
        path="/admin/entries"
        element={
          <Protected admin>
            <AdminResults key="entries" entriesOnly />
          </Protected>
        }
      />
      <Route
        path="/admin/judges"
        element={
          <Protected admin>
            <AdminJudges />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
