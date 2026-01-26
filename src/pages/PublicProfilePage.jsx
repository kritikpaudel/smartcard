import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toDirectImageUrl } from "../lib/url";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Mail,
  Globe,
  Link as LinkIcon,
  Instagram,
  Linkedin,
  Facebook,
  Youtube,
  Twitter,
  Music2,
  MapPin,
  MessageCircle,
  Send,
  FileText,
} from "lucide-react";
import { subscribePublicProfile } from "../lib/profile";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}

function normalizeUsername(u) {
  // input may be "@name" or "name"
  return (u || "").replace("@", "").trim().toLowerCase();
}

function safeUrl(url) {
  if (!url) return "";
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `https://${u}`;
}

/** ✅ Social icon mapping (TikTok supported) */
function socialIcon(label) {
  const s = (label || "").toLowerCase();
  if (s.includes("insta")) return Instagram;
  if (s.includes("linkedin")) return Linkedin;
  if (s.includes("facebook")) return Facebook;
  if (s.includes("youtube")) return Youtube;
  if (s.includes("tiktok") || s.includes("tik tok")) return Music2;
  if (s.includes("twitter") || s === "x" || s.includes(" x ")) return Twitter;
  return LinkIcon;
}

/** ✅ Contact kind -> icon */
function contactKindIcon(kind) {
  const k = (kind || "").toLowerCase();
  if (k === "phone") return Phone;
  if (k === "email") return Mail;
  if (k === "website") return Globe;
  if (k === "whatsapp") return MessageCircle;
  if (k === "telegram") return Send;
  if (k === "location" || k === "address") return MapPin;
  return LinkIcon;
}

/** ✅ Contact kind -> link (if possible) */
function contactKindHref(kind, value) {
  const k = (kind || "").toLowerCase();
  const v = (value || "").trim();
  if (!v) return "";

  if (k === "phone") return `tel:${v}`;
  if (k === "email") return `mailto:${v}`;
  if (k === "website") return safeUrl(v);
  if (k === "whatsapp") return `https://wa.me/${v.replace(/\D/g, "")}`;
  if (k === "telegram") return safeUrl(v);
  if (k === "location" || k === "address") {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`;
  }

  // if they paste a url in custom field, open it
  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  return "";
}

function downloadVCF({ fullName, phone, email, website }) {
  const esc = (v) => (v || "").replace(/\n/g, " ").trim();

  const vcf = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${esc(fullName)}`,
    phone ? `TEL:${esc(phone)}` : null,
    email ? `EMAIL:${esc(email)}` : null,
    website ? `URL:${esc(website)}` : null,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");

  const blob = new Blob([vcf], { type: "text/vcard" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${esc(fullName || "contact").replace(/\s+/g, "_")}.vcf`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function PublicProfilePage() {
  const nav = useNavigate();
  const { username: raw } = useParams();
  const username = useMemo(() => normalizeUsername(raw), [raw]);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;

    setLoading(true);

    // ✅ IMPORTANT: only ONE "@"
    const unsub = subscribePublicProfile("@" + username, (p) => {
      setProfile(p);
      setLoading(false);
    });

    return () => unsub?.();
  }, [username]);

  const fallbackTheme = {
    background: "#0b0f16",
    card: "#0f172a",
    primary: "#ffffff",
  };

  const theme = profile?.theme || fallbackTheme;

  // ✅ Auto redirect (old username -> new username)
  useEffect(() => {
    if (!profile?.redirectTo) return;

    const target = normalizeUsername(profile.redirectTo);
    if (!target) return;
    if (target === username) return;

    nav(`/@${target}`, { replace: true });
  }, [profile?.redirectTo, nav, username]);

  if (loading) {
    return (
      <div
        className="min-h-screen grid place-items-center"
        style={{ background: fallbackTheme.background }}
      >
        <div className="text-white/70">Loading…</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className="min-h-screen grid place-items-center p-6 text-center"
        style={{ background: fallbackTheme.background }}
      >
        <div>
          <div className="text-2xl font-semibold text-white">Profile not found</div>
          <div className="mt-2 text-white/60">Check the username link.</div>
        </div>
      </div>
    );
  }

  if (profile.redirectTo) {
    return (
      <div
        className="min-h-screen grid place-items-center p-6 text-center"
        style={{ background: theme.background }}
      >
        <div>
          <div className="text-2xl font-semibold text-white">Redirecting…</div>
          <div className="mt-2 text-white/60">Opening the updated profile.</div>
        </div>
      </div>
    );
  }

  if (profile.published === false) {
    return (
      <div
        className="min-h-screen grid place-items-center text-center p-6"
        style={{ background: theme.background }}
      >
        <div>
          <div className="text-2xl font-semibold text-white">Profile is private</div>
          <div className="mt-2 text-white/60">This card is currently unpublished.</div>
        </div>
      </div>
    );
  }

  const blocks = Array.isArray(profile?.blocks) ? profile.blocks : [];
  const header = blocks.find((b) => b.type === "header")?.data || {};
  const fullName = header.fullName || `@${username}`;
  const subtitle = [header.position, header.company].filter(Boolean).join(" • ");

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: theme.background }}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
      <div className="absolute -top-20 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute top-48 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative p-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-md"
        >
          <div
            className="rounded-3xl border border-white/10 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
            style={{ background: theme.card }}
          >
            {/* Cover */}
            <div className="h-36 bg-white/5 relative overflow-hidden">
              {header.coverImageUrl ? (
                <img
                  src={toDirectImageUrl(header.coverImageUrl)}
                  alt="Cover"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : null}

              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            {/* Main */}
            <div className="-mt-10 px-5 pb-6">
              {/* Avatar */}
              <div className="h-20 w-20 rounded-2xl border-4 border-black/30 bg-white/10 overflow-hidden">
                {header.profileImageUrl ? (
                  <img
                    src={toDirectImageUrl(header.profileImageUrl)}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : null}
              </div>

              <div className="mt-3">
                <div className="text-2xl font-semibold text-white">{fullName}</div>
                {subtitle ? (
                  <div className="text-sm text-white/65 mt-1">{subtitle}</div>
                ) : (
                  <div className="text-sm text-white/50 mt-1">@{username}</div>
                )}
              </div>

              <div className="mt-5 space-y-3">
                <AnimatePresence initial={false}>
                  {blocks.map((b) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                    >
                      <RenderBlock block={b} headerFullName={fullName} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* If you want footer to control this, delete this block */}
              <div className="mt-6 text-center text-xs text-white/35">
                Powered by SmartCard
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function RenderBlock({ block, headerFullName }) {
  const d = block.data || {};

  if (block.type === "header") return null;

  if (block.type === "divider") {
    return <div className="h-px w-full bg-white/10" />;
  }

  if (block.type === "text") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80 text-sm leading-relaxed">
        {d.text || ""}
      </div>
    );
  }

  if (block.type === "button") {
    const url = safeUrl(d.url);
    const label = d.label || "Open";
    if (!url) return null;

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "block w-full rounded-2xl px-4 py-3 font-semibold text-sm",
          "bg-white text-gray-950 hover:bg-white/95 transition",
          "shadow-[0_18px_40px_rgba(255,255,255,0.10)]"
        )}
      >
        {label}
      </a>
    );
  }

  // ✅ Save Contact: supports items[] + legacy phone/email/website
  if (block.type === "save_contact") {
    const fullName = d.fullName?.trim() || headerFullName;

    const items = Array.isArray(d.items) ? d.items : [];

    const phone =
      items.find((i) => (i.kind || "").toLowerCase() === "phone")?.value?.trim() ||
      (d.phone || "").trim();

    const email =
      items.find((i) => (i.kind || "").toLowerCase() === "email")?.value?.trim() ||
      (d.email || "").trim();

    const websiteRaw =
      items.find((i) => (i.kind || "").toLowerCase() === "website")?.value?.trim() ||
      (d.website || "").trim();

    const website = safeUrl(websiteRaw);

    return (
      <button
        onClick={() => downloadVCF({ fullName, phone, email, website })}
        className={cn(
          "w-full rounded-2xl px-4 py-3 font-semibold text-sm",
          "bg-white text-gray-950 hover:bg-white/95 transition",
          "shadow-[0_18px_40px_rgba(255,255,255,0.10)]"
        )}
      >
        Save Contact
      </button>
    );
  }

  // ✅ Socials (TikTok supported)
  if (block.type === "socials") {
    const items = Array.isArray(d.items) ? d.items : [];
    if (items.length === 0) return null;

    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="grid grid-cols-5 gap-2">
          {items.slice(0, 10).map((it) => {
            const Icon = socialIcon(it.label);
            const url = safeUrl(it.url);
            if (!url) return null;

            return (
              <a
                key={it.id}
                href={url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "h-12 rounded-2xl border border-white/10 bg-black/20",
                  "grid place-items-center text-white/80",
                  "hover:bg-white/10 hover:text-white transition"
                )}
                title={it.label}
              >
                <Icon size={18} />
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  // ✅ Contact: supports items[] + legacy
  if (block.type === "contact") {
    const items = Array.isArray(d.items) ? d.items : [];

    const legacy = [
      d.phone ? { id: "p", kind: "phone", label: "Phone", value: d.phone } : null,
      d.email ? { id: "e", kind: "email", label: "Email", value: d.email } : null,
      d.website ? { id: "w", kind: "website", label: "Website", value: d.website } : null,
    ].filter(Boolean);

    const list = items.length ? items : legacy;

    if (!list.length) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm text-white/55 px-2 py-1">No contact info yet.</div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
        {list.map((it) => {
          const value = (it.value || "").trim();
          if (!value) return null;

          const Icon = contactKindIcon(it.kind);
          const href = contactKindHref(it.kind, value);

          const row = (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white/80 hover:bg-white/10 hover:text-white transition">
              <Icon size={18} />
              <div className="min-w-0">
                <div className="text-[11px] text-white/45">
                  {it.label || it.kind || "Contact"}
                </div>
                <div className="text-sm font-medium break-all">{value}</div>
              </div>
            </div>
          );

          return href ? (
            <a
              key={it.id}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
            >
              {row}
            </a>
          ) : (
            <div key={it.id}>{row}</div>
          );
        })}
      </div>
    );
  }

  // ✅ Footer: lines[] (dynamic)
  if (block.type === "footer") {
    const lines = Array.isArray(d.lines)
      ? d.lines
      : d.text
      ? [d.text]
      : [];

    if (!lines.length) return null;

    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-white/60 text-xs mb-1">
          <FileText size={14} />
          <span>Footer</span>
        </div>
        {lines.filter(Boolean).map((line, idx) => (
          <div key={idx} className="text-xs text-white/55 leading-relaxed">
            {line}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
