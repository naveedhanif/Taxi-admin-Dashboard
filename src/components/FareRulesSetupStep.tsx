import { useState, useEffect } from "react";
import { Euro, ArrowRight, CheckCircle2, ShieldCheck, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

// COMPLETE REBUILD — the original version of this step let a driver
// type in their own base rate, per-km rate, and per-minute rate, and
// never actually saved any of it to the database (onNext threw the
// data away). Both problems, fixed:
//   1. Rates are Ireland's real National Maximum Taxi Fare, fixed by
//      the NTA — a driver can't set them, same principle already
//      correctly enforced in FareRulesScreen.tsx's Settings tab (only
//      a discount is editable there). This step is now purely
//      informational, with real numbers shown, not a form.
//   2. Clicking Continue actually calls seed-fare-rules and creates
//      the three real fare_rules rows server-side, instead of
//      collecting form data that goes nowhere.

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
        background: linear-gradient(135deg, #378ADD, #0C447C);
        border: none;
        box-shadow: 3px 3px 8px rgba(4,44,83,0.35), -2px -2px 6px rgba(133,183,235,0.5);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn-primary:active {
        box-shadow: inset 2px 2px 5px rgba(4,44,83,0.5), inset -2px -2px 4px rgba(133,183,235,0.35);
        transform: translateY(1px);
      }
    `}</style>
  );
}

function TariffRow({ label, hint, initial, tariffA, tariffB }: { label: string; hint: string; initial: string; tariffA: string; tariffB: string }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "#F1EFE8" }}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-bold text-[#2C2C2A]">{label}</span>
        <span className="text-[10px] text-[#8C8977]">{hint}</span>
      </div>
      <div className="text-[11px] text-[#5F5E5A] leading-relaxed">
        Initial charge <strong className="text-[#2C2C2A]">{initial}</strong> · then {tariffA}
        {tariffB && <> · {tariffB}</>}
      </div>
    </div>
  );
}

interface FareRulesSetupStepProps {
  driverId: string | null;
  onComplete?: () => void;
}

export default function FareRulesSetupStep({ driverId, onComplete }: FareRulesSetupStepProps) {
  useGoogleFont();
  const [saving, setSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleContinue() {
    if (!driverId) return;
    setSaving(true);
    setErrorMessage("");
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const res = await fetch(`${supabaseUrl}/functions/v1/seed-fare-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken || anonKey}`, apikey: anonKey },
        body: JSON.stringify({ driver_id: driverId }),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) {
        setErrorMessage(data.error || "Couldn't set up your fare rules — try again.");
        return;
      }
      setIsCompleted(true);
      setTimeout(() => onComplete?.(), 1400);
    } catch (err) {
      setSaving(false);
      setErrorMessage(err instanceof Error ? err.message : "Couldn't set up your fare rules — try again.");
    }
  }

  return (
    <div className="flex min-h-[500px] w-full items-center justify-center p-4 font-sans" style={{ backgroundColor: "#F7F7F5" }}>
      <EmbossStyles />
      <div className="w-full max-w-lg rounded-2xl p-8" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0", boxShadow: "6px 6px 14px rgba(44,44,42,0.10), -6px -6px 14px rgba(255,255,255,0.85)" }}>
        {isCompleted ? (
          <div className="space-y-4 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3DE]">
              <CheckCircle2 size={28} color="#27500A" />
            </div>
            <div className="text-2xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
              You're all set!
            </div>
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-[#5F5E5A]">
              Your fares are live at the official NTA rate. Your booking link is ready for passengers.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-[#EAF3DE] px-2.5 py-0.5 text-[11px] font-semibold text-[#27500A]">Step 5 of 6</span>
              </div>
              <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
                Your fares
              </h1>
              <p className="mt-1 text-xs text-[#5F5E5A]">Set automatically — nothing for you to enter here</p>
            </div>

            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#E4E2DA] bg-[#F1EFE8] p-3.5 text-xs leading-relaxed text-[#5F5E5A]">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#185FA5]" />
              <span>
                <strong className="text-[#2C2C2A]">Fixed at the National Maximum Taxi Fare.</strong> These rates are set by the National Transport Authority, not by you — see{" "}
                <a href="https://www.transportforireland.ie/fares/taxi-fares/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-[#185FA5] underline">
                  the official NTA taxi fares page <ExternalLink size={10} />
                </a>
                . Once you're set up, you can offer passengers an optional discount anytime in Settings — the rates themselves stay fixed.
              </span>
            </div>

            <div className="mb-5 space-y-2">
              <TariffRow label="Standard" hint="Mon–Sat, 08:00–20:00" initial="€4.40" tariffA="€1.32/km up to €23.60" tariffB="then €1.72/km" />
              <TariffRow label="Premium" hint="Nights, Sundays, most holidays" initial="€5.40" tariffA="€1.81/km up to €31.80" tariffB="then €2.20/km" />
              <TariffRow label="Special" hint="Weekend 00:00–04:00, Christmas, NYE" initial="€5.40" tariffA="€2.20/km flat" tariffB="" />
            </div>

            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
                <AlertCircle size={13} /> {errorMessage}
              </div>
            )}

            <button
              onClick={handleContinue}
              disabled={saving || !driverId}
              className="emboss-btn-primary flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold uppercase tracking-wider text-white cursor-pointer disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Euro size={14} />}
              <span>{saving ? "Setting up…" : "Continue"}</span>
              {!saving && <ArrowRight size={14} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
