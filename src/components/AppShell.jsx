import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Wand2, Globe, Settings, ExternalLink, LogOut } from "lucide-react";

import { useAuth } from "../lib/useAuth";
import { getMyUserDoc, logout } from "../lib/auth";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const [username, setUsername] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user?.uid) return;
      try {
        const udoc = await getMyUserDoc(user.uid);
        if (!mounted) return;
        setUsername(udoc?.username || "");
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/dashboard/editor", label: "Editor", icon: Wand2 },
    { to: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (to) => pathname === to;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-gray-900" />
      <motion.div
        aria-hidden
        className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        animate={{ x: [0, 18, 0], y: [0, 10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        animate={{ x: [0, -18, 0], y: [0, 12, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[520px] w-[720px] rounded-full bg-white/5 blur-3xl"
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative">
        {/* Topbar */}
        <div className="sticky top-0 z-20 border-b border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
            {/* Brand */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-2xl bg-white/10 border border-white/15 grid place-items-center">
                <Globe size={18} className="text-white/85" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-white font-semibold">SmartCard</div>
                <div className="text-xs text-white/55 truncate">
                  {username ? `@${username}` : "Dashboard"}
                </div>
              </div>
            </div>

            {/* Nav */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {nav.map((n) => {
                const active = isActive(n.to);
                const Icon = n.icon;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition border",
                      active
                        ? "bg-white/10 border-white/20 text-white"
                        : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Icon size={16} />
                    {n.label}
                  </Link>
                );
              })}

              
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </div>
    </div>
  );
}
