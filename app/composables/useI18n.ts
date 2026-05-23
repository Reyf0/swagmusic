import { ref, computed } from 'vue'

type Locale = 'en' | 'ru'

const defaultLocale = (process.env.NUXT_PUBLIC_DEFAULT_LOCALE as Locale) ?? 'en'

const locale = ref<Locale>(defaultLocale)

const messages: Record<Locale, Record<string, any>> = {
    en: {
        error: {
            title: 'Something went wrong',
            description: "We're sorry — an unexpected error occurred. Try refreshing the page or send a report so we can investigate.",
            tryAgain: 'Try Again',
            goHome: 'Go to Home',
            sendReport: 'Send Report',
            sending: 'Sending…',
            sent: 'Sent',
            message: 'Message',
            showDetails: 'Show error details (dev only)',
            note: 'If the problem persists, check environment variables and deployment logs.'
        },
        notFound: {
            code: 'Page not found',
            title: "We can't find that page",
            description: "The page you're looking for doesn't exist or was moved. Try searching or go back home.",
            home: 'Home',
            search: 'Search',
            report: 'Report missing page',
            tryAgain: 'Try Again',
            tip: 'Tip: check the URL or search for a track, author, or playlist.'
        },
        global: {
            home: 'Home'
        }
    },
    ru: {
        error: {
            title: 'Что-то пошло не так',
            description: 'Извините — произошла непредвиденная ошибка. Попробуйте обновить страницу или отправьте отчёт, чтобы мы могли исследовать проблему.',
            tryAgain: 'Попробовать снова',
            goHome: 'На главную',
            sendReport: 'Отправить отчёт',
            sending: 'Отправка…',
            sent: 'Отправлено',
            message: 'Сообщение',
            showDetails: 'Показать детали ошибки (только для dev)',
            note: 'Если ошибка повторяется, проверь переменные окружения и логи деплоя.'
        },
        notFound: {
            code: 'Страница не найдена',
            title: 'Страница не найдена',
            description: 'Страница, которую вы ищете, не существует или была перемещена. Попробуйте поискать или вернитесь на главную.',
            home: 'Главная',
            search: 'Поиск',
            report: 'Сообщить о пропавшей странице',
            tryAgain: 'Попробовать заново',
            tip: 'Подсказка: проверьте URL или попробуйте поискать трек, исполнителя или плейлист.'
        },
        global: {
            home: 'Главная'
        }
    }
}

/**
 * Lightweight i18n composable.
 * - t('error.title') -> returns translated string
 * - setLocale('ru') to switch
 *
 * This is intentionally tiny and dependency-free so you can replace with vue-i18n/nuxt-i18n later.
 */
export const useI18n = () => {
    const availableLocales = Object.keys(messages) as Locale[]

    function t(path: string): string {
        const parts = path.split('.')
        let cur: any = messages[locale.value] ?? messages.en
        for (const p of parts) {
            if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
            else {
                // fallback to english if missing
                cur = messages.en
                for (const q of parts) {
                    if (cur && typeof cur === 'object' && q in cur) cur = cur[q]
                    else return path
                }
                return String(cur)
            }
        }
        return String(cur)
    }

    const isDev = computed(() => process.env.NODE_ENV !== 'production')

    function setLocale(l: Locale) {
        if (availableLocales.includes(l)) locale.value = l
    }

    return {
        locale,
        setLocale,
        availableLocales,
        t,
        isDev
    }
}
