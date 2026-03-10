export type GlyphName =
    | 'play'
    | 'pause'
    | 'stop'
    | 'empty'
    | 'error'
    | 'link'
    | 'left'
    | 'right'
    | 'filled'

export interface DisplayOptions {
    /** Visual transition style. Defaults to 'crossfade'. */
    transition?: 'crossfade' | 'immediate'
    /** Auto-clear after this many ms. Omit to leave glyph showing indefinitely. */
    timeout?: number
}

/**
 * Common interface for all display backends.
 * Devices without a display (e.g. Ortho Remote) use a no-op implementation.
 */
export interface DisplayAdapter {
    showGlyph(name: GlyphName, options?: DisplayOptions): void
    showVolume(volume: number, options?: DisplayOptions): void
    showSplash(): void
    clear(): void
}
