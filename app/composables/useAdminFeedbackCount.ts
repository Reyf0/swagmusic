/** Number of feedback messages with status "new", shown in the admin navigation. */
export const useAdminFeedbackCount = () => useState<number>('admin-feedback-new', () => 0)
