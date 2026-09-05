import { useState, useEffect } from "react";
import { Share2, Copy, Check, Download, QrCode, ExternalLink } from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "../supabaseClient";

// Real QR codes, generated entirely client-side from the driver's
// actual booking link — no external QR-generation API involved (that
// would leak the driver's real booking URL to a third-party service
// for no real benefit, since generating one locally is just as fast
// and needs no network call at all).

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

export default function ShareLinkCard({ driverId }: { driverId: string | null }) {
  useGoogleFont();
  const [bookingSlug, setBookingSlug] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const passengerAppUrl = (import.meta.env.VITE_PASSENGER_APP_URL as string | undefined) || "https://taxi-passenger-pwa.vercel.app";
  const bookingUrl = bookingSlug ? `${passengerAppUrl}/${bookingSlug}` : null;

  useEffect(() => {
    if (!driverId) return;
    supabase
      .from("drivers")
      .select("booking_slug")
      .eq("id", driverId)
      .single()
      .then(({ data }) => setBookingSlug(data?.booking_slug ?? null));
  }, [driverId]);

  useEffect(() => {
    if (!bookingUrl) return;
    QRCode.toDataURL(bookingUrl, { width: 240, margin: 1, color: { dark: "#2C2C2A", light: "#FFFFFF" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [bookingUrl]);

  async function handleCopy() {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", bookingUrl);
    }
  }

  async function handleShare() {
    if (!bookingUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Book a ride", url: bookingUrl });
        return;
      } catch {
        // Cancelled — fall through to clipboard copy.
      }
    }
    handleCopy();
  }

  function handleDownloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "booking-qr-code.png";
    a.click();
  }

  if (!bookingSlug) return null;

  return (
    <div className="w-full overflow-hidden rounded-xl p-4 sm:p-5" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#2C2C2A]">
        <QrCode size={15} className="text-[#185FA5]" /> Share your booking link
      </div>
      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start">
        {qrDataUrl && (
          <div className="shrink-0 rounded-xl bg-white p-2" style={{ border: "1px solid #ECE9E0" }}>
            <img src={qrDataUrl} alt="Booking QR code" width={120} height={120} />
          </div>
        )}
        {/* w-full is the actual fix here — on mobile this container is
            inside a flex-col with items-center, where a flex child
            normally sizes to fit its own content rather than
            stretching to the parent's width. Since the booking URL is
            one long unbroken string, that meant this whole column grew
            wide enough to fit it in one line, pushing past the screen
            edge — min-w-0 alone doesn't fix that in a column layout,
            it only affects flex-shrink behavior, not the base sizing. */}
        <div className="w-full min-w-0 flex-1">
          <p className="mb-3 text-xs text-[#8C8977]">
            Customers scan this code, or use the link below, to book with you directly — no app download needed.
          </p>
          <div className="mb-3 flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg p-2.5" style={{ background: "#FFFFFF", border: "1px solid #E4E2DA" }}>
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-mono text-[#2C2C2A]">{bookingUrl}</span>
            <a href={bookingUrl!} target="_blank" rel="noreferrer" className="shrink-0 text-[#8C8977]">
              <ExternalLink size={13} />
            </a>
          </div>
          <div className="flex w-full flex-wrap gap-2">
            <button onClick={handleShare} className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white">
              <Share2 size={12} /> Share
            </button>
            <button onClick={handleCopy} className="emboss-btn flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#5F5E5A]">
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy link"}
            </button>
            {qrDataUrl && (
              <button onClick={handleDownloadQr} className="emboss-btn flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#5F5E5A]">
                <Download size={12} /> Download QR
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
