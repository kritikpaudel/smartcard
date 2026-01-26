import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import UserDetailsModal from "./UserDetailsModal";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}

export default function UsersList() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [users, setUsers] = useState([]);
  const [qText, setQText] = useState("");

  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(200));
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(rows);
    } catch (e) {
      setErr(e?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = qText.trim().toLowerCase();
    if (!s) return users;

    return users.filter((u) => {
      const email = String(u.email || "").toLowerCase();
      const username = String(u.username || "").toLowerCase();
      const name = String(u.fullName || "").toLowerCase();
      const uid = String(u.uid || u.id || "").toLowerCase();
      return email.includes(s) || username.includes(s) || name.includes(s) || uid.includes(s);
    });
  }, [qText, users]);

  function openUser(u) {
    setSelected(u);
    setOpen(true);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Users</div>
          <div className="text-sm text-white/60 mt-1">
            Showing latest {users.length} users (max 200). Search filters locally.
          </div>
        </div>

        <button
          onClick={load}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4">
        <div className="text-xs text-white/60 mb-1">Search (email / username / name / uid)</div>
        <input
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder="Type to search…"
          className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white outline-none focus:border-white/25"
        />
      </div>

      {err && (
        <div className="mt-4 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          {err}
          <div className="text-xs text-white/60 mt-2">
            If you see index error, Firestore may ask to create an index for orderBy(createdAt).
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-6 text-white/70">Loading…</div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <div className="grid grid-cols-12 gap-2 bg-black/30 px-3 py-2 text-xs text-white/60">
            <div className="col-span-4">Email</div>
            <div className="col-span-2">Username</div>
            <div className="col-span-3">Full name</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-1 text-right">UID</div>
          </div>

          <div className="divide-y divide-white/10">
            {filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => openUser(u)}
                className={cn(
                  "w-full text-left grid grid-cols-12 gap-2 px-3 py-2 text-sm",
                  "hover:bg-white/5 transition focus:outline-none"
                )}
                title="Click to manage user"
              >
                <div className="col-span-4 text-white/90 break-all">{u.email || "—"}</div>
                <div className="col-span-2 text-white/80 break-all">{u.username ? `@${u.username}` : "—"}</div>
                <div className="col-span-3 text-white/80 break-all">{u.fullName || "—"}</div>
                <div className="col-span-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-lg border px-2 py-1 text-xs",
                      u.role === "admin"
                        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
                        : "border-white/10 bg-white/5 text-white/70"
                    )}
                  >
                    {u.role || "user"}
                  </span>
                </div>
                <div className="col-span-1 text-right text-white/60">
                  <span title={u.uid || u.id}>{String(u.uid || u.id).slice(0, 6)}…</span>
                </div>
              </button>
            ))}

            {!filtered.length && (
              <div className="px-3 py-6 text-sm text-white/60">
                No users match your search.
              </div>
            )}
          </div>
        </div>
      )}

      <UserDetailsModal
        open={open}
        onClose={() => setOpen(false)}
        userRow={selected}
        onUpdated={load}
      />
    </div>
  );
}
