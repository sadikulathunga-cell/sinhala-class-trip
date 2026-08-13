import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Radar, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  distanceMeters,
  exportCsv,
  isLive,
  timeAgo,
  type StudentRecord,
} from "@/lib/classtrack";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Dashboard — ClassTrack" },
      {
        name: "description",
        content:
          "See which students are within 100 m of you and browse the full roster with live online status, last seen times and CSV export.",
      },
      { property: "og:title", content: "Teacher Dashboard — ClassTrack" },
      {
        property: "og:description",
        content: "Nearby students and the full trip roster, updated live.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherScreen,
});

/** Radius used by the Nearby tab. */
const NEARBY_RADIUS_M = 100;

function TeacherScreen() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load + live updates as students ping their location.
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("lastSeen", { ascending: false });
      if (error) toast.error("Couldn't load the roster");
      setStudents((data ?? []) as StudentRecord[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("students-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <Link to="/" className="rounded-full p-2 hover:bg-muted" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-medium">Teacher</h1>
          <Badge variant="secondary" className="ml-auto rounded-full">
            {students.length} students
          </Badge>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <Tabs defaultValue="nearby">
          <TabsList className="grid w-full grid-cols-2 rounded-full">
            <TabsTrigger value="nearby" className="rounded-full">
              <Radar className="mr-2 h-4 w-4" />
              Nearby
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-full">
              <Users className="mr-2 h-4 w-4" />
              All Students
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nearby" className="mt-5">
            <NearbyTab students={students} />
          </TabsContent>

          <TabsContent value="all" className="mt-5">
            <AllStudentsTab students={students} loading={loading} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

/** Tab 1 — students within 100 m of the teacher's own GPS position. */
function NearbyTab({ students }: { students: StudentRecord[] }) {
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState("");

  // Watch the teacher's position so distances stay accurate while walking.
  useEffect(() => {
    if (!scanning || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        toast.error(`Location error: ${err.message}`);
        setScanning(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [scanning]);

  const nearby = useMemo(() => {
    if (!origin) return [];
    return students
      .filter((s) => s.lat != null && s.lng != null && isLive(s))
      .map((s) => ({
        ...s,
        distance: distanceMeters(origin.lat, origin.lng, s.lat as number, s.lng as number),
      }))
      .filter((s) => s.distance <= NEARBY_RADIUS_M)
      .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.distance - b.distance);
  }, [students, origin, query]);

  return (
    <div className="space-y-4">
      <Button
        onClick={() => setScanning((v) => !v)}
        className="w-full rounded-full"
        variant={scanning ? "secondary" : "default"}
      >
        <Radar className={`mr-2 h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
        {scanning ? "Stop scan" : "Start scan"}
      </Button>

      <SearchBar value={query} onChange={setQuery} placeholder="Filter by name" />

      {!scanning && (
        <EmptyState text={`Start a scan to find students within ${NEARBY_RADIUS_M} m of you.`} />
      )}
      {scanning && !origin && <EmptyState text="Getting your location…" />}
      {scanning && origin && nearby.length === 0 && (
        <EmptyState text="No students within range right now." />
      )}

      <ul className="space-y-2">
        {nearby.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-elev-1"
          >
            <Avatar name={s.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.name}</p>
              <p className="text-sm text-muted-foreground">Roll {s.rollNo}</p>
            </div>
            <Badge className="rounded-full bg-success text-success-foreground">
              {Math.round(s.distance)} m
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tab 2 — the whole roster with search and CSV export. */
function AllStudentsTab({
  students,
  loading,
}: {
  students: StudentRecord[];
  loading: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q),
    );
  }, [students, query]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <SearchBar value={query} onChange={setQuery} placeholder="Search name or roll no" />
        <Button
          variant="outline"
          className="shrink-0 rounded-full"
          onClick={() => exportCsv(filtered)}
          disabled={filtered.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          CSV
        </Button>
      </div>

      {loading && <EmptyState text="Loading roster…" />}
      {!loading && filtered.length === 0 && (
        <EmptyState text="No students yet. Ask them to open the Student screen." />
      )}

      <ul className="space-y-2">
        {filtered.map((s) => {
          const live = isLive(s);
          return (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-elev-1"
            >
              <Avatar name={s.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name}</p>
                <p className="text-sm text-muted-foreground">
                  Roll {s.rollNo}
                  {s.lat != null && s.lng != null && (
                    <> · {s.lat.toFixed(4)}, {s.lng.toFixed(4)}</>
                  )}
                </p>
              </div>
              <div className="text-right">
                <Badge
                  className={`rounded-full ${
                    live
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {live ? "Online" : "Offline"}
                </Badge>
                <p className="mt-1 text-xs text-muted-foreground">{timeAgo(s.lastSeen)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-full pl-9"
      />
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
      {initials || "?"}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
