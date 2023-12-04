/* eslint-disable @typescript-eslint/no-unused-vars */
import { workerData, parentPort } from 'worker_threads'
import * as vv from 'vv-common'
import * as path from 'path'
import * as fs from 'fs-extra'
import { TData, TQuery, TQueryInsert, TQueryKey, TQueryUpdate, TResult, TResultInsert, TResultTemplate, TResultDelete, TResultUpdate, TQueryDelete, TResultLoad, TQueryLoad } from './driverMaster'
import { NumeratorUuid } from './numerator'
import { DriverHandle } from './driverHandle'
import { EnumQuery, TDataKey } from '.'

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
        cacheInsert: string,
        cacheUpdate: string
    }
}

const env = {
    workerData: workerData as TDriverWorkerData,
    uuid: new NumeratorUuid(),
    queryQueue: [] as { queueKey: TQueryKey, query: TQuery }[]
}

const handle = new DriverHandle()
handle.setGenerateKey(env.workerData.handle?.generateKey?.toString())
handle.setGenerateFileName(env.workerData.handle?.generateFileName?.toString())
handle.setGenerateFileSubdir(env.workerData.handle?.generateFileSubdir?.toString())
handle.setGetFileFromKey(env.workerData.handle?.getFileFromKey?.toString())
handle.setGetSubdirFromKey(env.workerData.handle?.getSubdirFromKey?.toString())
handle.setGetSubdirVerify(env.workerData.handle?.getSubdirVerify?.toString())
handle.setCacheInsert(env.workerData.handle?.cacheInsert?.toString())
handle.setCacheUpdate(env.workerData.handle?.cacheUpdate?.toString())

function queryQueueProcess(calback: () => void) {
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
    } else if (queryQueue.query.kind === EnumQuery.delete) {
        onQueryDelete(result as TResultDelete, queryQueue.query, (result) => {
            result.key = queryQueue.queueKey
            parentPort.postMessage(result)
            queryQueueProcess(calback)
        })
    } else if (queryQueue.query.kind === EnumQuery.load) {
        onQueryLoad(result as TResultLoad, queryQueue.query, (result) => {
            result.key = queryQueue.queueKey
            parentPort.postMessage(result)
            queryQueueProcess(calback)
        })
    } else {
        result.error = `unknown kind`
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
    const fileName = handle.generateFileName(gkey.keyRaw, query.payLoad)
    const fileSubdir = handle.generateFileSubdir(gkey.keyRaw, query.payLoad)
    const fileDir = path.join(env.workerData.dir.data, fileSubdir)
    const fileFullName = path.join(fileDir, fileName)

    const data = {
        wrap: {
            key: gkey.key,
            fdm: dm,
            ldm: dm,
            ddm: "",
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
    const p = {
        dm: undefined as string,
        fileName: undefined as string,
        fileSubdir: undefined as string,
        fileDir: undefined as string,
        fileFullName: undefined as string
    }

    p.dm = vv.dateFormat(new Date(), '126')

    try {
        p.fileName = handle.getFileFromKey(query.key)
    } catch (error) {
        result.error = `on getFileFromKey(${query.key}) - ${error}`
        calback(result as TResult)
        return
    }

    try {
        p.fileSubdir = handle.getSubdirFromKey(query.key)
    } catch (error) {
        result.error = `on getSubdirFromKey(${query.key}) - ${error}`
        calback(result as TResult)
        return
    }

    try {
        p.fileDir = path.join(env.workerData.dir.data, p.fileSubdir)
        p.fileFullName = path.join(p.fileDir, p.fileName)
    } catch (error) {
        result.error = `on build dir - ${error}`
        calback(result as TResult)
        return
    }

    fs.stat(p.fileFullName, error => {
        if (error) {
            result.error = `not exists file "${p.fileFullName}" - ${error}`
            calback(result as TResult)
            return
        }
        fs.readJSON(p.fileFullName, { encoding: 'utf8' }, (error, data: TData) => {
            if (error) {
                result.error = `on read file "${p.fileFullName}" - ${error}`
                calback(result as TResult)
                return
            }
            try {
                if (!data.payload) {
                    data.payload = {}
                }
                data.payload = Object.assign(data.payload, query.payLoad)
                data.wrap.ldm = p.dm

                result.stamp = {
                    data: data,
                    position: {
                        file: p.fileName,
                        subdir: p.fileSubdir
                    }
                }

                fs.writeJSON(p.fileFullName, data, { encoding: 'utf8', spaces: `\t` }, error => {
                    if (error) {
                        result.error = `on write json "${p.fileFullName}" - ${error}`
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

function onQueryDelete(result: TResultDelete, query: TQueryDelete, calback: (result: TResult) => void) {
    const p = {
        dm: undefined as string,
        fileName: undefined as string,
        fileSubdir: undefined as string,
        fileDir: undefined as string,
        fileFullName: undefined as string
    }

    p.dm = vv.dateFormat(new Date(), '126')

    try {
        p.fileName = handle.getFileFromKey(query.key)
    } catch (error) {
        result.error = `on getFileFromKey(${query.key}) - ${error}`
        calback(result as TResult)
        return
    }

    try {
        p.fileSubdir = handle.getSubdirFromKey(query.key)
    } catch (error) {
        result.error = `on getSubdirFromKey(${query.key}) - ${error}`
        calback(result as TResult)
        return
    }

    try {
        p.fileDir = path.join(env.workerData.dir.data, p.fileSubdir)
        p.fileFullName = path.join(p.fileDir, p.fileName)
    } catch (error) {
        result.error = `on build dir - ${error}`
        calback(result as TResult)
        return
    }

    fs.stat(p.fileFullName, error => {
        if (error) {
            result.error = `not exists file "${p.fileFullName}" - ${error}`
            calback(result as TResult)
            return
        }
        fs.readJSON(p.fileFullName, { encoding: 'utf8' }, (error, data: TData) => {
            if (error) {
                result.error = `on read file "${p.fileFullName}" - ${error}`
                calback(result as TResult)
                return
            }
            try {
                data.wrap.ddm = p.dm

                result.stamp = {
                    data: data,
                    position: {
                        file: p.fileName,
                        subdir: p.fileSubdir
                    }
                }

                fs.writeJSON(p.fileFullName, data, { encoding: 'utf8', spaces: `\t` }, error => {
                    if (error) {
                        result.error = `on write json "${p.fileFullName}" - ${error}`
                    }
                    calback(result as TResult)
                })
            } catch (error) {
                result.error = `on delete - ${error}`
                calback(result as TResult)
                return
            }
        })
    })
}

function onQueryLoad(result: TResultLoad, query: TQueryLoad, calback: (result: TResult) => void) {
    result.stamp = []
    if (query.key === 'all') {
        vv.dir(env.workerData.dir.data, { mode: 'files' }, (error, resultDir) => {
            if (error) {
                result.error = `on build file list - ${error}`
                calback(result as TResult)
                return
            }
            onQueryLoadAll(result, resultDir.filter(f => handle.getSubdirVerify(f.subpath) === true).map(m => {
                return {
                    fileFullName: path.join(m.path, m.file),
                    subpath: m.subpath
                }
            }), 0, () => {
                calback(result as TResult)
                return
            })
        })
    } else {
        onQueryLoadByKey(result, Array.isArray(query.key) ? query.key : [query.key], 0, () => {
            calback(result as TResult)
            return
        })
    }
}

function onQueryLoadByKey(result: TResultLoad, keys: TDataKey[], keyIdx: number, calback: () => void) {
    const key = keys.at(keyIdx)
    if (!key) {
        calback()
        return
    }

    const p = {
        fileName: undefined as string,
        fileSubdir: undefined as string,
        fileDir: undefined as string,
        fileFullName: undefined as string
    }

    try {
        p.fileName = handle.getFileFromKey(key)
    } catch (error) {
        result.error = (result.error ? ';' : '') + `on getFileFromKey(${key}) - ${error}`
        keyIdx++
        onQueryLoadByKey(result, keys, keyIdx, calback)
        return
    }

    try {
        p.fileSubdir = handle.getSubdirFromKey(key)
    } catch (error) {
        result.error = (result.error ? ';' : '') + `on getSubdirFromKey(${key}) - ${error}`
        keyIdx++
        onQueryLoadByKey(result, keys, keyIdx, calback)
        return
    }

    try {
        p.fileDir = path.join(env.workerData.dir.data, p.fileSubdir)
        p.fileFullName = path.join(p.fileDir, p.fileName)
    } catch (error) {
        result.error = (result.error ? ';' : '') + `on build dir - ${error}`
        keyIdx++
        onQueryLoadByKey(result, keys, keyIdx, calback)
        return
    }

    fs.stat(p.fileFullName, error => {
        if (error) {
            result.error = (result.error ? ';' : '') + `not exists file "${p.fileFullName}" - ${error}`
            keyIdx++
            onQueryLoadByKey(result, keys, keyIdx, calback)
            return
        }
        fs.readJSON(p.fileFullName, { encoding: 'utf8' }, (error, data: TData) => {
            if (error) {
                result.error = (result.error ? ';' : '') + `on read file "${p.fileFullName}" - ${error}`
                keyIdx++
                onQueryLoadByKey(result, keys, keyIdx, calback)
                return
            }
            if (!data.wrap.ddm) {
                result.stamp.push({
                    data: data,
                    position: {
                        file: p.fileName,
                        subdir: p.fileSubdir
                    }
                })
            }
            keyIdx++
            onQueryLoadByKey(result, keys, keyIdx, calback)
        })
    })
}

function onQueryLoadAll(result: TResultLoad, files: {fileFullName: string, subpath: string}[], fileIdx: number, calback: () => void) {
    const file = files.at(fileIdx)
    if (!file) {
        calback()
        return
    }

    fs.readJSON(file.fileFullName, { encoding: 'utf8' }, (error, data: TData) => {
        if (error) {
            result.error = (result.error ? ';' : '') + `on read file "${file.fileFullName}" - ${error}`
            fileIdx++
            onQueryLoadAll(result, files, fileIdx, calback)
            return
        }
        if (!data.wrap.ddm) {
            result.stamp.push({
                data: data,
                position: {
                    file: path.basename(file.fileFullName),
                    subdir: file.subpath
                }
            })
        }
        fileIdx++
        onQueryLoadAll(result, files, fileIdx, calback)
    })
}
