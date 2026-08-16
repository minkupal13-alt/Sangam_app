import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { X } from "lucide-react";

type Props = {
  roomName: string;
  participantName: string;
  role: "host" | "viewer";
  onClose: () => void;
};

export function LiveStream({ roomName, participantName, role, onClose }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, participantName, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not start live stream");
      }
      const data = await res.json();
      if (cancelled) return;
      setToken(data.token);
      setServerUrl(data.url);
    })().catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Could not start live stream");
    });
    return () => {
      cancelled = true;
    };
  }, [roomName, participantName, role]);

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <button
        aria-label="Close live"
        onClick={onClose}
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white"
      >
        <X className="h-5 w-5" />
      </button>

      {error ? (
        <div className="grid h-full place-items-center px-8 text-center text-sm text-white/80">
          <div>
            <p className="font-semibold text-white">लाइव शुरू नहीं हो सका</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : token && serverUrl ? (
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          audio={role === "host"}
          video={role === "host"}
          onDisconnected={onClose}
          data-lk-theme="default"
          style={{ height: "100dvh" }}
        >
          <VideoConference />
        </LiveKitRoom>
      ) : (
        <div className="grid h-full place-items-center text-sm text-white/70">जुड़ रहे हैं…</div>
      )}
    </div>
  );
}
