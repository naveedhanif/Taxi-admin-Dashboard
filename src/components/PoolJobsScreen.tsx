import { useState, useEffect, useCallback } from "react";
import { Plane, MapPin, Clock, Loader2, AlertCircle, Wallet, Navigation } from "lucide-react";
import { supabase } from "../supabaseClient";

interface PoolJob {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  estimated_fare: number;
  distance_km: number | null;
  estimated_duration_minutes: number | null;
  flight_number: string | null;
  flight_status: string | null;
  passenger_name: string;
}

async function authedFetch(path: string, body: object) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { error: "Your session expired — please refresh and sign in again." };
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function PoolJobsScreen({ driverId }: { driverId: string | null }) {
  const [jobs, setJobs] = useState<PoolJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [takenNotice, setTakenNotice] = useState<string | null>(null);
  // Set from the notification URL (?job=...) — the specific job this
  // driver tapped a notification for, scrolled to and briefly
  // highlighted once the list loads, rather than making them hunt for
  // it among whatever else is waiting.
  const [highlightedJobId, setHighlightedJobId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get("job");
  });

  const load = useCallback(async () => {
    const result = await authedFetch("list-pool-jobs", {});
    if (!result.error) setJobs(result.jobs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Real-time — any change to a pool-sourced booking refreshes the
    // list, so a job another driver just claimed disappears here
    // without needing a manual refresh.
    const channel = supabase
      .channel("pool-jobs-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: "source=eq.pool" }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    if (!highlightedJobId || jobs.length === 0) return;
    const el = document.getElementById(`pool-job-${highlightedJobId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Clean the URL so refreshing the page later doesn't re-trigger
    // the highlight, and clear the highlight itself after a few
    // seconds so it doesn't linger indefinitely.
    window.history.replaceState(null, "", "/pool-jobs");
    const timeout = setTimeout(() => setHighlightedJobId(null), 4000);
    return () => clearTimeout(timeout);
  }, [highlightedJobId, jobs]);

  async function handleClaim(jobId: string) {
    setClaimingId(jobId);
    setErrorMessage("");
    setTakenNotice(null);
    const result = await authedFetch("claim-pool-job", { booking_id: jobId });
    setClaimingId(null);
    if (result.error) {
      if (result.error.includes("already claimed")) {
        setTakenNotice("Someone else got that one first — updating the list.");
        load();
      } else {
        setErrorMessage(result.error);
      }
      return;
    }
    // A claimed job becomes a completely normal booking from here —
    // it'll show up on the regular Bookings screen like anything else.
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }

  return (
    <div className="w-full">
      <div className="mb-6 px-1">
        <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
          Airport Jobs
        </h1>
        <p className="text-sm text-[#5F5E5A]">Shared pool — first to accept gets it. Cash paid directly to you.</p>
      </div>

      {takenNotice && (
        <div className="mb-4 flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FAEEDA", color: "#633806" }}>
          <AlertCircle size={14} /> {takenNotice}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
          <AlertCircle size={14} /> {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#E4E2DA] bg-white py-16 text-sm text-[#5F5E5A]">
          <Loader2 size={16} className="animate-spin" /> Loading airport jobs…
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-[#E4E2DA] bg-white py-16 text-center">
          <Plane size={24} className="text-[#B4B2A9]" />
          <div className="text-sm text-[#5F5E5A]">No airport jobs waiting right now.</div>
          <div className="px-6 text-xs text-[#8C8977]">New jobs from the pool appear here in real time — you'll also get a push notification.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const isHighlighted = job.id === highlightedJobId;
            return (
            <div
              key={job.id}
              id={`pool-job-${job.id}`}
              className="rounded-xl border p-4 transition-all duration-500"
              style={{
                borderColor: isHighlighted ? "#185FA5" : "#E4E2DA",
                background: isHighlighted ? "#E6F1FB" : "white",
                boxShadow: isHighlighted ? "0 0 0 3px rgba(24,95,165,0.15)" : "none",
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md bg-[#F1EFE8] px-2.5 py-1.5 text-center text-xs font-semibold text-[#2C2C2A]">
                    <div className="flex items-center gap-1">
                      <Clock size={11} className="text-[#5F5E5A]" />
                      {new Date(job.scheduled_time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#2C2C2A]">{job.passenger_name}</span>
                </div>
                <span className="text-base font-bold text-[#2C2C2A]">€{Number(job.estimated_fare).toFixed(2)}</span>
              </div>

              <div className="mb-3 flex gap-2.5 pl-0.5 text-xs text-[#2C2C2A]">
                <div className="flex flex-col items-center pt-1">
                  <MapPin size={11} className="text-[#639922]" />
                  <div className="my-0.5 w-px flex-1" style={{ background: "#D8D5CB", minHeight: 16 }} />
                  <Navigation size={11} className="text-[#185FA5]" />
                </div>
                <div className="flex-1 space-y-2.5">
                  <div>
                    {job.pickup_address}
                    {job.flight_number && <span className="ml-1.5 text-[11px] text-[#8C8977]">· Flight {job.flight_number}</span>}
                  </div>
                  <div>{job.dropoff_address}</div>
                </div>
              </div>

              {(job.distance_km || job.estimated_duration_minutes) && (
                <div className="mb-3 text-[11px] text-[#8C8977]">
                  {job.estimated_duration_minutes ? `${Math.round(job.estimated_duration_minutes)} mins` : ""}
                  {job.estimated_duration_minutes && job.distance_km ? " · " : ""}
                  {job.distance_km ? `${Number(job.distance_km).toFixed(1)} km` : ""}
                </div>
              )}

              <button
                onClick={() => handleClaim(job.id)}
                disabled={claimingId === job.id}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #378ADD, #0C447C)" }}
              >
                {claimingId === job.id ? <Loader2 size={15} className="animate-spin" /> : <Wallet size={15} />}
                {claimingId === job.id ? "Claiming…" : "Accept this job"}
              </button>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
