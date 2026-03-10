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
        /** IP address of the Sonos speaker. */
        host: string
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
    speaker: { type: 'sonos', host: '0.0.0.0' },
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
