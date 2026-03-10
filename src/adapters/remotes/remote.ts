import { EventEmitter } from 'events'

/**
 * Common interface for all knob remote devices.
 * Normalizes events from Nuimo, Ortho Remote, etc. into a unified shape.
 *
 * rotate   – knob turned; delta is the change, absolute is [0, 1] (0 = min, 1 = max)
 * click    – primary button pressed (Nuimo: center select, Ortho: click)
 * longClick – button held (Ortho: longClick, can also be used on Nuimo select)
 * touch    – touchpad touched (Nuimo only; absent on Ortho)
 * disconnect – device disconnected
 */

export abstract class RemoteAdapter extends EventEmitter {
    abstract connect(): Promise<void>

    // Typed overloads so callers get correct parameter types.
    on(event: 'rotate', listener: (delta: number, absolute: number) => void): this
    on(event: 'click', listener: () => void): this
    on(event: 'longClick', listener: () => void): this
    on(event: 'touch', listener: () => void): this
    on(event: 'disconnect', listener: () => void): this
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, listener: (...args: any[]) => void): this {
        return super.on(event, listener)
    }

    emit(event: 'rotate', delta: number, absolute: number): boolean
    emit(event: 'click'): boolean
    emit(event: 'longClick'): boolean
    emit(event: 'touch'): boolean
    emit(event: 'disconnect'): boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit(event: string, ...args: any[]): boolean {
        return super.emit(event, ...args)
    }
}
