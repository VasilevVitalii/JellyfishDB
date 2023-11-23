import * as vv from 'vv-common'
import * as path from 'path'
import * as fs from 'fs-extra'
import { Worker } from 'worker_threads'
import { NumeratorIncrement } from './numerator'
import { TDriverWorkerData } from './driverWorker'

export enum EnumConcurrency {
    exclusive = 'exclusive',
    distributed = 'distributed',
}

export type TDriverMasterParam = {
    dir: string,
    concurrency?: EnumConcurrency,
    countWorker?: number
}

export type TDriverMasterHandle = {
    generateKey?: (keyRaw?: TDataKey, payLoad?: any) => {keyRaw: TDataKey, key: TDataKey},
    generateFileName?: (keyRaw?: TDataKey, payLoad?: any) => string,
    generateFileSubdir?: (keyRaw?: TDataKey, payLoad?: any) => string,
    getFileFromKey?: (key: TDataKey) => string,
    getSubdirFromKey?: (key: TDataKey) => string
}

export enum EnumQuery {
    insert = 'insert',
    update = 'update',
    upsert = 'upsert',
    delete = 'delete',
    loadByFile = 'loadByFile',
    loadByFilter = 'loadByFilter'
}

export type TDataKey = string

export type TData = {
    wrap: {
        key: TDataKey,
        fdm: string,
        ldm: string,
        isDeleted: boolean
    },
    payload: any
}

export type TPosition = {
    file: string,
    subdir: string
}

export type TStamp = {
    data: TData,
    position: TPosition
}

export type TQueryInsert = { kind: EnumQuery.insert, payLoad: any }
export type TQueryUpdate = { kind: EnumQuery.update, payLoad: any, key: TDataKey }
export type TQueryUpsert = { kind: EnumQuery.upsert, payLoad: any, key: TDataKey }
export type TQueryDelete = { kind: EnumQuery.delete, key: TDataKey }
export type TQueryLoadByKey = { kind: EnumQuery.loadByFile, key: TDataKey[] }

export type TQuery =
    TQueryInsert |
    TQueryUpdate |
    TQueryUpsert |
    TQueryDelete |
    TQueryLoadByKey

export type TResultTemplate = {kind: EnumQuery, key: TQueryKey, error?: string}

export type TResultInsert = TResultTemplate & { kind: EnumQuery.insert, stamp: TStamp }
export type TResultUpdate = TResultTemplate & { kind: EnumQuery.update, stamp: TStamp }
export type TResultUpsert = TResultTemplate & { kind: EnumQuery.upsert, stamp: TStamp }
export type TResultDelete = TResultTemplate & { kind: EnumQuery.delete, stamp: TStamp }
export type TResultLoadByFile = TResultTemplate & { kind: EnumQuery.loadByFile, stamp: TStamp[] }

export type TResult =
    TResultInsert |
    TResultUpdate |
    TResultUpsert |
    TResultDelete |
    TResultLoadByFile

export type TQueryKey = string

type TWorker = { worker: Worker, queueCount: number }

export class DriverMaster {
    private _connected = false
    private _handle = undefined as TDriverMasterHandle
    private _param = undefined as TDriverMasterParam
    private _numeratorQueue = new NumeratorIncrement()
    private _worker = [] as TWorker[]
    private _resultQueue = [] as { result: TResult, isUsed: boolean }[]
    private _timerClearResultQueue = undefined as vv.Timer

    private _findWorker(queryKind: EnumQuery): TWorker {
        if (this._param.countWorker === 1) {
            return this._worker[0]
        }
        if (queryKind === EnumQuery.insert || queryKind === EnumQuery.update || queryKind === EnumQuery.upsert || queryKind === EnumQuery.delete) {
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

    private _checkWork() {
        if (!this._connected) {
            throw new Error ('not connected')
        }
    }

    constructor(handle?: TDriverMasterHandle) {
        this._handle = handle
    }

    public connect(param: TDriverMasterParam) {
        if (this._connected) return

        this._param = {
            dir: vv.toString(param?.dir),
            concurrency: (vv.toString(param?.concurrency) as EnumConcurrency) || EnumConcurrency.distributed,
            countWorker: vv.toIntPositive(param?.countWorker) || 8
        }

        const workerData = {
            dir: {
                data: path.join(this._param.dir, 'data'),
                index: path.join(this._param.dir, 'index'),
                process: path.join(this._param.dir, '.process'),
            },
            concurrency: this._param.concurrency,
            handle: {
                generateKey: this._handle?.generateKey?.toString(),
                generateFileName: this._handle?.generateFileName?.toString(),
                generateFileSubdir: this._handle?.generateFileSubdir?.toString(),
                getFileFromKey: this._handle?.getFileFromKey?.toString(),
                getSubdirFromKey: this._handle?.getSubdirFromKey?.toString(),
            }
        } as TDriverWorkerData

        fs.ensureDirSync(workerData.dir.data)
        fs.ensureDirSync(workerData.dir.index)
        fs.ensureDirSync(workerData.dir.process)

        for (let i = 0; i < this._param.countWorker; i++) {
            const worker = new Worker(path.join(__dirname, './driverWorker.js'), { workerData })
            worker.on('message', (result: TResult) => {
                this._resultQueue.push({ result, isUsed: false })
            })
            this._worker.push({
                worker,
                queueCount: 0
            })
        }

        this._timerClearResultQueue = new vv.Timer(3000, () => {
            this._resultQueue = this._resultQueue.filter(f => !f.isUsed)
            this._timerClearResultQueue.nextTick(3000)
        })

        this._connected = true
    }

    public execOne(query: TQuery): TQueryKey {
        this._checkWork()
        const w = this._findWorker(query.kind)
        const queueKey = this._numeratorQueue.getId()
        w.queueCount++
        w.worker.postMessage({ queueKey, query })
        return queueKey
    }

    public checkResult(queryKey: TQueryKey): TResult {
        const fnd = this._resultQueue.find(f => f.result.key === queryKey)
        if (fnd) {
            fnd.isUsed = true
            return fnd.result
        } else {
            return undefined
        }
    }
}