import { SiteFooter, SiteHeader } from "@/components/brand";
import { SurfaceShell } from "@/components/surface";
import { JoinForm } from "@/features/join/join-form";
import { themeSchema } from "@/lib/schemas";

export const metadata = {
  title: "Add your hope",
  description: "Share a hope for Bhutan and grow a leaf on the BI Tree.",
  robots: { index: false, follow: false },
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams,
    theme = themeSchema.safeParse(params.theme);
  return (
    <SurfaceShell>
      <SiteHeader />
      <main className="surface-join">
        <div className="join-layout">
          <header className="join-intro">
            <p className="surface-kicker">Add a hope</p>
            <h1 className="join-title">
              Leave a hope
              <br />
              for Bhutan.
            </h1>
            <p className="join-lede">
              Three quiet steps: choose a branch, write what matters to you,
              and watch your leaf join the Living Tree. No account needed.
            </p>
            <ul className="join-notes">
              <li>
                <strong>Anonymous by default</strong>
                No name, no email. Only your approved leaf appears on the tree.
              </li>
              <li>
                <strong>Read before it grows</strong>
                Every note is checked privately before it joins the Living Tree.
              </li>
              <li>
                <strong>Yours to return to</strong>
                Add an optional CID and PIN to revisit your note and private
                reply.
              </li>
            </ul>
          </header>
          <div className="join-flow">
            <JoinForm initialTheme={theme.success ? theme.data : undefined} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </SurfaceShell>
  );
}
