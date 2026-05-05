import { NextResponse, type NextRequest } from 'next/server';
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDocClient } from '@/lib/awsDynamo';
import { sendEmail } from '@/lib/awsSes';
import { nowIso, randomToken, sha256, subscriberPk, subscriberSk, normalizeEmail } from '@/lib/newsletter';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-static';

const TABLE = process.env.NEWSLETTER_TABLE_NAME;
const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: 'newsletter' });
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const emailRaw = String(body?.email ?? '');
    const source = body?.source ? String(body.source) : undefined;
    const honey = body?.honey ? String(body.honey) : '';

    // Honeypot: bots fill it.
    if (honey) return json(200, { ok: true });

    const email = normalizeEmail(emailRaw);
    if (!email || !email.includes('@') || email.length > 320) {
      return json(400, { error: 'Invalid email address.' });
    }

    if (!TABLE) {
      // Local/dev friendly: pretend it worked.
      return json(200, { ok: true, dev: true });
    }

    const db = getDynamoDocClient();

    // Upsert subscriber.
    const now = nowIso();
    const token = randomToken();
    const tokenHash = sha256(token);

    // Check existing status (avoid spamming active users)
    const existing = await db.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'pk = :pk AND sk = :sk',
        ExpressionAttributeValues: {
          ':pk': subscriberPk(email),
          ':sk': subscriberSk,
        },
        Limit: 1,
      })
    );

    const item = existing.Items?.[0] as Record<string, unknown> | undefined;
    const status = (item?.status as string | undefined) ?? undefined;
    if (status === 'active') {
      return json(200, { ok: true });
    }

    if (!item) {
      await db.send(
        new PutCommand({
          TableName: TABLE,
          Item: {
            pk: subscriberPk(email),
            sk: subscriberSk,
            email,
            status: 'pending',
            source,
            createdAt: now,
            updatedAt: now,
            confirmTokenHash: tokenHash,
          },
          ConditionExpression: 'attribute_not_exists(pk)',
        })
      );
    } else {
      // existing pending/unsubscribed -> rotate token + set pending
      await db.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { pk: subscriberPk(email), sk: subscriberSk },
          UpdateExpression: 'SET #status = :pending, updatedAt = :now, confirmTokenHash = :h, source = if_not_exists(source, :source)',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':pending': 'pending',
            ':now': now,
            ':h': tokenHash,
            ':source': source ?? 'unknown',
          },
        })
      );
    }

    // Send confirm email
    if (!SITE_URL) {
      console.log('[newsletter] SITE_URL not set; cannot generate confirm URL');
      return json(200, { ok: true, dev: true });
    }

    const confirmUrl = new URL('/api/newsletter/confirm', SITE_URL);
    confirmUrl.searchParams.set('email', email);
    confirmUrl.searchParams.set('token', token);

    await sendEmail({
      to: email,
      subject: 'Confirm your subscription',
      html: `
        <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
          <h2>Confirm your subscription</h2>
          <p>Click the link below to confirm:</p>
          <p><a href="${confirmUrl.toString()}">${confirmUrl.toString()}</a></p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `.trim(),
      text: `Confirm your subscription: ${confirmUrl.toString()}`,
    });

    return json(200, { ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Subscription failed';
    return json(500, { error: msg });
  }
}
