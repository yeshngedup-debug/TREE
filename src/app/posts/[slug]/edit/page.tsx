import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/brand";
import { PostComposer } from "@/features/community/post-composer";
import { listCategories, getOwnPost } from "@/server/community";
import { currentAccount } from "@/server/community-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit post · BI Tree",
  robots: { index: false, follow: false },
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const account = await currentAccount();
  if (!account)
    redirect(`/create?mode=login&next=${encodeURIComponent(`/posts/${slug}/edit`)}`);
  const post = await getOwnPost(slug, account.id);
  if (!post) notFound();
  const categories = await listCategories();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[860px] px-5 pb-20 pt-6 md:px-10">
        <PostComposer categories={categories} post={post} />
      </main>
      <SiteFooter />
    </>
  );
}
