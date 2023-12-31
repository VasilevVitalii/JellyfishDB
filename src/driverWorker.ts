/* eslint-disable @typescript-eslint/no-unused-vars */
import { workerData, parentPort } from 'worker_threads'
import * as vv from 'vv-common'
import * as path from 'path'
import { TQuery, TQueryKey, TResult, TResultInsert, TResultTemplate, TResultDelete, TResultUpdate, TResultLoadByKey, TResultLoadAll, TResultShrink } from './driverMaster'
import { NumeratorUuid } from './numerator'
import { DriverHandle } from './driverHandle'
import { EnumQuery } from '.'
import { OnQueryInsert } from './worker.handle/onQueryInsert'
import { OnQueryUpdate } from './worker.handle/onQueryUpdate'
import { OnQueryDelete } from './worker.handle/onQueryDelete'
import { OnQueryShrink } from './worker.handle/onQueryShrink'
import { OnQueryLoadByKey } from './worker.handle/onQueryLoadByKey'
import { OnQueryLoadAll } from './worker.handle/onQueryLoadAll'

export type TDriverWorkerData = {
    dir: {
        data: string,
        index: string,
        process: string,
    },
    handle: {
        generateKey: string
        generateFileName: string
        generateFileSubdir: string
        getFileFromKey: string
        getSubdirFromKey: string,
        getSubdirVerify: string,
    }
}

export const env = {
    workerData: workerData as TDriverWorkerData,
    uuid: new NumeratorUuid(),
    queryQueue: [] as { queueKey: TQueryKey, query: TQuery<any> }[]
}

export const handle = new DriverHandle()
handle.setGenerateKey(env.workerData?.handle?.generateKey?.toString())
handle.setGenerateFileName(env.workerData?.handle?.generateFileName?.toString())
handle.setGenerateFileSubdir(env.workerData?.handle?.generateFileSubdir?.toString())
handle.setGetFileFromKey(env.workerData?.handle?.getFileFromKey?.toString())
handle.setGetSubdirFromKey(env.workerData?.handle?.getSubdirFromKey?.toString())
handle.setGetSubdirVerify(env.workerData?.handle?.getSubdirVerify?.toString())

function queryQueueProcess(calback: () => void) {
    const queryQueue = env.queryQueue.shift()
    if (!queryQueue) {
        calback()
        return
    }

    const result: TResultTemplate = {
        key: queryQueue.queueKey,
        kind: queryQueue.query.kind,
        error: undefined,
    }

    const kind = queryQueue.query.kind as any as string

    if (queryQueue.query.kind === EnumQuery.insert) {
        OnQueryInsert(result as TResultInsert<any>, queryQueue.query, () => {
            parentPort.postMessage(result)
            queryQueueProcess(calback)
        })
    } else if (queryQueue.query.kind === EnumQuery.update) {
        OnQueryUpdate(result as TResultUpdate<any>, queryQueue.query, () => {
            parentPort.postMessage(result)
            queryQueueProcess(calback)
        })
    } else if (queryQueue.query.kind === EnumQuery.delete) {
        OnQueryDelete(result as TResultDelete<any>, queryQueue.query, () => {
            parentPort.postMessage(result)
            queryQueueProcess(calback)
        })
    } else if (queryQueue.query.kind === EnumQuery.shrink) {
        OnQueryShrink(result as TResultShrink, queryQueue.query, (result) => {
            parentPort.postMessage(result)
            queryQueueProcess(calback)
        })
    } else if (queryQueue.query.kind === EnumQuery.loadByKey) {
        OnQueryLoadByKey(result as TResultLoadByKey<any>, queryQueue.query, () => {
            parentPort.postMessage(result)
            queryQueueProcess(calback)
        })
    } else if (queryQueue.query.kind === EnumQuery.loadAll) {
        (result as TResultLoadAll<any>).target = queryQueue.query.target
        OnQueryLoadAll(result as TResultLoadAll<any>, () => {
            parentPort.postMessage(result)
            queryQueueProcess(calback)
        })
    } else {
        result.error = `unknown kind "${kind}"`
        parentPort.postMessage(result as TResult<any>)
        queryQueueProcess(calback)
    }
}

parentPort.on('message', (message: { queueKey: TQueryKey, query: TQuery<any> }) => {
    env.queryQueue.push(message)
})

const timer = new vv.Timer(50, () => {
    queryQueueProcess(() => {
        timer.nextTick(50)
    })
})