# Sonos Nuimo Controller

Built using [rocket-nuimo](https://github.com/happycodelucky/rocket-nuimo-node)

## Usage

Add your own IP to `src/sonos-controller.ts`:
```javascript
const sonos_speaker: string = '0.0.0.0'
```

```bash
yarn install
yarn run sonos-controller
```