import { useEffect, useState } from "react";
import { Gift, Loader2, Check, AlertCircle, Save } from "lucide-react";
import { supabase } from "../supabaseClient";

/**
 * Driver control for the customer-facing "Refer & Earn" feature.
 * Off (the default): customers never see the referral card or a code, and
 * referral codes entered at signup are ignored. On: customers get their
 * own code and both sides earn the percentage set here.
 * Stored in drivers.referral_enabled / drivers.referral_reward_percent.
 */
export default function ReferralSettingsScreen({ driverId }: { driverId: string | null }) {
  const [enabled, setEnabled] = useState(false);
  const [percent, setPercent] = useState(10);
  const [percentDraft, setPercentDraft] = useState("10");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    supabase
      .from("drivers")
      .select("referral_enabled, referral_reward_percent")
      .eq("id", driverId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("ReferralSettingsScreen: load failed:", error.message);
          setErrorMessage(
            error.message.includes("referral_enabled")
              ? "The referral setting isn't available yet — the database update hasn't been applied."
              : error.message
          );
        } else if (data) {
          setEnabled(data.referral_enabled ?? false);
          const pct = Number(data.referral_reward_percent ?? 10);
          setPercent(pct);
          setPercentDraft(String(pct));
        }
        setLoading(false);
      });
  }, [driverId]);

  async function save(nextEnabled: boolean, nextPercent: number) {
    if (!driverId) return;
    if (isNaN(nextPercent) || nextPercent <= 0 || nextPercent > 100) {
      setErrorMessage("Reward must be between 1% and 100%.");
      return;
    }
    setSaving(true);
    setErrorMessage("");
    const { error } = await supabase
      .from("drivers")
      .update({ referral_enabled: nextEnabled, referral_reward_percent: nextPercent })
      .eq("id", driverId);
    setSaving(false);
    if (error) {
      console.error("ReferralSettingsScreen: save failed:", error.message);
      setErrorMessage(error.message);
      return;
    }
    setEnabled(nextEnabled);
    setPercent(nextPercent);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-[#5F5E5A]">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#2C2C2A]">
        <Gift size={15} className="text-[#185FA5]" /> Refer &amp; Earn
      </div>
      <p className="mb-4 text-[11px] text-[#8C8977]">
        When on, every signed-in customer sees a personal referral code in their app. A friend who signs up with it gets the
        reward below off their first ride, and once that friend completes the ride, the customer gets the same reward off
        their next one. When off, customers see nothing about referrals.
      </p>

      <div className="mb-4 flex items-center justify-between rounded-xl p-3.5" style={{ background: enabled ? "#EAF3DE" : "#F1EFE8" }}>
        <div>
          <div className="text-xs font-semibold" style={{ color: enabled ? "#27500A" : "#5F5E5A" }}>
            {enabled ? "Refer & Earn is on" : "Refer & Earn is off"}
          </div>
          <div className="text-[11px]" style={{ color: enabled ? "#27500A" : "#8C8977" }}>
            {enabled ? "Customers can see and share their code." : "Customers don't see referrals."}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle Refer and Earn"
          onClick={() => save(!enabled, percent)}
          disabled={saving}
          style={{
            position: "relative",
            width: 44,
            height: 24,
            borderRadius: 12,
            border: "none",
            padding: 0,
            background: enabled ? "#185FA5" : "#D8D5CB",
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: enabled ? 22 : 2,
              width: 20,
              height: 20,
              borderRadius: 10,
              background: "white",
              transition: "left 0.15s",
            }}
          />
        </button>
      </div>

      <div className="mb-1.5 text-xs font-medium text-[#5F5E5A]">Reward for both sides</div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="number"
            min="1"
            max="100"
            value={percentDraft}
            onChange={(e) => setPercentDraft(e.target.value)}
            className="emboss-input w-24 rounded-lg px-3 py-2.5 pr-7 text-sm font-semibold text-[#2C2C2A]"
          />
          <span className="absolute right-3 top-2.5 text-xs text-[#8C8977]">%</span>
        </div>
        <button
          onClick={() => save(enabled, parseFloat(percentDraft))}
          disabled={saving || parseFloat(percentDraft) === percent}
          className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 rounded-lg p-2.5 text-[11px]" style={{ background: "#FCEBEB", color: "#791F1F" }}>
          <AlertCircle size={12} /> {errorMessage}
        </div>
      )}
    </div>
  );
}
