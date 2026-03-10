import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

export interface Config {
    remote: {
        /** Which device to use. */
        type: 'nuimo' | 'ortho'
        /** Optional BLE device ID for deterministic discovery. Auto-discovers if omitted. */
        deviceId?: string
    }
    speaker: {
        type: 'sonos'
        /**
         * IP address of a single Sonos speaker.
         * If omitted along with `hosts`, the app auto-discovers all speakers on the network
         * and defaults to whichever is actively playing.
         */
        host?: string
        /**
         * Explicit list of Sonos speaker IPs to manage.
         * When provided, the app uses only these speakers (no network discovery).
         * Long-click the knob to cycle through them.
         */
        hosts?: string[]
        /**
         * How long (in ms) to wait for network discovery when no hosts are specified.
         * Default: 5000
         */
        discoveryTimeout?: number
    }
    display: {
        /** Show animated SONOS splash on startup (Nuimo only). */
        splash: boolean
        /** How long to show status glyphs before clearing, in ms. */
        timeout: number
    }
}

const DEFAULTS: Config = {
    remote: { type: 'nuimo' },
    speaker: { type: 'sonos' },
    display: { splash: true, timeout: 5000 },
}

/**
 * Loads configuration from a YAML file.
 *
 * Resolution order:
 *   1. Path provided as argument
 *   2. `config.yaml` in the current working directory
 *   3. Built-in defaults (warns if no file found)
 */
export function loadConfig(configPath?: string): Config {
    const filePath = configPath ?? path.join(process.cwd(), 'config.yaml')

    if (!fs.existsSync(filePath)) {
        console.warn(`[config] No config file found at ${filePath} — using defaults.`)
        console.warn('[config] Copy config.example.yaml to config.yaml and fill in your speaker IP.')
        return DEFAULTS
    }

    const raw = yaml.load(fs.readFileSync(filePath, 'utf8')) as Partial<Config>

    return {
        remote: { ...DEFAULTS.remote, ...raw.remote },
        speaker: { ...DEFAULTS.speaker, ...raw.speaker },
        display: { ...DEFAULTS.display, ...raw.display },
    }
}
