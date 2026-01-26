import { useState } from "react";
import { adminCreateUser, isUsernameAvailable } from "../lib/admin";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}

function generateTempPassword(len = 14) {
  // Strong-ish temp password: uppercase, lowercase, number, symbol
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const nums = "23456789";
  const sym = "!@#$%&*_-+=";

  const all = upper + lower + nums + sym;

  const pick = (s) => s[Math.floor(Math.random() * s.length)];

  // Ensure all types exist
  let pw = pick(upper) + pick(lower) + pick(nums) + pick(sym);

  for (let i = pw.length; i < len; i++) pw += pick(all);

  // Shuffle
  pw = pw
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  return pw;
}

export default function CreateUser() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");

  const [checking, setChecking] = useState(false);
  const [userMsg, setUserMsg] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkUsername(u) {
    const raw = u.trim();
    if (!raw) {
      setUserMsg("");
      return;
    }
    setChecking(true);
    setUserMsg("Checking...");
    try {
      const available = await isUsernameAvailable(raw);
      setUserMsg(available ? "✅ Username available" : "❌ Username taken");
    } catch {
      setUserMsg("Could not check username (rules?)");
    } finally {
      setChecking(false);
    }
  }

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);

    try {
      const res = await adminCreateUser({
        emailRaw: email,
        password,
        fullName,
        usernameRaw: username,
      });

      setOk(`User created: ${res.email} ( @${res.username} )`);
      setFullName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setUserMsg("");
    } catch (e) {
      setErr(e?.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-lg font-semibold text-white">Create user</div>
      <div className="text-sm text-white/60 mt-1">
        Creates Firebase Auth + Firestore docs (users, usernames, profiles)
      </div>

      <form onSubmit={onCreate} className="mt-5 grid gap-3">
        <Label label="Full name">
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
          />
        </Label>

        <Label label="Username (no @)">
          <Input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUserMsg("");
            }}
            onBlur={() => checkUsername(username)}
            placeholder="john.doe"
          />
          {userMsg && (
            <div
              className={cn(
                "mt-2 text-xs rounded-xl border px-3 py-2",
                userMsg.includes("available")
                  ? "border-green-500/30 bg-green-500/10 text-green-200"
                  : userMsg.includes("taken")
                  ? "border-red-500/30 bg-red-500/10 text-red-200"
                  : "border-white/10 bg-white/5 text-white/70"
              )}
            >
              {checking ? "Checking..." : userMsg}
            </div>
          )}
          <div className="mt-1 text-[11px] text-white/45">
            Allowed: a-z, 0-9, dot (.) underscore (_)
          </div>
        </Label>
        <div>
            <label className="text-xs text-white/60 mb-1 block">Role</label>
            <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25"
            >
                <option value="user">user</option>
                <option value="admin">admin</option>
            </select>
            </div>


        <Label label="Email">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@gmail.com"
          />
        </Label>

        <Label label="Temporary password">
          <div className="flex gap-2">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min 8 chars"
            />
            <button
              type="button"
              onClick={() => setPassword(generateTempPassword(14))}
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
              title="Generate strong temp password"
            >
              Generate
            </button>
          </div>
          <div className="mt-1 text-[11px] text-white/45">
            Tip: copy this and send to user (later we’ll add “send reset link”).
          </div>
        </Label>

        {err && (
          <div className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            {err}
          </div>
        )}

        {ok && (
          <div className="text-sm text-green-200 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
            {ok}
          </div>
        )}

        <button
          disabled={loading}
          className="mt-1 w-full rounded-xl bg-white text-black py-2 font-semibold disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create user"}
        </button>
      </form>
    </div>
  );
}

function Label({ label, children }) {
  return (
    <div>
      <div className="text-xs text-white/60 mb-1">{label}</div>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25"
    />
  );
}
