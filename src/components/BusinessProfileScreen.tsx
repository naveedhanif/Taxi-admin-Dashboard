import { useState, useEffect } from "react";
import { Loader2, AlertCircle, Save, Check, Phone, Building2 } from "lucide-react";
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

function EmbossStyles() {
  return (
    <style>{`
      .emboss-btn-primary {
        background: #185FA5;
        border: none;
        box-shadow: 3px 3px 7px rgba(4,44,83,0.35), -2px -2px 5px rgba(133,183,235,0.55);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn-primary:active {
        box-shadow: inset 2px 2px 5px rgba(4,44,83,0.5), inset -2px -2px 4px rgba(133,183,235,0.35);
        transform: translateY(1px);
      }
      .emboss-input {
        background: #FFFFFF;
        border: 1px solid #E4E2DA;
        box-shadow: inset 1px 1px 3px rgba(44,44,42,0.08);
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .emboss-input:focus {
        outline: none;
        border-color: #185FA5;
        box-shadow: inset 1px 1px 3px rgba(44,44,42,0.08), 0 0 0 2px rgba(24,95,165,0.15);
      }
    `}</style>
  );
}

interface ProfileData {
  business_name: string;
  phone_number: string | null;
}

export default function BusinessProfileScreen({ driverId }: { driverId: string | null }) {
  useGoogleFont();
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("drivers")
        .select("business_name, phone_number")
        .eq("id", driverId)
        .single();
      if (cancelled) return;
      if (error) {
        setErrorMessage(error.message);
      } else if (data) {
        setBusinessName(data.business_name ?? "");
        setPhoneNumber(data.phone_number ?? "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!driverId) return;
    setSaving(true);
    setErrorMessage("");
    setSaved(false);

    const { error } = await supabase
      .from("drivers")
      .update({
        business_name: businessName.trim(),
        // Stored as entered — the tel:/wa.me links elsewhere normalize
        // it by stripping non-digits, so this doesn't need strict E.164
        // enforcement here, just something recognizable to the driver.
        phone_number: phoneNumber.trim() || null,
      })
      .eq("id", driverId);

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="min-h-[400px] w-full p-4 sm:p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      <div className="mb-6">
        <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
          Business Profile
        </h1>
        <p className="text-sm text-[#5F5E5A]">Your public business name and contact number</p>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#E4E2DA] bg-[#F1EFE8] p-4">
        <Phone size={18} className="mt-0.5 shrink-0 text-[#185FA5]" />
        <div className="text-xs leading-relaxed text-[#5F5E5A]">
          Your phone number is shown to passengers on your public booking page (with a tap-to-call and
          tap-to-WhatsApp button), the same way a business listing shows a contact number. Leave it blank if
          you'd rather passengers only reach you through the app.
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-xs text-[#5F5E5A]">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md space-y-4 text-xs">
          <div>
            <label className="mb-1 flex items-center gap-1.5 font-medium text-[#2C2C2A]">
              <Building2 size={12} className="text-[#5F5E5A]" /> Business name
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. John's Taxi"
              className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 font-medium text-[#2C2C2A]">
              <Phone size={12} className="text-[#5F5E5A]" /> Phone number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+353 87 123 4567"
              className="emboss-input w-full rounded-lg px-3 py-2 text-xs font-mono text-[#2C2C2A]"
            />
            <p className="mt-1.5 text-[10px] text-[#8C8977]">
              Include the country code (e.g. +353 for Ireland) so both call and WhatsApp links work correctly.
            </p>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
              <AlertCircle size={14} /> {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-60"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </form>
      )}
    </div>
  );
}
