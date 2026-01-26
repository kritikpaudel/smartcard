// src/admin/UserDetailsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  adminGetUser,
  adminUpdateUserFields,
  adminChangeUsername,
  adminIsUsernameAvailable,
  adminGetProfile,
  adminSaveProfile,
  adminToggleProfilePublished,
} from "../lib/adminUsers";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}

function normalizeUsername(u) {
  return (u || "").toLowerCase().replace("@", "").trim();
}
function usernameLooksValid(u) {
  return /^[a-z0-9._]{3,20}$/.test(u);
}

export default function UserDetailsModal({ open, onClose, userRow, onUpdated }) {
  const uid = userRow?.uid || userRow?.id;

  const [tab, setTab] = useState("account"); // account | profile

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [user, setUser] = useState(null);

  // editable user fields
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("user");
  const [username, setUsername] = useState("");
  const [published, setPublished] = useState(true);

  // username check ui
  const [uCheck, setUCheck] = useState({ state: "idle", msg: "" });

  // profile editor
  const [profile, setProfile] = useState(null);
  const [profileJson, setProfileJson] = useState("");
  const [profileDirty, setProfileDirty] = useState(false);

  // quick editor fields
  const [pFullName, setPFullName] = useState("");
  const [pPosition, setPPosition] = useState("");
  const [pCompany, setPCompany] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pWebsite, setPWebsite] = useState("");
  const [pFooter, setPFooter] = useState("");

  useEffect(() => {
    if (!open || !uid) return;

    let mounted = true;
    (async () => {
      setLoading(true);
      setErr("");
      setOk("");
      setTab("account");
      try {
        const u = await adminGetUser(uid);
        if (!mounted) return;

        setUser(u);
        setFullName(u?.fullName || "");
        setRole(u?.role || "user");
        setUsername(u?.username || "");

        // load profile by username
        const un = normalizeUsername(u?.username || "");
        if (un) {
          const p = await adminGetProfile(un);
          if (!mounted) return;

          if (p) {
            setProfile(p);
            setPublished(p.published !== false);
            setProfileJson(JSON.stringify(p, null, 2));

            // parse quick fields
            const blocks = Array.isArray(p.blocks) ? p.blocks : [];
            const header = blocks.find((b) => b.type === "header")?.data || {};
            const contact = blocks.find((b) => b.type === "contact")?.data || {};
            const footer = blocks.find((b) => b.type === "footer")?.data || {};

            setPFullName(header.fullName || "");
            setPPosition(header.position || "");
            setPCompany(header.company || "");
            setPPhone(contact.phone || "");
            setPEmail(contact.email || "");
            setPWebsite(contact.website || "");
            setPFooter(footer.text || "");
          } else {
            setProfile(null);
            setProfileJson("");
          }
        }
      } catch (e) {
        setErr(e?.message || "Failed to load user/profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, uid]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function checkUsernameAvailability(raw) {
    const u = normalizeUsername(raw);
    if (!u) {
      setUCheck({ state: "idle", msg: "" });
      return;
    }
    if (!usernameLooksValid(u)) {
      setUCheck({
        state: "invalid",
        msg: "3–20 chars: a-z, 0-9, dot (.) or underscore (_).",
      });
      return;
    }

    if (user?.username && u === normalizeUsername(user.username)) {
      setUCheck({ state: "ok", msg: "Unchanged ✅" });
      return;
    }

    setUCheck({ state: "checking", msg: "Checking..." });
    try {
      const ok = await adminIsUsernameAvailable(u);
      setUCheck(ok ? { state: "ok", msg: "Username available ✅" } : { state: "taken", msg: "Username taken ❌" });
    } catch (e) {
      setUCheck({ state: "invalid", msg: e?.message || "Check failed." });
    }
  }

  const publicLink = useMemo(() => {
    const u = normalizeUsername(username || user?.username);
    if (!u) return null;
    return `${window.location.origin}/#/@${u}`;
  }, [username, user]);

  async function saveAccount() {
    if (!user) return;
    setErr("");
    setOk("");
    setLoading(true);

    try {
      const oldU = normalizeUsername(user.username);
      const newU = normalizeUsername(username);

      if (newU && oldU !== newU) {
        if (uCheck.state === "taken" || uCheck.state === "invalid") {
          throw new Error("Fix username first.");
        }
        await adminChangeUsername({
          uid: user.uid || user.id,
          oldUsernameRaw: oldU,
          newUsernameRaw: newU,
        });
      }

      await adminUpdateUserFields(user.uid || user.id, {
        fullName: fullName.trim(),
        role,
        updatedAt: Date.now(),
      });

      setOk("Account saved ✅");
      onUpdated?.();
    } catch (e) {
      setErr(e?.message || "Save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function togglePublish(next) {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const u = normalizeUsername(username || user?.username);
      if (!u) throw new Error("No username found.");
      await adminToggleProfilePublished(u, next);
      setPublished(next);
      setOk(next ? "Profile published ✅" : "Profile unpublished ✅");
      onUpdated?.();
    } catch (e) {
      setErr(e?.message || "Publish toggle failed.");
    } finally {
      setLoading(false);
    }
  }

  function applyQuickFieldsToProfile(current) {
    const p = { ...current };
    const blocks = Array.isArray(p.blocks) ? [...p.blocks] : [];

    const upsert = (type, data) => {
      const idx = blocks.findIndex((b) => b.type === type);
      if (idx >= 0) blocks[idx] = { ...blocks[idx], data: { ...(blocks[idx].data || {}), ...data } };
      else blocks.push({ id: `admin_${type}`, type, data });
    };

    upsert("header", {
      fullName: pFullName,
      position: pPosition,
      company: pCompany,
    });

    upsert("contact", {
      phone: pPhone,
      email: pEmail,
      website: pWebsite,
    });

    upsert("footer", { text: pFooter });

    p.blocks = blocks;
    p.updatedAt = Date.now();
    return p;
  }

  async function saveProfileQuick() {
    if (!profile) return;
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const u = normalizeUsername(username || user?.username);
      if (!u) throw new Error("No username found for profile.");

      const updated = applyQuickFieldsToProfile(profile);
      await adminSaveProfile(u, updated);

      setProfile(updated);
      setProfileJson(JSON.stringify(updated, null, 2));
      setProfileDirty(false);

      setOk("Profile saved ✅");
      onUpdated?.();
    } catch (e) {
      setErr(e?.message || "Profile save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfileJson() {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const u = normalizeUsername(username || user?.username);
      if (!u) throw new Error("No username found for profile.");

      const parsed = JSON.parse(profileJson);
      await adminSaveProfile(u, { ...parsed, updatedAt: Date.now() });

      setProfile(parsed);
      setProfileDirty(false);
      setOk("Profile JSON saved ✅");
      onUpdated?.();
    } catch (e) {
      setErr(e?.message || "Invalid JSON or save failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />

        {/* Center wrapper (NO translate) */}
        <div className="fixed inset-0 grid place-items-center p-4">
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-[92vw] max-w-3xl max-h-[85vh] overflow-auto rounded-3xl border border-white/10 bg-[#0b0f16] text-white shadow-[0_40px_120px_rgba(0,0,0,0.65)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">User details</div>
                <div className="text-xs text-white/60 mt-1 break-all">UID: {uid}</div>
              </div>

              <div className="flex items-center gap-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-1 flex gap-1">
                  <button
                    onClick={() => setTab("account")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm transition",
                      tab === "account" ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                  >
                    Account
                  </button>
                  <button
                    onClick={() => setTab("profile")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm transition",
                      tab === "profile" ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                  >
                    Profile
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {loading && !user ? <div className="text-white/70">Loading…</div> : null}

              {/* ACCOUNT TAB */}
              {tab === "account" && user && (
                <>
                  <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <div className="text-sm font-semibold">Account</div>

                    <Row label="Email">
                      <div className="text-sm text-white/80 break-all">{user.email || "—"}</div>
                    </Row>

                    <Row label="Full name">
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25"
                      />
                    </Row>

                    <Row label="Username">
                      <div className="space-y-2">
                        <input
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value);
                            setUCheck({ state: "idle", msg: "" });
                          }}
                          onBlur={() => checkUsernameAvailability(username)}
                          className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25"
                          placeholder="username (no @)"
                        />
                        {uCheck.state !== "idle" && (
                          <div
                            className={cn(
                              "text-xs px-3 py-2 rounded-xl border",
                              uCheck.state === "ok" && "bg-green-500/10 border-green-500/20 text-green-200",
                              (uCheck.state === "taken" || uCheck.state === "invalid") &&
                                "bg-red-500/10 border-red-500/20 text-red-200",
                              uCheck.state === "checking" && "bg-white/5 border-white/10 text-white/70"
                            )}
                          >
                            {uCheck.msg}
                          </div>
                        )}
                        {publicLink && (
                          <a
                            className="text-xs text-white/70 hover:text-white underline underline-offset-4"
                            href={publicLink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open public profile
                          </a>
                        )}
                      </div>
                    </Row>

                    <Row label="Role">
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </Row>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        disabled={loading || uCheck.state === "taken" || uCheck.state === "invalid"}
                        onClick={saveAccount}
                        className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold disabled:opacity-60"
                      >
                        {loading ? "Saving…" : "Save changes"}
                      </button>

                      <button
                        disabled={loading}
                        onClick={() => togglePublish(!published)}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition disabled:opacity-60"
                      >
                        {published ? "Unpublish profile" : "Publish profile"}
                      </button>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold mb-3">Recent activity</div>
                    {Array.isArray(user.recentActivity) && user.recentActivity.length ? (
                      <div className="space-y-2">
                        {user.recentActivity
                          .slice()
                          .reverse()
                          .slice(0, 12)
                          .map((a, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                            >
                              <div className="text-sm text-white/80">{a.type || "activity"}</div>
                              <div className="text-xs text-white/55">{a.at ? new Date(a.at).toLocaleString() : "—"}</div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-sm text-white/60">No recent activity recorded.</div>
                    )}
                  </section>
                </>
              )}

              {/* PROFILE TAB */}
              {tab === "profile" && (
                <>
                  {!profile ? (
                    <div className="text-white/70">No profile found for this user.</div>
                  ) : (
                    <>
                      {/* QUICK EDIT */}
                      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <div className="text-sm font-semibold">Quick edit (syncs with public profile)</div>

                        <TwoCol>
                          <Label label="Display name">
                            <input
                              value={pFullName}
                              onChange={(e) => {
                                setPFullName(e.target.value);
                                setProfileDirty(true);
                              }}
                              className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25"
                            />
                          </Label>
                          <Label label="Position">
                            <input
                              value={pPosition}
                              onChange={(e) => {
                                setPPosition(e.target.value);
                                setProfileDirty(true);
                              }}
                              className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25"
                            />
                          </Label>
                        </TwoCol>

                        <TwoCol>
                          <Label label="Company">
                            <input
                              value={pCompany}
                              onChange={(e) => {
                                setPCompany(e.target.value);
                                setProfileDirty(true);
                              }}
                              className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25"
                            />
                          </Label>
                          <Label label="Phone">
                            <input
                              value={pPhone}
                              onChange={(e) => {
                                setPPhone(e.target.value);
                                setProfileDirty(true);
                              }}
                              className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25"
                            />
                          </Label>
                        </TwoCol>

                        <TwoCol>
                          <Label label="Email">
                            <input
                              value={pEmail}
                              onChange={(e) => {
                                setPEmail(e.target.value);
                                setProfileDirty(true);
                              }}
                              className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25"
                            />
                          </Label>
                          <Label label="Website">
                            <input
                              value={pWebsite}
                              onChange={(e) => {
                                setPWebsite(e.target.value);
                                setProfileDirty(true);
                              }}
                              className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25"
                            />
                          </Label>
                        </TwoCol>

                        <Label label="Footer text">
                          <input
                            value={pFooter}
                            onChange={(e) => {
                              setPFooter(e.target.value);
                              setProfileDirty(true);
                            }}
                            className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25"
                          />
                        </Label>

                        <button
                          disabled={loading}
                          onClick={saveProfileQuick}
                          className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold disabled:opacity-60"
                        >
                          {loading ? "Saving…" : "Save quick changes"}
                        </button>
                      </section>

                      {/* JSON EDITOR */}
                      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <div className="text-sm font-semibold">Advanced (Profile JSON)</div>
                        <div className="text-xs text-white/60">
                          Edit blocks directly. Be careful — invalid JSON won’t save.
                        </div>

                        <textarea
                          value={profileJson}
                          onChange={(e) => {
                            setProfileJson(e.target.value);
                            setProfileDirty(true);
                          }}
                          className="w-full min-h-[260px] rounded-2xl px-3 py-3 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25 font-mono text-xs"
                        />

                        <button
                          disabled={loading}
                          onClick={saveProfileJson}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition disabled:opacity-60"
                        >
                          {loading ? "Saving…" : "Save JSON"}
                        </button>

                        {profileDirty && (
                          <div className="text-xs text-yellow-200 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                            You have unsaved profile changes.
                          </div>
                        )}
                      </section>
                    </>
                  )}
                </>
              )}

              <AnimatePresence>
                {ok && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="text-sm text-green-200 bg-green-500/10 border border-green-500/20 rounded-2xl p-3"
                  >
                    {ok}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {err && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-2xl p-3"
                  >
                    {err}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-12 gap-3 items-start">
      <div className="col-span-4 text-xs text-white/60 pt-2">{label}</div>
      <div className="col-span-8">{children}</div>
    </div>
  );
}

function TwoCol({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Label({ label, children }) {
  return (
    <div>
      <div className="text-xs text-white/60 mb-1">{label}</div>
      {children}
    </div>
  );
}
