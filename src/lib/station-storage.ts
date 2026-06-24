"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type Station = {
  id: string;
  name: string;
  url: string;
  price: string;
  multiplier: string;
  entry: string;
  packageType: string;
  status: string;
  models: string;
  uptime: string;
  latency: string;
  source: string;
  verdict: string;
  note: string;
  advantage: string;
  risk: string;
  badge: string;
  groupName: string;
  sortOrder: number;
  lastEditorName?: string;
  lastEditAt?: string;
};

export type StationEditRecord = {
  id: string;
  stationId: string;
  editorId: string;
  editorName: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Map the view/table row (snake_case) to our camelCase Station type. */
function stationFromRow(row: Record<string, unknown>): Station {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    url: String(row.url ?? ""),
    price: String(row.price ?? ""),
    multiplier: String(row.multiplier ?? ""),
    entry: String(row.entry ?? ""),
    packageType: String(row.package_type ?? ""),
    status: String(row.status ?? ""),
    models: String(row.models ?? ""),
    uptime: String(row.uptime ?? ""),
    latency: String(row.latency ?? ""),
    source: String(row.source ?? ""),
    verdict: String(row.verdict ?? ""),
    note: String(row.note ?? ""),
    advantage: String(row.advantage ?? ""),
    risk: String(row.risk ?? ""),
    badge: String(row.badge ?? ""),
    groupName: String(row.group_name ?? ""),
    sortOrder: Number(row.sort_order ?? 0),
    lastEditorName: row.last_editor_name
      ? String(row.last_editor_name)
      : undefined,
    lastEditAt: row.last_edit_at ? String(row.last_edit_at) : undefined,
  };
}

/** Map a Station update object (camelCase) to a snake_case record for Supabase. */
function stationToUpdate(updates: Partial<Station>): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  if (updates.name !== undefined) record.name = updates.name;
  if (updates.url !== undefined) record.url = updates.url;
  if (updates.price !== undefined) record.price = updates.price;
  if (updates.multiplier !== undefined) record.multiplier = updates.multiplier;
  if (updates.entry !== undefined) record.entry = updates.entry;
  if (updates.packageType !== undefined)
    record.package_type = updates.packageType;
  if (updates.status !== undefined) record.status = updates.status;
  if (updates.models !== undefined) record.models = updates.models;
  if (updates.uptime !== undefined) record.uptime = updates.uptime;
  if (updates.latency !== undefined) record.latency = updates.latency;
  if (updates.source !== undefined) record.source = updates.source;
  if (updates.verdict !== undefined) record.verdict = updates.verdict;
  if (updates.note !== undefined) record.note = updates.note;
  if (updates.advantage !== undefined) record.advantage = updates.advantage;
  if (updates.risk !== undefined) record.risk = updates.risk;
  if (updates.badge !== undefined) record.badge = updates.badge;
  if (updates.groupName !== undefined) record.group_name = updates.groupName;
  if (updates.sortOrder !== undefined) record.sort_order = updates.sortOrder;
  return record;
}

/** camelCase field name → snake_case column name mapping for edits. */
const CAMEL_TO_SNAKE: Record<string, string> = {
  packageType: "package_type",
  groupName: "group_name",
  sortOrder: "sort_order",
  lastEditorName: "last_editor_name",
  lastEditAt: "last_edit_at",
};

function toSnakeCase(field: string): string {
  return CAMEL_TO_SNAKE[field] ?? field;
}

/** Map a station_edits row (snake_case) to our camelCase StationEditRecord. */
function editRecordFromRow(row: Record<string, unknown>): StationEditRecord {
  return {
    id: String(row.id ?? ""),
    stationId: String(row.station_id ?? ""),
    editorId: String(row.editor_id ?? ""),
    editorName: String(row.editor_name ?? ""),
    fieldName: String(row.field_name ?? ""),
    oldValue: String(row.old_value ?? ""),
    newValue: String(row.new_value ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Load all approved stations (from the view), ordered by sort_order. */
export async function loadStations(): Promise<Station[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("stations_with_editor")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map(stationFromRow);
  } catch {
    return [];
  }
}

/** Get a single station by id (from the view). */
export async function getStation(id: string): Promise<Station | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await getSupabaseClient()
      .from("stations_with_editor")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data ? stationFromRow(data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Create a new station. The authenticated user becomes the author;
 *  sort_order is auto-assigned as max(sort_order) + 1. */
export async function createStation(input: {
  name: string;
  url?: string;
  price?: string;
  multiplier?: string;
  entry?: string;
  packageType?: string;
  status?: string;
  models?: string;
  uptime?: string;
  latency?: string;
  source?: string;
  verdict?: string;
  note?: string;
  advantage?: string;
  risk?: string;
  badge?: string;
  groupName?: string;
}): Promise<Station> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 未配置，无法创建站点。请先配置 Supabase 环境变量。");
  }
  const supabase = getSupabaseClient();

  try {
    // Compute next sort_order
    const { data: maxRow, error: maxError } = await supabase
      .from("stations")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) throw maxError;

    const nextSortOrder =
      maxRow && typeof maxRow.sort_order === "number"
        ? maxRow.sort_order + 1
        : 1;

    const row = {
      name: input.name,
      url: input.url ?? null,
      price: input.price ?? null,
      multiplier: input.multiplier ?? null,
      entry: input.entry ?? null,
      package_type: input.packageType ?? null,
      status: input.status ?? null,
      models: input.models ?? null,
      uptime: input.uptime ?? null,
      latency: input.latency ?? null,
      source: input.source ?? null,
      verdict: input.verdict ?? null,
      note: input.note ?? null,
      advantage: input.advantage ?? null,
      risk: input.risk ?? null,
      badge: input.badge ?? null,
      group_name: input.groupName ?? null,
      sort_order: nextSortOrder,
    };

    const { data, error } = await supabase
      .from("stations")
      .insert(row)
      .select("*")
      .single();

    if (error) throw error;
    return stationFromRow(data as Record<string, unknown>);
  } catch (e) {
    throw e instanceof Error ? e : new Error("创建站点失败，请稍后重试。");
  }
}

/**
 * Update a station. Compares each incoming field against the current row;
 * for every changed field a station_edits record is inserted.
 */
export async function updateStation(
  id: string,
  updates: Partial<Station>,
  editorName: string,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 未配置，无法更新站点。请先配置 Supabase 环境变量。");
  }
  const supabase = getSupabaseClient();

  try {
    // Fetch current row
    const { data: current, error: fetchError } = await supabase
      .from("stations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const currentRow = current as Record<string, unknown>;

    // Get editor id
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error("Please sign in first.");
    }
    const editorId = userData.user.id;

    // Write the update row
    const updateRow = stationToUpdate(updates);
    if (Object.keys(updateRow).length > 0) {
      const { error: updateError } = await supabase
        .from("stations")
        .update(updateRow)
        .eq("id", id);

      if (updateError) throw updateError;
    }

    // Record edits for each changed field
    const editInserts: Array<{
      station_id: string;
      editor_id: string;
      editor_name: string;
      field_name: string;
      old_value: string;
      new_value: string;
    }> = [];

    for (const [camelKey, newVal] of Object.entries(updates)) {
      if (camelKey === "id") continue; // never edit id

      const snakeKey = toSnakeCase(camelKey);
      const oldVal = currentRow[snakeKey];

      const oldStr =
        oldVal === null || oldVal === undefined
          ? ""
          : String(oldVal);
      const newStr =
        newVal === null || newVal === undefined
          ? ""
          : String(newVal);

      if (oldStr !== newStr) {
        editInserts.push({
          station_id: id,
          editor_id: editorId,
          editor_name: editorName,
          field_name: snakeKey,
          old_value: oldStr,
          new_value: newStr,
        });
      }
    }

    if (editInserts.length > 0) {
      const { error: editError } = await supabase
        .from("station_edits")
        .insert(editInserts);

      if (editError) throw editError;
    }
  } catch (e) {
    throw e instanceof Error ? e : new Error("更新站点失败，请稍后重试。");
  }
}

/** Delete a station by id. */
export async function deleteStation(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 未配置，无法删除站点。请先配置 Supabase 环境变量。");
  }
  try {
    const { error } = await getSupabaseClient()
      .from("stations")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (e) {
    throw e instanceof Error ? e : new Error("删除站点失败，请稍后重试。");
  }
}

/** Load the edit history for a single station. */
export async function loadStationEditHistory(
  stationId: string,
): Promise<StationEditRecord[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("station_edits")
      .select("*")
      .eq("station_id", stationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map(editRecordFromRow);
  } catch {
    return [];
  }
}

/** Load the most recent edits across all stations (limit 50). */
export async function loadRecentEdits(): Promise<StationEditRecord[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("station_edits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map(editRecordFromRow);
  } catch {
    return [];
  }
}
