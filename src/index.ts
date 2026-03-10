import { loadConfig } from './config'
import { Controller } from './controller'
import { NoopDisplayAdapter } from './adapters/display/noop-display'
import { NuimoDisplayAdapter } from './adapters/display/nuimo-display'
import { NuimoRemoteAdapter } from './adapters/remotes/nuimo'
import { OrthoRemoteAdapter } from './adapters/remotes/ortho'
import { SonosSpeakerAdapter } from './adapters/speakers/sonos'
import { discoverZones, findActiveZone, zonesFromHosts, ZoneInfo } from './adapters/speakers/zone-discovery'
import { DisplayAdapter } from './adapters/display/display'
import { RemoteAdapter } from './adapters/remotes/remote'

async function resolveSpeakers(speakerConfig: ReturnType<typeof loadConfig>['speaker']): Promise<SonosSpeakerAdapter[]> {
    let zones: ZoneInfo[]

    if (speakerConfig.hosts && speakerConfig.hosts.length > 0) {
        // Explicit list of hosts provided — resolve names, no network scan.
        console.log(`[init] Using ${speakerConfig.hosts.length} configured speaker(s): ${speakerConfig.hosts.join(', ')}`)
        zones = await zonesFromHosts(speakerConfig.hosts)
    } else if (speakerConfig.host) {
        // Single explicit host — no discovery needed.
        console.log(`[init] Using configured speaker: ${speakerConfig.host}`)
        zones = await zonesFromHosts([speakerConfig.host])
    } else {
        // Auto-discover all Sonos speakers on the network.
        const timeoutMs = speakerConfig.discoveryTimeout ?? 5000
        console.log(`[init] Discovering Sonos speakers on the network (timeout: ${timeoutMs}ms)…`)
        zones = await discoverZones(timeoutMs)

        if (zones.length === 0) {
            throw new Error(
                'No Sonos speakers found on the network. ' +
                'Set speaker.host or speaker.hosts in config.yaml, or ensure a speaker is reachable.',
            )
        }

        console.log(`[init] Discovered ${zones.length} speaker(s): ${zones.map((z) => z.name).join(', ')}`)
    }

    // Build adapters
    const speakers = zones.map((z) => new SonosSpeakerAdapter(z.host, z.name))

    // Move the actively playing speaker to the front so it becomes the default.
    if (speakers.length > 1) {
        const activeZone = await findActiveZone(zones)
        if (activeZone) {
            const activeIndex = speakers.findIndex((s) => s.host === activeZone.host)
            if (activeIndex > 0) {
                const [active] = speakers.splice(activeIndex, 1)
                speakers.unshift(active)
            }
        }
    }

    return speakers
}

async function main(): Promise<void> {
    const config = loadConfig()

    console.log(`[init] Remote: ${config.remote.type}`)
    console.log(`[init] Speaker backend: ${config.speaker.type}`)

    // --- Remote + Display ---------------------------------------------------
    let remote: RemoteAdapter
    let display: DisplayAdapter

    if (config.remote.type === 'nuimo') {
        const nuimo = new NuimoRemoteAdapter(config.remote.deviceId)
        await nuimo.connect()
        remote = nuimo
        display = new NuimoDisplayAdapter(nuimo.getDevice())
    } else if (config.remote.type === 'ortho') {
        const ortho = new OrthoRemoteAdapter(config.remote.deviceId)
        await ortho.connect()
        remote = ortho
        display = new NoopDisplayAdapter()
    } else {
        const exhaustive: never = config.remote.type
        throw new Error(`Unknown remote type: ${exhaustive}`)
    }

    // --- Speakers -----------------------------------------------------------
    const speakers = await resolveSpeakers(config.speaker)

    if (speakers.length > 1) {
        console.log(`[init] ${speakers.length} zones available. Long-click the knob to cycle through them.`)
    }

    // --- Controller ---------------------------------------------------------
    const controller = new Controller(remote, speakers, display, config)
    controller.start()
}

main().catch((err) => {
    console.error('[fatal]', err)
    process.exit(1)
})
