import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  User,
  Shield,
  Lock,
  Eye,
  LogOut,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";

import { useAuth } from "../lib/useAuth";
import { getMyUserDoc, resetPassword, logout } from "../lib/auth";
import { getPublicProfile, saveProfile } from "../lib/profile";

import {
  normalizeHandle,
  handleLooksValid,
  isUsernameAvailable,
  changeUsername,
  isNicknameAvailable,
  saveNickname,
} from "../lib/account";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}

function Section({ icon: Icon, title, desc, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Icon size={18} />
          {title}
        </div>
        <div className="text-sm text-white/60 mt-1">{desc}</div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Label({ children }) {
  return <div className="text-xs text-white/55">{children}</div>;
}

function Input({ value, onChange, placeholder, disabled = false }) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-black/20 text-white",
        "px-3 py-2 outline-none placeholder:text-white/35",
        "focus:border-white/25 focus:bg-black/30 transition",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    />
  );
}

function StatusPill({ state, text }) {
  if (!text) return null;
  const cls =
    state === "ok"
      ? "bg-green-500/10 border-green-500/20 text-green-200"
      : state === "bad"
      ? "bg-red-500/10 border-red-500/20 text-red-200"
      : "bg-white/5 border-white/10 text-white/70";

  const Icon =
    state === "ok" ? CheckCircle2 : state === "bad" ? XCircle : Loader2;

  return (
    <div className={cn("text-xs px-3 py-2 rounded-xl border inline-flex items-center gap-2", cls)}>
      <Icon size={14} className={state === "checking" ? "animate-spin" : ""} />
      {text}
    </div>
  );
}

export default function SettingsPage() {
  const { user, loading } = useAuth();

  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);

  // editable fields
  const [nickname, setNickname] = useState("");
  const [newUsername, setNewUsername] = useState("");

  // privacy
  const [published, setPublished] = useState(true);

  // statuses
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const [nickCheck, setNickCheck] = useState({ state: "idle", msg: "" }); // idle|checking|ok|bad
  const [userCheck, setUserCheck] = useState({ state: "idle", msg: "" });

  // remember initial values (to detect changes)
  const [initial, setInitial] = useState({ nickname: "", username: "", published: true });

  const currentUsername = me?.username || "";
  const email = me?.email || user?.email || "";

  const publicLink = useMemo(() => {
    if (!currentUsername) return "";
    return `${window.location.origin}/#/@${currentUsername}`;
  }, [currentUsername]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user) return;

      const u = await getMyUserDoc(user.uid);
      if (!mounted) return;

      setMe(u);
      setNickname(u?.nickname || u?.fullName || "");
      setNewUsername(u?.username || "");

      if (u?.username) {
        const p = await getPublicProfile("@" + u.username);
        if (!mounted) return;

        setProfile(p);
        const pub = p?.published !== false;
        setPublished(pub);

        setInitial({
          nickname: (u?.nickname || u?.fullName || "").toString(),
          username: (u?.username || "").toString(),
          published: pub,
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  if (loading) return null;
  if (!user || !me) return null;

  const nicknameNorm = normalizeHandle(nickname);
  const usernameNorm = normalizeHandle(newUsername);

  const hasChanges =
    nicknameNorm !== normalizeHandle(initial.nickname) ||
    usernameNorm !== normalizeHandle(initial.username) ||
    published !== initial.published;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicLink);
      setToast("Link copied ✅");
      setTimeout(() => setToast(""), 1200);
    } catch {
      setToast("Copy failed");
      setTimeout(() => setToast(""), 1400);
    }
  }

  async function onPasswordReset() {
    setBusy(true);
    try {
      await resetPassword(email);
      setToast("Password reset email sent ✅");
      setTimeout(() => setToast(""), 1600);
    } catch (e) {
      setToast(e?.message || "Could not send reset email");
      setTimeout(() => setToast(""), 1800);
    } finally {
      setBusy(false);
    }
  }

  async function checkNickname() {
    const n = nicknameNorm;

    if (!n) {
      setNickCheck({ state: "bad", msg: "Nickname is required." });
      return;
    }
    if (!handleLooksValid(n)) {
      setNickCheck({ state: "bad", msg: "3–20 chars: a-z, 0-9, dot (.) underscore (_)." });
      return;
    }

    setNickCheck({ state: "checking", msg: "Checking nickname..." });
    try {
      const ok = await isNicknameAvailable(n, user.uid);
      setNickCheck(ok ? { state: "ok", msg: "Nickname available ✅" } : { state: "bad", msg: "Nickname taken ❌" });
    } catch (e) {
      setNickCheck({ state: "bad", msg: e?.message || "Nickname check failed" });
    }
  }

  async function checkUsername() {
    const u = usernameNorm;

    if (!u) {
      setUserCheck({ state: "bad", msg: "Username is required." });
      return;
    }
    if (!handleLooksValid(u)) {
      setUserCheck({ state: "bad", msg: "3–20 chars: a-z, 0-9, dot (.) underscore (_)." });
      return;
    }

    // current is always "ok"
    if (u === normalizeHandle(currentUsername)) {
      setUserCheck({ state: "ok", msg: "This is your current username ✅" });
      return;
    }

    setUserCheck({ state: "checking", msg: "Checking username..." });
    try {
      const ok = await isUsernameAvailable(u);
      setUserCheck(ok ? { state: "ok", msg: "Username available ✅" } : { state: "bad", msg: "Username taken ❌" });
    } catch (e) {
      setUserCheck({ state: "bad", msg: e?.message || "Username check failed" });
    }
  }

  async function saveAllChanges() {
    if (!hasChanges) {
      setToast("No changes to save.");
      setTimeout(() => setToast(""), 1200);
      return;
    }

    // basic validation first
    if (!nicknameNorm) {
      setToast("Nickname is required.");
      setTimeout(() => setToast(""), 1500);
      return;
    }
    if (!handleLooksValid(nicknameNorm)) {
      setToast("Nickname format invalid.");
      setTimeout(() => setToast(""), 1500);
      return;
    }

    if (!usernameNorm) {
      setToast("Username is required.");
      setTimeout(() => setToast(""), 1500);
      return;
    }
    if (!handleLooksValid(usernameNorm)) {
      setToast("Username format invalid.");
      setTimeout(() => setToast(""), 1500);
      return;
    }

    setBusy(true);
    try {
      // 1) Save nickname if changed
      if (nicknameNorm !== normalizeHandle(initial.nickname)) {
        await saveNickname(user.uid, nicknameNorm);
      }

      // 2) Change username if changed (this migrates profile + usernames mapping)
      let finalUsername = currentUsername;
      if (usernameNorm !== normalizeHandle(initial.username)) {
        finalUsername = await changeUsername({
          uid: user.uid,
          oldUsernameRaw: initial.username,
          newUsernameRaw: usernameNorm,
        });
      }

      // 3) Save privacy (published) (must use finalUsername)
      const latestProfile = await getPublicProfile("@" + finalUsername);
      const nextProfile = { ...latestProfile, published: !!published, updatedAt: Date.now() };
      await saveProfile(finalUsername, nextProfile);

      // refresh local state
      const freshUser = await getMyUserDoc(user.uid);
      setMe(freshUser);
      setProfile(nextProfile);

      setInitial({
        nickname: nicknameNorm,
        username: finalUsername,
        published: !!published,
      });

      setNewUsername(finalUsername); // keep input synced after change
      setToast("Saved ✅");
      setTimeout(() => setToast(""), 1400);

      // reset checks
      setNickCheck({ state: "idle", msg: "" });
      setUserCheck({ state: "idle", msg: "" });
    } catch (e) {
      setToast(e?.message || "Save failed");
      setTimeout(() => setToast(""), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* PERSONAL INFO */}
      <Section
        icon={User}
        title="Personal info"
        desc="Your public handle and basic account details."
      >
        <div className="space-y-2">
          <Label>Current username</Label>
          <Input value={`@${currentUsername}`} disabled />
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} disabled />
        </div>

        <div className="space-y-2">
          <Label>Public profile link</Label>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="text-sm text-white break-all">{publicLink}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition"
              >
                <Copy size={16} className="inline mr-2" />
                Copy
              </button>
              <a
                href={`/#/@${currentUsername}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition"
              >
                <ExternalLink size={16} className="inline mr-2" />
                Open
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* SECURITY & SIGN-INS */}
      <Section
        icon={Shield}
        title="Security & sign-ins"
        desc="Change password, nickname, and username."
      >
        {/* Change password */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-white/80 font-medium">
            <Lock size={16} />
            Password
          </div>
          <div className="text-sm text-white/55">
            For safety, we send a password reset link to your email.
          </div>
          <button
            type="button"
            onClick={onPasswordReset}
            disabled={busy}
            className={cn(
              "w-full rounded-2xl bg-white text-gray-950 py-2 font-semibold hover:bg-white/95 transition",
              busy && "opacity-60 cursor-not-allowed"
            )}
          >
            Send password reset email
          </button>
        </div>

        {/* Nickname */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-2">
          <Label>Nickname (unique inside the app)</Label>
          <Input
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setNickCheck({ state: "idle", msg: "" });
            }}
            placeholder="e.g. kritik.paudel"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={checkNickname}
              disabled={busy}
              className={cn(
                "px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition",
                busy && "opacity-60 cursor-not-allowed"
              )}
            >
              {nickCheck.state === "checking" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Checking
                </span>
              ) : (
                "Check availability"
              )}
            </button>

            <div className="text-[11px] text-white/45">
              Allowed: a-z, 0-9, dot (.) underscore (_), 3–20 chars.
            </div>
          </div>

          {nickCheck.state !== "idle" && (
            <StatusPill
              state={nickCheck.state === "checking" ? "checking" : nickCheck.state === "ok" ? "ok" : "bad"}
              text={nickCheck.msg}
            />
          )}
        </div>

        {/* Username */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-2">
          <Label>Username (your public URL handle)</Label>
          <Input
            value={newUsername}
            onChange={(e) => {
              setNewUsername(e.target.value);
              setUserCheck({ state: "idle", msg: "" });
            }}
            placeholder="new.username"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={checkUsername}
              disabled={busy}
              className={cn(
                "px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition",
                busy && "opacity-60 cursor-not-allowed"
              )}
            >
              {userCheck.state === "checking" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Checking
                </span>
              ) : (
                "Check availability"
              )}
            </button>

            <div className="text-[11px] text-white/45">
              Changing username changes your public link. Old link may stop working.
            </div>
          </div>

          {userCheck.state !== "idle" && (
            <StatusPill
              state={userCheck.state === "checking" ? "checking" : userCheck.state === "ok" ? "ok" : "bad"}
              text={userCheck.msg}
            />
          )}
        </div>

        {/* Save changes button (main) */}
        <button
          type="button"
          onClick={saveAllChanges}
          disabled={busy}
          className={cn(
            "w-full rounded-2xl py-3 font-semibold transition",
            hasChanges
              ? "bg-white text-gray-950 hover:bg-white/95 shadow-[0_18px_40px_rgba(255,255,255,0.18)]"
              : "bg-white/20 text-white/60 border border-white/10",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {busy ? "Saving..." : hasChanges ? "Save changes" : "No changes"}
        </button>

      </Section>

      {/* DATA & PRIVACY */}
      <Section
        icon={Eye}
        title="Data & privacy"
        desc="Control what visitors can see on your public profile."
      >
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <Label>Profile visibility</Label>
          <button
            type="button"
            onClick={() => setPublished((p) => !p)}
            className={cn(
              "mt-2 w-full rounded-2xl py-2 font-semibold transition border",
              published
                ? "bg-green-500/10 text-green-200 border-green-500/30"
                : "bg-red-500/10 text-red-200 border-red-500/30"
            )}
          >
            {published ? "Public" : "Private"}
          </button>
          <div className="mt-2 text-xs text-white/50">
            Private profiles show “This profile is private” to visitors.
          </div>
        </div>
      </Section>

      {/* DANGER ZONE */}
      <Section
        icon={AlertTriangle}
        title="Danger zone"
        desc="Sensitive actions."
      >
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 py-2 transition"
        >
          <LogOut size={16} className="inline mr-2" />
          Logout
        </button>
      </Section>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="text-sm text-white/80"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
