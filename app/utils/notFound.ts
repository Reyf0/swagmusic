/**
 * Answer the server render with HTTP 404 while the page shows its own "not found" message,
 * so search engines drop the URL instead of indexing the message. Call in a page's setup.
 */
export function notFound() {
    if (!import.meta.server) return
    const event = useRequestEvent()
    if (event) setResponseStatus(event, 404)
}
