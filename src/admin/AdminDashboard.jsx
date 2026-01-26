import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import CreateUser from "./CreateUser";
import UsersList from "./UsersList";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const [tab, setTab] = useState("create"); // create | users

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Admin Dashboard</div>
          <div className="text-sm text-white/60 mt-1">Localhost only</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-1 flex gap-1">
            <button
              onClick={() => setTab("create")}
              className={cn(
                "px-3 py-2 rounded-lg text-sm transition",
                tab === "create"
                  ? "bg-white text-black"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              Create user
            </button>
            <button
              onClick={() => setTab("users")}
              className={cn(
                "px-3 py-2 rounded-lg text-sm transition",
                tab === "users"
                  ? "bg-white text-black"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              Users
            </button>
          </div>

          <button
            onClick={async () => {
              await signOut(auth);
              nav("/admin");
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="mt-6 max-w-4xl">
        {tab === "create" ? <CreateUser /> : <UsersList />}
      </div>
    </div>
  );
}
