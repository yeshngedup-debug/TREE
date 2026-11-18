import { SiteHeader, SiteFooter } from "@/components/brand";
import {
  SurfaceClosing,
  SurfaceHero,
  SurfaceShell,
} from "@/components/surface";

export default function PrivacyPage() {
  return (
    <SurfaceShell>
      <SiteHeader />
      <main>
        <SurfaceHero
          kicker="Participation & privacy"
          title={
            <>
              A shared tree.
              <br />
              Your choice to grow.
            </>
          }
          lede="What becomes public, what stays private, and how your words are handled at the Living Tree."
        />
        <div className="surface-prose">
          <section>
            <h2>What becomes public</h2>
            <p>
              Your approved leaf, its theme, timestamp and suggested guide path
              appear on the tree and a public keepsake page. Anyone with that
              page's link can view it. Your leaf may contribute to a collective
              reflection. Participation is optional and anonymous; we do not ask
              for a name or contact details to submit a hope.
            </p>
          </section>
          <section>
            <h2>Remembering a visit is optional</h2>
            <p>
              After submitting, you can choose to connect your voice to your
              11-digit CID and a private 6-digit PIN. The CID is stored only as
              a keyed lookup value; the PIN is salted and hashed. Neither is
              sent to the configured AI provider, displayed publicly or kept in
              browser storage. This is a private visit profile, not government
              identity verification. You need both values to unlock your linked
              notes and replies on a later visit. Staff cannot recover a
              forgotten PIN.
            </p>
            <p>
              A private session cookie lasts 12 hours. While signed in, new
              submissions are connected to your history. Sign out on shared
              devices. From your history you can remove your profile, its lookup
              value, PIN and history links; anonymous leaves and staff
              submission records remain. Private notes removed by staff are no
              longer available in your history.
            </p>
          </section>
          <section>
            <h2>What happens to your words</h2>
            <p>
              When interpretation is enabled, your aspiration is sent to the
              configured AI provider for safety checks and interpretation, with
              response storage disabled in our generation requests. The provider
              processes that request under its own data policies. In offline
              mode (set via <code>AI_MODE=offline</code>) we use local keyword
              matching and a curated sentence instead — no external provider is
              contacted.
            </p>
            <p>
              <strong>AI-generated guidance is clearly labeled.</strong> When the
              AI guide responds, the UI indicates whether it used the live
              provider or the curated offline fallback. Conversation history is
              held by the browser and sent with each request; there is no per-
              visitor chat table in the database. Any provider failure, timeout,
              or malformed response degrades to the deterministic offline fallback.
            </p>
            <p>
              With the consent you give before submitting, your original words
              are retained privately for staff review. Email addresses,
              phone-like numbers and links are redacted before the message is
              encrypted. Only the approved leaf is public. A personal reply to
              your note is stored privately for safe retries; it is never
              included in the public tree or keepsake.
            </p>
          </section>
          <section>
            <h2>Where your data is stored</h2>
            <p>
              Approved leaves, encrypted private messages and moderation
              outcomes, anonymous request fingerprints for safe retries,
              short-lived rate-limit counters, staff action records and
              aggregate counts are stored in the configured PostgreSQL database
              (Neon serverless). A signed anonymous browser cookie helps limit
              repeat submissions. Staff sign-in uses a separate cookie that
              expires after eight hours. The display caches approved leaves on
              its browser for up to one day to recover from outages. Your
              private reply and original note are also kept in this browser tab
              until you start another hope or close the tab. An unfinished form
              is kept in this browser tab's session storage so a refresh does
              not lose your draft. Staff can delete private words in the
              console; doing so also hides the linked public leaf. Older
              contributions created before private history was enabled do not
              have recoverable original words.
            </p>
          </section>
          <section>
            <h2>Keep your hope anonymous</h2>
            <p>
              Please leave out names, addresses, phone numbers, emails, links
              and personal information. Submitted content is checked, but
              automated moderation has limits. Ask reception staff to remove a
              leaf if something should not be shared. Hidden leaves stop
              appearing in public reads and connected displays; a disconnected
              screen may show its last cached tree until it reconnects. A saved
              image or shared copy cannot be recalled.
            </p>
          </section>
          <section>
            <h2>A living, non-official collection</h2>
            <p>
              These are participating visitors' hopes, not official plans,
              commitments or representative survey results. Demo contributions
              are labelled. The local operator controls database retention and
              should clear demonstration data when the event ends.
            </p>
          </section>
        </div>
        <SurfaceClosing
          kicker="Participation is a choice"
          title="Add a hope, or simply wander."
          text="Every leaf is shared with care. Read the tree, explore the community, or leave a hope of your own."
          primary={{ href: "/join", label: "Add your hope" }}
          secondary={{ href: "/discover", label: "Explore Discover" }}
        />
      </main>
      <SiteFooter />
    </SurfaceShell>
  );
}
