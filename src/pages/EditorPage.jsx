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
  Globe,
  Layout,
  Minus,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  Music2,
  Instagram,
  Linkedin,
  Facebook,
  Youtube,
  Twitter,
  FileText,
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

/** ---------- SOCIAL ICONS (preview) ---------- */
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

/** ---------- Contact kind -> icon (preview) ---------- */
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

function defaultSaveContactItems() {
  return [
    { id: uid(), kind: "phone", label: "Phone", value: "" },
    { id: uid(), kind: "email", label: "Email", value: "" },
    { id: uid(), kind: "website", label: "Website", value: "" },
  ];
}

function defaultContactItems() {
  return [
    { id: uid(), kind: "phone", label: "Phone", value: "" },
    { id: uid(), kind: "email", label: "Email", value: "" },
    { id: uid(), kind: "website", label: "Website", value: "" },
    { id: uid(), kind: "location", label: "Location", value: "" },
  ];
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
        // ✅ NEW dynamic fields
        items: defaultSaveContactItems(),
        // (legacy support: phone/email/website may exist from old data)
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
        // ✅ NEW dynamic fields
        items: defaultContactItems(),
        // (legacy support: phone/email/website may exist from old data)
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
          { id: uid(), label: "TikTok", url: "https://www.tiktok.com/@" },
        ],
      },
    }),
  },
  {
    type: "footer",
    label: "Footer",
    icon: FileText,
    template: () => ({
      id: uid(),
      type: "footer",
      data: {
        // ✅ NEW dynamic lines
        lines: ["Made with SmartCard"],
      },
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
        theme: safeProfile.theme || {
          background: "#0b0f16",
          card: "#0f172a",
          primary: "#ffffff",
        },
        published: safeProfile.published !== false,
      };

      setProfile(normalizedProfile);
      setBlocks(safeBlocks);

      setSelectedId(safeBlocks[0]?.id || null);
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

      {/* MIDDLE: Live Preview (Canvas) */}
      <Panel
        title="Live Preview"
        className="lg:col-span-6"
        right={
          <div className="flex flex-wrap gap-2 items-center">
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

  // ✅ Save Contact: supports new items[] + legacy fields
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
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          downloadVCF({ fullName, phone, email, website });
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

  // ✅ Socials: show proper icons based on label (TikTok supported)
  if (block.type === "socials") {
    const items = Array.isArray(d.items) ? d.items : [];
    if (items.length === 0) return null;

    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="grid grid-cols-5 gap-2">
          {items.slice(0, 10).map((it) => {
            const url = safeUrl(it.url);
            if (!url) return null;
            const Icon = socialIcon(it.label);

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

  // ✅ Contact: supports new items[] + legacy fields
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
          <div className="text-sm text-white/55 px-2 py-1">
            No contact info yet.
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
        {list.map((it) => {
          const value = (it.value || "").trim();
          if (!value) return null;

          const Icon = contactKindIcon(it.kind);

          return (
            <div
              key={it.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white/80"
              title={it.label || it.kind}
            >
              <Icon size={18} />
              <div className="min-w-0">
                <div className="text-[11px] text-white/45">
                  {it.label || it.kind || "Contact"}
                </div>
                <div className="text-sm font-medium break-all">{value}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ✅ Footer: dynamic lines
  if (block.type === "footer") {
    const lines = Array.isArray(d.lines)
      ? d.lines
      : d.text
      ? [d.text]
      : [];
    if (!lines.length) return null;

    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center space-y-1">
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
  if (b.type === "contact") {
    const items = Array.isArray(d.items) ? d.items : [];
    return items.length ? `${items.length} fields` : "Contact fields";
  }
  if (b.type === "socials") return `${(d.items || []).length} links`;
  if (b.type === "footer") return "Footer text";
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

const KIND_OPTIONS = [
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "website", label: "Website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "location", label: "Location" },
  { value: "address", label: "Address" },
  { value: "custom", label: "Custom" },
];

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-black/20 text-white",
        "px-3 py-2 outline-none",
        "focus:border-white/25 focus:bg-black/30 transition"
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-black">
          {o.label}
        </option>
      ))}
    </select>
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

  // ✅ Save contact inspector: dynamic items
  if (block.type === "save_contact") {
    const items = Array.isArray(d.items) ? d.items : defaultSaveContactItems();

    function addField() {
      onChange({
        items: [
          { id: uid(), kind: "custom", label: "New field", value: "" },
          ...items,
        ],
      });
    }

    function updateField(itemId, patch) {
      onChange({
        items: items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      });
    }

    function removeField(itemId) {
      onChange({ items: items.filter((it) => it.id !== itemId) });
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
          {items.map((it) => (
            <div key={it.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Type">
                  <Select
                    value={it.kind || "custom"}
                    onChange={(e) => updateField(it.id, { kind: e.target.value })}
                    options={KIND_OPTIONS}
                  />
                </Field>
                <Field label="Label">
                  <Input
                    value={it.label || ""}
                    onChange={(e) => updateField(it.id, { label: e.target.value })}
                    placeholder="e.g. Location"
                  />
                </Field>
              </div>

              <Field label="Value">
                <Input
                  value={it.value || ""}
                  onChange={(e) => updateField(it.id, { value: e.target.value })}
                  placeholder="Type value..."
                />
              </Field>

              <button
                type="button"
                onClick={() => removeField(it.id)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 text-white/70 hover:text-red-200 hover:border-red-500/30 py-2 transition"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-white/45">
          Note: vCard downloads use phone/email/website fields. Extra fields are shown on the page (not in vCard yet).
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

  // ✅ Contact inspector: dynamic items
  if (block.type === "contact") {
    const items = Array.isArray(d.items) ? d.items : defaultContactItems();

    function addField() {
      onChange({
        items: [
          { id: uid(), kind: "custom", label: "New field", value: "" },
          ...items,
        ],
      });
    }

    function updateField(itemId, patch) {
      onChange({
        items: items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      });
    }

    function removeField(itemId) {
      onChange({ items: items.filter((it) => it.id !== itemId) });
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
          {items.map((it) => (
            <div key={it.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Type">
                  <Select
                    value={it.kind || "custom"}
                    onChange={(e) => updateField(it.id, { kind: e.target.value })}
                    options={KIND_OPTIONS}
                  />
                </Field>
                <Field label="Label">
                  <Input
                    value={it.label || ""}
                    onChange={(e) => updateField(it.id, { label: e.target.value })}
                    placeholder="e.g. WhatsApp"
                  />
                </Field>
              </div>

              <Field label="Value">
                <Input
                  value={it.value || ""}
                  onChange={(e) => updateField(it.id, { value: e.target.value })}
                  placeholder="Type value..."
                />
              </Field>

              <button
                type="button"
                onClick={() => removeField(it.id)}
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
        items: [{ id: uid(), label: "TikTok", url: "https://tiktok.com/@" }, ...items],
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
              <Field label="Label (Instagram, TikTok, X...)">
                <Input
                  value={it.label}
                  onChange={(e) => update(it.id, { label: e.target.value })}
                />
              </Field>
              <Field label="URL">
                <Input
                  value={it.url}
                  onChange={(e) => update(it.id, { url: e.target.value })}
                />
              </Field>
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

        <div className="text-[11px] text-white/45">
          Tip: Write label like “TikTok” and icon will match automatically.
        </div>
      </div>
    );
  }

  // ✅ Footer inspector
  if (block.type === "footer") {
    const lines = Array.isArray(d.lines)
      ? d.lines
      : d.text
      ? [d.text]
      : ["Made with SmartCard"];

    function addLine() {
      onChange({ lines: ["New line", ...lines] });
    }
    function updateLine(idx, val) {
      onChange({ lines: lines.map((l, i) => (i === idx ? val : l)) });
    }
    function removeLine(idx) {
      onChange({ lines: lines.filter((_, i) => i !== idx) });
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/80 font-medium">Footer lines</div>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition"
          >
            <Plus size={16} />
            Add line
          </button>
        </div>

        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
              <Field label={`Line ${idx + 1}`}>
                <Input value={line} onChange={(e) => updateLine(idx, e.target.value)} />
              </Field>

              <button
                type="button"
                onClick={() => removeLine(idx)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 text-white/70 hover:text-red-200 hover:border-red-500/30 py-2 transition"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-white/45">
          Add a description, tagline, address, copyright, etc.
        </div>
      </div>
    );
  }

  if (block.type === "divider") {
    return <div className="text-sm text-white/60">Divider has no settings.</div>;
  }

  return <div className="text-sm text-white/60">No inspector available.</div>;
}
