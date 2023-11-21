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
    generateKey?: (keyRaw?: TDataKey, payLoad?: any) => TDataKey,
    generateFileName?: (key?: TDataKey, payLoad?: any) => string,
    generateFileSubdir?: (key?: TDataKey, payLoad?: any) => string,
}

export enum EnumQuery {
    insert = 'insert',
    update = 'update',
    upsert = 'upsert',
    delete = 'delete'
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

export type TQuery =
    { kind: EnumQuery.insert, payLoad: any } |
    { kind: EnumQuery.update, payLoad: any, key: string } |
    { kind: EnumQuery.upsert, payLoad: any, key: string } |
    { kind: EnumQuery.delete, key: string }

export type TResult =
    { kind: EnumQuery.insert, key: TQueryKey, error?: string, data: TData } |
    { kind: EnumQuery.update, key: TQueryKey, error?: string, data: TData } |
    { kind: EnumQuery.upsert, key: TQueryKey, error?: string, data: TData } |
    { kind: EnumQuery.delete, key: TQueryKey, error?: string }

export type TQueryKey = string

type TWorker = { worker: Worker, queueCount: number }

export class DriverMaster {
    private _connected = false
    private _handle = undefined as TDriverMasterHandle
    private _param = undefined as TDriverMasterParam
    private _numeratorQueue = new NumeratorIncrement()
    private _worker = [] as TWorker[]
    private _resultQueue = [] as { result: TResult, isUsed: boolean }[]
    private _timerClearResultQueue = new vv.Timer(3000, () => {
        this._resultQueue = this._resultQueue.filter(f => !f.isUsed)
        this._timerClearResultQueue.nextTick(3000)
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _execOne(query: TQuery): TQueryKey {
        throw new Error ('not connected')
    }

    constructor(handle?: TDriverMasterHandle) {
        this._handle = handle
    }

    public connect(param: TDriverMasterParam) {
        if (this._connected) return
        this._connected = true

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
                generateKey: this._handle?.generateKey,
                generateFileName: this._handle?.generateFileName,
                generateFileSubdir: this._handle?.generateFileSubdir
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

        this._execOne = (query: TQuery): TQueryKey => {
            const w = this._findWorker(query.kind)
            const queueKey = this._numeratorQueue.getId()
            w.queueCount++
            w.worker.postMessage({ queueKey, query })
            return queueKey
        }
    }

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

    public execOne(query: TQuery): TQueryKey {
        return this._execOne(query)
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