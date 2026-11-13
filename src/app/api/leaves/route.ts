import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { withTree } from '@/lib/db';
import { getAiProvider } from '@/lib/ai/provider';
import { moderateAspiration } from '@/lib/ai/provider';
import { getAiProvider as getAiProvider2 } from '@/lib/ai/provider';
import { submitAspiration } from '@/lib/submit';
import { generateMessageForLeaf } from '@/lib/ai/pipeline';
import { publishRealtime } from '@/lib/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SubmitSchema = z.object({
  tree: z.string().trim().min(1).max(64).default('global'),
  body: z.string().max(2000),
  inviteToken: z.string().trim().min(1).max(256).optional().nullable(),
});

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof SubmitSchema>;
  try {
    parsed = SubmitSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const userId = await getUserId();
  const ip = getClientIp(req.headers);
  const userAgent = req.headers.get('user-agent');
  const deviceCookie = req.cookies.get('wt_vid')?.value ?? null;

  let outcome;
  try {
    outcome = await submitAspiration({
      treeSlug: parsed.tree,
      body: parsed.body,
      userId,
      ip,
      userAgent,
      deviceCookie,
      inviteToken: parsed.inviteToken ?? null,
    });
  } catch (err) {
    console.error('[api/leaves] submit failed:', err);
    return NextResponse.json({ ok: false, error: 'The tree is quiet right now — please try again.' }, { status: 500 });
  }

  if (!outcome.ok) {
    const headers: Record<string, string> = {};
    if (outcome.retryAfterSeconds) headers['retry-after'] = String(outcome.retryAfterSeconds);
    return NextResponse.json({ ok: false, error: outcome.error }, { status: outcome.status, headers });
  }

  // Background: compose the relevant message. Never blocks the submit flow.
  if (outcome.published) {
    const leafId = outcome.leafId;
    after(() =>
      generateMessageForLeaf(leafId).catch((err) =>
        console.error('[api/leaves] message pipeline failed:', err),
      ),
    );
    // For Ably deployments, nudge subscribers immediately (SSE path polls the table instead).
    await publishRealtime(outcome.tree.id, {
      kind: 'leaf.created',
      payload: { id: outcome.leafId, leafPosition: outcome.leafPosition },
    }).catch(() => undefined);
  }

  const res = NextResponse.json({
    ok: true,
    leafId: outcome.leafId,
    leafPosition: outcome.leafPosition,
    published: outcome.published,
    flagged: outcome.flagged,
    messageStatus: outcome.messageStatus,
  });
  if (outcome.newDeviceCookie) {
    res.cookies.set('wt_vid', outcome.newDeviceCookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }
  return res;
}

/** Public tree state — used by /tree resync and the phone's glowing-leaf preview. */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('tree') ?? 'global';
  try {
    const state = await withTree(slug, null, async (client) => getTreeState(client));
    return NextResponse.json(state, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (err) {
    if (err instanceof TreeNotFoundError) {
      return NextResponse.json({ error: 'Tree not found.' }, { status: 404 });
    }
    console.error('[api/leaves] GET failed:', err);
    return NextResponse.json({ error: 'Unavailable.' }, { status: 500 });
  }
}