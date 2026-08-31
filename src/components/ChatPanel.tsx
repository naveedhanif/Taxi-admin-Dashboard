import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { supabase } from "../supabaseClient";

const POLL_INTERVAL_MS = 6000;

interface Message {
  id: string;
  sender_role: "driver" | "passenger";
  body: string;
  created_at: string;
}

async function callMessages(path: string, body: Record<string, unknown>): Promise<any> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  const response = await fetch(`${supabaseUrl}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionData.session?.access_token || anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) return { error: data.error || "Something went wrong" };
  return data;
}

export default function ChatPanel({ bookingId }: { bookingId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;

    async function load() {
      const result = await callMessages("list-messages", { booking_id: bookingId });
      if (cancelled || result.error) return;
      setMessages(result.messages || []);
      setLoaded(true);
    }
    load();
    const intervalId = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [bookingId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const optimistic: Message = { id: `pending-${Date.now()}`, sender_role: "driver", body: text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    const result = await callMessages("send-message", { booking_id: bookingId, body: text });
    setSending(false);
    if (result.error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      window.alert(result.error);
    }
  }

  return (
    <div className="rounded-xl" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
      <div className="flex items-center gap-2 border-b border-[#ECE9E0] px-3.5 py-2.5 text-xs font-semibold text-[#5F5E5A]">
        <MessageCircle size={13} /> Messages
      </div>
      <div ref={scrollRef} className="max-h-52 space-y-2 overflow-y-auto p-3">
        {!loaded ? (
          <div className="flex items-center justify-center gap-1.5 py-4 text-xs text-[#8C8977]">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="py-4 text-center text-xs text-[#8C8977]">No messages yet.</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_role === "driver" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[75%] rounded-2xl px-3 py-1.5 text-xs"
                style={
                  m.sender_role === "driver"
                    ? { background: "#185FA5", color: "white" }
                    : { background: "#F0EEE7", color: "#2C2C2A" }
                }
              >
                {m.body}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-[#ECE9E0] p-2.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message…"
          className="flex-1 rounded-full px-3.5 py-2 text-xs text-[#2C2C2A] placeholder:text-[#B4B2A9]"
          style={{ background: "#F0EEE7" }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-50"
          style={{ background: "#185FA5" }}
          aria-label="Send"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}
