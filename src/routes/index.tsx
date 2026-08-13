import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Users, MapPin } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClassTrack — School Trip Student Tracking" },
      {
        name: "description",
        content:
          "Track up to 400 students on school trips. Students share GPS, teachers see who is nearby and who is online — works offline too.",
      },
      { property: "og:title", content: "ClassTrack — School Trip Student Tracking" },
      {
        property: "og:description",
        content: "Live GPS roll call for school trips. Student and teacher modes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RolePicker,
});

/** Entry screen: pick Student or Teacher. */
function RolePicker() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-elev-2">
            <MapPin className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">ClassTrack</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep every student accounted for on school trips — online or off.
          </p>
        </div>

        <div className="space-y-3">
          <RoleCard
            to="/student"
            icon={<GraduationCap className="h-6 w-6" />}
            title="Student"
            subtitle="Share your location with your teacher"
          />
          <RoleCard
            to="/teacher"
            icon={<Users className="h-6 w-6" />}
            title="Teacher"
            subtitle="See nearby students and the full roster"
          />
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Web version. Bluetooth proximity is available in the ClassTrack mobile app.
        </p>
      </div>
    </main>
  );
}

function RoleCard({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-elev-1 transition-all hover:-translate-y-0.5 hover:shadow-elev-2 active:translate-y-0"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}
