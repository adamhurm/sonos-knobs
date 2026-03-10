import {
    DeviceDiscoveryManager,
    NuimoDeviceCommunicationError,
    NuimoDeviceCommunicationErrorCode,
    RotationMode,
} from 'rocket-nuimo'
import { RemoteAdapter } from './remote'

const DISCOVERY_TIMEOUT_MS = 60 * 1000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NuimoDevice = any

/**
 * Remote adapter for the Nuimo Control device.
 *
 * Nuimo event mapping:
 *   select  → click
 *   touch   → touch
 *   rotate  → rotate (absolute normalized to [0, 1])
 *
 * The raw Nuimo rotation range is configured as [-1, 1]; we map that to [0, 1]
 * so callers never need to know about the underlying range.
 */
export class NuimoRemoteAdapter extends RemoteAdapter {
    private device?: NuimoDevice

    constructor(private readonly deviceId?: string) {
        super()
    }

    async connect(): Promise<void> {
        const manager = DeviceDiscoveryManager.defaultManager
        const session = manager.startDiscoverySession({
            timeoutMs: DISCOVERY_TIMEOUT_MS,
            deviceIds: this.deviceId ? [this.deviceId] : undefined,
        })

        console.log('Waiting for Nuimo device…')
        const device: NuimoDevice = await session.waitForFirstDevice()
        console.log(`Found Nuimo '${device.id}'`)

        if (!await device.connect()) {
            throw new NuimoDeviceCommunicationError(
                NuimoDeviceCommunicationErrorCode.ConnectionTimeout,
                device.id,
            )
        }
        console.log('Connected to Nuimo Control')

        // Clamp rotation in range [-1, 1], starting at 0.
        device.rotationMode = RotationMode.Clamped
        device.setRotationRange(-1, 1, 0, 2)

        device.on('select', () => this.emit('click'))
        device.on('touch', () => this.emit('touch'))
        device.on('rotate', (delta: number, rotation: number) => {
            // Normalize from [-1, 1] to [0, 1]
            const absolute = (rotation + 1) / 2
            this.emit('rotate', delta, absolute)
        })
        device.on('disconnect', () => {
            console.log('Nuimo disconnected.')
            this.emit('disconnect')
        })

        this.device = device
    }

    /** Returns the raw rocket-nuimo device (used by NuimoDisplayAdapter). */
    getDevice(): NuimoDevice {
        if (!this.device) throw new Error('NuimoRemoteAdapter: not connected')
        return this.device
    }
}
