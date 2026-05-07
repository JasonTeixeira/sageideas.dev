// Phase 2D PR-B -- intake form helpers.
//
// The schema column is jsonb of shape:
//   { "fields": [{ "id": "...", "type": "text|textarea|select|date",
//                  "label": "...", "required": bool, "options": [...] }] }

import type { SupabaseClient } from '@supabase/supabase-js';

export type IntakeFieldType = 'text' | 'textarea' | 'select' | 'date';

export type IntakeField = {
  id: string;
  type: IntakeFieldType;
  label: string;
  required?: boolean;
  options?: string[];
};

export type IntakeSchema = { fields: IntakeField[] };

export type IntakeFormDefinition = {
  id: string;
  service_type: string | null;
  title: string;
  description: string | null;
  schema: IntakeSchema;
};

const FIELD_TYPES: ReadonlyArray<IntakeFieldType> = ['text', 'textarea', 'select', 'date'];

function isFieldType(v: unknown): v is IntakeFieldType {
  return typeof v === 'string' && (FIELD_TYPES as ReadonlyArray<string>).includes(v);
}

export function parseIntakeSchema(raw: unknown): IntakeSchema {
  if (!raw || typeof raw !== 'object') return { fields: [] };
  const obj = raw as { fields?: unknown };
  if (!Array.isArray(obj.fields)) return { fields: [] };
  const fields: IntakeField[] = [];
  for (const f of obj.fields) {
    if (!f || typeof f !== 'object') continue;
    const candidate = f as {
      id?: unknown;
      type?: unknown;
      label?: unknown;
      required?: unknown;
      options?: unknown;
    };
    if (typeof candidate.id !== 'string' || typeof candidate.label !== 'string') continue;
    if (!isFieldType(candidate.type)) continue;
    fields.push({
      id: candidate.id,
      type: candidate.type,
      label: candidate.label,
      required: candidate.required === true,
      options: Array.isArray(candidate.options)
        ? candidate.options.filter((o): o is string => typeof o === 'string')
        : undefined,
    });
  }
  return { fields };
}

export async function loadFormDefinitionForEngagement(input: {
  engagement: {
    id: string;
    intake_form_id: string | null;
    service_type: string | null;
  };
  sb: SupabaseClient;
}): Promise<IntakeFormDefinition | null> {
  const { engagement, sb } = input;

  if (engagement.intake_form_id) {
    const { data } = await sb
      .from('intake_form_definitions')
      .select('id, service_type, title, description, schema')
      .eq('id', engagement.intake_form_id)
      .maybeSingle();
    if (data) {
      return {
        id: data.id as string,
        service_type: (data.service_type as string | null) ?? null,
        title: (data.title as string) ?? '',
        description: (data.description as string | null) ?? null,
        schema: parseIntakeSchema(data.schema),
      };
    }
  }

  if (engagement.service_type) {
    const { data } = await sb
      .from('intake_form_definitions')
      .select('id, service_type, title, description, schema')
      .eq('service_type', engagement.service_type)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      return {
        id: data.id as string,
        service_type: (data.service_type as string | null) ?? null,
        title: (data.title as string) ?? '',
        description: (data.description as string | null) ?? null,
        schema: parseIntakeSchema(data.schema),
      };
    }
  }
  return null;
}

export function readAnswers(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
    else if (v != null) out[k] = String(v);
  }
  return out;
}

export function validateAnswers(
  schema: IntakeSchema,
  answers: Record<string, string>,
): { ok: true } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  for (const f of schema.fields) {
    if (f.required && !(answers[f.id] && answers[f.id].trim().length > 0)) {
      missing.push(f.label);
    }
  }
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
