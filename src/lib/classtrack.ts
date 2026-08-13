/**
 * ClassTrack — shared helpers for the web app.
 * Mirrors the data model used by the Flutter app (see /flutter).
 */
import { supabase } from "@/integrations/supabase/client";

/** A student row as stored in the "students" collection/table. */
export interface StudentRecord {
  id: string;
  name: string;
  rollNo: string;
  lat: number | null;
  lng: number | null;
  lastSeen: string;
  isOnline: boolean;
}

/** Locally saved student identity (works with no internet). */
export interface LocalProfile {
  name: string;
  rollNo: string;
}

const PROFILE_KEY = "classtrack.profile";
const QUEUE_KEY = "classtrack.queue";

/** Read the student's saved name/roll number from this device. */
export function loadProfile(): LocalProfile {
  if (typeof window === "undefined") return { name: "", rollNo: "" };
  try {
    return { name: "", rollNo: "", ...JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") };
  } catch {
    return { name: "", rollNo: "" };
  }
}

/** Persist the student's identity so it survives reloads and offline use. */
export function saveProfile(profile: LocalProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/** A location ping that could not be sent because the device was offline. */
interface QueuedPing {
  name: string;
  rollNo: string;
  lat: number;
  lng: number;
  lastSeen: string;
}

function readQueue(): QueuedPing[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedPing[];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedPing[]) {
  // Keep the queue bounded — only the most recent pings matter.
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-50)));
}

/** Number of pings still waiting for a connection. */
export function queuedCount(): number {
  return readQueue().length;
}

/**
 * Upsert the student's position into the backend.
 * If the network is unavailable the ping is stored locally and retried later,
 * which is what makes the web app usable in patchy trip conditions.
 */
export async function sendPing(ping: QueuedPing): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("students")
      .upsert(
        {
          name: ping.name,
          rollNo: ping.rollNo,
          lat: ping.lat,
          lng: ping.lng,
          lastSeen: ping.lastSeen,
          isOnline: true,
        },
        { onConflict: "rollNo" },
      );
    if (error) throw error;
    return true;
  } catch {
    writeQueue([...readQueue(), ping]);
    return false;
  }
}

/** Try to flush any pings recorded while offline. */
export async function flushQueue(): Promise<number> {
  const queue = readQueue();
  if (queue.length === 0) return 0;
  writeQueue([]);
  let sent = 0;
  for (const ping of queue) {
    // eslint-disable-next-line no-await-in-loop -- pings are few and ordered
    if (await sendPing(ping)) sent += 1;
  }
  return sent;
}

/** Mark a student as offline (used by the "Stop All" button). */
export async function markOffline(rollNo: string) {
  await supabase.from("students").update({ isOnline: false }).eq("rollNo", rollNo);
}

/** Great-circle distance in metres between two coordinates. */
export function distanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "3 min ago" style formatting for the Last Seen column. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/** A student counts as "online" only if they pinged recently. */
export function isLive(student: StudentRecord): boolean {
  return student.isOnline && Date.now() - new Date(student.lastSeen).getTime() < 2 * 60000;
}

/** Build and download a CSV of the roster. */
export function exportCsv(rows: StudentRecord[]) {
  const header = ["Name", "RollNo", "Latitude", "Longitude", "Status", "Last Seen"];
  const body = rows.map((s) => [
    s.name,
    s.rollNo,
    s.lat ?? "",
    s.lng ?? "",
    isLive(s) ? "Online" : "Offline",
    new Date(s.lastSeen).toISOString(),
  ]);
  const csv = [header, ...body]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `classtrack-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
