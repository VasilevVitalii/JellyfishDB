import * as vv from 'vv-common'
import { Hash } from './hash'
import { v4 } from 'uuid'

const NUMERATOR_INCREMENT_DF = 'yymmddhhmissmsec'
const NUMERATOR_UUID_DF = 'yyyymmddhhmiss'
const NUMERATOR_UUID_HASH_LEN = 4

export class NumeratorIncrement {
    private _counter = 0
    private _ts = vv.dateFormat(new Date(), NUMERATOR_INCREMENT_DF)
    private _zeros = '00000'

    constructor() {
    }

    private _recount() {
        if (this._counter < 1000000) return
        const newTs = vv.dateFormat(new Date(), NUMERATOR_INCREMENT_DF)
        if (this._ts === newTs) return
        this._ts = newTs
        this._counter = 0
        this._zeros = '00000'
    }

    private _increment() {
        this._counter++
        if (this._counter === 10) {
            this._zeros = '0000'
        } else if (this._counter === 100) {
            this._zeros = '000'
        } else if (this._counter === 1000) {
            this._zeros = '00'
        } else if (this._counter === 10000) {
            this._zeros = '0'
        } else if (this._counter === 100000) {
            this._zeros = ''
        }
    }

    getId(): string {
        this._recount()
        this._increment()
        return `${this._ts}-${this._zeros}${this._counter}`
    }
}

export class NumeratorUuid {
    private _counter = 0
    private _ts = vv.dateFormat(new Date(), NUMERATOR_UUID_DF)
    private _hash = Hash(this._ts, NUMERATOR_UUID_HASH_LEN)

    constructor() {
    }

    private _rehash() {
        if (this._counter > 100) {
            const newTs = vv.dateFormat(new Date(), NUMERATOR_UUID_DF)
            if (newTs !== this._ts) {
                this._ts = newTs
                this._hash = Hash(this._ts, NUMERATOR_UUID_HASH_LEN)
                this._counter = 0
            }
        }
        this._counter++
    }

    getId(): string {
        this._rehash()
        return `${this._hash}${vv.replace('-', '', v4())}`
    }
}