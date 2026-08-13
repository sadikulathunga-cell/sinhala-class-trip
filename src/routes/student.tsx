import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Satellite, WifiOff, Save, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  flushQueue,
  loadProfile,
  markOffline,
  queuedCount,
  saveProfile,
  sendPing,
} from "@/lib/classtrack";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Student Check-in — ClassTrack" },
      {
        name: "description",
        content:
          "Save your name and roll number, then share your GPS location with your teacher every 30 seconds.",
      },
      { property: "og:title", content: "Student Check-in — ClassTrack" },
      {
        property: "og:description",
        content: "Share your trip location with your teacher in one tap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentScreen,
});

/** How often a location ping is sent while GPS sharing is on. */
const PING_INTERVAL_MS = 30_000;

function StudentScreen() {
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [saved, setSaved] = useState(false);
  const [gpsOn, setGpsOn] = useState(false);
  const [status, setStatus] = useState<string>("Idle");
  const [pending, setPending] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore the locally saved identity (available with no internet).
  useEffect(() => {
    const profile = loadProfile();
    setName(profile.name);
    setRollNo(profile.rollNo);
    setSaved(Boolean(profile.name && profile.rollNo));
    setPending(queuedCount());
  }, []);

  // Retry queued pings as soon as the browser regains connectivity.
  useEffect(() => {
    const onOnline = async () => {
      const sent = await flushQueue();
      setPending(queuedCount());
      if (sent > 0) toast.success(`Synced ${sent} saved location${sent > 1 ? "s" : ""}`);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  /** Read the GPS position once and push it to the backend. */
  const pingOnce = () => {
    if (!navigator.geolocation) {
      setStatus("GPS not supported on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const ok = await sendPing({
          name,
          rollNo,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          lastSeen: new Date().toISOString(),
        });
        setPending(queuedCount());
        setStatus(
          ok
            ? `Sent at ${new Date().toLocaleTimeString()}`
            : "Offline — location saved on device",
        );
      },
      (err) => setStatus(`Location error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  // Start/stop the 30 second ping loop when the toggle changes.
  useEffect(() => {
    if (!gpsOn) {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      return;
    }
    pingOnce();
    timer.current = setInterval(pingOnce, PING_INTERVAL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsOn, name, rollNo]);

  const handleSave = () => {
    if (!name.trim() || !rollNo.trim()) {
      toast.error("Enter both your name and roll number");
      return;
    }
    saveProfile({ name: name.trim(), rollNo: rollNo.trim() });
    setSaved(true);
    toast.success("Details saved on this device");
  };

  const handleStopAll = async () => {
    setGpsOn(false);
    setStatus("Stopped");
    if (rollNo) await markOffline(rollNo.trim());
    toast("Sharing stopped");
  };

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4">
          <Link to="/" className="rounded-full p-2 hover:bg-muted" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-medium">Student</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-4 px-4 py-6">
        {/* Identity — stored locally so it works with no connection. */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-elev-1">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Your details</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amaya Perera"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roll">Roll No</Label>
              <Input
                id="roll"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="e.g. 10B-042"
              />
            </div>
            <Button onClick={handleSave} className="w-full rounded-full">
              <Save className="mr-2 h-4 w-4" />
              Save details
            </Button>
          </div>
        </section>

        {/* GPS sharing toggle */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-elev-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-medium">
                <Satellite className="h-4 w-4 text-primary" />
                Online GPS
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sends your location to your teacher every 30 seconds.
              </p>
            </div>
            <Switch
              checked={gpsOn}
              disabled={!saved}
              onCheckedChange={setGpsOn}
              aria-label="Toggle GPS sharing"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant={gpsOn ? "default" : "secondary"} className="rounded-full">
              {gpsOn ? "Sharing location" : "Not sharing"}
            </Badge>
            {pending > 0 && (
              <Badge variant="outline" className="rounded-full">
                <WifiOff className="mr-1 h-3 w-3" />
                {pending} saved offline
              </Badge>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{status}</p>
          {!saved && (
            <p className="mt-2 text-xs text-warning">Save your details to start sharing.</p>
          )}
        </section>

        <Button
          variant="destructive"
          className="w-full rounded-full"
          onClick={handleStopAll}
        >
          <Square className="mr-2 h-4 w-4" />
          Stop All
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Browsers can't broadcast Bluetooth. Use the ClassTrack mobile app for offline
          Bluetooth check-in.
        </p>
      </div>
    </main>
  );
}
