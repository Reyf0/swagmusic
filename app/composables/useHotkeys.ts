import { useEventListener } from '@vueuse/core'

/** Keyboard shortcuts, also listed in <KeyboardShortcuts> (opened with "?"). */
export const HOTKEYS: { keys: string[]; label: string }[] = [
    { keys: ['Space'], label: 'Play / pause' },
    { keys: ['←', '→'], label: 'Seek 5 seconds back / forward' },
    { keys: ['Shift', '←', '→'], label: 'Previous / next track' },
    { keys: ['Shift', '↑', '↓'], label: 'Volume up / down' },
    { keys: ['M'], label: 'Mute / unmute' },
    { keys: ['/'], label: 'Search' },
    { keys: ['?'], label: 'Show keyboard shortcuts' },
]

const SEEK_SECONDS = 5
const VOLUME_STEP = 0.1

/** Open state of the shortcuts help dialog. */
export const useShortcutsOpen = () => useState('shortcuts-open', () => false)

/**
 * Global player / navigation shortcuts. Ignored while typing and with Ctrl / Cmd / Alt held,
 * so browser and OS shortcuts keep working. Arrow keys alone seek (and still scroll when
 * nothing is playing); volume needs Shift so ↑ / ↓ keep scrolling the page.
 */
export function useHotkeys(options: { focusSearch: () => void }) {
    const player = usePlayerStore()
    const toast = useToast()
    const shortcutsOpen = useShortcutsOpen()

    function showVolume() {
        toast.add({
            id: 'volume',
            title: player.isMuted ? 'Muted' : `Volume ${Math.round(player.volume * 100)}%`,
            icon: player.isMuted ? 'i-heroicons-speaker-x-mark' : 'i-heroicons-speaker-wave',
            duration: 1200,
        })
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
        const el = e.target as HTMLElement | null
        if (el?.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="menu"], [role="listbox"], [role="dialog"]')) return

        const hasTrack = !!player.currentTrack
        const handled = (() => {
            switch (e.key) {
                case ' ':
                    // Space on a focused button presses the button.
                    if (!hasTrack || e.repeat || el?.closest('button, a')) return false
                    player.togglePlay()
                    return true
                case 'ArrowLeft':
                case 'ArrowRight': {
                    if (!hasTrack) return false
                    const dir = e.key === 'ArrowRight' ? 1 : -1
                    if (e.shiftKey) {
                        if (e.repeat) return true
                        if (dir > 0) player.playNext()
                        else player.playPrevious()
                    } else {
                        player.seek(player.currentTime + dir * SEEK_SECONDS)
                    }
                    return true
                }
                case 'ArrowUp':
                case 'ArrowDown':
                    if (!e.shiftKey) return false
                    player.setVolume(player.volume + (e.key === 'ArrowUp' ? VOLUME_STEP : -VOLUME_STEP))
                    showVolume()
                    return true
                case 'm':
                case 'M':
                    if (e.repeat) return true
                    player.toggleMute()
                    showVolume()
                    return true
                case '/':
                    options.focusSearch()
                    return true
                case '?':
                    shortcutsOpen.value = true
                    return true
                default:
                    return false
            }
        })()
        if (handled) e.preventDefault()
    }

    if (import.meta.client) useEventListener(window, 'keydown', onKeydown)
}
