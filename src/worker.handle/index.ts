/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unused-vars */
import path from 'path'
import * as fs from 'fs-extra'
import * as vv from 'vv-common'
import { NumeratorUuid } from "../numerator"
import { transpile } from "typescript"
import { TDataKey } from '..'
import { handle, env } from '../driverWorker';
import { TDataWrap, TStamp } from '../driverMaster'

type TDriverHandleGetKeyFromPayload<TAbstractPayLoad> = (payLoad: TAbstractPayLoad) => TDataKey
type TDriverHandleSetKeyToPayload<TAbstractPayLoad> = (payLoad: TAbstractPayLoad, keyDefault: TDataKey) => TDataKey
type TDriverHandleGetFileNameFromKey = (key: TDataKey, fileNameDefault: string) => string
type TDriverHandleGetFileSubdirFromKey = (key: TDataKey, subdirNameDefault: string) => string

export type TWorkerDriverHandle<TAbstractPayLoad> = {
    getKeyFromPayload: TDriverHandleGetKeyFromPayload<TAbstractPayLoad>,
    setKeyToPayload: TDriverHandleSetKeyToPayload<TAbstractPayLoad>,
    getFileNameFromKey?: TDriverHandleGetFileNameFromKey,
    getFileSubdirFromKey?: TDriverHandleGetFileSubdirFromKey
}

export class WorkerDriverHandle<TAbstractPayLoad> {
    private _uuid = new NumeratorUuid()
    private _prefix = [`import * as path from 'path'`]

    private _f(func: string): any {
        if (!vv.isEmpty(func)) {
            const startParamIdx = func.indexOf('(');
            const funcAnonim = `return function${func.substring(startParamIdx)}`
            const funcAnonim1 = `(function() { \n function ${func} \n return ${func.substring(0, startParamIdx)} \n })();`
            //return new Function(funcAnonim)()
            const f = eval(funcAnonim1)
            return f
        } else {
            return undefined
        }

        // if (!vv.isEmpty(func)) {
        //     const ft = transpile([...this._prefix, func].join(`\n`))
        //     const f = eval(ft)
        //     return f
        // } else {
        //     return undefined
        // }
    }

    //===getKeyFromPayload
    private _funcGetKeyFromPayload: TDriverHandleGetKeyFromPayload<TAbstractPayLoad> = (payLoad: TAbstractPayLoad): TDataKey => {
        return vv.toString((payLoad as any).__jellyfishDbKey)
    }
    public setGetKeyFromPayload(func: string) {
        const f = this._f(func)
        if (f) {
            this._funcGetKeyFromPayload = (payLoad: TAbstractPayLoad) => {
                return vv.toString(f(payLoad)) as TDataKey
            }
        }
    }
    public getKeyFromPayload(payLoad: TAbstractPayLoad): TDataKey {
        return this._funcGetKeyFromPayload(payLoad)
    }

    //===setKeyToPayload
    private _funcSetKeyToPayload: TDriverHandleSetKeyToPayload<TAbstractPayLoad> = (payLoad: TAbstractPayLoad, keyDefault: TDataKey): TDataKey => {
        (payLoad as any).__jellyfishDbKey = keyDefault
        return keyDefault
    }
    public setSetKeyToPayload(func: string) {
        const f = this._f(func)
        if (f) {
            this._funcSetKeyToPayload = (payLoad: TAbstractPayLoad, keyDefault: TDataKey) => {
                return vv.toString(f(payLoad, keyDefault)) as TDataKey
            }
        }
    }
    public setKeyToPayload(payLoad: TAbstractPayLoad): TDataKey {
        return this._funcSetKeyToPayload(payLoad, this._uuid.getId())
    }

    //===getFileNameFromKey
    private _funcGetFileNameFromKey: TDriverHandleGetFileNameFromKey = (key: TDataKey, fileNameDefault: string): string => {
        return fileNameDefault
    }
    public setGetFileNameFromKey(func: string) {
        const f = this._f(func)
        if (f) {
            this._funcGetFileNameFromKey = (key: TDataKey, fileNameDefault: string) => {
                return vv.toString(f(key, fileNameDefault)) as TDataKey
            }
        }
    }
    public getFileNameFromKey(key: TDataKey): string {
        return this._funcGetFileNameFromKey(key, `${key}.json`)
    }

    //===getFileSubdirFromKey
    private _funcGetFileSubdirFromKey: TDriverHandleGetFileSubdirFromKey = (key: TDataKey, subdirNameDefault: string): string => {
        return subdirNameDefault
    }
    public setGetFileSubdirFromKey(func: string) {
        const f = this._f(func)
        if (f) {
            this._funcGetFileSubdirFromKey = (key: TDataKey, subdirNameDefault: string) => {
                return vv.toString(f(key, subdirNameDefault)) as TDataKey
            }
        }
    }
    public getFileSubdirFromKey(key: TDataKey): string {
        //path.join(...key.substring(0, 4))
        return this._funcGetFileSubdirFromKey(key, ``)
    }
}

export async function GetStamp<TAbstractPayLoad>(key: TDataKey, allowFiles: {data: boolean, wrap: boolean}): Promise<{ stamp: TStamp< TAbstractPayLoad>, error: string }> {

    const res = {
        error: undefined as string,
        stamp: {
            payLoadStamp: {
                fileFullName: undefined as string,
                fileSubdir: undefined as string,
                data: undefined as TAbstractPayLoad,
            },
            wrapStamp: {
                fileFullName: undefined as string,
                fileSubdir: undefined as string,
                wrap: undefined as TDataWrap
            }
        }
    } as { stamp: TStamp< TAbstractPayLoad>, error: string }

    const p = {
        dataFileName: undefined as string,
        dataFileFullDir: undefined as string,
        dataFileExists: undefined as boolean,
        wrapFileName: undefined as string,
        wrapFileFullDir: undefined as string,
        wrapFileExists: undefined as boolean,
    }

    try {
        p.dataFileName = handle.getFileNameFromKey(key)
        p.wrapFileName = `wrap.${p.dataFileName}`
    } catch (error) {
        res.error = `on getFileNameFromKey(${key}) - ${error}`
        return res
    }

    try {
        res.stamp.payLoadStamp.fileSubdir = handle.getFileSubdirFromKey(key)
        res.stamp.wrapStamp.fileSubdir = res.stamp.payLoadStamp.fileSubdir
    } catch (error) {
        res.error = `on getFileSubdirFromKey(${key}) - ${error}`
        return res
    }

    try {
        p.dataFileFullDir = path.join(env.workerData.dir.data, res.stamp.payLoadStamp.fileSubdir)
        p.wrapFileFullDir = path.join(env.workerData.dir.wrap, res.stamp.wrapStamp.fileSubdir)
        res.stamp.payLoadStamp.fileFullName = path.join(p.dataFileFullDir, p.dataFileName)
        res.stamp.wrapStamp.fileFullName = path.join(p.wrapFileFullDir, p.wrapFileName)
    } catch (error) {
        res.error = `on build dir - ${error}`
        return res
    }

    if (allowFiles.wrap) {
        try {
            await fs.ensureDir(p.wrapFileFullDir)
        }
        catch (err) {
            res.error = `on ensureDir "${p.wrapFileFullDir}" - ${err}`
            return res
        }

        try {
            res.stamp.wrapStamp.wrap = await fs.readJSON(res.stamp.wrapStamp.fileFullName, { encoding: 'utf8' })
            p.wrapFileExists = true
        } catch(err) {
            if ((err as any)?.code === 'ENOENT') {
                p.wrapFileExists = false
            } else {
                res.error = `on readJSON "${res.stamp.wrapStamp.fileFullName}" - ${err}`
                return res
            }
        }
    }

    if (allowFiles.data) {
        try {
            await fs.ensureDir(p.dataFileFullDir)
        }
        catch (err) {
            res.error = `on ensureDir "${p.dataFileFullDir}" - ${err}`
            return res
        }

        try {
            res.stamp.payLoadStamp.data = await fs.readJSON(res.stamp.payLoadStamp.fileFullName, { encoding: 'utf8' })
            p.dataFileExists = true
        } catch(err) {
            if ((err as any)?.code === 'ENOENT') {
                p.dataFileExists = false
            } else {
                res.error = `on readJSON "${res.stamp.payLoadStamp.fileFullName}" - ${err}`
                return res
            }
        }
    }

    return res
}