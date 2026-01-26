// src/pages/PublicProfilePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mail, Globe } from "lucide-react";
import { subscribePublicProfile } from "../lib/profile";
import { toDirectImageUrl } from "../lib/url";

// ✅ Brand icons (auto-detect)
import {
  FaInstagram,
  FaSnapchatGhost,
  FaFacebookF,
  FaTwitter,
  FaTwitch,
  FaDiscord,
  FaWhatsapp,
  FaViber,
  FaYoutube,
  FaTiktok,
  FaPinterestP,
  FaLinkedinIn,
  FaTelegramPlane,
  FaWeixin, // WeChat
  FaLink, // fallback
} from "react-icons/fa";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}

function normalizeUsername(u) {
  return (u || "").replace("@", "").trim().toLowerCase();
}

function safeUrl(url) {
  if (!url) return "";
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `https://${u}`;
}

// ✅ Auto-detect icon by label OR url
function pickSocialIcon(label, url) {
  const s = `${label || ""} ${url || ""}`.toLowerCase();

  if (s.includes("instagram.com") || s.includes("insta")) return FaInstagram;
  if (s.includes("snapchat.com") || s.includes("snap")) return FaSnapchatGhost;
  if (s.includes("facebook.com") || s.includes("fb")) return FaFacebookF;

  // X / Twitter (use twitter icon for stability)
  if (s.includes("x.com") || s.includes("twitter.com") || s.includes("twitter") || s.includes(" x "))
    return FaTwitter;

  if (s.includes("twitch.tv") || s.includes("twitch")) return FaTwitch;
  if (s.includes("discord.gg") || s.includes("discord.com") || s.includes("discord"))
    return FaDiscord;

  if (s.includes("wa.me") || s.includes("whatsapp.com") || s.includes("whatsapp"))
    return FaWhatsapp;
  if (s.includes("viber.com") || s.includes("viber")) return FaViber;

  // Threads: no stable FA icon here, fallback
  if (s.includes("threads.net") || s.includes("threads")) return FaLink;

  if (s.includes("youtube.com") || s.includes("youtu.be") || s.includes("youtube"))
    return FaYoutube;

  if (s.includes("tiktok.com") || s.includes("tiktok")) return FaTiktok;

  if (s.includes("pinterest.com") || s.includes("pinterest")) return FaPinterestP;

  if (s.includes("linkedin.com") || s.includes("linkedin")) return FaLinkedinIn;

  if (s.includes("t.me") || s.includes("telegram.me") || s.includes("telegram"))
    return FaTelegramPlane;

  if (s.includes("wechat") || s.includes("weixin") || s.includes("weixin.qq.com"))
    return FaWeixin;

  return FaLink;
}

function downloadVCF({ fullName, fields }) {
  const esc = (v) => (v || "").replace(/\n/g, " ").trim();

  // fields: [{ label, value }]
  // We'll map some common labels to vCard properties when possible.
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${esc(fullName)}`];

  const lower = (s) => (s || "").toLowerCase();

  for (const f of fields || []) {
    const label = lower(f.label);
    const value = esc(f.value);
    if (!value) continue;

    if (label.includes("phone") || label === "tel" || label === "mobile") {
      lines.push(`TEL:${value}`);
    } else if (label.includes("email")) {
      lines.push(`EMAIL:${value}`);
    } else if (label.includes("website") || label.includes("url")) {
      lines.push(`URL:${safeUrl(value)}`);
    } else if (label.includes("location") || label.includes("address")) {
      lines.push(`ADR:${value}`);
    } else {
      // custom field -> NOTE
      lines.push(`NOTE:${esc(`${f.label}: ${f.value}`)}`);
    }
  }

  lines.push("END:VCARD");

  const blob = new Blob([lines.join("\n")], { type: "text/vcard" });
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

    // ✅ IMPORTANT: subscribePublicProfile expects "@username"
    const unsub = subscribePublicProfile("@" + username, (p) => {
      setProfile(p);
      setLoading(false);
    });

    return () => unsub?.();
  }, [username]);

  // Default theme for loading / not found states
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

  // If doc doesn't exist
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

  // If it's a redirect stub, show quick redirect message while effect navigates
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

  // ✅ Publish toggle support
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
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: theme.background }}
    >
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
                      <RenderBlock
                        block={b}
                        headerFullName={fullName}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

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

/* ---------- Block rendering ---------- */

function RenderBlock({ block, headerFullName }) {
  const d = block.data || {};

  // Header already rendered at top
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

  /* ✅ SAVE CONTACT — supports dynamic fields */
  if (block.type === "save_contact") {
    const fullName = (d.fullName || "").trim() || headerFullName;

    // New format: data.fields = [{ id,label,value }]
    // Fallback to old format: phone/email/website
    const fields =
      Array.isArray(d.fields) && d.fields.length
        ? d.fields.map((f) => ({
            label: f.label || "",
            value: f.value || "",
          }))
        : [
            { label: "Phone", value: d.phone || "" },
            { label: "Email", value: d.email || "" },
            { label: "Website", value: d.website || "" },
          ];

    return (
      <button
        onClick={() => downloadVCF({ fullName, fields })}
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

  /* ✅ SOCIALS — auto-detect icons */
  if (block.type === "socials") {
    const items = Array.isArray(d.items) ? d.items : [];
    if (items.length === 0) return null;

    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="grid grid-cols-5 gap-2">
          {items.slice(0, 10).map((it) => {
            const url = safeUrl(it.url);
            if (!url) return null;

            const Icon = pickSocialIcon(it.label, it.url);

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

  /* ✅ CONTACT — supports dynamic fields + nice icons for phone/email/url */
  if (block.type === "contact") {
    // New format: data.fields = [{ id,label,value }]
    // Fallback to old format: phone/email/website
    const fields =
      Array.isArray(d.fields) && d.fields.length
        ? d.fields
        : [
            { id: "phone", label: "Phone", value: d.phone || "" },
            { id: "email", label: "Email", value: d.email || "" },
            { id: "website", label: "Website", value: d.website || "" },
          ];

    const nonEmpty = fields.filter((f) => (f?.value || "").trim());
    if (nonEmpty.length === 0) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm text-white/55 px-2 py-1">
            No contact info yet.
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
        {nonEmpty.map((f) => {
          const label = (f.label || "").toLowerCase();
          const val = (f.value || "").trim();

          let href = "";
          let Icon = Globe;

          if (label.includes("phone") || label.includes("mobile") || label === "tel") {
            href = `tel:${val}`;
            Icon = Phone;
          } else if (label.includes("email")) {
            href = `mailto:${val}`;
            Icon = Mail;
          } else if (label.includes("website") || label.includes("url") || val.startsWith("http")) {
            href = safeUrl(val);
            Icon = Globe;
          } else {
            // For custom contact fields, don't force a link
            href = "";
            Icon = Globe;
          }

          const row = (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white/80 hover:bg-white/10 hover:text-white transition">
              <Icon size={18} />
              <div className="min-w-0">
                <div className="text-xs text-white/50">{f.label}</div>
                <div className="text-sm font-medium break-all">{val}</div>
              </div>
            </div>
          );

          if (!href) return <div key={f.id || f.label}>{row}</div>;

          return (
            <a
              key={f.id || f.label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noreferrer" : undefined}
            >
              {row}
            </a>
          );
        })}
      </div>
    );
  }

  /* ✅ FOOTER — editable text */
  if (block.type === "footer") {
    const text = (d.text || "").trim();
    if (!text) return null;

    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70 text-sm">
        {text}
      </div>
    );
  }

  return null;
}
