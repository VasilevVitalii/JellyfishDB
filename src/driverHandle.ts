/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vv from 'vv-common'
import { NumeratorUuid } from "./numerator"
import { transpile } from "typescript"
import { join } from 'path'
import { TDataKey } from '.'

type TDriverHandleGenerateKey = (keyRaw?: TDataKey, payLoad?: any) => string
type TDriverHandleGenerateFileName = (keyRaw?: TDataKey, payLoad?: any) => string
type TDriverHandleGenerateFileSubdir = (keyRaw?: TDataKey, payLoad?: any) => string
type TDriverHandleGetFileFromKey = (key: TDataKey) => string
type TDriverHandleGetSubdirFromKey = (key: TDataKey) => string
type TDriverHandleGetSubdirVerify   = (subdir: string) => boolean
type TDriverHandleCacheInsert = (payLoad: any, cache: any[]) => void
type TDriverHandleCacheUpdate = (payLoad: any, cache: any[]) => void

export type TDriverHandle = {
    generateKey?: TDriverHandleGenerateKey,
    generateFileName?: TDriverHandleGenerateFileName,
    generateFileSubdir?: TDriverHandleGenerateFileSubdir,
    getFileFromKey?: TDriverHandleGetFileFromKey,
    getSubdirFromKey?: TDriverHandleGetSubdirFromKey,
    getSubdirVerify?: TDriverHandleGetSubdirVerify,
    cacheInsert?: TDriverHandleCacheInsert,
    cacheUpdate?: TDriverHandleCacheUpdate,
}

export class DriverHandle {
    private _generateKey = undefined as TDriverHandleGenerateKey
    private _generateFileName = undefined as TDriverHandleGenerateFileName
    private _generateFileSubdir = undefined as TDriverHandleGenerateFileSubdir
    private _getFileFromKey = undefined as TDriverHandleGetFileFromKey
    private _getSubdirFromKey = undefined as TDriverHandleGetSubdirFromKey
    private _getSubdirVerify = undefined as TDriverHandleGetSubdirVerify
    private _cacheInsert = undefined as TDriverHandleCacheInsert
    private _cacheUpdate = undefined as TDriverHandleCacheUpdate

    private _uuid = new NumeratorUuid()
    private _prefix = [`import * as path from 'path'`]
    private _defaultSubdir = RegExp(/^[0-9][/|\\][0-9][/|\\][0-9][/|\\][0-9]$/)

    public setGenerateKey(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._generateKey = (keyRaw: TDataKey, payLoad?: any) => {
                return vv.toString(f(keyRaw, payLoad)) as TDataKey
            }
        } else {
            this._generateKey = (keyRaw: TDataKey) => {
                return keyRaw
            }
        }
    }
    public setGenerateFileName(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._generateFileName = (keyRaw: TDataKey, payLoad?: any) => {
                return vv.toString(f(keyRaw, payLoad)) as string
            }
        } else {
            this._generateFileName = (keyRaw: TDataKey) => {
                return `${keyRaw}.json` as string
            }
        }
    }
    public setGenerateFileSubdir(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._generateFileSubdir = (keyRaw: TDataKey, payLoad?: any) => {
                return vv.toString(f(keyRaw, payLoad)) as string
            }
        } else {
            this._generateFileSubdir = (keyRaw: TDataKey) => {
                return join(...keyRaw.substring(0, 4)) as string
            }
        }
    }
    public setGetFileFromKey(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._getFileFromKey = (key: TDataKey) => {
                return vv.toString(f(key)) as string
            }
        } else {
            this._getFileFromKey = (key: TDataKey) => {
                return `${key}.json` as string
            }
        }
    }
    public setGetSubdirFromKey(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._getSubdirFromKey = (key: TDataKey) => {
                return vv.toString(f(key)) as string
            }
        } else {
            this._getSubdirFromKey = (key: TDataKey) => {
                return join(...key.substring(0, 4)) as string
            }
        }
    }
    public setGetSubdirVerify(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._getSubdirVerify = (subdir: string) => {
                return vv.toBool(f(subdir)) as boolean
            }
        } else {
            this._getSubdirVerify = (subdir: string) => {
                return this._defaultSubdir.test(subdir) as boolean
            }
        }
    }
    public setCacheInsert(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._cacheInsert = (payLoad: any, cache: any[]) => {
                f(payLoad, cache)
            }
        } else {
            this._cacheInsert = (payLoad: any, cache: any[]) => {
            }
        }
    }
    public setCacheUpdate(func?: string) {
        if (func) {
            const ft = transpile([...this._prefix, func].join(`\n`))
            const f = eval(ft)
            this._cacheUpdate = (payLoad: any, cache: any[]) => {
                f(payLoad, cache)
            }
        } else {
            this._cacheUpdate = (payLoad: any, cache: any[]) => {
            }
        }
    }

    public generateKey(payLoad: any): { keyRaw: TDataKey, key: TDataKey } {
        const keyRaw = this._uuid.getId()
        return { keyRaw, key: this._generateKey(keyRaw, payLoad) }
    }
    public generateFileName(keyRaw: TDataKey, payLoad: any) {
        return this._generateFileName(keyRaw, payLoad)
    }
    public generateFileSubdir(keyRaw: TDataKey, payLoad: any) {
        return this._generateFileSubdir(keyRaw, payLoad)
    }
    public getFileFromKey(key: TDataKey) {
        return this._getFileFromKey(key)
    }
    public getSubdirFromKey(key: TDataKey) {
        return this._getSubdirFromKey(key)
    }
    public getSubdirVerify(subdir: string) {
        return this._getSubdirVerify(subdir)
    }
    public cacheInsert(payLoad: any, cache: any[]) {
        return this._cacheInsert(payLoad, cache)
    }
    public cacheUpdate(payLoad: any, cache: any[]) {
        return this._cacheUpdate(payLoad, cache)
    }
}