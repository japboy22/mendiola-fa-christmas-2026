import { ChristmasRsvpExperience } from "@/components/christmas-rsvp-experience";
import { fetchAllRsvps } from "@/lib/rsvp-sheets";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { records, stats, syncMode, hasAppsScriptUrl } = await fetchAllRsvps();

  return (
    <ChristmasRsvpExperience
      initialRecords={records}
      initialStats={stats}
      initialSyncMode={syncMode}
      initialHasAppsScriptUrl={hasAppsScriptUrl}
    />
  );
}
