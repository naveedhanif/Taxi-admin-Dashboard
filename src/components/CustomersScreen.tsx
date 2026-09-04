import { useState, useEffect, useMemo } from "react";
import {
  Users, Loader2, AlertCircle, Tag, Plus, Trash2, Copy, Check, X, Gift, Percent, Zap,
  Search, Filter, Download, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal,
  Mail, Phone as PhoneIcon, Calendar, TrendingUp,
} from "lucide-react";
import { supabase } from "../supabaseClient";

// MAJOR DESIGN OVERHAUL of the Customers page, built from your spec.
// Every underlying edge function call (get-driver-customers,
// manage-promo-codes) and every piece of real data is unchanged —
// this adds real, working interactivity on top (search/filter/sort/
// pagination/bulk-send), all computed from data already being
// fetched, no fabricated numbers, no new backend endpoints needed.
//
// Adapted from the brief to this app's real data shape:
//   - No "VIP" flag exists in the schema — implemented as a real
//     filter (totalSpent > €500) computed from real numbers.
//   - "Has Active Promo" is cross-referenced client-side against the
//     promo list already being fetched (a customer_id match on an
//     active, non-expired, non-maxed-out code).
//   - Bulk "send promo to selected" reuses the exact same
//     manage-promo-codes create call, once per selected customer,
//     rather than inventing a new bulk endpoint.
//   - The "View Details" slide-out shows every real field this app
//     has for a customer (contact info, stats, their own promo
//     codes) — it does NOT fabricate a fake trip-by-trip history,
//     since that data isn't available from get-driver-customers today.

const PAGE_SIZE = 10;

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, []);
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  signedUpAt: string;
  tripCount: number;
  totalSpent: number;
  lastRide: string | null;
}

interface Promo {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  customer_id: string | null;
  customer_name: string | null;
  max_uses: number | null;
  uses_count: number;
  active: boolean;
  expires_at: string | null;
}

async function authedFetch(fnName: string, body: Record<string, unknown>) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionData.session?.access_token || anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || "Something went wrong" };
  return data;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function isPromoUsable(p: Promo): boolean {
  if (!p.active) return false;
  if (p.expires_at && new Date(p.expires_at) < new Date()) return false;
  if (p.max_uses != null && p.uses_count >= p.max_uses) return false;
  return true;
}

function EmbossStyles() {
  return (
    <style>{`
      .emboss-btn { background: #F0EEE7; border: none; box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85); transition: box-shadow 0.12s ease, transform 0.08s ease; }
      .emboss-btn:active { box-shadow: inset 2px 2px 4px rgba(44,44,42,0.18), inset -2px -2px 4px rgba(255,255,255,0.7); transform: translateY(1px); }
      .emboss-btn-primary { background: #185FA5; border: none; box-shadow: 3px 3px 7px rgba(4,44,83,0.35), -2px -2px 5px rgba(133,183,235,0.55); transition: box-shadow 0.12s ease, transform 0.08s ease; }
      .emboss-btn-primary:active { box-shadow: inset 2px 2px 5px rgba(4,44,83,0.5), inset -2px -2px 4px rgba(133,183,235,0.35); transform: translateY(1px); }
      .emboss-input { background: #FFFFFF; border: 1px solid #E4E2DA; box-shadow: inset 1px 1px 3px rgba(44,44,42,0.08); transition: border-color 0.15s ease, box-shadow 0.15s ease; }
      .emboss-input:focus { outline: none; border-color: #185FA5; box-shadow: inset 1px 1px 3px rgba(44,44,42,0.08), 0 0 0 2px rgba(24,95,165,0.15); }
      @keyframes modalIn { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      .row-hover:hover { background: #FBFAF6; }
    `}</style>
  );
}

// Same fields/validation/create-call as before — a real modal, used by
// both the Promo Codes tab's "New code" button and the slide-out's
// "Send promo" action.
function PromoModal({
  driverId,
  presetCustomer,
  onClose,
  onCreated,
}: {
  driverId: string;
  presetCustomer: { id: string; name: string } | null;
  onClose: () => void;
  onCreated: (promo: Promo) => void;
}) {
  const [code, setCode] = useState("");
  const [discountValue, setDiscountValue] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCreate() {
    if (!code.trim()) {
      setErrorMessage("Give the code a name, e.g. WELCOME10");
      return;
    }
    const pct = parseFloat(discountValue) || 0;
    if (pct <= 0 || pct > 100) {
      setErrorMessage("Percent off must be between 1 and 100");
      return;
    }
    setSaving(true);
    setErrorMessage("");
    const result = await authedFetch("manage-promo-codes", {
      action: "create",
      driver_id: driverId,
      code: code.trim(),
      discount_type: "percent",
      discount_value: pct,
      customer_id: presetCustomer?.id ?? null,
      max_uses: maxUses ? parseInt(maxUses, 10) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    setSaving(false);
    if (result.error) {
      setErrorMessage(result.error);
      return;
    }
    onCreated(result.promo);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(44,44,42,0.45)" }} onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5"
        style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.25)", animation: "modalIn 160ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2C2C2A]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "#E6F1FB" }}>
              <Tag size={13} className="text-[#185FA5]" />
            </div>
            {presetCustomer ? `New code for ${presetCustomer.name}` : "New broadcast code"}
          </div>
          <button onClick={onClose} className="emboss-btn flex h-7 w-7 items-center justify-center rounded-full">
            <X size={13} className="text-[#5F5E5A]" />
          </button>
        </div>

        {!presetCustomer && (
          <p className="mb-3 mt-2 text-[11px] text-[#8C8977]">Any of your customers will be able to use this — not tied to one person.</p>
        )}
        <p className="mb-4 mt-2 rounded-lg p-2.5 text-[11px]" style={{ background: "#FAEEDA", color: "#633806" }}>
          When a passenger uses this code, it replaces your standard per-tariff discount for that booking — the two never stack.
        </p>

        {errorMessage && (
          <div className="mb-3 flex items-center gap-2 rounded-lg p-2.5 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
            <AlertCircle size={13} /> {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-[#5F5E5A]">Code</label>
            <input
              type="text"
              placeholder="WELCOME10"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="emboss-input w-full rounded-lg px-3 py-2.5 text-sm font-semibold uppercase text-[#2C2C2A]"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#5F5E5A]">Percent off</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="emboss-input w-full rounded-lg px-3 py-2.5 pr-7 text-sm font-semibold text-[#2C2C2A]"
              />
              <span className="absolute right-3 top-2.5 text-xs text-[#8C8977]">%</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#5F5E5A]">Max uses</label>
            <input
              type="number"
              min="1"
              placeholder="Unlimited"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="emboss-input w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-[#2C2C2A]"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-[#5F5E5A]">Expires (optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="emboss-input w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-[#2C2C2A]"
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={saving}
          className="emboss-btn-primary mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Create code
        </button>
      </div>
    </div>
  );
}

function PromoCard({ promo, onToggle, onDelete }: { key?: string; promo: Promo; onToggle: (p: Promo) => void; onDelete: (p: Promo) => void }) {
  const [copied, setCopied] = useState(false);
  const isExpired = promo.expires_at != null && new Date(promo.expires_at) < new Date();
  const isLive = promo.active && !isExpired;
  const usageRatio = promo.max_uses ? Math.min(promo.uses_count / promo.max_uses, 1) : null;

  return (
    <div className="rounded-xl p-3.5" style={{ background: isLive ? "#FBFAF6" : "#F7F7F5", border: "1px solid #ECE9E0", opacity: isLive ? 1 : 0.7 }}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-bold tracking-wide text-[#2C2C2A]">{promo.code}</span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(promo.code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="text-[#8C8977]"
            title="Copy code"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: isLive ? "#EAF3DE" : isExpired ? "#FCEBEB" : "#F1EFE8", color: isLive ? "#27500A" : isExpired ? "#791F1F" : "#8C8977" }}
        >
          {isExpired ? "Expired" : promo.active ? "Active" : "Paused"}
        </span>
      </div>
      <div className="mb-2.5 flex items-center gap-1.5 text-lg font-bold text-[#185FA5]" style={{ fontFamily: "'Space Grotesk'" }}>
        <Percent size={15} />
        {promo.discount_value}<span className="text-xs font-medium text-[#8C8977]"> off {promo.customer_name ? promo.customer_name.split(" ")[0] + "'s" : "any"} ride</span>
      </div>
      <div className="mb-3 flex items-center justify-between text-[11px] text-[#8C8977]">
        <span>{promo.customer_name ? `For ${promo.customer_name}` : "Broadcast — any customer"}</span>
        <span>{promo.max_uses != null ? `${promo.uses_count}/${promo.max_uses} used` : `${promo.uses_count} used`}</span>
      </div>
      {usageRatio !== null && (
        <div className="mb-3 h-1.5 overflow-hidden rounded-full" style={{ background: "#F0EEE7" }}>
          <div className="h-full rounded-full" style={{ width: `${usageRatio * 100}%`, background: "linear-gradient(90deg, #378ADD, #185FA5)" }} />
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <button onClick={() => onToggle(promo)} className="emboss-btn flex-1 rounded-lg py-1.5 text-[11px] font-semibold text-[#5F5E5A]">
          {promo.active ? "Pause" : "Resume"}
        </button>
        <button onClick={() => onDelete(promo)} className="emboss-btn flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#791F1F]">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

type SortField = "name" | "tripCount" | "totalSpent" | "lastRide";
type FilterKey = "inactive30" | "vip" | "hasPromo";

function KpiCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8C8977]">
        <Icon size={12} /> {label}
      </div>
      <div className="text-2xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>{value}</div>
    </div>
  );
}

// The slide-out "View Details" panel — every field here is real data
// this app already has for a customer (no invented trip history).
function CustomerDrawer({
  customer,
  promos,
  onClose,
  onSendPromo,
}: {
  customer: Customer;
  promos: Promo[];
  onClose: () => void;
  onSendPromo: () => void;
}) {
  const theirPromos = promos.filter((p) => p.customer_id === customer.id);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(44,44,42,0.35)" }} />
      <div
        className="relative flex h-full w-full max-w-md flex-col bg-white"
        style={{ boxShadow: "-12px 0 32px rgba(0,0,0,0.15)", animation: "slideIn 220ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ECE9E0] px-5 py-4">
          <div className="text-sm font-semibold text-[#2C2C2A]">Customer details</div>
          <button onClick={onClose} className="emboss-btn flex h-8 w-8 items-center justify-center rounded-full">
            <X size={14} className="text-[#5F5E5A]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-5 flex items-center gap-3">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
              style={{ background: "linear-gradient(135deg, #378ADD, #0C447C)", fontFamily: "'Space Grotesk'" }}
            >
              {initials(customer.name)}
            </div>
            <div>
              <div className="text-lg font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>{customer.name}</div>
              <div className="text-xs text-[#8C8977]">Customer since {new Date(customer.signedUpAt).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-3 gap-2">
            <div className="rounded-xl p-3 text-center" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
              <div className="text-lg font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>{customer.tripCount}</div>
              <div className="text-[10px] text-[#8C8977]">Trips</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
              <div className="text-lg font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>€{customer.totalSpent.toFixed(0)}</div>
              <div className="text-[10px] text-[#8C8977]">Spent</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
              <div className="text-sm font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                {customer.lastRide ? new Date(customer.lastRide).toLocaleDateString() : "—"}
              </div>
              <div className="text-[10px] text-[#8C8977]">Last ride</div>
            </div>
          </div>

          <div className="mb-5 space-y-2">
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm text-[#2C2C2A]">
                <PhoneIcon size={14} className="text-[#8C8977]" /> {customer.phone}
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-sm text-[#2C2C2A]">
                <Mail size={14} className="text-[#8C8977]" /> {customer.email}
              </div>
            )}
          </div>

          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold text-[#5F5E5A]">Promo codes for {customer.name.split(" ")[0]}</div>
            <button onClick={onSendPromo} className="emboss-btn-primary flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white">
              <Plus size={11} /> Send promo
            </button>
          </div>
          {theirPromos.length === 0 ? (
            <div className="rounded-xl py-6 text-center text-xs text-[#8C8977]" style={{ background: "#F7F7F5" }}>
              No promo codes targeted at this customer yet.
            </div>
          ) : (
            <div className="space-y-2">
              {theirPromos.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg p-2.5" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
                  <div>
                    <span className="font-mono text-xs font-bold text-[#2C2C2A]">{p.code}</span>
                    <span className="ml-2 text-[11px] text-[#8C8977]">{p.discount_value}% off</span>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: isPromoUsable(p) ? "#EAF3DE" : "#F1EFE8", color: isPromoUsable(p) ? "#27500A" : "#8C8977" }}
                  >
                    {isPromoUsable(p) ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CustomersScreen({ driverId }: { driverId: string | null }) {
  useGoogleFont();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [tab, setTab] = useState<"directory" | "promos" | "referral">("directory");
  const [modalTarget, setModalTarget] = useState<{ id: string; name: string } | null | "broadcast">(null);
  const [referralPercent, setReferralPercent] = useState<number>(10);
  const [referralInput, setReferralInput] = useState("10");
  const [savingReferral, setSavingReferral] = useState(false);
  const [referralSaved, setReferralSaved] = useState(false);

  // Directory controls
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortField, setSortField] = useState<SortField>("totalSpent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null>(null);
  const [bulkSending, setBulkSending] = useState(false);

  useEffect(() => {
    if (!driverId) return;
    loadAll();
    supabase
      .from("drivers")
      .select("referral_reward_percent")
      .eq("id", driverId)
      .single()
      .then(({ data }) => {
        const pct = data?.referral_reward_percent ?? 10;
        setReferralPercent(pct);
        setReferralInput(String(pct));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  async function loadAll() {
    setLoading(true);
    setErrorMessage("");
    const [customersResult, promosResult] = await Promise.all([
      authedFetch("get-driver-customers", { driver_id: driverId }),
      authedFetch("manage-promo-codes", { action: "list", driver_id: driverId }),
    ]);
    setLoading(false);
    if (customersResult.error) {
      setErrorMessage(customersResult.error);
      return;
    }
    if (promosResult.error) {
      setErrorMessage(promosResult.error);
      return;
    }
    setCustomers(customersResult.customers ?? []);
    setPromos(promosResult.promos ?? []);
  }

  async function handleSaveReferralPercent() {
    const pct = parseFloat(referralInput);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      setErrorMessage("Referral reward must be between 1 and 100");
      return;
    }
    setSavingReferral(true);
    const { error } = await supabase.from("drivers").update({ referral_reward_percent: pct }).eq("id", driverId);
    setSavingReferral(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setReferralPercent(pct);
    setReferralSaved(true);
    setTimeout(() => setReferralSaved(false), 1500);
  }

  async function handleTogglePromo(promo: Promo) {
    setPromos((prev) => prev.map((p) => (p.id === promo.id ? { ...p, active: !p.active } : p)));
    const result = await authedFetch("manage-promo-codes", { action: "toggle", driver_id: driverId, promo_id: promo.id, active: !promo.active });
    if (result.error) {
      setErrorMessage(result.error);
      loadAll();
    }
  }

  async function handleDeletePromo(promo: Promo) {
    setPromos((prev) => prev.filter((p) => p.id !== promo.id));
    const result = await authedFetch("manage-promo-codes", { action: "delete", driver_id: driverId, promo_id: promo.id });
    if (result.error) {
      setErrorMessage(result.error);
      loadAll();
    }
  }

  function handlePromoCreated(promo: Promo) {
    setPromos((prev) => [promo, ...prev]);
    setModalTarget(null);
  }

  // Cross-referenced client-side from data already fetched — no new
  // query. A customer "has an active promo" if any promo_codes row
  // targets them specifically and is currently usable.
  const customersWithActivePromo = useMemo(() => {
    const ids = new Set<string>();
    for (const p of promos) {
      if (p.customer_id && isPromoUsable(p)) ids.add(p.customer_id);
    }
    return ids;
  }, [promos]);

  const filteredSorted = useMemo(() => {
    const now = Date.now();
    let list = customers.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matches = c.name.toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (activeFilters.has("inactive30")) {
        const daysSince = c.lastRide ? (now - new Date(c.lastRide).getTime()) / 86400000 : Infinity;
        if (daysSince < 30) return false;
      }
      if (activeFilters.has("vip") && c.totalSpent <= 500) return false;
      if (activeFilters.has("hasPromo") && !customersWithActivePromo.has(c.id)) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "tripCount") cmp = a.tripCount - b.tripCount;
      else if (sortField === "totalSpent") cmp = a.totalSpent - b.totalSpent;
      else if (sortField === "lastRide") cmp = (a.lastRide ? new Date(a.lastRide).getTime() : 0) - (b.lastRide ? new Date(b.lastRide).getTime() : 0);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [customers, searchQuery, activeFilters, sortField, sortDir, customersWithActivePromo]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filteredSorted.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeFilters]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function toggleFilter(key: FilterKey) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    const pageIds = pageItems.map((c) => c.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function handleExportCsv() {
    const rows = filteredSorted.map((c) => ({
      Name: c.name,
      Phone: c.phone || "",
      Email: c.email || "",
      Trips: c.tripCount,
      "Total spent": c.totalSpent.toFixed(2),
      "Last ride": c.lastRide ? new Date(c.lastRide).toLocaleDateString() : "",
      "Customer since": new Date(c.signedUpAt).toLocaleDateString(),
    }));
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Bulk "send promo to selected" — loops the exact same create call
  // used everywhere else, once per selected customer, with an
  // auto-suffixed code so each row stays unique (manage-promo-codes
  // enforces UNIQUE(driver_id, code), same as a single manual create).
  async function handleBulkSendPromo() {
    if (selectedIds.size === 0) return;
    const pct = 10;
    const base = `BULK${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    setBulkSending(true);
    let i = 0;
    const created: Promo[] = [];
    for (const customerId of selectedIds) {
      i++;
      const result = await authedFetch("manage-promo-codes", {
        action: "create",
        driver_id: driverId,
        code: `${base}-${i}`,
        discount_type: "percent",
        discount_value: pct,
        customer_id: customerId,
        max_uses: 1,
        expires_at: null,
      });
      if (!result.error) created.push(result.promo);
    }
    setBulkSending(false);
    setPromos((prev) => [...created, ...prev]);
    setSelectedIds(new Set());
  }

  const kpiTotalCustomers = customers.length;
  const kpiActiveThisMonth = useMemo(() => {
    const now = new Date();
    return customers.filter((c) => c.lastRide && new Date(c.lastRide).getMonth() === now.getMonth() && new Date(c.lastRide).getFullYear() === now.getFullYear()).length;
  }, [customers]);
  const kpiAvgLtv = customers.length > 0 ? customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length : 0;

  const activePromoCount = promos.filter(isPromoUsable).length;
  const totalRedemptions = promos.reduce((sum, p) => sum + p.uses_count, 0);

  const SORT_ICON = (field: SortField) =>
    sortField !== field ? null : sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-[#5F5E5A]">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="w-full">
      <EmbossStyles />

      <div className="mb-1 flex items-center gap-2">
        <Users size={18} className="text-[#185FA5]" />
        <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
          Customers
        </h1>
      </div>
      <p className="mb-5 text-sm text-[#5F5E5A]">Who's booked with you, your promo codes, and referral rewards.</p>

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
          <AlertCircle size={14} /> {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "directory" as const, label: "Directory" },
          { id: "promos" as const, label: "Promo Codes" },
          { id: "referral" as const, label: "Referral Settings" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`emboss-btn shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold cursor-pointer ${tab === t.id ? "text-white" : "text-[#5F5E5A]"}`}
            style={
              tab === t.id
                ? { background: "linear-gradient(135deg, #378ADD, #0C447C)", boxShadow: "inset 2px 2px 5px rgba(4,44,83,0.5), inset -1px -1px 3px rgba(133,183,235,0.3)" }
                : undefined
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "directory" && (
        <>
          {/* KPI cards */}
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard label="Total customers" value={String(kpiTotalCustomers)} icon={Users} />
            <KpiCard label="Active this month" value={String(kpiActiveThisMonth)} icon={TrendingUp} />
            <KpiCard label="Average lifetime value" value={`€${kpiAvgLtv.toFixed(0)}`} icon={Percent} />
          </div>

          {/* Toolbar */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8977]" />
              <input
                type="text"
                placeholder="Search by name, phone, or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="emboss-input w-full rounded-xl py-2.5 pl-9 pr-3 text-sm text-[#2C2C2A]"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu((s) => !s)}
                className="emboss-btn flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#5F5E5A]"
              >
                <Filter size={14} /> Filter {activeFilters.size > 0 && `(${activeFilters.size})`}
              </button>
              {showFilterMenu && (
                <div
                  className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl bg-white p-2"
                  style={{ boxShadow: "0 12px 28px rgba(0,0,0,0.15)", border: "1px solid #ECE9E0" }}
                >
                  {[
                    { key: "inactive30" as const, label: "Inactive for 30+ days" },
                    { key: "vip" as const, label: "VIPs — spent > €500" },
                    { key: "hasPromo" as const, label: "Has an active promo" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => toggleFilter(f.key)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-[#2C2C2A] hover:bg-[#F7F7F5]"
                    >
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                        style={{ background: activeFilters.has(f.key) ? "#185FA5" : "#F0EEE7", border: activeFilters.has(f.key) ? "none" : "1px solid #E4E2DA" }}
                      >
                        {activeFilters.has(f.key) && <Check size={11} color="white" />}
                      </span>
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleExportCsv}
              className="emboss-btn flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#5F5E5A]"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-xl p-3" style={{ background: "#E6F1FB", border: "1px solid #C9DFF4" }}>
              <span className="text-xs font-semibold text-[#0C447C]">{selectedIds.size} selected</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkSendPromo}
                  disabled={bulkSending}
                  className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {bulkSending ? <Loader2 size={11} className="animate-spin" /> : <Tag size={11} />}
                  Send 10% promo to selected
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="text-xs font-medium text-[#0C447C] underline">
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Data table */}
          <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid #ECE9E0" }}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr style={{ background: "#FBFAF6", borderBottom: "1px solid #ECE9E0" }}>
                    <th className="w-10 px-4 py-3">
                      <button onClick={toggleSelectAllOnPage} className="flex h-4 w-4 items-center justify-center rounded" style={{ background: "#F0EEE7", border: "1px solid #E4E2DA" }}>
                        {pageItems.length > 0 && pageItems.every((c) => selectedIds.has(c.id)) && <Check size={11} color="#185FA5" />}
                      </button>
                    </th>
                    <th className="cursor-pointer px-2 py-3 text-[11px] font-semibold uppercase text-[#8C8977]" onClick={() => toggleSort("name")}>
                      <span className="flex items-center gap-1">Customer {SORT_ICON("name")}</span>
                    </th>
                    <th className="px-2 py-3 text-[11px] font-semibold uppercase text-[#8C8977]">Contact</th>
                    <th className="cursor-pointer px-2 py-3 text-[11px] font-semibold uppercase text-[#8C8977]" onClick={() => toggleSort("tripCount")}>
                      <span className="flex items-center gap-1">Trips {SORT_ICON("tripCount")}</span>
                    </th>
                    <th className="cursor-pointer px-2 py-3 text-[11px] font-semibold uppercase text-[#8C8977]" onClick={() => toggleSort("totalSpent")}>
                      <span className="flex items-center gap-1">Total spent {SORT_ICON("totalSpent")}</span>
                    </th>
                    <th className="cursor-pointer px-2 py-3 text-[11px] font-semibold uppercase text-[#8C8977]" onClick={() => toggleSort("lastRide")}>
                      <span className="flex items-center gap-1">Last ride {SORT_ICON("lastRide")}</span>
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase text-[#8C8977]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#8C8977]">
                        {customers.length === 0 ? "No signed-in customers yet — guest bookings don't create an account." : "No customers match your search/filters."}
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((c) => (
                      <tr
                        key={c.id}
                        className="row-hover cursor-pointer"
                        style={{ borderBottom: "1px solid #F0EEE7" }}
                        onClick={() => setDrawerCustomer(c)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleSelect(c.id)} className="flex h-4 w-4 items-center justify-center rounded" style={{ background: "#F0EEE7", border: "1px solid #E4E2DA" }}>
                            {selectedIds.has(c.id) && <Check size={11} color="#185FA5" />}
                          </button>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                              style={{ background: "linear-gradient(135deg, #378ADD, #0C447C)", fontFamily: "'Space Grotesk'" }}
                            >
                              {initials(c.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-[#2C2C2A]">{c.name}</div>
                              {customersWithActivePromo.has(c.id) && (
                                <div className="flex items-center gap-1 text-[10px] text-[#185FA5]"><Tag size={9} /> Has promo</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-[#5F5E5A]">{c.phone || c.email || "—"}</td>
                        <td className="px-2 py-3 text-[#2C2C2A]">{c.tripCount}</td>
                        <td className="px-2 py-3 font-semibold text-[#2C2C2A]">€{c.totalSpent.toFixed(2)}</td>
                        <td className="px-2 py-3 text-[#5F5E5A]">{c.lastRide ? new Date(c.lastRide).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setDrawerCustomer(c)} className="emboss-btn rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#5F5E5A]">
                            View <MoreHorizontal size={11} className="ml-1 inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredSorted.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ECE9E0] px-4 py-3" style={{ background: "#FBFAF6" }}>
                <span className="text-xs text-[#8C8977]">
                  Showing {(pageSafe - 1) * PAGE_SIZE + 1}-{Math.min(pageSafe * PAGE_SIZE, filteredSorted.length)} of {filteredSorted.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pageSafe === 1}
                    className="emboss-btn flex h-7 w-7 items-center justify-center rounded-lg disabled:opacity-40"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - pageSafe) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-xs text-[#8C8977]">…</span>}
                        <button
                          onClick={() => setPage(p)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold"
                          style={p === pageSafe ? { background: "#185FA5", color: "white" } : { color: "#5F5E5A" }}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={pageSafe === totalPages}
                    className="emboss-btn flex h-7 w-7 items-center justify-center rounded-lg disabled:opacity-40"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "promos" && (
        <div className="rounded-2xl p-5" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-[#2C2C2A]">
                <Tag size={14} className="text-[#185FA5]" /> Promo codes
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-[11px] text-[#8C8977]">
                <span>{activePromoCount} active</span>
                <span>·</span>
                <span>{totalRedemptions} total redemptions</span>
              </div>
            </div>
            <button onClick={() => setModalTarget("broadcast")} className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white">
              <Plus size={13} /> New code
            </button>
          </div>
          {promos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl py-10 text-center" style={{ background: "#F7F7F5" }}>
              <Zap size={20} color="#B4B2A9" />
              <div className="text-xs text-[#8C8977]">No promo codes yet — create one to offer a discount.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {promos.map((p) => (
                <PromoCard key={p.id} promo={p} onToggle={handleTogglePromo} onDelete={handleDeletePromo} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "referral" && (
        <div className="rounded-2xl p-5" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#2C2C2A]">
            <Gift size={14} className="text-[#185FA5]" /> Referral program
          </div>
          <p className="mb-4 text-[11px] text-[#8C8977]">
            Every customer gets their own code to share. Their friend gets this much off their first ride; once that friend actually completes it, your customer automatically gets the same reward off their own next ride.
          </p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value)}
                className="emboss-input w-24 rounded-lg px-3 py-2.5 pr-7 text-sm font-semibold text-[#2C2C2A]"
              />
              <span className="absolute right-3 top-2.5 text-xs text-[#8C8977]">%</span>
            </div>
            <button
              onClick={handleSaveReferralPercent}
              disabled={savingReferral || parseFloat(referralInput) === referralPercent}
              className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {savingReferral ? <Loader2 size={12} className="animate-spin" /> : referralSaved ? <Check size={12} /> : null}
              {referralSaved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      )}

      {modalTarget && (
        <PromoModal
          driverId={driverId!}
          presetCustomer={modalTarget === "broadcast" ? null : modalTarget}
          onClose={() => setModalTarget(null)}
          onCreated={handlePromoCreated}
        />
      )}

      {drawerCustomer && (
        <CustomerDrawer
          customer={drawerCustomer}
          promos={promos}
          onClose={() => setDrawerCustomer(null)}
          onSendPromo={() => {
            setModalTarget({ id: drawerCustomer.id, name: drawerCustomer.name });
          }}
        />
      )}
    </div>
  );
}
