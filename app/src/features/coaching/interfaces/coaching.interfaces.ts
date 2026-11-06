import type { CallKind, CallOutcome, CallStatus } from "@/features/calls/interfaces/calls.interfaces";
import type { DashboardOverview } from "@/features/dashboard/interfaces/dashboard.interfaces";
import type { OrgRole } from "@/features/organisations/interfaces/organisations.interfaces";

export interface Paginated<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}

// ---------- Cohort ----------

export interface PoolMeter {
    included_minutes: number | null;
    used_minutes: number;
    remaining_minutes: number | null;
    owner_reserve_minutes: number | null;
    owner_reserve_left_minutes: number | null;
    team_credit_minutes: number;
    member_cap_minutes: number | null;
}

export interface CohortStudent {
    user_id: string;
    name: string;
    email: string;
    role: OrgRole;
    joined_at: string;
    sessions: number;
    live_sessions: number;
    practice_sessions: number;
    practice_minutes: number;
    average_score: number | null;
    score_change: number | null;
    score_trend: { date: string; score: number }[];
    last_activity_at: string | null;
    last_practice_at: string | null;
    inactive: boolean;
    recurring_mistakes: { category_key: string; label: string; count: number }[] | null;
    minutes_this_period: {
        live_used: number;
        practice_used: number;
        live_cap: number | null;
        practice_cap: number | null;
        live_remaining: number | null;
        practice_remaining: number | null;
    };
}

export interface LeaderboardEntry {
    user_id: string;
    name: string;
    value: number;
}

export interface Cohort {
    window_days: number;
    inactive_days: number;
    moments_locked: boolean;
    period: { start: string; end: string };
    pool: { shared: boolean; live: PoolMeter; practice: PoolMeter };
    students: CohortStudent[];
    leaderboard: { by_average_score: LeaderboardEntry[]; by_practice_minutes: LeaderboardEntry[] };
    inactive_user_ids: string[];
}

// ---------- Student page ----------

export const AssignmentStatuses = {
    OPEN: "open",
    OVERDUE: "overdue",
    COMPLETED: "completed",
    ARCHIVED: "archived",
} as const;
export type AssignmentStatus = (typeof AssignmentStatuses)[keyof typeof AssignmentStatuses];

export interface StudentDetail {
    member: {
        user_id: string;
        name: string;
        email: string;
        role: OrgRole;
        joined_at: string;
        last_active_at: string | null;
        is_coach: boolean;
    };
    kpis: {
        average_score: number | null;
        score_change: number | null;
        live_sessions: number;
        practice_sessions: number;
        live_minutes_period: number;
        practice_minutes_period: number;
        live_cap_minutes: number | null;
        practice_cap_minutes: number | null;
        period: { start: string; end: string };
    };
    overview: DashboardOverview & { locked_cards?: string[] };
    recent_calls: {
        id: string;
        kind: CallKind;
        call_type: string;
        status: CallStatus;
        title: string | null;
        started_at: string;
        duration_seconds: number;
        outcome: CallOutcome | null;
        assignment_id: string | null;
        score: number | null;
    }[];
    assignments: {
        id: string;
        title: string;
        practice_agent_name: string;
        due_at: string | null;
        archived: boolean;
        required_attempts: number;
        target_score: number | null;
        attempts_count: number;
        best_score: number | null;
        completed_at: string | null;
        status: AssignmentStatus;
    }[];
    recent_comments: {
        id: string;
        call_id: string;
        call_title: string | null;
        at_ms: number | null;
        body: string;
        author: { id: string; name: string } | null;
        created_at: string;
    }[];
}

// ---------- Assignments ----------

export interface AssignmentListItem {
    id: string;
    title: string;
    practice_agent_id: string | null;
    practice_agent_name: string;
    prospect_removed: boolean;
    due_at: string | null;
    target_score: number | null;
    required_attempts: number;
    all_members: boolean;
    archived_at: string | null;
    created_at: string;
    created_by: { id: string; name: string } | null;
    status: AssignmentStatus;
    progress: { total: number; completed: number; overdue: number; open: number };
}

export interface AssignmentAttempt {
    call_id: string;
    started_at: string;
    duration_seconds: number;
    status: CallStatus;
    score: number | null;
}

export interface AssignmentTarget {
    user_id: string;
    name: string;
    attempts_count: number;
    best_score: number | null;
    last_attempt_at: string | null;
    completed_at: string | null;
    status: AssignmentStatus;
    attempts: AssignmentAttempt[];
}

export interface AssignmentDetail extends AssignmentListItem {
    instructions: string | null;
    targets: AssignmentTarget[];
}

export interface AssignmentQuery {
    page?: number;
    limit?: number;
    status?: AssignmentStatus | "all";
    search?: string;
    user_id?: string;
}

export interface CreateAssignmentDto {
    practice_agent_id: string;
    title: string;
    instructions?: string;
    due_at?: string;
    target_score?: number;
    required_attempts?: number;
    all_members?: boolean;
    user_ids?: string[];
}

export type UpdateAssignmentDto = Partial<Omit<CreateAssignmentDto, "practice_agent_id">> & { archived?: boolean };

export interface MyAssignment {
    id: string;
    title: string;
    instructions: string | null;
    due_at: string | null;
    target_score: number | null;
    required_attempts: number;
    practice_agent_id: string | null;
    practice_agent_name: string;
    can_start: boolean;
    assigned_by: { id: string; name: string } | string | null;
    attempts_count: number;
    best_score: number | null;
    completed_at: string | null;
    status: AssignmentStatus;
    created_at: string;
}

// ---------- Comments ----------

export interface CallComment {
    id: string;
    parent_id: string | null;
    at_ms: number | null;
    body: string | null;
    deleted: boolean;
    edited_at: string | null;
    created_at: string;
    author: { id: string; name: string } | null;
    can_edit: boolean;
    can_delete: boolean;
    can_reply: boolean;
    replies: CallComment[];
}

export interface CallCommentsResponse {
    can_comment: boolean;
    feature_enabled: boolean;
    data: CallComment[];
}

export interface CreateCommentDto {
    body: string;
    parent_id?: string;
    at_ms?: number;
}

// ---------- Weekly reports ----------

export interface ReportTotals {
    students: number;
    active_students: number;
    sessions: number;
    sessions_prev: number;
    practice_minutes: number;
    practice_minutes_prev: number;
    live_minutes: number;
}

export interface ReportListItem {
    id: string;
    period_start: string;
    period_end: string;
    created_at: string;
    empty: boolean;
    totals: ReportTotals;
}

export interface ReportRankEntry {
    user_id: string;
    value: number;
}

export interface ReportData {
    empty: boolean;
    totals: ReportTotals;
    improved: { user_id: string; from: number | null; to: number | null }[];
    needs_attention: {
        user_id: string;
        reason: "SCORE_DROP" | "INACTIVE";
        from: number | null;
        to: number | null;
        last_practice_at: string | null;
    }[];
    assignments: {
        completed_count: number;
        completed: unknown[];
        overdue_count: number;
        overdue: unknown[];
        due_next_7_days: { assignment_id: string; due_at: string; open_targets: number }[];
    };
    top_by_score: ReportRankEntry[];
    top_by_practice_minutes: ReportRankEntry[];
    pool: {
        live?: { used_minutes?: number; included_minutes?: number | null; owner_reserve_left_minutes?: number | null } | null;
        practice?: { used_minutes?: number; included_minutes?: number | null; owner_reserve_left_minutes?: number | null } | null;
    };
    improved_threshold: number;
    inactive_days: number;
}

export interface ReportDetail {
    id: string;
    period_start: string;
    period_end: string;
    created_at: string;
    data: ReportData;
    users: Record<string, string>;
    assignments: Record<string, string>;
}

export interface CallsExportQuery {
    from?: string;
    to?: string;
    user_id?: string;
}
