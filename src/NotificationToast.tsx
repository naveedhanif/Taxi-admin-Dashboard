import type React from "react";
import { Bell, X, MapPin } from "lucide-react";
import type { BookingNotification } from "./useNewBookingNotifications";

interface Props {
  notifications: BookingNotification[];
  onDismiss: (id: string) => void;
}

export default function NotificationToast({ notifications, onDismiss }: Props) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-3" style={{ fontFamily: "Inter" }}>
      {notifications.map((n) => (
        <div
          key={n.id}
          className="w-80 rounded-xl p-4"
          style={{
            background: "#FBFAF6",
            border: "1px solid #ECE9E0",
            boxShadow: "9px 9px 20px rgba(44,44,42,0.16), -7px -7px 16px rgba(255,255,255,0.9), 0 24px 30px -16px rgba(44,44,42,0.2)",
          }}
        >
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: "#185FA5" }}
              >
                <Bell size={14} color="#FFFFFF" />
              </div>
              <span className="text-sm font-semibold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                New booking
              </span>
            </div>
            <button onClick={() => onDismiss(n.id)}>
              <X size={15} color="#8C8977" />
            </button>
          </div>
          <div className="text-sm text-[#2C2C2A]">{n.passenger_name}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-[#5F5E5A]">
            <MapPin size={11} /> {n.pickup_address} → {n.dropoff_address}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[#ECE9E0] pt-2">
            <span className="text-xs text-[#8C8977]">
              {new Date(n.scheduled_time).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-sm font-semibold text-[#2C2C2A]">€{Number(n.estimated_fare).toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

