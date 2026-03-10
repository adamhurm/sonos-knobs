import { RemoteAdapter } from './remote'

const DISCOVERY_TIMEOUT_MS = 60 * 1000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrthoDevice = any

/**
 * Remote adapter for the Ortho Remote device.
 *
 * Ortho Remote event mapping:
 *   click     → click
 *   longClick → longClick
 *   rotate    → rotate
 *
 * The Ortho Remote has no touchpad, so 'touch' events are never emitted.
 * The Ortho only emits rotation deltas (no absolute), so we accumulate
 * position locally, starting at 0.5 (mid-point = 50% volume).
 *
 * API reference: https://www.npmjs.com/package/ortho-remote (v0.4.0)
 */
export class OrthoRemoteAdapter extends RemoteAdapter {
    /** Accumulated absolute position in [0, 1]. Starts at mid-point. */
    private absoluteRotation = 0.5

    constructor(private readonly deviceId?: string) {
        super()
    }

    async connect(): Promise<void> {
        // Dynamic import keeps rocket-nuimo users from needing ortho-remote installed.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { OrthoRemoteDiscoveryManager } = require('ortho-remote') as {
            OrthoRemoteDiscoveryManager: {
                defaultManager: {
                    startDiscoverySession(opts: {
                        timeoutMs: number
                        deviceIds?: string[]
                    }): { waitForFirstDevice(): Promise<OrthoDevice> }
                }
            }
        }

        const manager = OrthoRemoteDiscoveryManager.defaultManager
        const session = manager.startDiscoverySession({
            timeoutMs: DISCOVERY_TIMEOUT_MS,
            deviceIds: this.deviceId ? [this.deviceId] : undefined,
        })

        console.log('Waiting for Ortho Remote device…')
        const device: OrthoDevice = await session.waitForFirstDevice()
        console.log(`Found Ortho Remote '${device.id}'`)

        await device.connect()
        console.log('Connected to Ortho Remote')

        device.on('rotate', (delta: number) => {
            this.absoluteRotation = Math.max(0, Math.min(1, this.absoluteRotation + delta))
            this.emit('rotate', delta, this.absoluteRotation)
        })
        device.on('click', () => this.emit('click'))
        device.on('longClick', () => this.emit('longClick'))
        device.on('disconnect', () => {
            console.log('Ortho Remote disconnected.')
            this.emit('disconnect')
        })
    }
}
