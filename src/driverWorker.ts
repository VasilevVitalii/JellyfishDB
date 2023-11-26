/* eslint-disable @typescript-eslint/no-unused-vars */
import { workerData, parentPort } from 'worker_threads'
import * as vv from 'vv-common'
import * as path from 'path'
import * as fs from 'fs-extra'
import { EnumQuery, TData, TDataKey, TQuery, TQueryInsert, TQueryKey, TQueryUpdate, TResult, TResultInsert, TResultTemplate, TResultUpdate } from './driverMaster'
import { NumeratorUuid } from './numerator'
import { DriverHandle } from './driverHandle'


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
        getSubdirFromKey: string
    }
}

const env = {
    workerData: workerData as TDriverWorkerData,
    uuid: new NumeratorUuid(),
    queryQueue: [] as { queueKey: TQueryKey, query: TQuery }[]
}

const handle = new DriverHandle()
handle.setGenerateKey(env.workerData.handle?.generateKey?.toString())
handle.setGenerateFileName(env.workerData.handle?.generateFileName)
handle.setGenerateFileSubdir(env.workerData.handle?.generateFileSubdir)
handle.setGetFileFromKey(env.workerData.handle?.getFileFromKey)
handle.setGetSubdirFromKey(env.workerData.handle?.getSubdirFromKey)

function queryQueueProcess (calback: () => void) {
    const queryQueue = env.queryQueue.shift()
    if (!queryQueue) {
        calback()
        return
    }

    const result = {
        kind: queryQueue.query.kind,
        key: queryQueue.queueKey,
        error: undefined,
    } as TResultTemplate

    if (queryQueue.query.kind === EnumQuery.insert) {
        onQueryInsert(result as TResultInsert, queryQueue.query, (result) => {
            result.key = queryQueue.queueKey
            parentPort.postMessage(result)
            queryQueueProcess(calback)
        })
    } else if (queryQueue.query.kind === EnumQuery.update) {
        onQueryUpdate(result as TResultUpdate, queryQueue.query, (result) => {
            result.key = queryQueue.queueKey
            parentPort.postMessage(result)
            queryQueueProcess(calback)
        })
    } else {
        result.error = `unknown kind "${queryQueue.query.kind}"`
        parentPort.postMessage(result as TResult)
        queryQueueProcess(calback)
    }
}

parentPort.on('message', (message: { queueKey: TQueryKey, query: TQuery }) => {
    env.queryQueue.push(message)
})

const timer = new vv.Timer(50, () => {
    queryQueueProcess(() => {
        timer.nextTick(50)
    })
})

function onQueryInsert(result: TResultInsert, query: TQueryInsert, calback: (result: TResult) => void) {
    const dm = vv.dateFormat(new Date(), '126')
    const gkey = handle.generateKey(query.payLoad)
    const fileName = handle.generateFileName(gkey.keyRaw , query.payLoad)
    const fileSubdir = handle.generateFileSubdir(gkey.keyRaw, query.payLoad)
    const fileDir = path.join(env.workerData.dir.data, fileSubdir)
    const fileFullName = path.join(fileDir, fileName)

    const data = {
        wrap: {
            key: gkey.key,
            fdm: dm,
            ldm: dm,
            isDeleted: false,
        },
        payload: query.payLoad
    } as TData

    result.stamp = {
        data: data,
        position: {
            file: fileName,
            subdir: fileSubdir
        }
    }

    fs.ensureDir(fileDir, error => {
        if (error) {
            result.error = `on ensure dir "${fileDir}" - ${error}`
            calback(result as TResult)
            return
        }
        fs.writeJSON(fileFullName, data, { encoding: 'utf8', spaces: `\t` }, error => {
            if (error) {
                result.error = `on write json "${fileFullName}" - ${error}`
            }
            calback(result as TResult)
        })
    })
}

function onQueryUpdate(result: TResultUpdate, query: TQueryUpdate, calback: (result: TResult) => void) {
    const dm = vv.dateFormat(new Date(), '126')
    const fileName = handle.getFileFromKey(query.key)
    const fileSubdir = handle.getSubdirFromKey(query.key)
    const fileDir = path.join(env.workerData.dir.data, fileSubdir)
    const fileFullName = path.join(fileDir, fileName)

    fs.stat(fileFullName, error => {
        if (error) {
            result.error = `not exists file "${fileFullName}" - ${error}`
            calback(result as TResult)
            return
        }
        fs.readJSON(fileFullName, {encoding: 'utf8'}, (error, data: TData) => {
            if (error) {
                result.error = `on read file "${fileFullName}" - ${error}`
                calback(result as TResult)
                return
            }
            try {
                if (!data.payload) {
                    data.payload = {}
                }
                data.payload = Object.assign(data.payload, query.payLoad)
                data.wrap.ldm = dm

                result.stamp = {
                    data: data,
                    position: {
                        file: fileName,
                        subdir: fileSubdir
                    }
                }

                fs.writeJSON(fileFullName, data, { encoding: 'utf8', spaces: `\t` }, error => {
                    if (error) {
                        result.error = `on write json "${fileFullName}" - ${error}`
                    }
                    calback(result as TResult)
                })
            } catch (error) {
                result.error = `on edit payload - ${error}`
                calback(result as TResult)
                return
            }
        })
    })
}




