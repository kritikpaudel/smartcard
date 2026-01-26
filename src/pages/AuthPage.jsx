import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AtSign, Lock, Sparkles, Eye, EyeOff } from "lucide-react";
import { loginWithIdentifier, resetPassword } from "../lib/auth";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}

export default function AuthPage() {
  const nav = useNavigate();

  const [identifier, setIdentifier] = useState(""); // username OR email
  const [password, setPassword] = useState("");

  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  async function onForgotPassword() {
    setErr("");
    setInfo("");
    try {
      if (!identifier.trim() || !identifier.includes("@")) {
        throw new Error("Enter your email above to reset your password.");
      }
      await resetPassword(identifier.trim());
      setInfo("Password reset email sent. Check your inbox (and spam).");
    } catch (e) {
      setErr(e?.message || "Could not send reset email.");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setInfo("");
    setLoading(true);

    try {
      if (!identifier.trim()) throw new Error("Enter username or email.");
      if (!password) throw new Error("Enter password.");

      await loginWithIdentifier(identifier.trim(), password);
      nav("/dashboard");
    } catch (error) {
      setErr(error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-gray-900" />
      <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[520px] w-[720px] rounded-full bg-white/5 blur-3xl" />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Brand */}
          <div className="mb-5 flex items-center justify-center gap-2 text-white">
            <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/15 grid place-items-center">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-lg font-semibold leading-tight">SmartCard</div>
              <div className="text-xs text-white/60">Login only (accounts created by admin)</div>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-white/10">
              <div className="text-2xl font-semibold text-white">Welcome back</div>
              <div className="text-sm text-white/60 mt-1">
                Log in to edit your public profile.
              </div>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-4">
              {/* Username/email */}
              <div className="group relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/55 group-focus-within:text-white/85 transition">
                  <AtSign size={16} />
                </div>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Username or email"
                  className={cn(
                    "w-full rounded-2xl border border-white/10 bg-white/5 text-white",
                    "pl-10 pr-4 py-3 outline-none",
                    "placeholder:text-white/35",
                    "focus:border-white/25 focus:bg-white/10",
                    "transition"
                  )}
                />
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 group-focus-within:ring-2 ring-white/10 transition" />
              </div>

              {/* Password */}
              <div className="group relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/55 group-focus-within:text-white/85 transition">
                  <Lock size={16} />
                </div>

                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  type={showPw ? "text" : "password"}
                  className={cn(
                    "w-full rounded-2xl border border-white/10 bg-white/5 text-white",
                    "pl-10 pr-12 py-3 outline-none",
                    "placeholder:text-white/35",
                    "focus:border-white/25 focus:bg-white/10",
                    "transition"
                  )}
                />

                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-white/90 transition"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>

                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 group-focus-within:ring-2 ring-white/10 transition" />
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm text-white/70 hover:text-white underline underline-offset-4"
                >
                  Forgot password?
                </button>
              </div>

              <AnimatePresence>
                {info && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="text-sm text-green-200 bg-green-500/10 border border-green-500/20 rounded-2xl p-3"
                  >
                    {info}
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

              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className={cn(
                  "w-full rounded-2xl py-3 font-semibold",
                  "bg-white text-gray-950 hover:bg-white/95",
                  "shadow-[0_18px_40px_rgba(255,255,255,0.18)]",
                  "focus:outline-none focus:ring-2 focus:ring-white/30",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                  "transition"
                )}
              >
                {loading ? "Please wait…" : "Login"}
              </motion.button>

              <div className="text-xs text-white/50 text-center">
                By continuing, you agree to our Terms & Privacy.
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
