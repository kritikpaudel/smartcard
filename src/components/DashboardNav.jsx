import { NavLink } from "react-router-dom";
import { LogOut, LayoutDashboard, Wand2, Settings, ExternalLink } from "lucide-react";
import { logout } from "../lib/auth";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}

export default function DashboardNav({ username }) {
  const linkBase =
    "px-3 py-2 rounded-2xl text-sm border transition inline-flex items-center gap-2";
  const active = "bg-white text-gray-950 border-white";
  const idle = "bg-white/5 text-white/80 border-white/10 hover:bg-white/10 hover:text-white";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) => cn(linkBase, isActive ? active : idle)}
        >
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

        <NavLink
          to="/dashboard/editor"
          className={({ isActive }) => cn(linkBase, isActive ? active : idle)}
        >
          <Wand2 size={16} />
          Editor
        </NavLink>

        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) => cn(linkBase, isActive ? active : idle)}
        >
          <Settings size={16} />
          Settings
        </NavLink>

        <a
          href={`/#/@@${username}`}
          className={cn(linkBase, idle)}
          title="Open public page"
        >
          <ExternalLink size={16} />
          Public
        </a>
      </div>

      <button
        onClick={logout}
        className={cn(
          "px-3 py-2 rounded-2xl text-sm border transition inline-flex items-center gap-2",
          "bg-white/5 text-white/80 border-white/10 hover:bg-white/10 hover:text-white"
        )}
        type="button"
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>
  );
}
