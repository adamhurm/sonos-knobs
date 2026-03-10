import { DisplayAdapter, DisplayOptions, GlyphName } from './display'

/**
 * No-op display adapter for devices that have no screen (e.g. Ortho Remote).
 * All calls are silently ignored.
 */
export class NoopDisplayAdapter implements DisplayAdapter {
    showGlyph(_name: GlyphName, _options?: DisplayOptions): void {
        // intentionally empty
    }

    showVolume(_volume: number, _options?: DisplayOptions): void {
        // intentionally empty
    }

    showSplash(): void {
        // intentionally empty
    }

    clear(): void {
        // intentionally empty
    }
}
