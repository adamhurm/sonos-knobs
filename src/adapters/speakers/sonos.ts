import { Sonos } from 'sonos'
import { PlaybackState, SpeakerAdapter } from './speaker'

/**
 * Speaker adapter for Sonos devices, backed by the `sonos` npm package.
 */
export class SonosSpeakerAdapter implements SpeakerAdapter {
    private device: Sonos

    /** Human-readable zone name (resolved at construction time). */
    readonly name: string

    constructor(host: string, name?: string) {
        this.device = new Sonos(host)
        this.name = name ?? host
    }

    get host(): string {
        return this.device.host
    }

    async getVolume(): Promise<number> {
        return this.device.getVolume()
    }

    async setVolume(volume: number): Promise<void> {
        await this.device.setVolume(volume)
    }

    async togglePlayback(): Promise<void> {
        await this.device.togglePlayback()
    }

    async getCurrentState(): Promise<PlaybackState> {
        const state = await this.device.getCurrentState()
        const valid: PlaybackState[] = ['playing', 'paused', 'stopped', 'transitioning']
        return valid.includes(state as PlaybackState)
            ? (state as PlaybackState)
            : 'stopped'
    }
}
