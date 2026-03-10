export type PlaybackState = 'playing' | 'paused' | 'stopped' | 'transitioning'

/**
 * Common interface for all speaker backends.
 */
export interface SpeakerAdapter {
    getVolume(): Promise<number>
    setVolume(volume: number): Promise<void>
    togglePlayback(): Promise<void>
    getCurrentState(): Promise<PlaybackState>
}
