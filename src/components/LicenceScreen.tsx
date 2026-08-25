import type React from "react";
import { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, Save, Loader2, AlertCircle, Check, ExternalLink } from "lucide-react";
import { supabase } from "../supabaseClient";

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
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

interface LicenceData {
  spsv_licence_number: string | null;
  licence_verified: boolean;
  licence_verified_at: string | null;
}

export default function LicenceScreen({ driverId }: { driverId: string | null }) {
  useGoogleFont();
  const [licenceNumber, setLicenceNumber] = useState("");
  const [savedData, setSavedData] = useState<LicenceData | null>(null);
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
        .select("spsv_licence_number, licence_verified, licence_verified_at")
        .eq("id", driverId)
        .single();
      if (cancelled) return;
      if (error) {
        setErrorMessage(error.message);
      } else if (data) {
        setSavedData(data as LicenceData);
        setLicenceNumber(data.spsv_licence_number ?? "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId) return;
    setSaving(true);
    setErrorMessage("");
    setSaved(false);

    // Changing the licence number after it was already verified resets
    // verification — a new number is a different licence and needs to
    // be checked again, not silently carried over as "verified."
    const numberChanged = licenceNumber.trim() !== (savedData?.spsv_licence_number ?? "");

    const { error } = await supabase
      .from("drivers")
      .update({
        spsv_licence_number: licenceNumber.trim() || null,
        ...(numberChanged ? { licence_verified: false, licence_verified_at: null } : {}),
      })
      .eq("id", driverId);

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSavedData((prev) => ({
      spsv_licence_number: licenceNumber.trim() || null,
      licence_verified: numberChanged ? false : prev?.licence_verified ?? false,
      licence_verified_at: numberChanged ? null : prev?.licence_verified_at ?? null,
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const isVerified = savedData?.licence_verified ?? false;

  return (
    <div className="min-h-[500px] w-full p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      <div className="mb-6">
        <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
          SPSV licence
        </h1>
        <p className="text-sm text-[#5F5E5A]">Your taxi licence number and verification status</p>
      </div>

      {/* Status banner */}
      <div
        className="mb-6 flex items-start gap-3 rounded-xl border p-4"
        style={{
          background: isVerified ? "#EAF3DE" : "#FAEEDA",
          borderColor: isVerified ? "#C0DD97" : "#FAC775",
        }}
      >
        {isVerified ? (
          <ShieldCheck size={20} className="mt-0.5 shrink-0" style={{ color: "#27500A" }} />
        ) : (
          <ShieldAlert size={20} className="mt-0.5 shrink-0" style={{ color: "#633806" }} />
        )}
        <div className="text-xs leading-relaxed" style={{ color: isVerified ? "#27500A" : "#633806" }}>
          {isVerified ? (
            <>
              <strong>Verified</strong> — your licence has been manually confirmed against the National
              Transport Authority's public register
              {savedData?.licence_verified_at
                ? ` on ${new Date(savedData.licence_verified_at).toLocaleDateString()}`
                : ""}
              . Passengers see a "Verified driver" badge on your booking page.
            </>
          ) : (
            <>
              <strong>Not yet verified</strong> — enter your licence number below. Verification is done
              manually against the NTA's public register, since it has no automated lookup available.
              You'll be marked verified once that check is complete.
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-xs text-[#5F5E5A]">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md space-y-4 text-xs">
          <div>
            <label className="mb-1 block font-medium text-[#2C2C2A]">SPSV licence number</label>
            <input
              type="text"
              value={licenceNumber}
              onChange={(e) => setLicenceNumber(e.target.value)}
              placeholder="e.g. SPSV-123456"
              className="emboss-input w-full rounded-lg px-3 py-2 text-xs font-mono text-[#2C2C2A]"
            />
            <p className="mt-1.5 text-[10px] text-[#8C8977]">
              Find this on your SPSV licence card or disc. Changing this number resets verification —
              a new number needs to be checked again.
            </p>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
              <AlertCircle size={14} /> {errorMessage}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-60"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
              {saving ? "Saving…" : saved ? "Saved" : "Save"}
            </button>
            <a
              href="https://publicregister.nationaltransport.ie/search/tab/driverVehicleCheck"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-[#185FA5] underline"
            >
              Check the NTA public register <ExternalLink size={11} />
            </a>
          </div>
        </form>
      )}
    </div>
  );
}
