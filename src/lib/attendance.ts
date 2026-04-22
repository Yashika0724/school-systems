import { Check, X, Clock, AlertCircle, type LucideIcon } from 'lucide-react';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'excused',
];

/** Hard-coded fallback threshold when attendance_settings is unavailable. */
export const DEFAULT_ATTENDANCE_THRESHOLD = 75;
/** @deprecated use DEFAULT_ATTENDANCE_THRESHOLD or settings.min_attendance_percent */
export const ATTENDANCE_THRESHOLD = DEFAULT_ATTENDANCE_THRESHOLD;

export interface AttendanceSettings {
  min_attendance_percent: number;
  enforce_exam_eligibility: boolean;
  notify_parents_on_absence: boolean;
  late_counts_as_present: boolean;
  exclude_weekends: boolean;
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  min_attendance_percent: DEFAULT_ATTENDANCE_THRESHOLD,
  enforce_exam_eligibility: false,
  notify_parents_on_absence: true,
  late_counts_as_present: true,
  exclude_weekends: true,
};

export interface AttendanceLike {
  status: string;
  date?: string;
}

export interface StatsOptions {
  settings?: Partial<AttendanceSettings>;
  /** ISO yyyy-MM-dd dates that should be skipped when counting. */
  holidayDates?: Set<string> | string[];
}

export interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  excused: number;
  /** All records fed in (after holiday filter). */
  total: number;
  /** Denominator for %: excludes excused days and (optionally) weekends/holidays. */
  workingDays: number;
  /** Rounded attendance %. 0 when workingDays === 0. */
  percent: number;
  /** Numeric threshold used for the belowThreshold flag. */
  threshold: number;
  belowThreshold: boolean;
}

function toHolidaySet(h: StatsOptions['holidayDates']): Set<string> {
  if (!h) return new Set();
  if (h instanceof Set) return h;
  return new Set(h);
}

function isWeekend(isoDate: string): boolean {
  const d = new Date(isoDate + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function calculateAttendanceStats(
  records: AttendanceLike[] | null | undefined,
  options: StatsOptions = {},
): AttendanceStats {
  const merged: AttendanceSettings = {
    ...DEFAULT_ATTENDANCE_SETTINGS,
    ...(options.settings ?? {}),
  };
  const holidays = toHolidaySet(options.holidayDates);

  const filtered = (records ?? []).filter((r) => {
    if (!r.date) return true;
    if (holidays.has(r.date)) return false;
    if (merged.exclude_weekends && isWeekend(r.date)) return false;
    return true;
  });

  const present = filtered.filter((r) => r.status === 'present').length;
  const absent = filtered.filter((r) => r.status === 'absent').length;
  const late = filtered.filter((r) => r.status === 'late').length;
  const excused = filtered.filter((r) => r.status === 'excused').length;
  const total = present + absent + late + excused;
  const workingDays = present + absent + late;

  const numerator = present + (merged.late_counts_as_present ? late : 0);
  const percent = workingDays > 0 ? Math.round((numerator / workingDays) * 100) : 0;

  return {
    present,
    absent,
    late,
    excused,
    total,
    workingDays,
    percent,
    threshold: merged.min_attendance_percent,
    belowThreshold: workingDays > 0 && percent < merged.min_attendance_percent,
  };
}

export function getStatusBgColor(status: AttendanceStatus | null): string {
  switch (status) {
    case 'present':
      return 'bg-green-500 hover:bg-green-600';
    case 'absent':
      return 'bg-red-500 hover:bg-red-600';
    case 'late':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'excused':
      return 'bg-blue-500 hover:bg-blue-600';
    default:
      return 'bg-muted';
  }
}

export function getStatusTextColor(status: AttendanceStatus | null): string {
  switch (status) {
    case 'present':
      return 'text-green-700';
    case 'absent':
      return 'text-red-700';
    case 'late':
      return 'text-yellow-700';
    case 'excused':
      return 'text-blue-700';
    default:
      return 'text-muted-foreground';
  }
}

export function getStatusIcon(status: AttendanceStatus | null): LucideIcon | null {
  switch (status) {
    case 'present':
      return Check;
    case 'absent':
      return X;
    case 'late':
      return Clock;
    case 'excused':
      return AlertCircle;
    default:
      return null;
  }
}

export function getStatusLabel(status: AttendanceStatus | string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
