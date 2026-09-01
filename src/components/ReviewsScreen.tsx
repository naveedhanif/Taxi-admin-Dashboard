import { useState, useEffect } from "react";
import { Star, Loader2, AlertCircle, MessageSquareQuote } from "lucide-react";
import { supabase } from "../supabaseClient";

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} fill={n <= rating ? "#F5B300" : "none"} color={n <= rating ? "#F5B300" : "#D3D1C7"} strokeWidth={1.5} />
      ))}
    </div>
  );
}

export default function ReviewsScreen({ driverId }: { driverId: string | null }) {
  useGoogleFont();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string | null; created_at: string }[]>([]);

  useEffect(() => {
    if (!driverId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/get-driver-reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token || anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ driver_id: driverId }),
      });
      const data = await res.json();
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setErrorMessage(data.error || "Couldn't load your reviews");
        return;
      }
      setAvgRating(data.avgRating);
      setReviewCount(data.reviewCount);
      setReviews(data.reviews || []);
    })();
    return () => { cancelled = true; };
  }, [driverId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-[#5F5E5A]">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl">
      <h1 className="mb-1 text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
        Reviews
      </h1>
      <p className="mb-4 text-sm text-[#5F5E5A]">What passengers have said after completed trips.</p>

      <div className="mb-5 flex items-center gap-3 rounded-xl p-4" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
        <div className="text-3xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
          {avgRating != null ? avgRating.toFixed(1) : "—"}
        </div>
        <div>
          {avgRating != null && <StarRow rating={Math.round(avgRating)} />}
          <div className="text-xs text-[#8C8977]">{reviewCount} review{reviewCount === 1 ? "" : "s"}</div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
          <AlertCircle size={14} /> {errorMessage}
        </div>
      )}

      {reviews.length === 0 && !errorMessage ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-[#E4E2DA] bg-white py-10 text-center">
          <MessageSquareQuote size={22} color="#B4B2A9" />
          <div className="text-sm text-[#8C8977]">No reviews yet — they'll show up here once passengers start rating trips.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-[#E4E2DA] bg-white p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <StarRow rating={r.rating} />
                <span className="text-[11px] text-[#8C8977]">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="text-sm text-[#2C2C2A]">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
