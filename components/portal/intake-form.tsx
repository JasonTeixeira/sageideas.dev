'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/portal/ui/button';
import { Input, Textarea } from '@/components/portal/ui/input';
import type { IntakeField, IntakeSchema } from '@/lib/portal/intake';
import { cn } from '@/lib/utils';

export function IntakeForm({
  engagementId,
  formId,
  schema,
}: {
  engagementId: string;
  formId: string;
  schema: IntakeSchema;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  function clientValidate(): string | null {
    for (const f of schema.fields) {
      if (f.required && !(values[f.id] && values[f.id].trim().length > 0)) {
        return `${f.label} is required.`;
      }
    }
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = clientValidate();
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/engagements/${engagementId}/intake`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ form_id: formId, answers: values }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Submit failed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  }

  if (schema.fields.length === 0) {
    return (
      <p className="text-sm text-[#71717a]">
        This intake form has no fields configured. Reach out to Sage to follow up.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {schema.fields.map((f) => (
        <FieldRow key={f.id} field={f} value={values[f.id] ?? ''} onChange={(v) => update(f.id, v)} />
      ))}
      <div className="flex items-center justify-between gap-3 pt-2">
        <span
          role="status"
          aria-live="polite"
          className={cn('text-xs', error ? 'text-[#f43f5e]' : 'text-transparent')}
        >
          {error ?? '·'}
        </span>
        <Button type="submit" size="sm" disabled={busy} data-testid="intake-submit">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit kickoff'}
        </Button>
      </div>
    </form>
  );
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: IntakeField;
  value: string;
  onChange: (v: string) => void;
}) {
  const testId = `intake-field-${field.id}`;
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-[#71717a] mb-1.5">
        {field.label}
        {field.required ? ' *' : ''}
      </span>
      {field.type === 'textarea' ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          maxLength={5000}
          required={field.required}
          data-testid={testId}
        />
      ) : field.type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-[#3f3f46] bg-[#0f0f12] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#06b6d4]"
          required={field.required}
          data-testid={testId}
        >
          <option value="">— Select —</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <Input
          type={field.type === 'date' ? 'date' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={500}
          required={field.required}
          data-testid={testId}
        />
      )}
    </label>
  );
}
