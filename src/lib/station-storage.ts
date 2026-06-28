"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { normalizeEditableExternalHref } from "@/lib/url-safety";

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

export const STATIONS_CHANGED_EVENT = "timix:stations-changed";

export function notifyStationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STATIONS_CHANGED_EVENT));
}

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

const EDITABLE_STATION_FIELDS = new Set([
  "name",
  "url",
  "price",
  "multiplier",
  "entry",
  "package_type",
  "status",
  "models",
  "uptime",
  "latency",
  "source",
  "verdict",
  "note",
  "advantage",
  "risk",
  "badge",
  "group_name",
  "sort_order",
]);

function toSnakeCase(field: string): string {
  return CAMEL_TO_SNAKE[field] ?? field;
}

function assertEditableStationField(fieldName: string) {
  if (!EDITABLE_STATION_FIELDS.has(fieldName)) {
    throw new Error("这个字段不允许通过协作编辑修改。");
  }
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

function normalizeStationUrl(url?: string) {
  return normalizeEditableExternalHref(url);
}

export function isOfficialStationId(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}

export function isTemporaryStationId(value: string | null | undefined) {
  return Boolean(value?.startsWith("static-"));
}

function isPermissionError(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  return (
    error.code === "42501" ||
    /row-level security|permission denied|not authorized|violates row-level/i.test(message)
  );
}

function stationWritePermissionMessage(action: string) {
  return `数据库暂时还没放开登录用户${action}正式榜单，请先执行 supabase/station-open-editing-migration.sql 后再试。`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Load all approved stations, ordered by sort_order. */
export async function loadStations(): Promise<Station[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await getSupabaseClient()
    .from("stations")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[loadStations] Error:", error);
    throw new Error(`加载站点数据失败: ${error.message}`);
  }
  return ((data ?? []) as Record<string, unknown>[]).map(stationFromRow);
}

/** Get a single station by id. */
export async function getStation(id: string): Promise<Station | null> {
  if (!isSupabaseConfigured()) return null;
  if (!isOfficialStationId(id)) return null;
  try {
    const { data, error } = await getSupabaseClient()
      .from("stations")
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
  sortOrder?: number;
}): Promise<Station> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 未配置，无法创建站点。请先配置 Supabase 环境变量。");
  }
  const supabase = getSupabaseClient();

  try {
    const normalizedUrl = normalizeStationUrl(input.url);

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
      url: normalizedUrl || null,
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
      sort_order: input.sortOrder ?? nextSortOrder,
    };

    const { data, error } = await supabase
      .from("stations")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      if (isPermissionError(error)) {
        throw new Error(stationWritePermissionMessage("新增"));
      }
      throw error;
    }
    return stationFromRow(data as Record<string, unknown>);
  } catch (e) {
    throw e instanceof Error ? e : new Error("创建站点失败，请稍后重试。");
  }
}

/**
 * Update a station in the official board and record the field-level history.
 */
export async function updateStation(
  id: string,
  updates: Partial<Station>,
  editorName: string,
): Promise<{ needsReview: boolean }> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 未配置，无法更新站点。请先配置 Supabase 环境变量。");
  }
  const supabase = getSupabaseClient();

  try {
    if (!isOfficialStationId(id)) {
      if (isTemporaryStationId(id)) {
        throw new Error("这条站点还是本地兜底数据（static-前缀），请用「保存为正式站点」按钮提交。");
      }
      throw new Error("站点ID格式不正确，无法更新。");
    }

    const normalizedUpdates: Partial<Station> = { ...updates };
    if (updates.url !== undefined) {
      normalizedUpdates.url = normalizeStationUrl(updates.url);
    }

    // Fetch current row
    const { data: current, error: fetchError } = await supabase
      .from("stations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("[updateStation] Fetch error:", fetchError);
      throw new Error(`获取站点信息失败: ${fetchError.message}`);
    }

    const currentRow = current as Record<string, unknown>;

    // Get editor id
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error("请先登录后再修改站点。");
    }
    const editorId = userData.user.id;

    // Build edit records for each changed field
    const editInserts: Array<{
      station_id: string;
      editor_id: string;
      editor_name: string;
      field_name: string;
      old_value: string;
      new_value: string;
    }> = [];

    for (const [camelKey, newVal] of Object.entries(normalizedUpdates)) {
      if (camelKey === "id") continue;

      const snakeKey = toSnakeCase(camelKey);
      assertEditableStationField(snakeKey);
      const oldVal = currentRow[snakeKey];

      const oldStr = oldVal === null || oldVal === undefined ? "" : String(oldVal);
      const newStr = newVal === null || newVal === undefined ? "" : String(newVal);

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

    if (editInserts.length === 0) {
      return { needsReview: false }; // No changes
    }

    const updateRow = stationToUpdate(normalizedUpdates);
    if (Object.keys(updateRow).length > 0) {
      const { error: updateError } = await supabase
        .from("stations")
        .update(updateRow)
        .eq("id", id);

      if (updateError) {
        console.error("[updateStation] Update error:", updateError);
        if (isPermissionError(updateError)) {
          throw new Error(stationWritePermissionMessage("修改"));
        }
        throw new Error(`更新站点失败: ${updateError.message}`);
      }
    }

    const { error: editError } = await supabase
      .from("station_edits")
      .insert(editInserts);

    if (editError) {
      console.error("[updateStation] Edit insert error:", editError);
    }

    return { needsReview: false };
  } catch (e) {
    console.error("[updateStation] Exception:", e);
    throw e instanceof Error ? e : new Error("更新站点失败，请稍后重试。");
  }
}

/**
 * Load pending edits for admin review.
 */
export async function loadPendingEdits(): Promise<Array<{
  id: string;
  stationId: string;
  stationName: string;
  editorName: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
}>> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await getSupabaseClient()
      .from("station_pending_edits")
      .select(`
        id, station_id, editor_name, field_name, old_value, new_value, created_at,
        stations(name)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data ?? []).map((row: Record<string, unknown>) => {
      const station = row.stations as { name?: string } | null;
      return {
        id: row.id as string,
        stationId: row.station_id as string,
        stationName: station?.name ?? "未知站点",
        editorName: row.editor_name as string,
        fieldName: row.field_name as string,
        oldValue: row.old_value as string,
        newValue: row.new_value as string,
        createdAt: row.created_at as string,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Approve a pending edit - apply it to the station.
 */
export async function approvePendingEdit(editId: string): Promise<void> {
  const supabase = getSupabaseClient();

  // Get the pending edit
  const { data: edit, error: fetchError } = await supabase
    .from("station_pending_edits")
    .select("*")
    .eq("id", editId)
    .single();

  if (fetchError || !edit) {
    throw new Error("找不到待审核的编辑记录。");
  }

  const editRow = edit as Record<string, unknown>;

  // Apply the update to the station
  const fieldName = editRow.field_name as string;
  assertEditableStationField(fieldName);
  const newValue = editRow.new_value as string;
  const stationId = editRow.station_id as string;

  const { error: updateError } = await supabase
    .from("stations")
    .update({ [fieldName]: newValue })
    .eq("id", stationId);

  if (updateError) {
    throw new Error(`应用编辑失败: ${updateError.message}`);
  }

  // Record in station_edits
  await supabase.from("station_edits").insert({
    station_id: stationId,
    editor_id: editRow.editor_id,
    editor_name: editRow.editor_name,
    field_name: fieldName,
    old_value: editRow.old_value,
    new_value: newValue,
  });

  // Update pending edit status
  const { data: userData } = await supabase.auth.getUser();
  await supabase
    .from("station_pending_edits")
    .update({
      status: "approved",
      reviewed_by: userData?.user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", editId);
}

/**
 * Reject a pending edit.
 */
export async function rejectPendingEdit(editId: string, note: string = ""): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  await supabase
    .from("station_pending_edits")
    .update({
      status: "rejected",
      admin_note: note,
      reviewed_by: userData?.user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", editId);
}

/** Delete a station by id. */
export async function deleteStation(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 未配置，无法删除站点。请先配置 Supabase 环境变量。");
  }
  if (!isOfficialStationId(id)) {
    throw new Error("这条站点还没有进入正式榜单，不能按正式站点删除。");
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
  if (!isOfficialStationId(stationId)) return [];
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
