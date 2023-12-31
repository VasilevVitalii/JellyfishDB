/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vv from 'vv-common'
import { NumeratorUuid } from "./numerator"
import { transpile } from "typescript"
import { join } from 'path'
import { TDataKey } from '.'
import { TStamp } from './driverMaster'

type TDriverHandleGenerateKey<TAbstractPayLoad> = (keyRaw?: TDataKey, payLoad?: TAbstractPayLoad) => string
type TDriverHandleGenerateFileName<TAbstractPayLoad> = (keyRaw?: TDataKey, payLoad?: TAbstractPayLoad) => string
type TDriverHandleGenerateFileSubdir<TAbstractPayLoad> = (keyRaw?: TDataKey, payLoad?: TAbstractPayLoad) => string
type TDriverHandleGetFileFromKey = (key: TDataKey) => string
type TDriverHandleGetSubdirFromKey = (key: TDataKey) => string
type TDriverHandleGetSubdirVerify   = (subdir: string) => boolean
type TDriverHandleCacheInsert<TAbstractPayLoad,TAbstractPayLoadCache> = (stamp: TStamp<TAbstractPayLoad>, cache: TAbstractPayLoadCache[]) => void
type TDriverHandleCacheUpdate<TAbstractPayLoad,TAbstractPayLoadCache> = (stamp: TStamp<TAbstractPayLoad>, cache: TAbstractPayLoadCache[]) => void
type TDriverHandleCacheDelete<TAbstractPayLoad,TAbstractPayLoadCache> = (stamp: TStamp<TAbstractPayLoad>, cache: TAbstractPayLoadCache[]) => void
type TDriverHandleCacheShrink = (cache: any[]) => void

export type TDriverHandle<TAbstractPayLoad, TAbstractPayLoadCache> = {
    generateKey?: TDriverHandleGenerateKey<TAbstractPayLoad>,
    generateFileName?: TDriverHandleGenerateFileName<TAbstractPayLoad>,
    generateFileSubdir?: TDriverHandleGenerateFileSubdir<TAbstractPayLoad>,
    getFileFromKey?: TDriverHandleGetFileFromKey,
    getSubdirFromKey?: TDriverHandleGetSubdirFromKey,
    getSubdirVerify?: TDriverHandleGetSubdirVerify,
    cacheInsert?: TDriverHandleCacheInsert<TAbstractPayLoad,TAbstractPayLoadCache>,
    cacheUpdate?: TDriverHandleCacheUpdate<TAbstractPayLoad,TAbstractPayLoadCache>,
    cacheDelete?: TDriverHandleCacheDelete<TAbstractPayLoad,TAbstractPayLoadCache>,
    cacheShrink?: TDriverHandleCacheShrink
}

export class DriverHandle<TAbstractPayLoad> {
    private _funcGenerateKey = undefined
    private _funcGenerateFileName = undefined
    private _funcGenerateFileSubdir = undefined
    private _funcGetFileFromKey = undefined
    private _funcGetSubdirFromKey = undefined
    private _funcGetSubdirVerify = undefined
    private _funcCacheInsert = undefined
    private _funcCacheUpdate = undefined
    private _funcCacheDelete = undefined
    private _funcCacheShrink = undefined

    private _uuid = new NumeratorUuid()
    private _prefix = [`import * as path from 'path'`]
    private _defaultSubdir = RegExp(/^[0-9][/|\\][0-9][/|\\][0-9][/|\\][0-9]$/)

    public setGenerateKey(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._funcGenerateKey = (keyRaw: TDataKey, payLoad?: TAbstractPayLoad) => {
                return vv.toString(f(keyRaw, payLoad)) as TDataKey
            }
        } else {
            this._funcGenerateKey = (keyRaw: TDataKey) => {
                return keyRaw
            }
        }
    }
    public setGenerateFileName(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._funcGenerateFileName = (keyRaw: TDataKey, payLoad?: TAbstractPayLoad) => {
                return vv.toString(f(keyRaw, payLoad)) as string
            }
        } else {
            this._funcGenerateFileName = (keyRaw: TDataKey) => {
                return `${keyRaw}.json` as string
            }
        }
    }
    public setGenerateFileSubdir(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._funcGenerateFileSubdir = (keyRaw: TDataKey, payLoad?: TAbstractPayLoad) => {
                return vv.toString(f(keyRaw, payLoad)) as string
            }
        } else {
            this._funcGenerateFileSubdir = (keyRaw: TDataKey) => {
                return join(...keyRaw.substring(0, 4)) as string
            }
        }
    }
    public setGetFileFromKey(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._funcGetFileFromKey = (key: TDataKey) => {
                return vv.toString(f(key)) as string
            }
        } else {
            this._funcGetFileFromKey = (key: TDataKey) => {
                return `${key}.json` as string
            }
        }
    }
    public setGetSubdirFromKey(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._funcGetSubdirFromKey = (key: TDataKey) => {
                return vv.toString(f(key)) as string
            }
        } else {
            this._funcGetSubdirFromKey = (key: TDataKey) => {
                return join(...key.substring(0, 4)) as string
            }
        }
    }
    public setGetSubdirVerify(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._funcGetSubdirVerify = (subdir: string) => {
                return vv.toBool(f(subdir)) as boolean
            }
        } else {
            this._funcGetSubdirVerify = (subdir: string) => {
                return this._defaultSubdir.test(subdir) as boolean
            }
        }
    }
    public setCacheInsert(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._funcCacheInsert = (stamp: TStamp<TAbstractPayLoad>, cache: any[]) => {
                f(stamp, cache)
            }
        } else {
            this._funcCacheInsert = (stamp: TStamp<TAbstractPayLoad>, cache: any[]) => {
            }
        }
    }
    public setCacheUpdate(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._funcCacheUpdate = (stamp: TStamp<TAbstractPayLoad>, cache: any[]) => {
                f(stamp, cache)
            }
        } else {
            this._funcCacheUpdate = (stamp: TStamp<TAbstractPayLoad>, cache: any[]) => {
            }
        }
    }
    public setCacheDelete(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._funcCacheDelete = (stamp: TStamp<TAbstractPayLoad>, cache: any[]) => {
                f(stamp, cache)
            }
        } else {
            this._funcCacheDelete = (stamp: TStamp<TAbstractPayLoad>, cache: any[]) => {
            }
        }
    }
    public setCacheShrink(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._funcCacheShrink = (cache: any[]) => {
                f(cache)
            }
        } else {
            this._funcCacheShrink = (cache: any[]) => {
            }
        }
    }


    public generateKey(payLoad: TAbstractPayLoad): { keyRaw: TDataKey, key: TDataKey } {
        const keyRaw = this._uuid.getId()
        return { keyRaw, key: this._funcGenerateKey(keyRaw, payLoad) }
    }
    public generateFileName(keyRaw: TDataKey, payLoad: TAbstractPayLoad) {
        return this._funcGenerateFileName(keyRaw, payLoad)
    }
    public generateFileSubdir(keyRaw: TDataKey, payLoad: TAbstractPayLoad) {
        return this._funcGenerateFileSubdir(keyRaw, payLoad)
    }
    public getFileFromKey(key: TDataKey) {
        return this._funcGetFileFromKey(key)
    }
    public getSubdirFromKey(key: TDataKey) {
        return this._funcGetSubdirFromKey(key)
    }
    public getSubdirVerify(subdir: string) {
        return this._funcGetSubdirVerify(subdir)
    }
    public cacheInsert(stamp: TStamp<TAbstractPayLoad>, cache: any[]) {
        return this._funcCacheInsert(stamp, cache)
    }
    public cacheUpdate(stamp: TStamp<TAbstractPayLoad>, cache: any[]) {
        return this._funcCacheUpdate(stamp, cache)
    }
    public cacheDelete(stamp: TStamp<TAbstractPayLoad>, cache: any[]) {
        return this._funcCacheDelete(stamp, cache)
    }
    public cacheShrink(cache: any[]) {
        return this._funcCacheShrink(cache)
    }
}