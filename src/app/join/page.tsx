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
              BI Tree — the Bhutanese Idea Tree — is one shared, living tree
              for everyone in the country. A hope can be anything you wish
              for Bhutan: big or small, personal or national. Write yours and
              it joins the canopy with everyone else’s. No account is
              required.
            </p>
            <ol
              className="join-lifecycle"
              aria-label="How your hope becomes a leaf"
            >
              <li>
                <span className="join-lifecycle-n" aria-hidden="true">
                  1
                </span>
                <span>
                  <strong>Write your hope</strong> — one honest wish, in your
                  own words.
                </span>
              </li>
              <li>
                <span className="join-lifecycle-n" aria-hidden="true">
                  2
                </span>
                <span>
                  <strong>It is read, privately</strong> — a person checks
                  every note before it appears. Your receipt arrives
                  immediately; the leaf joins the tree after review.
                </span>
              </li>
              <li>
                <span className="join-lifecycle-n" aria-hidden="true">
                  3
                </span>
                <span>
                  <strong>It joins the Living Tree</strong> — your leaf appears
                  on the shared 3D tree, with a keepsake link only you choose
                  to share.
                </span>
              </li>
            </ol>
            <ul className="join-notes">
              <li>
                <strong>Anonymous by default</strong>
                No name, no email. Only your approved leaf text appears on the
                tree. Hoping for a conversation instead? The community grove
                on Discover is for registered members — posts there have an
                author and a public thread; a visitor hope becomes a leaf,
                not a discussion.
              </li>
              <li>
                <strong>Read before it grows</strong>
                Every note is checked privately before it joins the Living
                Tree. What the moderator approves is what the kingdom sees —
                kind, honest and on-topic.
              </li>
              <li>
                <strong>Yours to return to</strong>
                Choose an optional 11-digit CID and a private 6-digit PIN.
                Anyone can reopen “My previous voices” with them on any
                browser — or keep your keepsake link, which works for anyone
                you share it with.
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
