declare module 'sonos' {
    class Sonos {
        constructor(host: string)
        getVolume(): Promise<number>
        setVolume(volume: number): Promise<void>
        togglePlayback(): Promise<void>
        getCurrentState(): Promise<string>
    }
    export { Sonos }
}
