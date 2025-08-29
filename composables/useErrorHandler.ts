export const useErrorHandler = () => {
    const toast = useToast()

    const handleError = (errorOrMessage:unknown, userMessage?: string) => {
        let description: string

        if (typeof errorOrMessage === "string") {
            description = errorOrMessage
            console.error("An error has occurred:", errorOrMessage)
        } else {
            description = userMessage || "Something went wrong, try later"
            console.error("An error has occurred:", errorOrMessage)
        }

        toast.add({
            title: "Error",
            description: description,
            color: 'error'
        })

    }

    const handleWarn = (warnOrMessage:unknown, userMessage?: string) => {
        let description: string

        if (typeof warnOrMessage === "string") {
            description = warnOrMessage
            console.warn("Warning:", warnOrMessage)
        } else {
            description = userMessage || "Something went wrong, try later"
            console.warn("Warning:", warnOrMessage)
        }

        toast.add({
            title: "Warning",
            description: description,
            color: 'warning'
        })
    }

    return { handleError, handleWarn }
}