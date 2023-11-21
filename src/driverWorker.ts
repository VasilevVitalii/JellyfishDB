import { workerData, parentPort } from 'worker_threads'
import * as vv from 'vv-common'
import path from 'path'
import fs from 'fs-extra'
import { EnumConcurrency, EnumQuery, TData, TDataKey, TQuery, TQueryKey, TResult } from './driverMaster'
import { NumeratorUuid } from './numerator'

export type TDriverWorkerData = {
    dir: {
        data: string,
        index: string,
        process: string,
    },
    concurrency: EnumConcurrency,
    handle: {
        generateKey: (keyRaw?: TDataKey, payLoad?: any) => TDataKey
        generateFileName: (key?: TDataKey, payLoad?: any) => string
        generateFileSubdir: (key?: TDataKey, payLoad?: any) => string
    }
}

const env = {
    workerData: workerData as TDriverWorkerData,
    uuid: new NumeratorUuid(),
    queryQueue: [] as {queueKey: TQueryKey, query: TQuery}[]
}

const handle = {
    generateKey: env.workerData.handle.generateKey
        ? ((payLoad?: any) => {
            return env.workerData.handle.generateKey(env.uuid.getId(), payLoad)
        })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        : ((payLoad?: any) => {
            return env.uuid.getId()
        }),
    generateFileName: env.workerData.handle.generateFileName
        ? ((key?: TDataKey, payLoad?: any) => {
            return env.workerData.handle.generateFileName(key, payLoad)
        })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        : ((key?: TDataKey, payLoad?: any) => {
            return `${key}.json`
        }),
    generateFileSubdir: env.workerData.handle.generateFileSubdir
        ? ((key?: TDataKey, payLoad?: any) => {
            return env.workerData.handle.generateFileSubdir(key, payLoad)
        })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        : ((key?: TDataKey, payLoad?: any) => {
            return path.join(...key.substring(0, 4))
        }),
    queryQueueProcess: (calback: () => void) => {
        const queryQueue = env.queryQueue.shift()
        if (!queryQueue) {
            calback()
            return
        }
        if (queryQueue.query.kind === EnumQuery.insert) {
            onQueryInsert(queryQueue.query.payLoad, (result) => {
                result.key = queryQueue.queueKey
                parentPort.postMessage(result)
                handle.queryQueueProcess(calback)
            })
        }
    }
}

parentPort.on('message', (message: {queueKey: TQueryKey, query: TQuery}) => {
    env.queryQueue.push(message)
})

const timer = new vv.Timer(50, () => {
    handle.queryQueueProcess(() => {
        timer.nextTick(50)
    })
})

function onQueryInsert(payload: any, calback: (result: TResult) => void) {
    const dm = vv.dateFormat(new Date(), '126')
    const key = handle.generateKey(payload)
    const fileName = handle.generateFileName(key, payload)
    const fileSubdir = handle.generateFileSubdir(key, payload)
    const fileDir = path.join(env.workerData.dir.data, fileSubdir)
    const fileFullName = path.join(fileDir, fileName)

    const data = {
        wrap: {
            key,
            fdm: dm,
            ldm: dm,
            isDeleted: false,
        },
        payload: payload
    } as TData

    const result = {
        key: null,
        kind: EnumQuery.insert,
        data: data,
        error: undefined
    } as TResult

    fs.ensureDir(fileDir, error => {
        if (error) {
            result.error = `on ensure dir "${fileDir}" - ${error}`
            calback(result)
            return
        }
        fs.writeJSON(fileFullName, data, {encoding: 'utf8', spaces: `\t`}, error => {
            if (error) {
                result.error = `on write json "${fileFullName}" - ${error}`
            }
            calback(result)
        })
    })
}



