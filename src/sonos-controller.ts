const { DeviceDiscoveryManager, DisplayTransition, Glyph, GlyphAlignment, NuimoControlDevice, NuimoDeviceCommunicationError, NuimoDeviceCommunicationErrorCode, RotationMode } = require('rocket-nuimo')
const { digitGlyph100, digitGlyphsSmall, emptyGlyph, pauseGlyph, playGlyph } = require('./model/glyphs')
const { Sonos } = require('sonos')

// Primary Sonos speaker to target for volume control
const sonos_speaker: string = '0.0.0.0'

// Default discovery timeout 60 seconds
const DEVICE_DISCOVERY_TIMEOUT_MS = 60 * 1000

// Device connection manager
const manager = DeviceDiscoveryManager.defaultManager

// Uncomment to search for only your device
// ENTER DEVICE_ID to discover only a particular device`
const DEVICE_ID: string | undefined = undefined

/**
 * Helper function to connect to a device
 *
 * @param [deviceId] - specific device to connect to
 */
export async function connectToDevice(deviceId?: string): Promise<typeof NuimoControlDevice> {
    console.log('Starting Numio Control discovery')
    const session = manager.startDiscoverySession({
        timeoutMs: DEVICE_DISCOVERY_TIMEOUT_MS,
        deviceIds: deviceId ? [deviceId] : undefined,
    })

    console.log('Waiting for device...')
    const device = await session.waitForFirstDevice()
    console.log(`Found device '${device.id}'`)

    console.log('Connecting...')
    if (await device.connect()) {
        console.log('Connected to Nuimo Control')

        device.on('disconnect', () => {
            console.log('Disconnected! Exiting.')

            // On a disconnect, exit
            process.exit(0)
        })

        return device
    }

    // Throw error
    throw new NuimoDeviceCommunicationError(NuimoDeviceCommunicationErrorCode.ConnectionTimeout, device.id)
}

// This function adds a buffer to the beginning and end of a Nx9 Glyph
function bannerAddBuffer(banner: Array<string>) {
    // return Glyph if it is not 9x9
    if (banner.length != 9) {
        return banner
    }
    let newBanner : string[] = []
    for (let i = 0; i < banner.length; i++) {
        let newBannerLine : string = ' '.repeat(9) + banner[i] + ' '.repeat(9)
        newBanner[i] = newBannerLine
    }
    return newBanner
}

// This function creates a Glyph array for scrolling text animations.
function bannerToAnimation(banner: Array<string>, addBuffer = false): Array<typeof Glyph> {
    if (addBuffer) {
        banner = bannerAddBuffer(banner)
    }
    // N (total frames) - 9 (we have Nx9 array) + 1 (we have at least one frame)
    let frameCount = banner[0].length - 8
    let animation : Array<typeof Glyph> = []
    for (let i = 0; i < frameCount; i++) {
        let frame : string[] = []
        for (let row = 0; row < 9; row++) {
            frame.push(banner[row].substring(i,i+9))
        }
        animation.push(Glyph.fromString(frame))
    }
    return animation
}

// This function converts a number to a double-digit Glyph
function numberGlyph(n: number) {
    // Only handle integers 0-100
    if ((n < 0) || (n > 100) || !Number.isInteger(n)) throw "outside of allowed range"
    // Return special "100" Glyph
    if (n == 100) { return digitGlyph100 }
    // Return combined Glyph of first and second digit
    return concatGlyph(digitGlyphsSmall[Math.floor((n/10) % 10)], digitGlyphsSmall[n % 10])
}

// This function concatenates two Glyphs, adding a space in between
function concatGlyph(a: typeof Glyph, b: typeof Glyph): typeof Glyph {
    if (a.characterRows.length != b.characterRows.length) throw "Glyph heights do not match"
    let combined : string[] = []
    for (let i = 0; i < a.characterRows.length; i++) {
        combined.push(a.characterRows[i].concat(' ', b.characterRows[i]))
    }
    return Glyph.fromString(combined)
}

// This function displays the "SONOS" startup splash screen
async function startupSplash(device: typeof NuimoControlDevice) {
    // Display beginning of animation Glyph on device
    const sonosString : string[] = [
        '                         ',
        ' **   **  *   *  **   ** ',
        '*  * *  * *   * *  * *  *',
        '*    *  * **  * *  * *   ',
        '**** *  * * * * *  * ****',
        '   * *  * *  ** *  *    *',
        '*  * *  * *   * *  * *  *',
        ' **   **  *   *  **   ** ',
        '                         '
    ]
    const animation: Array<typeof Glyph> = bannerToAnimation(sonosString, true)
    device.displayGlyph(animation[0], {
                       alignment: GlyphAlignment.Center,
                       transition: DisplayTransition.CrossFade,
    })

    // Continue sending Glyph animations to device
    let bannerFrame = 0
    const interval = setInterval(() => {
        // Check if the client is still connected
        if (!device.isConnected) {
            return
        }
        
        /* // Loop animation
        if (bannerFrame >= animation.length) {
                bannerFrame = 0
        } */

        // Stop animation after one cycle
        if (bannerFrame >= animation.length) {
            return
        }
        device.displayGlyph(animation[bannerFrame], {
                alignment: GlyphAlignment.Center,
                transition: DisplayTransition.Immediate,
        })
        bannerFrame++
    }, 250)

    // If there is a disconnection, cancel the animation.
    device.on('disconnect', () => {
        clearInterval(interval)
    })

}

/**
 * Main application entry point
 */
async function main() {
    // Get nuimo device and sonos speaker
    const device = await connectToDevice(DEVICE_ID)
    const speaker = new Sonos(sonos_speaker)

    await startupSplash(device)

    // Play + Pause when display button is clicked.
    device.on('select', async() => {
        // Get current speaker state and choose Glyph
        let status = await speaker.getCurrentState()
        let toggleGlyph = emptyGlyph
        if (status == "playing") {
            toggleGlyph = pauseGlyph
        }
        else if (status == "paused") {
            toggleGlyph = playGlyph
        }
        // Toggle speaker and show status Glyph display button
        speaker.togglePlayback()
        device.displayGlyph(toggleGlyph, {
                alignment: GlyphAlignment.Center,
                transition: DisplayTransition.CrossFade,
        })
        // Clear display button after 5 seconds
        await new Promise(f => setTimeout(f, 5000))
        device.displayGlyph(emptyGlyph, {
                alignment: GlyphAlignment.Center,
                transition: DisplayTransition.CrossFade,
        })
    })

    // Show current volume when display button is touched.
    device.on('touch', async() => {
        let volumeGlyph = numberGlyph(await speaker.getVolume())
        device.displayGlyph(volumeGlyph, {
                alignment: GlyphAlignment.Center,
                transition: DisplayTransition.CrossFade,
        })
        // Clear display button after 5 seconds
        await new Promise(f => setTimeout(f, 5000))
        device.displayGlyph(emptyGlyph, {
                alignment: GlyphAlignment.Center,
                transition: DisplayTransition.CrossFade,
        })
    })

    // Volume Control
    device.rotationMode = RotationMode.Clamped
    device.setRotationRange(-1, 1, 0, 2)
    device.on('rotate', async(delta: number, rotation: number) => { 
        // Linear Conversion (https://stackoverflow.com/a/929107/5024903)
        let newVolume = Math.floor(((rotation + 1) * 100) / 2)
        let volumeGlyph = numberGlyph(newVolume)
        
        speaker.setVolume(newVolume)
        
        device.displayGlyph(volumeGlyph, {
                alignment: GlyphAlignment.Center,
                transition: DisplayTransition.CrossFade,
        })
    })
}


// Boot strap async function
main().catch((err) => {
  console.log(err)
})