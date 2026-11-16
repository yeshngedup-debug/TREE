import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/brand";
import { SurfaceShell } from "@/components/surface";
import { CommunityAuthForm } from "@/features/community/community-auth-form";
import { PostComposer } from "@/features/community/post-composer";
import {
  communityContentTypes,
  safeNextPath,
  type CommunityContentType,
} from "@/lib/community";
import { listCategories } from "@/server/community";
import { currentAccount } from "@/server/community-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create · BI Tree",
  description:
    "Publish an aspiration or a practical idea and add it to Bhutan's Living Tree.",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const account = await currentAccount();
  const next = safeNextPath(first(raw.next));
  const requestedType = first(raw.type);
  const initialType: CommunityContentType = communityContentTypes.includes(
    requestedType as CommunityContentType,
  )
    ? (requestedType as CommunityContentType)
    : "idea";
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  try {
    categories = await listCategories();
  } catch {
    categories = [];
  }

  return (
    <SurfaceShell>
      <SiteHeader />
      <main className="surface-narrow-wide">
        {account ? (
          categories.length ? (
            <PostComposer
              categories={categories}
              initialType={initialType}
            />
          ) : (
            <section className="community-panel">
              <h1 className="text-2xl">Categories are unavailable.</h1>
              <p className="mt-3 text-sm leading-6 text-soft">
                The community database is still waking up. Please refresh in a
                moment.
              </p>
            </section>
          )
        ) : (
          <CommunityAuthForm
            initialMode={first(raw.mode) === "login" ? "login" : "signup"}
            next={next}
          />
        )}
      </main>
      <SiteFooter />
    </SurfaceShell>
  );
}
