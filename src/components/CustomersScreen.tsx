import { useState, useEffect } from "react";
import { Users, Loader2, AlertCircle, Tag, Plus, Trash2, Copy, Check, X } from "lucide-react";
import { supabase } from "../supabaseClient";

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
    `}</style>
  );
}

function PromoForm({
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
    <div className="rounded-xl border border-[#E4E2DA] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-[#2C2C2A]">
          {presetCustomer ? `New promo for ${presetCustomer.name}` : "New broadcast promo"}
        </div>
        <button onClick={onClose} className="emboss-btn flex h-7 w-7 items-center justify-center rounded-full">
          <X size={13} className="text-[#5F5E5A]" />
        </button>
      </div>

      {!presetCustomer && (
        <p className="mb-3 text-[11px] text-[#8C8977]">Any of your customers will be able to use this — not tied to one person.</p>
      )}
      <p className="mb-3 rounded-lg p-2.5 text-[11px]" style={{ background: "#FAEEDA", color: "#633806" }}>
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
            className="emboss-input w-full rounded-lg px-3 py-2 text-xs font-semibold uppercase text-[#2C2C2A]"
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
              className="emboss-input w-full rounded-lg px-3 py-2 pr-7 text-xs font-semibold text-[#2C2C2A]"
            />
            <span className="absolute right-3 top-2 text-xs text-[#8C8977]">%</span>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#5F5E5A]">Max uses (optional)</label>
          <input
            type="number"
            min="1"
            placeholder="Unlimited"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="emboss-input w-full rounded-lg px-3 py-2 text-xs font-semibold text-[#2C2C2A]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#5F5E5A]">Expires (optional)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="emboss-input w-full rounded-lg px-3 py-2 text-xs font-semibold text-[#2C2C2A]"
          />
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={saving}
        className="emboss-btn-primary mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
        Create code
      </button>
    </div>
  );
}

function PromoRow({ promo, onToggle, onDelete }: { key?: string; promo: Promo; onToggle: (p: Promo) => void; onDelete: (p: Promo) => void }) {
  const [copied, setCopied] = useState(false);
  const usesLabel = promo.max_uses != null ? `${promo.uses_count}/${promo.max_uses} used` : `${promo.uses_count} used`;
  const isExpired = promo.expires_at != null && new Date(promo.expires_at) < new Date();

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E4E2DA] bg-white px-3.5 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#2C2C2A]">{promo.code}</span>
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
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: promo.active && !isExpired ? "#EAF3DE" : "#F1EFE8", color: promo.active && !isExpired ? "#27500A" : "#8C8977" }}
          >
            {isExpired ? "Expired" : promo.active ? "Active" : "Paused"}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-[#5F5E5A]">
          {promo.discount_value}% off
          {" · "}
          {promo.customer_name ? `For ${promo.customer_name}` : "Broadcast"}
          {" · "}
          {usesLabel}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => onToggle(promo)}
          className="emboss-btn rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#5F5E5A]"
        >
          {promo.active ? "Pause" : "Resume"}
        </button>
        <button
          onClick={() => onDelete(promo)}
          className="emboss-btn flex h-7 w-7 items-center justify-center rounded-lg text-[#791F1F]"
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
  const [formTarget, setFormTarget] = useState<{ id: string; name: string } | null | "broadcast">(null);

  useEffect(() => {
    if (!driverId) return;
    loadAll();
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
    setFormTarget(null);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-[#5F5E5A]">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <EmbossStyles />
      <div className="mb-1 flex items-center gap-2">
        <Users size={18} className="text-[#185FA5]" />
        <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
          Customers
        </h1>
      </div>
      <p className="mb-4 text-sm text-[#5F5E5A]">Who's booked with you, and promo codes you've set up for them.</p>

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
          <AlertCircle size={14} /> {errorMessage}
        </div>
      )}

      {/* Promo codes section */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2C2C2A]">
            <Tag size={13} className="text-[#185FA5]" /> Promo codes
          </div>
          {formTarget !== "broadcast" && (
            <button
              onClick={() => setFormTarget("broadcast")}
              className="emboss-btn flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#5F5E5A]"
            >
              <Plus size={11} /> New broadcast code
            </button>
          )}
        </div>

        {formTarget === "broadcast" && (
          <div className="mb-2">
            <PromoForm driverId={driverId!} presetCustomer={null} onClose={() => setFormTarget(null)} onCreated={handleCreated} />
          </div>
        )}

        {promos.length === 0 ? (
          <div className="rounded-xl border border-[#E4E2DA] bg-[#FBFAF6] py-6 text-center text-xs text-[#8C8977]">
            No promo codes yet.
          </div>
        ) : (
          <div className="space-y-2">
            {promos.map((p) => (
              <PromoRow key={p.id} promo={p} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Customer ledger */}
      <div className="mb-2 text-xs font-semibold text-[#2C2C2A]">Customer ledger</div>
      {customers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-[#E4E2DA] bg-white py-10 text-center">
          <Users size={22} color="#B4B2A9" />
          <div className="text-sm text-[#8C8977]">No signed-in customers yet — guest bookings don't create an account.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <div key={c.id}>
              <div className="rounded-xl border border-[#E4E2DA] bg-white p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#2C2C2A]">{c.name}</div>
                    <div className="text-[11px] text-[#8C8977]">{c.phone || c.email || "—"}</div>
                  </div>
                  <button
                    onClick={() => setFormTarget(formTarget !== "broadcast" && formTarget?.id === c.id ? null : { id: c.id, name: c.name })}
                    className="emboss-btn flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#5F5E5A]"
                  >
                    <Tag size={11} /> Send promo
                  </button>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-[#ECE9E0] pt-2.5 text-center">
                  <div>
                    <div className="text-sm font-bold text-[#2C2C2A]">{c.tripCount}</div>
                    <div className="text-[10px] text-[#8C8977]">Trips</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#2C2C2A]">€{c.totalSpent.toFixed(2)}</div>
                    <div className="text-[10px] text-[#8C8977]">Total spent</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#2C2C2A]">{c.lastRide ? new Date(c.lastRide).toLocaleDateString() : "—"}</div>
                    <div className="text-[10px] text-[#8C8977]">Last ride</div>
                  </div>
                </div>
              </div>
              {formTarget !== "broadcast" && formTarget?.id === c.id && (
                <div className="mt-2">
                  <PromoForm driverId={driverId!} presetCustomer={{ id: c.id, name: c.name }} onClose={() => setFormTarget(null)} onCreated={handleCreated} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}