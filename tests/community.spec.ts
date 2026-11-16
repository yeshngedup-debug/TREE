import { test, expect, request as playwrightRequest } from "@playwright/test";

// ============================================================================
// COMMUNITY TESTS: accounts, publishing, discovery, profiles and API gates.
// These run against a fresh SQLite database created by scripts/test-server.mjs.
// ============================================================================

const stamp = Date.now().toString(36);
const password = "hackathon-test-password";
const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const member = {
  username: `member_${stamp}`.slice(0, 24),
  displayName: `Karma ${stamp}`,
  paragraph:
    "A practical pilot that helps rural students keep learning through the winter, run by local volunteers with offline devices.",
};

function token(label: string) {
  return `${label}${stamp}`;
}

test.describe.serial("community publishing flow", () => {
  test("signs up, publishes an aspiration, discovers it and edits the profile", async ({
    page,
  }) => {
    await page.goto("/create");
    await expect(
      page.getByRole("heading", { name: "Join the grove." }),
    ).toBeVisible();

    await page.getByLabel("Username").fill(member.username);
    await page.getByLabel("Display name").fill(member.displayName);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create my account" }).click();

    await expect(
      page.getByRole("heading", { name: "What are you growing?" }),
    ).toBeVisible();

    const searchToken = token("winterlearning");
    const title = `Learning through the winter ${searchToken}`;
    await page.getByText("A future you hope to see.").click();
    await expect(
      page.getByRole("radio", { name: /Aspiration/ }),
    ).toBeChecked();
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Category").selectOption("education");
    await page.getByLabel("Description").fill(member.paragraph);
    await page.getByLabel("Tags").fill("learning, offline, winter");
    await page.getByRole("button", { name: "Publish", exact: true }).click();

    await expect(page).toHaveURL(/\/posts\/[a-z0-9-]+$/);
    const slug = new URL(page.url()).pathname.split("/").pop() ?? "";
    expect(slug).toContain("learning-through-the-winter");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator(".post-body")).toContainText(member.paragraph);
    await expect(page.getByRole("link", { name: "#learning" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: new RegExp(member.displayName) }).first(),
    ).toBeVisible();
    await expect(
      page.locator('script[type="application/ld+json"]'),
    ).toHaveCount(1);

    // Discovery finds the post by keyword, type filter and category filter.
    await page.goto(`/discover?q=${searchToken}`);
    await expect(
      page.getByRole("link", { name: title, exact: true }),
    ).toBeVisible();
    await page.goto(`/discover?q=${searchToken}&type=aspiration`);
    await expect(
      page.getByRole("link", { name: title, exact: true }),
    ).toBeVisible();
    await page.goto(`/discover?q=${searchToken}&category=education`);
    await expect(
      page.getByRole("link", { name: title, exact: true }),
    ).toBeVisible();
    await page.goto(`/discover?q=${searchToken}&type=idea`);
    await expect(
      page.getByRole("heading", { name: "Nothing has grown here yet." }),
    ).toBeVisible();
    await page.goto(`/discover?tag=learning`);
    await expect(
      page.getByRole("link", { name: title, exact: true }),
    ).toBeVisible();

    // The public profile shows the published work and lets the owner edit it.
    await page.goto(`/u/${member.username}`);
    await expect(
      page.getByRole("heading", { name: member.displayName, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/1 published/)).toBeVisible();

    await page.getByText("Edit profile").click();
    const bio = "Building offline learning tools with rural schools.";
    await page.getByLabel("Short biography").fill(bio);
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved.")).toBeVisible();
    await expect(
      page.getByRole("paragraph").filter({ hasText: bio }),
    ).toBeVisible();

    // Signing out clears the session and the create page returns to auth.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/create");
    await expect(
      page.getByRole("heading", { name: "Join the grove." }),
    ).toBeVisible();

    // Signing back in restores the composer.
    await page
      .locator(".community-switch")
      .getByRole("button", { name: "Sign in" })
      .click();
    await page.getByLabel("Username").fill(member.username);
    await page.getByLabel("Password").fill(password);
    await page
      .locator("form.community-form")
      .getByRole("button", { name: "Sign in" })
      .click();
    await expect(
      page.getByRole("heading", { name: "What are you growing?" }),
    ).toBeVisible();

    // The signed-in author can like, save and discuss the published post.
    await page.goto(`/posts/${slug}`);
    await page.getByRole("button", { name: "Like this post" }).click();
    await expect(
      page.getByRole("button", { name: "Unlike this post" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Saved" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const note = "A note from the author about the next steps.";
    await page.getByLabel("Add a comment").fill(note);
    await page.getByRole("button", { name: "Post comment" }).click();
    await expect(page.locator(".comment-item").filter({ hasText: note })).toBeVisible();
    await expect(page.locator(".comment-heading")).toContainText("1 comment");

    await page.goto("/saved");
    await expect(
      page.getByRole("link", { name: title, exact: true }),
    ).toBeVisible();
  });
});

test.describe("community API", () => {
  test("enforces auth, origin, validation and search safety", async ({
    page,
    request,
  }) => {
    const apiUser = `api_${stamp}`.slice(0, 24);
    const signup = await request.post("/api/community/auth/signup", {
      data: {
        username: apiUser,
        displayName: `Api ${stamp}`,
        password,
      },
    });
    expect(signup.status()).toBe(201);

    const me = await request.get("/api/community/auth/me");
    expect(await me.json()).toMatchObject({ authenticated: true });

    const anonymous = await playwrightRequest.newContext({
      baseURL: baseURL,
    });
    try {
      const blocked = await anonymous.post("/api/community/posts", {
        data: {
          title: "Anonymous attempt to publish",
          body: member.paragraph,
          contentType: "idea",
          category: "education",
        },
      });
      expect(blocked.status()).toBe(401);
    } finally {
      await anonymous.dispose();
    }

    const crossOrigin = await request.post("/api/community/posts", {
      headers: { Origin: "https://evil.example" },
      data: {
        title: "Cross origin attempt to publish",
        body: member.paragraph,
        contentType: "idea",
        category: "education",
      },
    });
    expect(crossOrigin.status()).toBe(403);

    const badCategory = await request.post("/api/community/posts", {
      data: {
        title: "A post with an unknown category",
        body: member.paragraph,
        contentType: "idea",
        category: "not-a-real-category",
      },
    });
    expect(badCategory.status()).toBe(400);
    expect(await badCategory.json()).toMatchObject({ code: "BAD_CATEGORY" });

    const shortBody = await request.post("/api/community/posts", {
      data: {
        title: "A post with a short body",
        body: "too short",
        contentType: "idea",
        category: "education",
      },
    });
    expect(shortBody.status()).toBe(400);

    const searchToken = token("shared");
    const first = await request.post("/api/community/posts", {
      data: {
        title: `Solar study lamps ${searchToken}`,
        body: member.paragraph,
        contentType: "idea",
        category: "education",
        tags: ["energy", "learning"],
      },
    });
    expect(first.status()).toBe(201);
    const firstPost = (await first.json()).post as { slug: string };

    const second = await request.post("/api/community/posts", {
      data: {
        title: `A second shared idea ${searchToken}`,
        body: member.paragraph,
        contentType: "idea",
        category: "technology",
        tags: ["energy"],
      },
    });
    expect(second.status()).toBe(201);

    const duplicate = await request.post("/api/community/posts", {
      data: {
        title: `Solar study lamps ${searchToken}`,
        body: member.paragraph,
        contentType: "idea",
        category: "education",
      },
    });
    expect(duplicate.status()).toBe(201);
    const duplicatePost = (await duplicate.json()).post as { slug: string };
    expect(duplicatePost.slug).not.toBe(firstPost.slug);

    const found = await request.get(
      `/api/community/posts?q=${searchToken}&pageSize=1&page=2`,
    );
    expect(found.status()).toBe(200);
    const foundBody = (await found.json()) as {
      posts: unknown[];
      total: number;
      pages: number;
    };
    expect(foundBody.total).toBeGreaterThanOrEqual(3);
    expect(foundBody.pages).toBeGreaterThanOrEqual(3);
    expect(foundBody.posts).toHaveLength(1);

    const filtered = await request.get(
      `/api/community/posts?q=${searchToken}&type=aspiration`,
    );
    expect((await filtered.json()).total).toBe(0);

    const injection = await request.get(
      `/api/community/posts?q=${encodeURIComponent("' or 1=1--")}`,
    );
    expect(injection.status()).toBe(200);
    expect((await injection.json()).total).toBe(0);

    const xssTitle = `Saving <script>alert(1)</script> ${searchToken}`;
    const xss = await request.post("/api/community/posts", {
      data: {
        title: xssTitle,
        body: "A title that tries to inject markup, stored as plain text and escaped on the page.",
        contentType: "aspiration",
        category: "technology",
      },
    });
    expect(xss.status()).toBe(201);
    const xssPost = (await xss.json()).post as { slug: string };

    let alerted = false;
    page.on("dialog", async (dialog) => {
      alerted = true;
      await dialog.dismiss();
    });
    await page.goto(`/posts/${xssPost.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(xssTitle);
    await expect(page.locator(".post-article script")).toHaveCount(0);
    expect(alerted).toBe(false);

    const wrongPassword = await playwrightRequest.newContext({
      baseURL: baseURL,
    });
    try {
      const denied = await wrongPassword.post("/api/community/auth/login", {
        data: { username: apiUser, password: "definitely-wrong" },
      });
      expect(denied.status()).toBe(401);
    } finally {
      await wrongPassword.dispose();
    }

    const duplicateAccount = await playwrightRequest.newContext({
      baseURL: baseURL,
    });
    try {
      const taken = await duplicateAccount.post("/api/community/auth/signup", {
        data: {
          username: apiUser,
          displayName: "Duplicate",
          password,
        },
      });
      expect(taken.status()).toBe(409);
    } finally {
      await duplicateAccount.dispose();
    }

    const logout = await request.post("/api/community/auth/logout");
    expect(logout.status()).toBe(200);
    const afterLogout = await request.get("/api/community/auth/me");
    expect(await afterLogout.json()).toEqual({
      authenticated: false,
      account: null,
    });
    const afterLogoutPost = await request.post("/api/community/posts", {
      data: {
        title: "A post after signing out",
        body: member.paragraph,
        contentType: "idea",
        category: "education",
      },
    });
    expect(afterLogoutPost.status()).toBe(401);
  });
});

type ModerationOverview = {
  counts: { openReports: number };
  reports: Array<{
    id: string;
    status: string;
    post: { slug: string } | null;
    comment: { id: string } | null;
  }>;
};

type LeafSnapshot = {
  leaves: Array<{ post_slug?: string; leaf_message: string }>;
};

test.describe.serial("community engagement and moderation flow", () => {
  test("likes, bookmarks, comments, reports, moderation and tree linking", async ({
    page,
    request,
  }) => {
    const author = `engage_${stamp}`.slice(0, 24);
    const signup = await request.post("/api/community/auth/signup", {
      data: {
        username: author,
        displayName: `Engage ${stamp}`,
        password,
      },
    });
    expect(signup.status()).toBe(201);

    const searchToken = token("engage");
    const title = `A solar micro-grid for remote homes ${searchToken}`;
    const created = await request.post("/api/community/posts", {
      data: {
        title,
        body: member.paragraph,
        contentType: "idea",
        category: "technology",
        tags: ["energy"],
      },
    });
    expect(created.status()).toBe(201);
    const post = (await created.json()).post as { slug: string };
    expect(post.slug).toContain("solar-micro-grid");

    // Anonymous visitors cannot engage or report, but can read comments.
    const anonymous = await playwrightRequest.newContext({ baseURL });
    try {
      const like = await anonymous.post(
        `/api/community/posts/${post.slug}/like`,
      );
      expect(like.status()).toBe(401);
      const bookmark = await anonymous.post(
        `/api/community/posts/${post.slug}/bookmark`,
      );
      expect(bookmark.status()).toBe(401);
      const comment = await anonymous.post(
        `/api/community/posts/${post.slug}/comments`,
        { data: { body: "Anonymous comment" } },
      );
      expect(comment.status()).toBe(401);
      const report = await anonymous.post(
        `/api/community/posts/${post.slug}/report`,
        { data: { reason: "spam" } },
      );
      expect(report.status()).toBe(401);
    } finally {
      await anonymous.dispose();
    }

    // Likes toggle without double counting.
    const like = await request.post(`/api/community/posts/${post.slug}/like`);
    expect(like.status()).toBe(200);
    expect(await like.json()).toMatchObject({
      engagement: { liked: true, likeCount: 1 },
    });
    const unlike = await request.post(
      `/api/community/posts/${post.slug}/like`,
    );
    expect(await unlike.json()).toMatchObject({
      engagement: { liked: false, likeCount: 0 },
    });

    // Bookmarks appear in the private saved list and toggle off.
    const bookmark = await request.post(
      `/api/community/posts/${post.slug}/bookmark`,
    );
    expect(await bookmark.json()).toEqual({ bookmarked: true });
    const saved = await request.get("/api/community/saved");
    expect(saved.status()).toBe(200);
    const savedBody = (await saved.json()) as {
      posts: Array<{ slug: string }>;
    };
    expect(savedBody.posts.map((entry) => entry.slug)).toContain(post.slug);
    const unbookmark = await request.post(
      `/api/community/posts/${post.slug}/bookmark`,
    );
    expect(await unbookmark.json()).toEqual({ bookmarked: false });
    const savedAgain = (await (
      await request.get("/api/community/saved")
    ).json()) as { posts: Array<{ slug: string }> };
    expect(savedAgain.posts.map((entry) => entry.slug)).not.toContain(
      post.slug,
    );

    // Comments are stored, listed and counted.
    const commentBody = "This could work with village maintenance teams.";
    const commentResponse = await request.post(
      `/api/community/posts/${post.slug}/comments`,
      { data: { body: commentBody } },
    );
    expect(commentResponse.status()).toBe(201);
    const comment = (await commentResponse.json()).comment as {
      id: string;
      body: string;
    };
    expect(comment.body).toBe(commentBody);
    const comments = await request.get(
      `/api/community/posts/${post.slug}/comments`,
    );
    expect(comments.status()).toBe(200);
    const commentsBody = (await comments.json()) as {
      comments: Array<{ id: string; body: string }>;
    };
    expect(commentsBody.comments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: comment.id, body: commentBody }),
      ]),
    );

    // Editing keeps the original slug and refreshes the linked leaf.
    const revisedTitle = `${title} revised`;
    const edited = await request.patch(`/api/community/posts/${post.slug}`, {
      data: {
        title: revisedTitle,
        body: member.paragraph,
        contentType: "idea",
        category: "technology",
        tags: ["energy"],
      },
    });
    expect(edited.status()).toBe(200);
    expect((await edited.json()).post.slug).toBe(post.slug);

    // Published posts grow exactly one linked leaf on the Living Tree.
    const leafResponse = await request.get("/api/leaves");
    expect(leafResponse.status()).toBe(200);
    const snapshot = (await leafResponse.json()) as LeafSnapshot;
    const linkedLeaf = snapshot.leaves.find(
      (leaf) => leaf.post_slug === post.slug,
    );
    expect(linkedLeaf).toBeTruthy();
    expect(linkedLeaf?.leaf_message).toContain("revised");

    // Reports are accepted once per account and surface in moderation.
    const postReport = await request.post(
      `/api/community/posts/${post.slug}/report`,
      { data: { reason: "misinformation", detail: "Test report detail." } },
    );
    expect(postReport.status()).toBe(201);
    const duplicatePostReport = await request.post(
      `/api/community/posts/${post.slug}/report`,
      { data: { reason: "spam" } },
    );
    expect(duplicatePostReport.status()).toBe(409);

    const commentReport = await request.post(
      `/api/community/comments/${comment.id}/report`,
      { data: { reason: "harassment" } },
    );
    expect(commentReport.status()).toBe(201);
    const duplicateCommentReport = await request.post(
      `/api/community/comments/${comment.id}/report`,
      { data: { reason: "spam" } },
    );
    expect(duplicateCommentReport.status()).toBe(409);

    // A member cannot open the moderation queue.
    const memberModeration = await request.get("/api/community/moderation");
    expect(memberModeration.status()).toBe(401);

    // Staff can review reports and hide or restore the linked leaf.
    const staffLogin = await request.post("/api/admin/session", {
      data: { password: "test-only-staff-password" },
    });
    expect(staffLogin.status()).toBe(200);
    const overviewResponse = await request.get("/api/community/moderation");
    expect(overviewResponse.status()).toBe(200);
    const overview = (await overviewResponse.json())
      .overview as ModerationOverview;
    expect(overview.counts.openReports).toBeGreaterThanOrEqual(2);
    const reportOnPost = overview.reports.find(
      (report) => report.post?.slug === post.slug,
    );
    const reportOnComment = overview.reports.find(
      (report) => report.comment?.id === comment.id,
    );
    expect(reportOnPost).toBeTruthy();
    expect(reportOnComment).toBeTruthy();

    const hide = await request.post("/api/community/moderation", {
      data: {
        action: "post_status",
        target: post.slug,
        status: "hidden",
        note: "test hide",
      },
    });
    expect(hide.status()).toBe(200);
    expect(
      (await request.get(`/api/community/posts/${post.slug}`)).status(),
    ).toBe(404);
    const hiddenSearch = await request.get(
      `/api/community/posts?q=${searchToken}`,
    );
    expect((await hiddenSearch.json()).total).toBe(0);
    const hiddenLeaves = (await (
      await request.get("/api/leaves")
    ).json()) as LeafSnapshot;
    expect(
      hiddenLeaves.leaves.some((leaf) => leaf.post_slug === post.slug),
    ).toBe(false);

    const restore = await request.post("/api/community/moderation", {
      data: {
        action: "post_status",
        target: post.slug,
        status: "published",
        note: "test restore",
      },
    });
    expect(restore.status()).toBe(200);
    expect(
      (await request.get(`/api/community/posts/${post.slug}`)).status(),
    ).toBe(200);
    const restoredLeaves = (await (
      await request.get("/api/leaves")
    ).json()) as LeafSnapshot;
    expect(
      restoredLeaves.leaves.some((leaf) => leaf.post_slug === post.slug),
    ).toBe(true);

    // Featured posts are exposed to the public listing.
    const feature = await request.post("/api/community/moderation", {
      data: { action: "feature", target: post.slug, featured: true, note: "" },
    });
    expect(feature.status()).toBe(200);
    const listed = (await (
      await request.get(`/api/community/posts?q=${searchToken}`)
    ).json()) as { posts: Array<{ slug: string; featured: boolean }> };
    expect(listed.posts.find((entry) => entry.slug === post.slug)?.featured).toBe(
      true,
    );
    await request.post("/api/community/moderation", {
      data: { action: "feature", target: post.slug, featured: false, note: "" },
    });

    // Hidden comments leave the public conversation and the count.
    const hideComment = await request.post("/api/community/moderation", {
      data: {
        action: "comment_status",
        target: comment.id,
        status: "hidden",
        note: "test hide comment",
      },
    });
    expect(hideComment.status()).toBe(200);
    const afterHideComments = (await (
      await request.get(`/api/community/posts/${post.slug}/comments`)
    ).json()) as { comments: unknown[] };
    expect(afterHideComments.comments).toHaveLength(0);
    await request.post("/api/community/moderation", {
      data: {
        action: "comment_status",
        target: comment.id,
        status: "published",
        note: "test restore comment",
      },
    });
    const afterRestoreComments = (await (
      await request.get(`/api/community/posts/${post.slug}/comments`)
    ).json()) as { comments: unknown[] };
    expect(afterRestoreComments.comments).toHaveLength(1);

    // Resolving and dismissing clears the open report count.
    await request.post("/api/community/moderation", {
      data: {
        action: "report_status",
        target: reportOnPost!.id,
        status: "resolved",
        note: "",
      },
    });
    const dismissed = await request.post("/api/community/moderation", {
      data: {
        action: "report_status",
        target: reportOnComment!.id,
        status: "dismissed",
        note: "",
      },
    });
    expect(dismissed.status()).toBe(200);
    const cleared = (await dismissed.json())
      .overview as ModerationOverview;
    expect(cleared.counts.openReports).toBe(0);

    // A community moderator account can use the same queue without staff auth.
    const promote = await request.post("/api/community/moderation", {
      data: { action: "account_role", target: author, role: "moderator", note: "" },
    });
    expect(promote.status()).toBe(200);
    expect((await request.delete("/api/admin/session")).status()).toBe(200);
    const asModerator = await request.get("/api/community/moderation");
    expect(asModerator.status()).toBe(200);
    expect((await asModerator.json()).actor).toMatchObject({
      kind: "account",
      label: `@${author}`,
      role: "moderator",
    });

    // A moderator curates content but cannot escalate people or rewrite the
    // category vocabulary. Those actions stay with staff and community admins.
    const escalate = await request.post("/api/community/moderation", {
      data: { action: "account_role", target: author, role: "admin", note: "" },
    });
    expect(escalate.status()).toBe(403);
    const suspendAsModerator = await request.post("/api/community/moderation", {
      data: {
        action: "account_status",
        target: author,
        status: "suspended",
        note: "",
      },
    });
    expect(suspendAsModerator.status()).toBe(403);
    const categoryAsModerator = await request.post("/api/community/moderation", {
      data: {
        action: "category",
        slug: "moderator-created",
        label: "Moderator created",
        description: "",
        note: "",
      },
    });
    expect(categoryAsModerator.status()).toBe(403);
    const featureAsModerator = await request.post("/api/community/moderation", {
      data: { action: "feature", target: post.slug, featured: true, note: "" },
    });
    expect(featureAsModerator.status()).toBe(200);
    await request.post("/api/community/moderation", {
      data: { action: "feature", target: post.slug, featured: false, note: "" },
    });

    // Suspension blocks the account and invalidates its sessions; reactivation
    // lets the member sign in again.
    await request.post("/api/admin/session", {
      data: { password: "test-only-staff-password" },
    });
    await request.post("/api/community/moderation", {
      data: { action: "account_role", target: author, role: "member", note: "" },
    });
    const suspend = await request.post("/api/community/moderation", {
      data: {
        action: "account_status",
        target: author,
        status: "suspended",
        note: "",
      },
    });
    expect(suspend.status()).toBe(200);
    expect(await (await request.get("/api/community/auth/me")).json()).toEqual({
      authenticated: false,
      account: null,
    });
    const blockedLogin = await request.post("/api/community/auth/login", {
      data: { username: author, password },
    });
    expect(blockedLogin.status()).toBe(401);
    await request.post("/api/community/moderation", {
      data: {
        action: "account_status",
        target: author,
        status: "active",
        note: "",
      },
    });
    const relogin = await request.post("/api/community/auth/login", {
      data: { username: author, password },
    });
    expect(relogin.status()).toBe(200);
    expect(
      await (await request.get("/api/community/auth/me")).json(),
    ).toMatchObject({ authenticated: true });

    // SEO routes include published posts and exclude private surfaces.
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const sitemapXml = await sitemap.text();
    expect(sitemapXml).toContain(`/posts/${post.slug}`);
    expect(sitemapXml).not.toContain("/admin");
    // Private or noindex surfaces must not appear in the sitemap.
    expect(sitemapXml).not.toContain("/create");
    expect(sitemapXml).not.toContain("/voices");
    expect(sitemapXml).not.toContain("/join");
    const robots = await request.get("/robots.txt");
    const robotsText = await robots.text();
    expect(robotsText).toContain("Disallow: /admin");
    expect(robotsText).toContain("Disallow: /create");
    expect(robotsText).toContain("Sitemap:");

    await page.goto("/discover");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/discover$/,
    );
  });
});
