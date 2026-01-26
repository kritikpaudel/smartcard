import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Copy,
  LogOut,
  Sparkles,
  Wand2,
  Link as LinkIcon,
  QrCode,
  Download,
  X,
  Eye,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import { logout, getMyUserDoc } from "../lib/auth";
import { useAuth } from "../lib/useAuth";
import { getPublicProfile } from "../lib/profile";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}

function Card({ children, className }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl",
        "shadow-[0_30px_80px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function Badge({ kind = "neutral", children }) {
  const styles =
    kind === "green"
      ? "bg-green-500/10 border-green-500/30 text-green-200"
      : kind === "red"
      ? "bg-red-500/10 border-red-500/30 text-red-200"
      : "bg-white/5 border-white/10 text-white/70";
  return (
    <span className={cn("px-3 py-1.5 rounded-2xl text-xs border", styles)}>
      {children}
    </span>
  );
}

function ThemeChip({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
      <div className="text-xs text-white/60">{label}</div>
      <div className="flex items-center gap-2">
        <div
          className="h-4 w-4 rounded-full border border-white/15"
          style={{ background: value }}
          title={value}
        />
        <div className="text-xs text-white/70">{value}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();

  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);

  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user) return;

      const udoc = await getMyUserDoc(user.uid);
      if (!mounted) return;
      setMe(udoc);

      if (udoc?.username) {
        const p = await getPublicProfile("@" + udoc.username);
        if (!mounted) return;
        setProfile(p);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  const username = useMemo(() => me?.username || "yourusername", [me]);
  const publicPath = `/@${username}`;
  const fullLink = useMemo(
    () => `${window.location.origin}/#${publicPath}`,
    [publicPath]
  );

  const published = profile?.published !== false;

  const theme = profile?.theme || {
    background: "#0b0f16",
    card: "#0f172a",
    primary: "#ffffff",
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  function downloadQR() {
    const canvas = document.getElementById("qr-canvas");
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `smartcard-@${username}.png`;
    a.click();
  }

  // safe conditional returns AFTER hooks
  if (loading) {
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <div className="text-white/70">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <div className="text-white/70">Not logged in.</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-white/80 text-sm">
            <Sparkles size={16} />
            Your workspace
          </div>
          <h1 className="mt-1 text-3xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-white/60">
            Logged in as <span className="text-white/80">{user.email}</span>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge kind={published ? "green" : "red"}>
              {published ? "Published" : "Hidden"}
            </Badge>
            <Badge>@{username}</Badge>
          </div>
        </div>

        <button
          onClick={logout}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm",
            "border border-white/10 bg-white/5 text-white/80",
            "hover:bg-white/10 hover:text-white transition"
          )}
          type="button"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Public link */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-white font-semibold">Your NFC link</div>
                <div className="mt-1 text-sm text-white/60">
                  Write this into the NFC card (or use QR).
                </div>
              </div>
              <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
                <LinkIcon size={18} className="text-white/80" />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="text-xs text-white/50">URL</div>
              <div className="mt-1 font-medium text-white break-all">{fullLink}</div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={publicPath}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold",
                  "bg-white text-gray-950 hover:bg-white/95 transition"
                )}
              >
                Open page <ArrowUpRight size={16} />
              </Link>

              <button
                onClick={copyLink}
                type="button"
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm",
                  "border border-white/10 bg-white/5 text-white/80",
                  "hover:bg-white/10 hover:text-white transition"
                )}
              >
                <Copy size={16} />
                {copied ? "Copied!" : "Copy link"}
              </button>

              <button
                onClick={() => setQrOpen(true)}
                type="button"
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm",
                  "border border-white/10 bg-white/5 text-white/80",
                  "hover:bg-white/10 hover:text-white transition"
                )}
              >
                <QrCode size={16} />
                QR
              </button>
            </div>

            <div className="mt-4 text-xs text-white/45">
              If profile is hidden, NFC will show “Profile is private”.
            </div>
          </Card>
        </motion.div>

        {/* Theme preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="p-6">
            <div className="text-white font-semibold">Theme preview</div>
            <div className="mt-2 text-sm text-white/60">
              Colors from your profile editor.
            </div>

            <div className="mt-4 space-y-2">
              <ThemeChip label="Background" value={theme.background} />
              <ThemeChip label="Card" value={theme.card} />
              <ThemeChip label="Accent" value={theme.primary} />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs text-white/50">Mini preview</div>
              <div
                className="mt-2 rounded-2xl border border-white/10 p-4"
                style={{ background: theme.card }}
              >
                <div className="text-white font-semibold">@{username}</div>
                <div className="text-sm text-white/60 mt-1">
                  Your public profile card style
                </div>
                <div
                  className="mt-3 h-9 rounded-xl"
                  style={{ background: theme.primary }}
                  title="Accent"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="text-white font-semibold">Quick actions</div>
            <div className="mt-2 text-sm text-white/60">
              Edit blocks like Canva and publish changes.
            </div>

            <div className="mt-4 space-y-2">
              <Link
                to="/dashboard/editor"
                className={cn(
                  "block rounded-2xl border border-white/10 bg-white/5 p-4",
                  "hover:bg-white/10 transition"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Open Editor</div>
                    <div className="text-sm text-white/60 mt-1">
                      Add / remove / reorder blocks
                    </div>
                  </div>
                  <Wand2 size={18} className="text-white/70" />
                </div>
              </Link>

              <Link
                to={publicPath}
                className={cn(
                  "block rounded-2xl border border-white/10 bg-white/5 p-4",
                  "hover:bg-white/10 transition"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Preview Public Page</div>
                    <div className="text-sm text-white/60 mt-1">
                      See what opens from NFC
                    </div>
                  </div>
                  <Eye size={18} className="text-white/70" />
                </div>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {qrOpen && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setQrOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="relative mx-auto mt-20 w-[92%] max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="text-white font-semibold">QR code</div>
                <button
                  type="button"
                  onClick={() => setQrOpen(false)}
                  className="h-9 w-9 rounded-xl border border-white/10 bg-black/20 grid place-items-center text-white/70 hover:text-white hover:bg-white/10 transition"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5 grid place-items-center">
                  <QRCodeCanvas
                    id="qr-canvas"
                    value={fullLink}
                    size={220}
                    includeMargin={true}
                  />
                </div>

                <div className="mt-4 text-sm text-white/70 break-all">
                  {fullLink}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={downloadQR}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold",
                      "bg-white text-gray-950 hover:bg-white/95 transition"
                    )}
                  >
                    <Download size={16} />
                    Download PNG
                  </button>

                  <button
                    type="button"
                    onClick={copyLink}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-sm",
                      "border border-white/10 bg-white/5 text-white/80",
                      "hover:bg-white/10 hover:text-white transition"
                    )}
                  >
                    <Copy size={16} />
                    Copy URL
                  </button>
                </div>

                <div className="mt-4 text-xs text-white/45">
                  Tip: You can print this QR on the card too.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
