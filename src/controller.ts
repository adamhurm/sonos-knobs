import { Config } from './config'
import { DisplayAdapter } from './adapters/display/display'
import { RemoteAdapter } from './adapters/remotes/remote'
import { SpeakerAdapter } from './adapters/speakers/speaker'

/**
 * Controller — wires a RemoteAdapter, SpeakerAdapter, and DisplayAdapter together.
 *
 * Behaviour:
 *   click     → toggle play/pause; show play or pause glyph
 *   touch     → show current volume (Nuimo only; Ortho has no touchpad)
 *   longClick → (reserved for future use, e.g. track skip)
 *   rotate    → set volume proportional to absolute knob position; show volume
 *   disconnect → exit process
 */
export class Controller {
    constructor(
        private readonly remote: RemoteAdapter,
        private readonly speaker: SpeakerAdapter,
        private readonly display: DisplayAdapter,
        private readonly config: Config,
    ) {}

    start(): void {
        const { display, remote, speaker } = this
        const timeout = this.config.display.timeout

        if (this.config.display.splash) {
            display.showSplash()
        }

        // Play / Pause toggle
        remote.on('click', async () => {
            try {
                const state = await speaker.getCurrentState()
                display.showGlyph(
                    state === 'playing' ? 'pause' : 'play',
                    { timeout },
                )
                await speaker.togglePlayback()
            } catch (err) {
                console.error('click handler error:', err)
                display.showGlyph('error', { timeout })
            }
        })

        // Show current volume (touchpad on Nuimo)
        remote.on('touch', async () => {
            try {
                const volume = await speaker.getVolume()
                display.showVolume(volume, { timeout })
            } catch (err) {
                console.error('touch handler error:', err)
                display.showGlyph('error', { timeout })
            }
        })

        // Volume control — absolute position drives volume directly
        remote.on('rotate', async (_delta, absolute) => {
            try {
                const volume = Math.round(absolute * 100)
                await speaker.setVolume(volume)
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

        console.log('Controller started. Listening for events…')
    }
}
