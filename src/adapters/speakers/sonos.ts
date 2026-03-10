import { Sonos } from 'sonos'
import { PlaybackState, SpeakerAdapter } from './speaker'

/**
 * Speaker adapter for Sonos devices, backed by the `sonos` npm package.
 */
export class SonosSpeakerAdapter implements SpeakerAdapter {
    private readonly device: Sonos

    constructor(host: string) {
        this.device = new Sonos(host)
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
