// src/pages/EditorPage.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Eye,
  Type,
  Link as LinkIcon,
  Phone,
  Mail,
  Globe,
  Layout,
  Minus,
} from "lucide-react";
import { useAuth } from "../lib/useAuth";
import { getMyUserDoc } from "../lib/auth";
import { getPublicProfile, saveProfile } from "../lib/profile";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ✅ Brand icons (auto-detect) — requires: npm i react-icons
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
  FaWeixin,
  FaLink,
} from "react-icons/fa";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
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

  // X / Twitter (using Twitter icon for stability)
  if (s.includes("x.com") || s.includes("twitter.com") || s.includes("twitter") || s.includes(" x "))
    return FaTwitter;

  if (s.includes("twitch.tv") || s.includes("twitch")) return FaTwitch;
  if (s.includes("discord.gg") || s.includes("discord.com") || s.includes("discord"))
    return FaDiscord;

  if (s.includes("wa.me") || s.includes("whatsapp.com") || s.includes("whatsapp"))
    return FaWhatsapp;
  if (s.includes("viber.com") || s.includes("viber")) return FaViber;

  // Threads: fallback (no stable FA icon in this pack)
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
  const lower = (s) => (s || "").toLowerCase();

  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${esc(fullName)}`];

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

const BLOCKS = [
  {
    type: "header",
    label: "Header",
    icon: Layout,
    template: () => ({
      id: uid(),
      type: "header",
      data: {
        fullName: "Your Name",
        position: "Position",
        company: "Company",
        profileImageUrl: "",
        coverImageUrl: "",
      },
    }),
  },
  {
    type: "save_contact",
    label: "Save Contact",
    icon: Phone,
    template: () => ({
      id: uid(),
      type: "save_contact",
      data: {
        fullName: "",
        // ✅ dynamic fields
        fields: [
          { id: uid(), label: "Phone", value: "" },
          { id: uid(), label: "Email", value: "" },
          { id: uid(), label: "Website", value: "" },
        ],
      },
    }),
  },
  {
    type: "text",
    label: "Text",
    icon: Type,
    template: () => ({
      id: uid(),
      type: "text",
      data: { text: "Write something..." },
    }),
  },
  {
    type: "button",
    label: "Button",
    icon: LinkIcon,
    template: () => ({
      id: uid(),
      type: "button",
      data: { label: "Visit Website", url: "https://example.com" },
    }),
  },
  {
    type: "contact",
    label: "Contact",
    icon: Phone,
    template: () => ({
      id: uid(),
      type: "contact",
      data: {
        // ✅ dynamic fields
        fields: [
          { id: uid(), label: "Phone", value: "" },
          { id: uid(), label: "Email", value: "" },
          { id: uid(), label: "Website", value: "" },
        ],
      },
    }),
  },
  {
    type: "socials",
    label: "Social icons",
    icon: Globe,
    template: () => ({
      id: uid(),
      type: "socials",
      data: {
        items: [
          { id: uid(), label: "Instagram", url: "https://instagram.com/" },
          { id: uid(), label: "LinkedIn", url: "https://linkedin.com/in/" },
          { id: uid(), label: "TikTok", url: "https://tiktok.com/" },
        ],
      },
    }),
  },
  {
    type: "footer",
    label: "Footer",
    icon: Type,
    template: () => ({
      id: uid(),
      type: "footer",
      data: { text: "Made with SmartCard" },
    }),
  },
  {
    type: "divider",
    label: "Divider",
    icon: Minus,
    template: () => ({ id: uid(), type: "divider", data: {} }),
  },
];

export default function EditorPage() {
  const { user, loading } = useAuth();

  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);

  const [blocks, setBlocks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const username = useMemo(() => (me?.username || "").toLowerCase(), [me]);

  // Load user + profile
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user) return;

      const udoc = await getMyUserDoc(user.uid);
      if (!mounted) return;
      setMe(udoc);

      if (!udoc?.username) return;

      const p = await getPublicProfile("@" + udoc.username);
      if (!mounted) return;

      const safeProfile = p || {
        username: udoc.username.toLowerCase(),
        ownerUid: user.uid,
        published: true,
        theme: {
          background: "#0b0f16",
          card: "#0f172a",
          primary: "#ffffff",
        },
        blocks: [],
        updatedAt: Date.now(),
      };

      const safeBlocks = Array.isArray(safeProfile.blocks)
        ? safeProfile.blocks
        : [];

      const normalizedProfile = {
        ...safeProfile,
        theme:
          safeProfile.theme || {
            background: "#0b0f16",
            card: "#0f172a",
            primary: "#ffffff",
          },
        published: safeProfile.published !== false,
      };

      // ✅ Backward compatibility migration (old save_contact/contact fields -> dynamic)
      const migratedBlocks = safeBlocks.map((b) => migrateBlock(b));

      setProfile(normalizedProfile);
      setBlocks(migratedBlocks);

      setSelectedId(migratedBlocks[0]?.id || null);
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedId) || null,
    [blocks, selectedId]
  );

  function addBlock(type) {
    const def = BLOCKS.find((b) => b.type === type);
    if (!def) return;
    const b = def.template();
    setBlocks((prev) => [b, ...prev]);
    setSelectedId(b.id);
  }

  function deleteBlock(id) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) {
      const remaining = blocks.filter((b) => b.id !== id);
      setSelectedId(remaining[0]?.id || null);
    }
  }

  function updateBlockData(id, patch) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, data: { ...(b.data || {}), ...patch } } : b
      )
    );
  }

  async function onSave() {
    if (!profile || !username) return;
    setSaving(true);

    try {
      const next = {
        ...profile,
        blocks,
        updatedAt: Date.now(),
      };
      await saveProfile(username, next);

      setToast("Saved ✅");
      setTimeout(() => setToast(""), 1200);
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Save failed");
      setTimeout(() => setToast(""), 2000);
    } finally {
      setSaving(false);
    }
  }

  function onDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    setBlocks((items) => arrayMove(items, oldIndex, newIndex));
  }

  // Safe conditional returns AFTER hooks
  if (loading) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-white/70">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-white/70">
        Not logged in.
      </div>
    );
  }

  if (!me?.username) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-white/70">
        No username found for this account.
      </div>
    );
  }

  const theme = profile?.theme || {
    background: "#0b0f16",
    card: "#0f172a",
    primary: "#ffffff",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* LEFT: Add Blocks + Layers */}
      <Panel title="Blocks & Layers" className="lg:col-span-3">
        {/* Add blocks */}
        <div className="grid gap-2">
          {BLOCKS.map((b) => {
            const Icon = b.icon;
            return (
              <button
                key={b.type}
                type="button"
                onClick={() => addBlock(b.type)}
                className={cn(
                  "w-full rounded-2xl border border-white/10 bg-white/5 p-3",
                  "hover:bg-white/10 transition text-left"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-2xl border border-white/10 bg-black/20 grid place-items-center">
                    <Icon size={18} className="text-white/80" />
                  </div>
                  <div>
                    <div className="text-white font-medium">{b.label}</div>
                    <div className="text-xs text-white/50">Click to add</div>
                  </div>
                  <div className="ml-auto text-white/50">
                    <Plus size={16} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Layers */}
        <div className="mt-5 pt-5 border-t border-white/10">
          <div className="text-sm font-medium text-white mb-3">Layers</div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {blocks.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                    No blocks yet. Add from above.
                  </div>
                )}

                {blocks.map((b) => (
                  <SortableRow
                    key={b.id}
                    block={b}
                    selected={b.id === selectedId}
                    onSelect={() => setSelectedId(b.id)}
                    onDelete={() => deleteBlock(b.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="mt-3 text-xs text-white/45">
            Drag layers to reorder. Click to select.
          </div>
        </div>
      </Panel>

      {/* MIDDLE: Live Preview */}
      <Panel
        title="Live Preview"
        className="lg:col-span-6"
        right={
          <div className="flex flex-wrap gap-2 items-center">
            {/* Publish toggle */}
            {profile && (
              <button
                type="button"
                onClick={() =>
                  setProfile((p) => ({ ...p, published: !p.published }))
                }
                className={cn(
                  "px-3 py-2 rounded-2xl text-sm border transition",
                  profile.published
                    ? "bg-green-500/10 border-green-500/30 text-green-200 hover:bg-green-500/15"
                    : "bg-red-500/10 border-red-500/30 text-red-200 hover:bg-red-500/15"
                )}
              >
                {profile.published ? "Published" : "Hidden"}
              </button>
            )}

            <button
              onClick={onSave}
              disabled={saving}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold",
                "bg-white text-gray-950 hover:bg-white/95 transition",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
              type="button"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save"}
            </button>

            <a
              href={`/#/@${me.username}`}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm",
                "border border-white/10 bg-white/5 text-white/80",
                "hover:bg-white/10 hover:text-white transition"
              )}
            >
              <Eye size={16} />
              Open
            </a>
          </div>
        }
      >
        <div className="grid place-items-center">
          <div className="w-full max-w-md">
            <PreviewCard
              blocks={blocks}
              theme={theme}
              selectedId={selectedId}
              onSelect={setSelectedId}
              username={me.username}
            />
          </div>
        </div>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-4 text-sm text-white/80"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      {/* RIGHT: Properties */}
      <Panel title="Properties" className="lg:col-span-3">
        {/* Theme editor */}
        {profile && (
          <div className="mb-5 space-y-3">
            <div className="text-sm font-medium text-white">Theme</div>

            <Field label="Background color">
              <input
                type="color"
                value={theme.background || "#0b0f16"}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    theme: { ...(p.theme || {}), background: e.target.value },
                  }))
                }
                className="h-10 w-14 rounded-xl border border-white/10 bg-black/20"
              />
            </Field>

            <Field label="Card color">
              <input
                type="color"
                value={theme.card || "#0f172a"}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    theme: { ...(p.theme || {}), card: e.target.value },
                  }))
                }
                className="h-10 w-14 rounded-xl border border-white/10 bg-black/20"
              />
            </Field>

            <Field label="Accent color">
              <input
                type="color"
                value={theme.primary || "#ffffff"}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    theme: { ...(p.theme || {}), primary: e.target.value },
                  }))
                }
                className="h-10 w-14 rounded-xl border border-white/10 bg-black/20"
              />
            </Field>

            <div className="text-[11px] text-white/45">
              Changes apply instantly in preview. Press <b>Save</b> to publish.
            </div>
          </div>
        )}

        {!selectedBlock ? (
          <div className="text-sm text-white/60">
            Select a block (in layers or preview) to edit.
          </div>
        ) : (
          <BlockInspector
            block={selectedBlock}
            onChange={(patch) => updateBlockData(selectedBlock.id, patch)}
          />
        )}
      </Panel>
    </div>
  );
}

/* ---------- Migration helpers ---------- */

function migrateBlock(block) {
  const b = { ...block, data: { ...(block.data || {}) } };

  // save_contact: old phone/email/website -> fields[]
  if (b.type === "save_contact") {
    if (!Array.isArray(b.data.fields)) {
      const fields = [];
      if (b.data.phone != null) fields.push({ id: uid(), label: "Phone", value: b.data.phone });
      if (b.data.email != null) fields.push({ id: uid(), label: "Email", value: b.data.email });
      if (b.data.website != null) fields.push({ id: uid(), label: "Website", value: b.data.website });

      if (fields.length === 0) {
        fields.push({ id: uid(), label: "Phone", value: "" });
        fields.push({ id: uid(), label: "Email", value: "" });
        fields.push({ id: uid(), label: "Website", value: "" });
      }

      b.data.fields = fields;

      // optional: remove old keys
      delete b.data.phone;
      delete b.data.email;
      delete b.data.website;
    }
  }

  // contact: old phone/email/website -> fields[]
  if (b.type === "contact") {
    if (!Array.isArray(b.data.fields)) {
      const fields = [];
      if (b.data.phone != null) fields.push({ id: uid(), label: "Phone", value: b.data.phone });
      if (b.data.email != null) fields.push({ id: uid(), label: "Email", value: b.data.email });
      if (b.data.website != null) fields.push({ id: uid(), label: "Website", value: b.data.website });

      if (fields.length === 0) {
        fields.push({ id: uid(), label: "Phone", value: "" });
        fields.push({ id: uid(), label: "Email", value: "" });
        fields.push({ id: uid(), label: "Website", value: "" });
      }

      b.data.fields = fields;

      delete b.data.phone;
      delete b.data.email;
      delete b.data.website;
    }
  }

  // footer: ensure text exists
  if (b.type === "footer") {
    if (typeof b.data.text !== "string") b.data.text = "";
  }

  return b;
}

/* ---------- Preview Canvas ---------- */

function PreviewCard({ blocks, theme, selectedId, onSelect, username }) {
  const header = blocks.find((b) => b.type === "header")?.data || {};
  const fullName = header.fullName || `@${username}`;
  const subtitle = [header.position, header.company].filter(Boolean).join(" • ");

  return (
    <div
      className="rounded-3xl border border-white/10 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
      style={{ background: theme.card }}
    >
      {/* Cover */}
      <div className="h-36 bg-white/5 relative overflow-hidden">
        {header.coverImageUrl ? (
          <img
            src={header.coverImageUrl}
            alt="Cover"
            className="h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="-mt-10 px-5 pb-6">
        {/* Avatar */}
        <div className="h-20 w-20 rounded-2xl border-4 border-black/30 bg-white/10 overflow-hidden">
          {header.profileImageUrl ? (
            <img
              src={header.profileImageUrl}
              alt="Profile"
              className="h-full w-full object-cover"
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
          {blocks.map((b) => (
            <div
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={cn(
                "transition",
                b.id === selectedId && b.type !== "header"
                  ? "outline outline-2 outline-white/25 rounded-2xl"
                  : ""
              )}
            >
              <RenderBlock block={b} headerFullName={fullName} />
            </div>
          ))}
        </div>
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
      <div
        className={cn(
          "block w-full rounded-2xl px-4 py-3 font-semibold text-sm",
          "bg-white text-gray-950",
          "shadow-[0_18px_40px_rgba(255,255,255,0.10)]"
        )}
        title="Preview (click Open to test)"
      >
        {label}
      </div>
    );
  }

  if (block.type === "save_contact") {
    const fullName = d.fullName?.trim() || headerFullName;

    const fields = Array.isArray(d.fields) ? d.fields : [];
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          downloadVCF({
            fullName,
            fields: fields.map((f) => ({ label: f.label || "", value: f.value || "" })),
          });
        }}
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
              <div
                key={it.id}
                className={cn(
                  "h-12 rounded-2xl border border-white/10 bg-black/20",
                  "grid place-items-center text-white/80"
                )}
                title={it.label}
              >
                <Icon size={18} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "contact") {
    const fields = Array.isArray(d.fields) ? d.fields : [];
    const nonEmpty = fields.filter((f) => (f?.value || "").trim());

    if (nonEmpty.length === 0) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm text-white/55 px-2 py-1">No contact info yet.</div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
        {nonEmpty.map((f) => {
          const label = (f.label || "").toLowerCase();
          const val = (f.value || "").trim();

          let Icon = Globe;
          if (label.includes("phone") || label.includes("mobile") || label === "tel") Icon = Phone;
          if (label.includes("email")) Icon = Mail;
          if (label.includes("website") || label.includes("url") || val.startsWith("http")) Icon = Globe;

          return (
            <div
              key={f.id || f.label}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white/80"
              title={f.label}
            >
              <Icon size={18} />
              <div className="min-w-0">
                <div className="text-xs text-white/50">{f.label}</div>
                <div className="text-sm font-medium break-all">{val}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

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

/* ---------- UI helpers ---------- */

function Panel({ title, right, className, children }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl",
        "shadow-[0_30px_80px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="text-white font-semibold">{title}</div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SortableRow({ block, selected, onSelect, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl border bg-white/5",
        selected ? "border-white/25" : "border-white/10",
        isDragging ? "opacity-70" : "opacity-100",
        "transition"
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <div className="p-3 flex items-center gap-2">
        <button
          type="button"
          className="h-9 w-9 rounded-xl border border-white/10 bg-black/20 grid place-items-center text-white/70 hover:text-white transition cursor-grab"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>

        <div className="min-w-0">
          <div className="text-white font-medium capitalize">{block.type}</div>
          <div className="text-xs text-white/50 truncate">{blockPreview(block)}</div>
        </div>

        <button
          type="button"
          className="ml-auto h-9 w-9 rounded-xl border border-white/10 bg-black/20 grid place-items-center text-white/70 hover:text-red-200 hover:border-red-500/30 transition"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function blockPreview(b) {
  const d = b.data || {};
  if (b.type === "header") return `${d.fullName || ""} • ${d.position || ""}`;
  if (b.type === "save_contact") return "Save contact (.vcf)";
  if (b.type === "text") return d.text || "";
  if (b.type === "button") return `${d.label || "Button"} → ${d.url || ""}`;
  if (b.type === "contact") return `${(d.fields || []).length} fields`;
  if (b.type === "socials") return `${(d.items || []).length} links`;
  if (b.type === "footer") return d.text || "Footer";
  if (b.type === "divider") return "—";
  return "";
}

/* ---------- Inspector ---------- */

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-white/55">{label}</div>
      {children}
      {hint && <div className="text-[11px] text-white/40">{hint}</div>}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-black/20 text-white",
        "px-3 py-2 outline-none",
        "placeholder:text-white/35",
        "focus:border-white/25 focus:bg-black/30 transition"
      )}
    />
  );
}

function Textarea(props) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-black/20 text-white",
        "px-3 py-2 outline-none min-h-[110px]",
        "placeholder:text-white/35",
        "focus:border-white/25 focus:bg-black/30 transition"
      )}
    />
  );
}

function BlockInspector({ block, onChange }) {
  const d = block.data || {};

  if (block.type === "header") {
    return (
      <div className="space-y-4">
        <Field label="Full name">
          <Input value={d.fullName || ""} onChange={(e) => onChange({ fullName: e.target.value })} />
        </Field>

        <Field label="Position">
          <Input value={d.position || ""} onChange={(e) => onChange({ position: e.target.value })} />
        </Field>

        <Field label="Company">
          <Input value={d.company || ""} onChange={(e) => onChange({ company: e.target.value })} />
        </Field>

        <Field label="Profile image URL" hint="Paste image URL (premium upload later)">
          <Input
            value={d.profileImageUrl || ""}
            onChange={(e) => onChange({ profileImageUrl: e.target.value })}
            placeholder="https://..."
          />
        </Field>

        <Field label="Cover image URL" hint="Paste image URL (premium upload later)">
          <Input
            value={d.coverImageUrl || ""}
            onChange={(e) => onChange({ coverImageUrl: e.target.value })}
            placeholder="https://..."
          />
        </Field>
      </div>
    );
  }

  // ✅ Save Contact with dynamic fields
  if (block.type === "save_contact") {
    const fields = Array.isArray(d.fields) ? d.fields : [];

    function addField() {
      onChange({
        fields: [{ id: uid(), label: "New field", value: "" }, ...fields],
      });
    }

    function updateField(fieldId, patch) {
      onChange({
        fields: fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
      });
    }

    function removeField(fieldId) {
      onChange({ fields: fields.filter((f) => f.id !== fieldId) });
    }

    return (
      <div className="space-y-4">
        <Field label="Full name (optional)">
          <Input
            value={d.fullName || ""}
            onChange={(e) => onChange({ fullName: e.target.value })}
            placeholder="Leave empty to use Header name"
          />
        </Field>

        <div className="flex items-center justify-between">
          <div className="text-sm text-white/80 font-medium">Fields</div>
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition"
          >
            <Plus size={16} />
            Add field
          </button>
        </div>

        <div className="space-y-2">
          {fields.length === 0 && (
            <div className="text-sm text-white/60">No fields yet. Add one.</div>
          )}

          {fields.map((f) => (
            <div
              key={f.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2"
            >
              <Field label="Label">
                <Input
                  value={f.label || ""}
                  onChange={(e) => updateField(f.id, { label: e.target.value })}
                  placeholder="Phone / Email / Website / Location..."
                />
              </Field>

              <Field label="Value">
                <Input
                  value={f.value || ""}
                  onChange={(e) => updateField(f.id, { value: e.target.value })}
                  placeholder="Enter value..."
                />
              </Field>

              <button
                type="button"
                onClick={() => removeField(f.id)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 text-white/70 hover:text-red-200 hover:border-red-500/30 py-2 transition"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-white/45">
          Tip: Use labels like <b>Phone</b>, <b>Email</b>, <b>Website</b>, <b>Location</b> for best vCard output.
        </div>
      </div>
    );
  }

  if (block.type === "text") {
    return (
      <div className="space-y-4">
        <Field label="Text">
          <Textarea value={d.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
        </Field>
      </div>
    );
  }

  if (block.type === "button") {
    return (
      <div className="space-y-4">
        <Field label="Button label">
          <Input value={d.label || ""} onChange={(e) => onChange({ label: e.target.value })} />
        </Field>
        <Field label="URL">
          <Input value={d.url || ""} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://..." />
        </Field>
      </div>
    );
  }

  // ✅ Contact with dynamic fields
  if (block.type === "contact") {
    const fields = Array.isArray(d.fields) ? d.fields : [];

    function addField() {
      onChange({
        fields: [{ id: uid(), label: "New field", value: "" }, ...fields],
      });
    }

    function updateField(fieldId, patch) {
      onChange({
        fields: fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
      });
    }

    function removeField(fieldId) {
      onChange({ fields: fields.filter((f) => f.id !== fieldId) });
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/80 font-medium">Fields</div>
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition"
          >
            <Plus size={16} />
            Add field
          </button>
        </div>

        <div className="space-y-2">
          {fields.length === 0 && (
            <div className="text-sm text-white/60">No fields yet. Add one.</div>
          )}

          {fields.map((f) => (
            <div
              key={f.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2"
            >
              <Field label="Label">
                <Input
                  value={f.label || ""}
                  onChange={(e) => updateField(f.id, { label: e.target.value })}
                  placeholder="Phone / Email / Website / Location..."
                />
              </Field>

              <Field label="Value">
                <Input
                  value={f.value || ""}
                  onChange={(e) => updateField(f.id, { value: e.target.value })}
                  placeholder="Enter value..."
                />
              </Field>

              <button
                type="button"
                onClick={() => removeField(f.id)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 text-white/70 hover:text-red-200 hover:border-red-500/30 py-2 transition"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "socials") {
    const items = Array.isArray(d.items) ? d.items : [];

    function add() {
      onChange({
        items: [{ id: uid(), label: "New", url: "https://..." }, ...items],
      });
    }
    function update(itemId, patch) {
      onChange({
        items: items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      });
    }
    function remove(itemId) {
      onChange({ items: items.filter((it) => it.id !== itemId) });
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/80 font-medium">Links</div>
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition"
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        <div className="space-y-2">
          {items.length === 0 && (
            <div className="text-sm text-white/60">No social links yet.</div>
          )}

          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2"
            >
              <Field label="Label">
                <Input
                  value={it.label || ""}
                  onChange={(e) => update(it.id, { label: e.target.value })}
                />
              </Field>
              <Field label="URL">
                <Input
                  value={it.url || ""}
                  onChange={(e) => update(it.id, { url: e.target.value })}
                />
              </Field>

              <div className="text-xs text-white/55">
                Preview icon:{" "}
                <span className="inline-flex items-center gap-2">
                  {(() => {
                    const Icon = pickSocialIcon(it.label, it.url);
                    return <Icon size={16} />;
                  })()}
                  <span className="text-white/70">{it.label || "Link"}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => remove(it.id)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 text-white/70 hover:text-red-200 hover:border-red-500/30 py-2 transition"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "footer") {
    return (
      <div className="space-y-4">
        <Field label="Footer text">
          <Textarea
            value={d.text || ""}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Write a short footer message..."
          />
        </Field>
      </div>
    );
  }

  if (block.type === "divider") {
    return <div className="text-sm text-white/60">Divider has no settings.</div>;
  }

  return <div className="text-sm text-white/60">No inspector available.</div>;
}
