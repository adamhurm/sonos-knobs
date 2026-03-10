import { Config } from './config'
import { DisplayAdapter } from './adapters/display/display'
import { RemoteAdapter } from './adapters/remotes/remote'
import { SpeakerAdapter } from './adapters/speakers/speaker'
import { SonosSpeakerAdapter } from './adapters/speakers/sonos'

/**
 * Controller — wires a RemoteAdapter, SpeakerAdapter, and DisplayAdapter together.
 *
 * Behaviour:
 *   click     → toggle play/pause; show play or pause glyph
 *   touch     → show current volume (Nuimo only; Ortho has no touchpad)
 *   longClick → cycle to the next speaker/zone (when multiple are available)
 *   rotate    → set volume proportional to absolute knob position; show volume
 *   disconnect → exit process
 */
export class Controller {
    private speakerIndex: number = 0

    constructor(
        private readonly remote: RemoteAdapter,
        private readonly speakers: SonosSpeakerAdapter[],
        private readonly display: DisplayAdapter,
        private readonly config: Config,
    ) {
        if (speakers.length === 0) {
            throw new Error('Controller requires at least one speaker.')
        }
    }

    private get speaker(): SpeakerAdapter {
        return this.speakers[this.speakerIndex]
    }

    start(): void {
        const { display, remote } = this
        const timeout = this.config.display.timeout

        if (this.config.display.splash) {
            display.showSplash()
        }

        // Play / Pause toggle
        remote.on('click', async () => {
            try {
                const state = await this.speaker.getCurrentState()
                display.showGlyph(
                    state === 'playing' ? 'pause' : 'play',
                    { timeout },
                )
                await this.speaker.togglePlayback()
            } catch (err) {
                console.error('click handler error:', err)
                display.showGlyph('error', { timeout })
            }
        })

        // Show current volume (touchpad on Nuimo)
        remote.on('touch', async () => {
            try {
                const volume = await this.speaker.getVolume()
                display.showVolume(volume, { timeout })
            } catch (err) {
                console.error('touch handler error:', err)
                display.showGlyph('error', { timeout })
            }
        })

        // Cycle to next speaker/zone
        remote.on('longClick', async () => {
            if (this.speakers.length <= 1) return

            this.speakerIndex = (this.speakerIndex + 1) % this.speakers.length
            const next = this.speakers[this.speakerIndex]
            console.log(`[controller] Switched to zone: ${next.name} (${next.host})`)

            try {
                const volume = await next.getVolume()
                display.showVolume(volume, { timeout })
            } catch (err) {
                console.error('longClick handler error:', err)
                display.showGlyph('error', { timeout })
            }
        })

        // Volume control — absolute position drives volume directly
        remote.on('rotate', async (_delta, absolute) => {
            try {
                const volume = Math.round(absolute * 100)
                await this.speaker.setVolume(volume)
                display.showVolume(volume)
            } catch (err) {
                console.error('rotate handler error:', err)
            }
        })

        // Disconnect → exit so the process can be restarted / supervised
        remote.on('disconnect', () => {
            console.log('Remote disconnected — exiting.')
            process.exit(0)
        })

        const zoneList = this.speakers.map((s) => `${s.name} (${s.host})`).join(', ')
        console.log(`Controller started. Zones: [${zoneList}]`)
        console.log(`Active zone: ${this.speakers[this.speakerIndex].name}`)
    }
}
