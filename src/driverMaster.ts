/* eslint-disable @typescript-eslint/naming-convention */
import * as vv from 'vv-common'
import * as path from 'path'
import * as fs from 'fs-extra'
import { Worker } from 'worker_threads'
import { NumeratorIncrement } from './numerator'
import { TDriverWorkerData } from './driverWorker'
import { EnumQuery, EnumQueryTargetLoad, TDataKey, TWorkerDriverHandle } from '.'
import { MasterDriverHandle, TMasterDriverHandle } from './master.handle'

export type TDriverMasterParam = {
    /** root dir for data storage */
    dir: string,
    /** count parallel worker, default = 4, min = 1, max = 1024 */
    countWorker?: number,
}

export type TDataWrap = {
    fdm: string,
    ldm: string,
    ddm: string
}

export type TStamp<TAbstractPayLoad> = {
    payLoadStamp: {
        fileFullName: string,
        fileSubdir: string,
        data: TAbstractPayLoad,
    },
    wrapStamp: {
        fileFullName: string,
        fileSubdir: string,
        wrap: TDataWrap
    }
}

export type TQueryInsert<TAbstractPayLoad> = { kind: EnumQuery.insert, payLoad: TAbstractPayLoad }
export type TQueryUpdate<TAbstractPayLoad> = { kind: EnumQuery.update, payLoad: TAbstractPayLoad }
export type TQueryDelete = { kind: EnumQuery.delete, key: TDataKey }
export type TQueryShrink = { kind: EnumQuery.shrink }
export type TQueryLoadByKey = { kind: EnumQuery.loadByKey, key: TDataKey | TDataKey[]}
export type TQueryLoadAll = { kind: EnumQuery.loadAll, target: EnumQueryTargetLoad }

export type TQuery<TAbstractPayLoad> =
    TQueryInsert<TAbstractPayLoad> |
    TQueryUpdate<TAbstractPayLoad> |
    TQueryDelete |
    TQueryShrink |
    TQueryLoadByKey |
    TQueryLoadAll

export type TResultTemplate = {kind: EnumQuery, key: TQueryKey, error?: string}

export type TResultInsert<TAbstractPayLoad> = TResultTemplate & { kind: EnumQuery.insert, stamp: TStamp<TAbstractPayLoad> }
export type TResultUpdate<TAbstractPayLoad> = TResultTemplate & { kind: EnumQuery.update, stamp: TStamp<TAbstractPayLoad> }
export type TResultDelete<TAbstractPayLoad> = TResultTemplate & { kind: EnumQuery.delete, stamp: TStamp<TAbstractPayLoad> }
export type TResultLoadAll<TAbstractPayLoad> = TResultTemplate & { kind: EnumQuery.loadAll, target: EnumQueryTargetLoad, stamp: TStamp<TAbstractPayLoad>[] }
export type TResultLoadByKey<TAbstractPayLoad> = TResultTemplate & { kind: EnumQuery.loadByKey, stamp: TStamp<TAbstractPayLoad>[] }
export type TResultShrink = TResultTemplate & { kind: EnumQuery.shrink }

export type TResult<TAbstractPayLoad> =
    TResultInsert<TAbstractPayLoad> |
    TResultUpdate<TAbstractPayLoad> |
    TResultDelete<TAbstractPayLoad> |
    TResultShrink |
    TResultLoadByKey<TAbstractPayLoad> |
    TResultLoadAll<TAbstractPayLoad>
export type TResultQueue<TAbstractPayLoad> = { result: TResult<TAbstractPayLoad>, isUsed: boolean }
export type TQueryKey = string

type TWorker = { worker: Worker, queueCount: number }

export class DriverMaster<TAbstractPayLoad, TAbstractPayLoadCache> {
    private _connected = false
    private _handle = undefined as TWorkerDriverHandle<TAbstractPayLoad> & TMasterDriverHandle<TAbstractPayLoad,TAbstractPayLoadCache>
    private _param = undefined as TDriverMasterParam
    private _numeratorQueue = new NumeratorIncrement()
    private _worker = [] as TWorker[]
    private _resultQueue = [] as TResultQueue<TAbstractPayLoad>[]
    private _timerClearResultQueue = undefined as vv.Timer
    private _cache = [] as TAbstractPayLoadCache[]
    private _handleCache = undefined as MasterDriverHandle<TAbstractPayLoad>

    private _findWorker(): TWorker {
        if (this._param.countWorker === 1) {
            return this._worker[0]
        }
        let fndWorker = undefined as TWorker
        for (let i = 1; i < this._param.countWorker; i++) {
            const worker = this._worker[i]
            if (!fndWorker || fndWorker.queueCount > worker.queueCount) {
                fndWorker = worker
            }
            if (fndWorker.queueCount === 0) break
        }
        return fndWorker
    }

    constructor(handle?: TWorkerDriverHandle<TAbstractPayLoad> & TMasterDriverHandle<TAbstractPayLoad,TAbstractPayLoadCache> ) {
        this._handle = handle
    }

    public connect(param: TDriverMasterParam, onError?: (error: string) => void) {
        if (this._connected) return

        const dir = vv.toString(param?.dir)
        if (vv.isEmpty(dir)) {
            const errMessage = 'empty param.dir'
            if (onError) {
                onError(`on connection : ${errMessage}`)
                return
            } else {
                throw new Error(errMessage)
            }
        }

        let countWorker = vv.toIntPositive(param?.countWorker)
        if (countWorker === undefined) {
            countWorker = 4
        } else if (countWorker < 0) {
            countWorker = 1
        } else if (countWorker > 1024) {
            countWorker = 1024
        }

        this._param = {
            dir: dir,
            countWorker: countWorker
        }

        const workerData: TDriverWorkerData = {
            dir: {
                data: path.join(this._param.dir, 'data'),
                index: path.join(this._param.dir, 'index'),
                process: path.join(this._param.dir, '.process'),
                wrap: path.join(this._param.dir, 'wrap'),
            },
            handle: {
                getKeyFromPayload: this._handle?.getKeyFromPayload?.toString(),
                setKeyToPayload: this._handle?.setKeyToPayload?.toString(),
                getFileNameFromKey: this._handle?.storage?.getFileNameFromKey?.toString(),
                getFileSubdirFromKey: this._handle?.storage?.getFileSubdirFromKey?.toString(),
            }
        }

        try {
            fs.ensureDirSync(workerData.dir.data)
            fs.ensureDirSync(workerData.dir.index)
            fs.ensureDirSync(workerData.dir.process)
            fs.ensureDirSync(workerData.dir.wrap)

            this._handleCache = new MasterDriverHandle()
            this._handleCache.setCacheDelete(this._handle?.cache?.onDelete)
            this._handleCache.setCacheInsert(this._handle?.cache?.onInsert)
            this._handleCache.setCacheUpdate(this._handle?.cache?.onUpdate)
            this._handleCache.setCacheShrink(this._handle?.cache?.onShrink)
            this._handleCache.setOnResult(this._handle?.onResult)
        } catch (err) {
            if (onError) {
                onError(`on connection : ${(err as Error).message}`)
                return
            } else {
                throw err as Error
            }
        }

        for (let i = 0; i < this._param.countWorker; i++) {
            const w: TWorker = {
                worker: new Worker(path.join(__dirname, './driverWorker.js'), { workerData }),
                queueCount: 0
            }
            w.worker.on('message', (result: TResult<TAbstractPayLoad>) => {
                w.queueCount--
                if (result.kind === EnumQuery.loadAll && result.target === EnumQueryTargetLoad.cache) {
                    this._cache.splice(0)
                    result.stamp.forEach(item => {
                        try {
                            this._handleCache.cacheInsert(item, this._cache)
                        } catch (err) {
                            if (onError) {
                                onError((err as Error).message)
                            } else {
                                throw err as Error
                            }
                        }
                    })
                    return
                } else if (result.kind === EnumQuery.insert) {
                    try {
                        this._handleCache.cacheInsert(result.stamp, this._cache)
                    } catch (err) {
                        if (onError) {
                            onError((err as Error).message)
                        } else {
                            throw err as Error
                        }
                    }
                } else if (result.kind === EnumQuery.update) {
                    try {
                        this._handleCache.cacheUpdate(result.stamp, this._cache)
                    } catch (err) {
                        if (onError) {
                            onError((err as Error).message)
                        } else {
                            throw err as Error
                        }
                    }
                } else if (result.kind === EnumQuery.delete) {
                    try {
                        this._handleCache.cacheDelete(result.stamp, this._cache)
                    } catch (err) {
                        if (onError) {
                            onError((err as Error).message)
                        } else {
                            throw err as Error
                        }
                    }
                }
                this._resultQueue.push({ result, isUsed: false })
            })
            this._worker.push(w)
        }

        this._connected = true

        this._timerClearResultQueue = new vv.Timer(3000, () => {
            this._resultQueue = this._resultQueue.filter(f => !f.isUsed)
            if (this._connected) {
                this._timerClearResultQueue.nextTick(3000)
            }
        })
    }

    public exec(query: TQuery<TAbstractPayLoad>): TQueryKey {
        if (!this._connected) {
            throw new Error ('not connected')
        }
        const w = this._findWorker()
        const queueKey = this._numeratorQueue.getId()
        w.queueCount++
        w.worker.postMessage({ queueKey, query })
        return queueKey
    }

    public result(queryKey: TQueryKey): TResult<TAbstractPayLoad> {
        const fnd = this._resultQueue.find(f => f.result.key === queryKey)
        if (fnd) {
            this._handleCache.onResult(fnd)
            fnd.isUsed = true
            return fnd.result
        } else {
            return undefined
        }
    }

    public disconnect(callback: () => void) {
        this._connected = false
        const timer  = new vv.Timer(200, () => {
            if (this._worker.some(f => f.queueCount > 0)) {
                timer.nextTick(200)
            } else {
                this._worker.forEach(w => {
                    w.worker.terminate()
                })
                this._worker.splice(0)
                callback()
            }
        })
    }

    public get cache(): TAbstractPayLoadCache[] {
        return this._cache
    }

    public get param() : TDriverMasterParam {
        return this._param
    }


}