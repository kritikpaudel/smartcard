import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (!snap.exists()) throw new Error("User record missing.");

      if (snap.data().role !== "admin") {
        throw new Error("You are not an admin.");
      }

      nav("/admin/dashboard");
    } catch (e) {
      setErr(e.message || "Admin login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-black text-white p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4"
      >
        <div className="text-xl font-semibold text-center">Admin Login</div>

        <input
          className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {err && (
          <div className="text-sm text-red-400 text-center">{err}</div>
        )}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-white text-black py-2 font-semibold disabled:opacity-60"
        >
          {loading ? "Checking..." : "Login"}
        </button>
      </form>
    </div>
  );
}
