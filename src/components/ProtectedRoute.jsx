// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/useAuth";

export default function ProtectedRoute({ children }) {
  const { user, userDoc, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-white/70">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // ✅ block deleted/frozen accounts
  if (userDoc?.deleted) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="text-xl font-semibold text-white">Account deleted</div>
          <div className="mt-2 text-white/60 text-sm">
            This account has been deleted. Please contact admin if you believe this is a mistake.
          </div>
        </div>
      </div>
    );
  }

  if (userDoc?.disabled) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="text-xl font-semibold text-white">Account frozen</div>
          <div className="mt-2 text-white/60 text-sm">
            Your account is temporarily frozen. Please contact admin to regain access.
          </div>
        </div>
      </div>
    );
  }

  return children;
}
