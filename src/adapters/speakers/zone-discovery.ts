import { AsyncDeviceDiscovery, Sonos } from 'sonos'

export interface ZoneInfo {
    /** Resolved display name of the zone/speaker. */
    name: string
    /** IP address of the Sonos speaker. */
    host: string
}

/**
 * Discovers all Sonos speakers on the local network.
 *
 * @param timeoutMs - How long to scan before giving up (default: 5000 ms).
 * @returns Array of discovered zones, sorted with playing zones first.
 */
export async function discoverZones(timeoutMs = 5000): Promise<ZoneInfo[]> {
    const discovery = new AsyncDeviceDiscovery()

    let devices: Sonos[]
    try {
        devices = await discovery.discoverMultiple({ timeout: timeoutMs })
    } catch {
        // discoverMultiple rejects if no devices are found within the timeout
        return []
    }

    const zones = await Promise.all(
        devices.map(async (device) => {
            const name = await device.getName().catch(() => device.host)
            return { name, host: device.host }
        }),
    )

    return zones
}

/**
 * Given a list of zones, returns the first one that is actively playing.
 * Falls back to the first zone in the list if none are playing.
 */
export async function findActiveZone(zones: ZoneInfo[]): Promise<ZoneInfo | undefined> {
    if (zones.length === 0) return undefined

    for (const zone of zones) {
        try {
            const device = new Sonos(zone.host)
            const state = await device.getCurrentState()
            if (state === 'playing' || state === 'transitioning') {
                return zone
            }
        } catch {
            // Skip unreachable speakers
        }
    }

    // Nothing is playing — default to the first zone
    return zones[0]
}

/**
 * Builds a ZoneInfo list from explicit host IPs (no network scan).
 * Names are resolved via the Sonos API; falls back to the IP on error.
 */
export async function zonesFromHosts(hosts: string[]): Promise<ZoneInfo[]> {
    return Promise.all(
        hosts.map(async (host) => {
            const device = new Sonos(host)
            const name = await device.getName().catch(() => host)
            return { name, host }
        }),
    )
}
