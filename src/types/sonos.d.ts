declare module 'sonos' {
    class Sonos {
        host: string
        constructor(host: string)
        getVolume(): Promise<number>
        setVolume(volume: number): Promise<void>
        togglePlayback(): Promise<void>
        getCurrentState(): Promise<string>
        getName(): Promise<string>
    }

    interface DiscoverOptions {
        /** Stop discovery after this many milliseconds. Default: 5000 */
        timeout?: number
    }

    class AsyncDeviceDiscovery {
        discover(options?: DiscoverOptions): Promise<Sonos>
        discoverMultiple(options?: DiscoverOptions): Promise<Sonos[]>
    }

    export { Sonos, AsyncDeviceDiscovery }
}
