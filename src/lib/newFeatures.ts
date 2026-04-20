import { supabase } from './supabaseClient';

// ====== AUDIT LOGGING ======

export interface AuditLogEntry {
  id?: string;
  created_at?: string;
  admin_email: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  description?: string;
}

export async function logAuditAction(entry: AuditLogEntry) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([entry]);
    
    if (error) {
      console.error('Audit log error:', error);
    }
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
}

export async function fetchAuditLogs(limit = 100, offset = 0) {
  try {
    const { data, error, count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data, count };
  } catch (err) {
    console.error('Failed to fetch audit logs:', err);
    return { data: [], count: 0 };
  }
}

// ====== MODERATION FLAGS ======

export type FlagType = 'duplicate' | 'priority' | 'spam' | 'inappropriate' | 'low_quality';
export type FlagPriority = 'low' | 'medium' | 'high';

export interface ModerationFlag {
  id?: string;
  created_at?: string;
  report_id: string;
  flag_type: FlagType;
  priority: FlagPriority;
  description?: string;
  created_by?: string;
  resolved_at?: string;
  resolved_by?: string;
}

export async function createModerationFlag(flag: ModerationFlag, adminEmail: string) {
  try {
    const { data, error } = await supabase
      .from('moderation_flags')
      .insert([{
        ...flag,
        created_by: adminEmail
      }])
      .select();

    if (error) throw error;

    // Log audit
    await logAuditAction({
      admin_email: adminEmail,
      action: 'create_flag',
      table_name: 'moderation_flags',
      record_id: data?.[0]?.id,
      new_values: flag,
      description: `Flagged report ${flag.report_id} as ${flag.flag_type}`
    });

    // Update report to indicate pending flags
    await supabase
      .from('reports')
      .update({ has_pending_flags: true })
      .eq('id', flag.report_id);

    return data?.[0];
  } catch (err) {
    console.error('Failed to create moderation flag:', err);
    return null;
  }
}

export async function fetchModerationFlags(reportId?: string) {
  try {
    let query = supabase
      .from('moderation_flags')
      .select('*')
      .is('resolved_at', true);

    if (reportId) {
      query = query.eq('report_id', reportId);
    }

    const { data, error } = await query.order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch moderation flags:', err);
    return [];
  }
}

export async function resolveModerationFlag(flagId: string, adminEmail: string) {
  try {
    const { data, error } = await supabase
      .from('moderation_flags')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: adminEmail
      })
      .eq('id', flagId)
      .select();

    if (error) throw error;

    // Log audit
    await logAuditAction({
      admin_email: adminEmail,
      action: 'resolve_flag',
      table_name: 'moderation_flags',
      record_id: flagId,
      description: `Resolved moderation flag`
    });

    return data?.[0];
  } catch (err) {
    console.error('Failed to resolve moderation flag:', err);
    return null;
  }
}

// ====== ANALYTICS ======

export interface ReportAnalytics {
  total_reports: number;
  pending_count: number;
  investigating_count: number;
  published_count: number;
  archived_count: number;
  rejected_count: number;
  categories: number;
  distinct_prodis: number;
  latest_report_at: string;
}

export async function fetchReportAnalytics(): Promise<ReportAnalytics | null> {
  try {
    const { data, error } = await supabase
      .from('reports_analytics')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to fetch analytics:', err);
    return null;
  }
}

export interface WeeklyStat {
  week_start: string;
  category: string;
  status: string;
  count: number;
}

export async function fetchWeeklyStats(): Promise<WeeklyStat[]> {
  try {
    const { data, error } = await supabase
      .from('reports_weekly_stats')
      .select('*')
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch weekly stats:', err);
    return [];
  }
}

export interface CategoryStat {
  category: string;
  status: string;
  count: number;
  percentage: number;
}

export async function fetchCategoryStats(): Promise<CategoryStat[]> {
  try {
    const { data, error } = await supabase
      .from('reports_by_category')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch category stats:', err);
    return [];
  }
}

// ====== PAGINATION HELPER ======

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function calculatePaginationState(
  currentPage: number,
  pageSize: number,
  totalCount: number
): PaginationState {
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1
  };
}
