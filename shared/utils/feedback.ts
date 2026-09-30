/** Kinds of messages in the feedback form; `report` is a report about a track / album / playlist / artist. */
export const FEEDBACK_KINDS = ['bug', 'idea', 'question', 'other'] as const
export type FeedbackKind = typeof FEEDBACK_KINDS[number] | 'report'

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
    bug: 'Something is broken',
    idea: 'Idea or suggestion',
    question: 'Question',
    other: 'Something else',
    report: 'Report',
}

export const REPORT_TARGETS = ['track', 'album', 'playlist', 'artist'] as const
export type ReportTarget = typeof REPORT_TARGETS[number]

export const REPORT_REASONS = ['copyright', 'offensive', 'spam', 'other'] as const
export type ReportReason = typeof REPORT_REASONS[number]

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
    copyright: 'It uses my work without permission',
    offensive: 'Offensive, hateful or illegal content',
    spam: 'Spam or misleading',
    other: 'Something else',
}

export const FEEDBACK_STATUSES = ['new', 'in_progress', 'resolved', 'dismissed'] as const
export type FeedbackStatus = typeof FEEDBACK_STATUSES[number]

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
    new: 'New',
    in_progress: 'In progress',
    resolved: 'Resolved',
    dismissed: 'Dismissed',
}

/** Page of the reported item, for links in the admin panel. */
export const reportTargetPath = (type: ReportTarget, id: string) =>
    ({ track: `/tracks/${id}`, album: `/albums/${id}`, playlist: `/playlist/${id}`, artist: `/authors/${id}` })[type]

export const FEEDBACK_MESSAGE_MAX = 5000
