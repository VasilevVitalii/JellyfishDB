/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vv from 'vv-common'
import * as path from 'path'
import * as fs from 'fs-extra'
import { Worker } from 'worker_threads'
import { NumeratorIncrement } from './numerator'
import { TDriverWorkerData } from './driverWorker'
import { DriverHandle, TDriverHandle } from './driverHandle'
import { EnumQuery, TDataKey } from '.'

export type TDriverMasterParam = {
    dir: string,
    dirDeep?: 1 | 2 | 3 | 4,
    countWorker?: number,
}

export type TData<TAbstractPayLoad> = {
    wrap: {
        key: TDataKey,
        fdm: string,
        ldm: string,
        ddm: string
    },
    payload: TAbstractPayLoad
}

export type TPosition = {
    file: string,
    subdir: string
}

export type TStamp<TAbstractPayLoad> = {
    data: TData<TAbstractPayLoad>,
    position: TPosition
}

export type TQueryInsert<TAbstractPayLoad> = { kind: EnumQuery.insert, payLoad: TAbstractPayLoad }
export type TQueryUpdate<TAbstractPayLoad> = { kind: EnumQuery.update, payLoad: TAbstractPayLoad, key: TDataKey }
export type TQueryDelete = { kind: EnumQuery.delete, key: TDataKey }
export type TQueryShrink = { kind: EnumQuery.shrink }
export type TQueryLoadByKey = { kind: EnumQuery.loadByKey, key: TDataKey | TDataKey[]}
export type TQueryLoadAll = { kind: EnumQuery.loadAll, target: 'my' | 'cache' }

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
export type TResultShrink = TResultTemplate & { kind: EnumQuery.shrink }
export type TResultLoadByKey<TAbstractPayLoad> = TResultTemplate & { kind: EnumQuery.loadByKey, stamp: TStamp<TAbstractPayLoad>[] }
export type TResultLoadAll<TAbstractPayLoad> = TResultTemplate & { kind: EnumQuery.loadAll, target: 'my' | 'cache', stamp: TStamp<TAbstractPayLoad>[] }

export type TResult<TAbstractPayLoad> =
    TResultInsert<TAbstractPayLoad> |
    TResultUpdate<TAbstractPayLoad> |
    TResultDelete<TAbstractPayLoad> |
    TResultShrink |
    TResultLoadByKey<TAbstractPayLoad> |
    TResultLoadAll<TAbstractPayLoad>

export type TQueryKey = string

type TWorker = { worker: Worker, queueCount: number }

export class DriverMaster<TAbstractPayLoad, TAbstractPayLoadCache> {
    private _connected = false
    private _handle = undefined as TDriverHandle<TAbstractPayLoad,TAbstractPayLoadCache>
    private _param = undefined as TDriverMasterParam
    private _numeratorQueue = new NumeratorIncrement()
    private _worker = [] as TWorker[]
    private _resultQueue = [] as { result: TResult<TAbstractPayLoad>, isUsed: boolean }[]
    private _timerClearResultQueue = undefined as vv.Timer
    private _cache = [] as TAbstractPayLoadCache[]
    private _handleCache = undefined as DriverHandle<TAbstractPayLoad>

    private _findWorker(queryKind: EnumQuery): TWorker {
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

    constructor(handle?: TDriverHandle<TAbstractPayLoad,TAbstractPayLoadCache>) {
        this._handle = handle
    }

    public connect(param: TDriverMasterParam, onError?: (error: Error) => void) {
        if (this._connected) return

        let dirDeep = vv.toIntPositive(param?.dirDeep) || 4
        if (dirDeep > 4) {
            dirDeep = 4
        }

        this._param = {
            dir: vv.toString(param?.dir),
            dirDeep: dirDeep as any,
            countWorker: vv.toIntPositive(param?.countWorker) || 8
        }

        const workerData: TDriverWorkerData = {
            dir: {
                data: path.join(this._param.dir, 'data'),
                index: path.join(this._param.dir, 'index'),
                process: path.join(this._param.dir, '.process'),
            },
            handle: {
                generateKey: this._handle?.generateKey?.toString(),
                generateFileName: this._handle?.generateFileName?.toString(),
                generateFileSubdir: this._handle?.generateFileSubdir?.toString(),
                getFileFromKey: this._handle?.getFileFromKey?.toString(),
                getSubdirFromKey: this._handle?.getSubdirFromKey?.toString(),
                getSubdirVerify: undefined
            }
        }

        fs.ensureDirSync(workerData.dir.data)
        fs.ensureDirSync(workerData.dir.index)
        fs.ensureDirSync(workerData.dir.process)

        this._handleCache = new DriverHandle()
        this._handleCache.setCacheDelete(this._handle?.cacheDelete?.toString())
        this._handleCache.setCacheInsert(this._handle?.cacheInsert?.toString())
        this._handleCache.setCacheUpdate(this._handle?.cacheUpdate?.toString())
        this._handleCache.setCacheShrink(this._handle?.cacheShrink?.toString())

        for (let i = 0; i < this._param.countWorker; i++) {
            const w: TWorker = {
                worker: new Worker(path.join(__dirname, './driverWorker.js'), { workerData }),
                queueCount: 0
            }
            w.worker.on('message', (result: TResult<TAbstractPayLoad>) => {
                w.queueCount--
                if (result.kind === EnumQuery.loadAll && result.target === 'cache') {
                    this._cache.splice(0)
                    result.stamp.forEach(item => {
                        this._handleCache.cacheInsert(item, this._cache)
                    })
                    return
                } else if (result.kind === EnumQuery.insert) {
                    try {
                        this._handleCache.cacheInsert(result.stamp, this._cache)
                    } catch (err) {
                        if (onError) {
                            onError(err as Error)
                        } else {
                            throw err as Error
                        }
                    }
                } else if (result.kind === EnumQuery.update) {
                    this._handleCache.cacheUpdate(result.stamp, this._cache)
                } else if (result.kind === EnumQuery.delete) {
                    this._handleCache.cacheDelete(result.stamp, this._cache)
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
        const w = this._findWorker(query.kind)
        const queueKey = this._numeratorQueue.getId()
        w.queueCount++
        w.worker.postMessage({ queueKey, query })
        return queueKey
    }

    public result(queryKey: TQueryKey): TResult<TAbstractPayLoad> {
        const fnd = this._resultQueue.find(f => f.result.key === queryKey)
        if (fnd) {
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

    public get cache(): any {
        return this._cache
    }
}