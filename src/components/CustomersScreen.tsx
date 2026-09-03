import { useState, useEffect } from "react";
import { Users, Loader2, AlertCircle, Tag, Plus, Trash2, Copy, Check, X, Gift, Percent, Zap } from "lucide-react";
import { supabase } from "../supabaseClient";

// DESIGN-ONLY REDESIGN — every edge function call, field, and piece of
// data here is identical to before. What changed:
//   - The promo-creation form is now a real modal overlay instead of an
//     inline form that pushed the rest of the page around when it
//     opened/closed.
//   - Promo codes render as a proper card grid with a usage bar and
//     clearer status, instead of thin single-line rows.
//   - Promo codes, the customer ledger, and the referral program are
//     now three visually distinct sections (own header, own card),
//     instead of one long undifferentiated scroll.
//   - A small stats strip at the top of Promo codes (active count,
//     total redemptions) so that's visible without counting rows.

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

// Reuses the same emboss-input/emboss-btn-primary classes defined
// elsewhere (FareRulesScreen, ScheduleScreen) — kept local here too so
// this component doesn't depend on another screen having mounted first.
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
    `}</style>
  );
}

// Same fields, same validation, same manage-promo-codes "create" call
// as before — now rendered as a centered modal instead of an inline
// form, so opening/closing it never shifts anything else on the page.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(44,44,42,0.45)" }} onClick={onClose}>
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
    <div
      className="rounded-xl p-3.5"
      style={{
        background: isLive ? "#FBFAF6" : "#F7F7F5",
        border: "1px solid #ECE9E0",
        opacity: isLive ? 1 : 0.7,
      }}
    >
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
        <button
          onClick={() => onToggle(promo)}
          className="emboss-btn flex-1 rounded-lg py-1.5 text-[11px] font-semibold text-[#5F5E5A]"
        >
          {promo.active ? "Pause" : "Resume"}
        </button>
        <button
          onClick={() => onDelete(promo)}
          className="emboss-btn flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#791F1F]"
        >
          <Trash2 size={12} />
        </button>
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
  const [modalTarget, setModalTarget] = useState<{ id: string; name: string } | null | "broadcast">(null);
  const [referralPercent, setReferralPercent] = useState<number>(10);
  const [referralInput, setReferralInput] = useState("10");
  const [savingReferral, setSavingReferral] = useState(false);
  const [referralSaved, setReferralSaved] = useState(false);

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

  async function handleToggle(promo: Promo) {
    setPromos((prev) => prev.map((p) => (p.id === promo.id ? { ...p, active: !p.active } : p)));
    const result = await authedFetch("manage-promo-codes", { action: "toggle", driver_id: driverId, promo_id: promo.id, active: !promo.active });
    if (result.error) {
      setErrorMessage(result.error);
      loadAll(); // revert the optimistic update to the real state
    }
  }

  async function handleDelete(promo: Promo) {
    setPromos((prev) => prev.filter((p) => p.id !== promo.id));
    const result = await authedFetch("manage-promo-codes", { action: "delete", driver_id: driverId, promo_id: promo.id });
    if (result.error) {
      setErrorMessage(result.error);
      loadAll();
    }
  }

  function handleCreated(promo: Promo) {
    setPromos((prev) => [promo, ...prev]);
    setModalTarget(null);
  }

  const activeCount = promos.filter((p) => p.active && (!p.expires_at || new Date(p.expires_at) > new Date())).length;
  const totalRedemptions = promos.reduce((sum, p) => sum + p.uses_count, 0);

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
      <p className="mb-6 text-sm text-[#5F5E5A]">Who's booked with you, your promo codes, and referral rewards.</p>

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
          <AlertCircle size={14} /> {errorMessage}
        </div>
      )}

      {/* Promo codes — its own clearly bordered section */}
      <div className="mb-6 rounded-2xl p-5" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#2C2C2A]">
              <Tag size={14} className="text-[#185FA5]" /> Promo codes
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-[11px] text-[#8C8977]">
              <span>{activeCount} active</span>
              <span>·</span>
              <span>{totalRedemptions} total redemptions</span>
            </div>
          </div>
          <button
            onClick={() => setModalTarget("broadcast")}
            className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white"
          >
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
              <PromoCard key={p.id} promo={p} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Referral program — own section */}
      <div className="mb-6 rounded-2xl p-5" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
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

      {/* Customer ledger — own section */}
      <div className="rounded-2xl p-5" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
        <div className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-[#2C2C2A]">
          <Users size={14} className="text-[#185FA5]" /> Customer ledger
        </div>
        {customers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl py-10 text-center" style={{ background: "#F7F7F5" }}>
            <Users size={20} color="#B4B2A9" />
            <div className="text-xs text-[#8C8977]">No signed-in customers yet — guest bookings don't create an account.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {customers.map((c) => (
              <div key={c.id} className="rounded-xl bg-white p-3.5" style={{ border: "1px solid #ECE9E0" }}>
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #378ADD, #0C447C)", fontFamily: "'Space Grotesk'" }}
                    >
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#2C2C2A]">{c.name}</div>
                      <div className="truncate text-[11px] text-[#8C8977]">{c.phone || c.email || "—"}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalTarget({ id: c.id, name: c.name })}
                    className="emboss-btn flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#5F5E5A]"
                  >
                    <Tag size={11} /> Promo
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-[#ECE9E0] pt-2.5 text-center">
                  <div>
                    <div className="text-sm font-bold text-[#2C2C2A]">{c.tripCount}</div>
                    <div className="text-[10px] text-[#8C8977]">Trips</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#2C2C2A]">€{c.totalSpent.toFixed(2)}</div>
                    <div className="text-[10px] text-[#8C8977]">Spent</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#2C2C2A]">{c.lastRide ? new Date(c.lastRide).toLocaleDateString() : "—"}</div>
                    <div className="text-[10px] text-[#8C8977]">Last ride</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalTarget && (
        <PromoModal
          driverId={driverId!}
          presetCustomer={modalTarget === "broadcast" ? null : modalTarget}
          onClose={() => setModalTarget(null)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
