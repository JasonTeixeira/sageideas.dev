const DISCORD_API = 'https://discord.com/api/v10';
const EPHEMERAL_FLAG = 64;

export type DiscordFollowupInput = {
  applicationId: string;
  token: string;
  content: string;
  ephemeral?: boolean;
  attachment?: {
    filename: string;
    bytes: Buffer;
    contentType: string;
  };
};

export function buildDiscordFollowupRequest(input: DiscordFollowupInput): { url: string; init: RequestInit } {
  const applicationId = input.applicationId.trim();
  const token = input.token.trim();
  if (!applicationId || !token) throw new Error('Discord interaction application id and token are required.');
  if (input.attachment) {
    const form = new FormData();
    const attachmentBytes = new Uint8Array(input.attachment.bytes.byteLength);
    attachmentBytes.set(input.attachment.bytes);
    form.append('payload_json', JSON.stringify({
      content: input.content,
      flags: input.ephemeral === false ? undefined : EPHEMERAL_FLAG,
      attachments: [{ id: 0, filename: input.attachment.filename }],
    }));
    form.append(
      'files[0]',
      new Blob([attachmentBytes], { type: input.attachment.contentType }),
      input.attachment.filename,
    );
    return {
      url: `${DISCORD_API}/webhooks/${applicationId}/${token}`,
      init: { method: 'POST', body: form },
    };
  }
  return {
    url: `${DISCORD_API}/webhooks/${applicationId}/${token}`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: input.content,
        flags: input.ephemeral === false ? undefined : EPHEMERAL_FLAG,
      }),
    },
  };
}

export async function postDiscordInteractionFollowup(input: DiscordFollowupInput): Promise<void> {
  const request = buildDiscordFollowupRequest(input);
  const response = await fetch(request.url, request.init);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Discord followup failed: ${response.status}${body ? ` ${body.slice(0, 200)}` : ''}`);
  }
}
