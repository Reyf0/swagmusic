export type FeedbackInput = {
    kind: FeedbackKind
    message: string
    email?: string
    target_type?: ReportTarget
    target_id?: string
    report_reason?: ReportReason
    page_url?: string
    /** Honeypot, see FeedbackForm. */
    website?: string
}

/** What the global "Report" dialog is about; setting it opens the dialog. */
export type ReportSubject = { type: ReportTarget; id: string; title: string }

export const useReportSubject = () => useState<ReportSubject | null>('report-subject', () => null)

/** Sends feedback / reports to the server. `send` throws with a readable message on failure. */
export function useFeedback() {
    const sending = ref(false)

    async function send(input: FeedbackInput) {
        sending.value = true
        try {
            await $fetch('/api/v1/feedback', { method: 'POST', body: input })
        } catch (e: any) {
            throw new Error(e?.data?.statusMessage || e?.statusMessage || 'Could not send your message. Please try again.', { cause: e })
        } finally {
            sending.value = false
        }
    }

    return { send, sending }
}
