import { DisplayTransition, Glyph, GlyphAlignment } from 'rocket-nuimo'
import {
    digitGlyph100,
    digitGlyphs,
    digitGlyphsSmall,
    emptyGlyph,
    errorGlyph,
    filledGlyph,
    leftGlyph,
    linkGlyph,
    pauseGlyph,
    playGlyph,
    rightGlyph,
    stopGlyph,
} from '../../model/glyphs'
import { DisplayAdapter, DisplayOptions, GlyphName } from './display'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NuimoDevice = any

const GLYPH_MAP: Record<GlyphName, Glyph> = {
    play: playGlyph,
    pause: pauseGlyph,
    stop: stopGlyph,
    empty: emptyGlyph,
    error: errorGlyph,
    link: linkGlyph,
    left: leftGlyph,
    right: rightGlyph,
    filled: filledGlyph,
}

/**
 * Display adapter for the Nuimo Control 9×9 LED matrix.
 *
 * Handles glyph rendering, the startup splash animation, and two-digit
 * volume readouts.
 */
export class NuimoDisplayAdapter implements DisplayAdapter {
    constructor(private readonly device: NuimoDevice) {}

    showGlyph(name: GlyphName, options: DisplayOptions = {}): void {
        const glyph = GLYPH_MAP[name]
        const transition = this.resolveTransition(options.transition)
        this.show(glyph, transition)

        if (options.timeout !== undefined) {
            setTimeout(() => this.clear(), options.timeout)
        }
    }

    showVolume(volume: number, options: DisplayOptions = {}): void {
        const glyph = this.volumeGlyph(volume)
        const transition = this.resolveTransition(options.transition)
        this.show(glyph, transition)

        if (options.timeout !== undefined) {
            setTimeout(() => this.clear(), options.timeout)
        }
    }

    showSplash(): void {
        const sonosString: string[] = [
            '                         ',
            ' **   **  *   *  **   ** ',
            '*  * *  * *   * *  * *  *',
            '*    *  * **  * *  * *   ',
            '**** *  * * * * *  * ****',
            '   * *  * *  ** *  *    *',
            '*  * *  * *   * *  * *  *',
            ' **   **  *   *  **   ** ',
            '                         ',
        ]
        const animation = this.bannerToAnimation(sonosString, true)
        this.show(animation[0], DisplayTransition.CrossFade)

        let frame = 1
        const interval = setInterval(() => {
            if (!this.device.isConnected || frame >= animation.length) {
                clearInterval(interval)
                return
            }
            this.show(animation[frame], DisplayTransition.Immediate)
            frame++
        }, 250)

        this.device.on('disconnect', () => clearInterval(interval))
    }

    clear(): void {
        this.show(emptyGlyph, DisplayTransition.CrossFade)
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private show(glyph: Glyph, transition: DisplayTransition): void {
        this.device.displayGlyph(glyph, {
            alignment: GlyphAlignment.Center,
            transition,
        })
    }

    private resolveTransition(t: DisplayOptions['transition']): DisplayTransition {
        return t === 'immediate' ? DisplayTransition.Immediate : DisplayTransition.CrossFade
    }

    /** Builds a two-digit volume glyph for values 0–100. */
    private volumeGlyph(n: number): Glyph {
        const clamped = Math.max(0, Math.min(100, Math.round(n)))
        if (clamped === 100) return digitGlyph100
        const tens = digitGlyphsSmall[Math.floor(clamped / 10)]
        const ones = digitGlyphsSmall[clamped % 10]
        return this.concatGlyph(tens, ones)
    }

    /** Horizontally concatenates two glyphs with a single-pixel gap. */
    private concatGlyph(a: Glyph, b: Glyph): Glyph {
        if (a.characterRows.length !== b.characterRows.length) {
            throw new Error('Glyph heights do not match')
        }
        const combined: string[] = a.characterRows.map(
            (row: string, i: number) => row + ' ' + b.characterRows[i],
        )
        return Glyph.fromString(combined)
    }

    /** Adds 9-column blank padding to the left and right of a banner row. */
    private bannerAddBuffer(banner: string[]): string[] {
        if (banner.length !== 9) return banner
        return banner.map((row) => ' '.repeat(9) + row + ' '.repeat(9))
    }

    /** Slices a wide banner into a sequence of 9-wide animation frames. */
    private bannerToAnimation(banner: string[], addBuffer = false): Glyph[] {
        const rows = addBuffer ? this.bannerAddBuffer(banner) : banner
        const frameCount = rows[0].length - 8
        const frames: Glyph[] = []
        for (let i = 0; i < frameCount; i++) {
            const frame = rows.map((row) => row.substring(i, i + 9))
            frames.push(Glyph.fromString(frame))
        }
        return frames
    }
}

// Re-export large digit glyphs for external use (e.g. future animations).
export { digitGlyphs }
