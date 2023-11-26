/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vv from 'vv-common'
import { TDataKey } from "./driverMaster"
import { NumeratorUuid } from "./numerator"
import { transpile } from "typescript"
import { join } from 'path'

type TDriverHandleGenerateKey = (keyRaw?: TDataKey, payLoad?: any) => string
type TDriverHandleGenerateFileName = (keyRaw?: TDataKey, payLoad?: any) => string
type TDriverHandleGenerateFileSubdir = (keyRaw?: TDataKey, payLoad?: any) => string
type TDriverHandleGetFileFromKey = (key: TDataKey) => string
type TDriverHandleGetSubdirFromKey = (key: TDataKey) => string

export type TDriverHandle = {
    generateKey?: TDriverHandleGenerateKey,
    generateFileName?: TDriverHandleGenerateFileName,
    generateFileSubdir?: TDriverHandleGenerateFileSubdir,
    getFileFromKey?: TDriverHandleGetFileFromKey,
    getSubdirFromKey?: TDriverHandleGetSubdirFromKey
}

export class DriverHandle {
    private _generateKey = undefined as TDriverHandleGenerateKey
    private _generateFileName = undefined as TDriverHandleGenerateFileName
    private _generateFileSubdir = undefined as TDriverHandleGenerateFileSubdir
    private _getFileFromKey = undefined as TDriverHandleGetFileFromKey
    private _getSubdirFromKey = undefined as TDriverHandleGetSubdirFromKey

    private _uuid = new NumeratorUuid()
    private _prefix = [`import * as path from 'path'`]

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
                return vv.toString(f(keyRaw, payLoad)) as TDataKey
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
                return vv.toString(f(keyRaw, payLoad)) as TDataKey
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
                return vv.toString(f(key)) as TDataKey
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
                return vv.toString(f(key)) as TDataKey
            }
        } else {
            this._getSubdirFromKey = (key: TDataKey) => {
                return join(...key.substring(0, 4)) as string
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
}




// generateKey: env.workerData.handle.generateKey
//     ? ((payLoad?: any) => {
//         const sf = `function ${env.workerData.handle.generateKey.substring(env.workerData.handle.generateKey.indexOf('('))}`
//         const f = new Function(`return ${sf}`)()
//         return f(env.uuid.getId(), payLoad) as { keyRaw: TDataKey, key: TDataKey }
//     })
//     : ((payLoad?: any) => {
//         const keyRaw = env.uuid.getId()
//         return { keyRaw: env.uuid.getId(), key: keyRaw }
//     }),


// generateFileName: env.workerData.handle.generateFileName
//     ? ((key?: TDataKey, payLoad?: any) => {
//         const sf = `function ${env.workerData.handle.generateFileName.substring(env.workerData.handle.generateFileName.indexOf('('))}`
//         const f = new Function(`return ${sf}`)()
//         return f(key, payLoad) as string
//     })
//     : ((key?: TDataKey, payLoad?: any) => {
//         return `${key}.json` as string
//     }),
// generateFileSubdir: env.workerData.handle.generateFileSubdir
//     ? ((key?: TDataKey, payLoad?: any) => {
//         const sf = `function ${env.workerData.handle.generateFileSubdir.substring(env.workerData.handle.generateFileSubdir.indexOf('('))}`
//         const f = new Function(`return ${sf}`)()
//         return f(key, payLoad) as string
//     })
//     : ((key?: TDataKey, payLoad?: any) => {
//         return path.join(...key.substring(0, 4)) as string
//     }),
// getFileFromKey: (key: string): string => {return undefined},
// getSubdirFromKey: env.workerData.handle.getSubdirFromKey
// ? ((key: TDataKey) => {
//     const sf = `function ${env.workerData.handle.getSubdirFromKey.substring(env.workerData.handle.getSubdirFromKey.indexOf('('))}`
//     const f = new Function(`return ${sf}`)()
//     return f(key) as string
// })
// : ((key: TDataKey) => {
//     return path.join(...key.substring(0, 4)) as string
// }),