import type React from "react";
import { useState, useRef } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "../supabaseClient";

// Requires a public Storage bucket + policies, run once in the
// Supabase SQL editor before this works:
//
//   insert into storage.buckets (id, name, public) values ('driver-photos', 'driver-photos', true);
//
//   create policy "Public read for driver photos"
//   on storage.objects for select
//   using (bucket_id = 'driver-photos');
//
//   create policy "Drivers can manage their own photos"
//   on storage.objects for all
//   using (
//     bucket_id = 'driver-photos'
//     and (storage.foldername(name))[1] in (select id::text from drivers where user_id = auth.uid())
//   )
//   with check (
//     bucket_id = 'driver-photos'
//     and (storage.foldername(name))[1] in (select id::text from drivers where user_id = auth.uid())
//   );
//
// Also requires one column per usage — see the two call sites
// (BusinessProfileScreen.tsx: drivers.photo_url, VehicleInfoScreen.tsx:
// vehicles.photo_url):
//   ALTER TABLE drivers ADD COLUMN photo_url text;
//   ALTER TABLE vehicles ADD COLUMN photo_url text;

interface Props {
  driverId: string;
  table: "drivers" | "vehicles";
  matchColumn: "id" | "driver_id"; // drivers row is matched by id; vehicles row by driver_id
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  label: string;
}

export default function PhotoUpload({ driverId, table, matchColumn, currentUrl, onUploaded, label }: Props) {
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !driverId) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image must be under 5MB");
      return;
    }

    setUploading(true);
    setErrorMessage("");

    // Path is prefixed with driverId — this is what the storage
    // policies above check against, so a driver can only ever write
    // into their own folder within the shared bucket.
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${driverId}/${table}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("driver-photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      setUploading(false);
      setErrorMessage(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("driver-photos").getPublicUrl(path);
    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from(table)
      .update({ photo_url: publicUrl })
      .eq(matchColumn, driverId);

    setUploading(false);
    if (updateError) {
      setErrorMessage(`Uploaded, but failed to save: ${updateError.message}`);
      return;
    }
    onUploaded(publicUrl);
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#2C2C2A]">{label}</label>
      <div className="flex items-center gap-3">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl"
          style={{ background: "#F1EFE8" }}
        >
          {currentUrl ? (
            <img src={currentUrl} alt={label} className="h-full w-full object-cover" />
          ) : (
            <Camera size={22} color="#B4B2A9" />
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="emboss-btn flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-[#2C2C2A] cursor-pointer disabled:opacity-60"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            {uploading ? "Uploading…" : currentUrl ? "Change photo" : "Upload photo"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
      </div>
      {errorMessage && (
        <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "#791F1F" }}>
          <X size={12} /> {errorMessage}
        </div>
      )}
    </div>
  );
}
