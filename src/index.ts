import { loadConfig } from './config'
import { Controller } from './controller'
import { NoopDisplayAdapter } from './adapters/display/noop-display'
import { NuimoDisplayAdapter } from './adapters/display/nuimo-display'
import { NuimoRemoteAdapter } from './adapters/remotes/nuimo'
import { OrthoRemoteAdapter } from './adapters/remotes/ortho'
import { SonosSpeakerAdapter } from './adapters/speakers/sonos'
import { DisplayAdapter } from './adapters/display/display'
import { RemoteAdapter } from './adapters/remotes/remote'

async function main(): Promise<void> {
    const config = loadConfig()

    console.log(`[init] Remote: ${config.remote.type}`)
    console.log(`[init] Speaker: ${config.speaker.type} @ ${config.speaker.host}`)

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

    // --- Speaker ------------------------------------------------------------
    const speaker = new SonosSpeakerAdapter(config.speaker.host)

    // --- Controller ---------------------------------------------------------
    const controller = new Controller(remote, speaker, display, config)
    controller.start()
}

main().catch((err) => {
    console.error('[fatal]', err)
    process.exit(1)
})
