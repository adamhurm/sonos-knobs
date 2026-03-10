# sonos-knobs

Control a Sonos speaker with a physical knob over BLE.

**Supported remotes**
| Device | Rotate | Click | Long-click | Touch | Display |
|---|---|---|---|---|---|
| [Nuimo Control](https://www.senic.com/nuimo) | Volume | Play/Pause | — | Show volume | 9×9 LED matrix |
| [Ortho Remote](https://teenage.engineering/products/ortho) | Volume | Play/Pause | — | — | None |

```
Ortho / Nuimo  ──BLE──▶  Node.js (sonos-knobs)  ──HTTP──▶  Sonos speaker
```

---

## Requirements

- Node.js 20 LTS
- A Sonos speaker on your local network
- A Nuimo Control **or** Ortho Remote

### BLE on macOS

Works out of the box — no extra setup needed.

### BLE on Linux

`noble` (the underlying BLE library) requires either root or the `cap_net_raw` capability:

```bash
# Grant capability to the node binary (preferred over running as root)
sudo setcap cap_net_raw+eip $(which node)
```

You may also need to install `libbluetooth-dev`:

```bash
sudo apt-get install bluetooth libbluetooth-dev
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/adamhurm/sonos-knobs.git
cd sonos-knobs
yarn install
```

### 2. Configure

```bash
cp config.example.yaml config.yaml
```

Edit `config.yaml`:

```yaml
remote:
  type: nuimo        # or "ortho"
  # deviceId: "XX:XX:XX:XX:XX:XX"   # optional, auto-discovers if omitted

speaker:
  type: sonos
  host: 192.168.1.50  # your speaker's IP — find it in the Sonos app

display:
  splash: true
  timeout: 5000      # ms before status glyphs clear
```

**Finding your speaker's IP**: Sonos app → Settings → System → [room name] → About My [room].

### 3. Run

```bash
yarn start
```

The app discovers the remote over BLE (up to 60 s), then waits for events.

---

## Config reference

| Key | Type | Default | Description |
|---|---|---|---|
| `remote.type` | `"nuimo"` \| `"ortho"` | `"nuimo"` | Which remote to use |
| `remote.deviceId` | string | auto-discover | BLE device ID for deterministic pairing |
| `speaker.type` | `"sonos"` | `"sonos"` | Speaker backend |
| `speaker.host` | string | `"0.0.0.0"` | Sonos speaker IP address |
| `display.splash` | boolean | `true` | Show SONOS splash on startup (Nuimo only) |
| `display.timeout` | number (ms) | `5000` | How long to show status glyphs |

---

## Architecture

```
src/
  adapters/
    remotes/
      remote.ts         # abstract RemoteAdapter (EventEmitter)
      nuimo.ts          # rocket-nuimo wrapper
      ortho.ts          # ortho-remote wrapper
    speakers/
      speaker.ts        # SpeakerAdapter interface
      sonos.ts          # sonos package wrapper
    display/
      display.ts        # DisplayAdapter interface
      nuimo-display.ts  # 9×9 LED matrix rendering
      noop-display.ts   # no-op for devices without a display
  model/
    glyphs.ts           # Nuimo LED glyph definitions
  config.ts             # YAML config loader
  controller.ts         # wires remote + speaker + display
  index.ts              # entry point
```

All device-specific code lives in an adapter. Adding a new knob or speaker means writing one new file; the controller never changes.

---

## Development

```bash
yarn typecheck   # type-check without emitting
yarn lint        # ESLint
```

CI runs both on every push via GitHub Actions.

---

## Stretch goals

- Multi-speaker support (group control or room switching via long-press)
- Multi-remote support (one per room)
- Track skip on swipe (Nuimo) or double-click (Ortho)
- Home Assistant / MQTT bridge
