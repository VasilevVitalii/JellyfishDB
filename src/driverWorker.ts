import { workerData, parentPort } from 'worker_threads'
import * as vv from 'vv-common'
import path from 'path'
import fs, { exists } from 'fs-extra'
import { EnumConcurrency, EnumQuery, TData, TDataKey, TQuery, TQueryInsert, TQueryKey, TQueryUpdate, TResult, TResultInsert, TResultTemplate, TResultUpdate } from './driverMaster'
import { NumeratorUuid } from './numerator'

export type TDriverWorkerData = {
    dir: {
        data: string,
        index: string,
        process: string,
    },
    concurrency: EnumConcurrency,
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

const handle = {
    generateKey: env.workerData.handle.generateKey
        ? ((payLoad?: any) => {
            const sf = `function ${env.workerData.handle.generateKey.substring(env.workerData.handle.generateKey.indexOf('('))}`
            const f = new Function(`return ${sf}`)()
            return f(env.uuid.getId(), payLoad) as { keyRaw: TDataKey, key: TDataKey }
        })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        : ((payLoad?: any) => {
            const keyRaw = env.uuid.getId()
            return { keyRaw: env.uuid.getId(), key: keyRaw }
        }),
    generateFileName: env.workerData.handle.generateFileName
        ? ((key?: TDataKey, payLoad?: any) => {
            const sf = `function ${env.workerData.handle.generateFileName.substring(env.workerData.handle.generateKey.indexOf('('))}`
            const f = new Function(`return ${sf}`)()
            return f(key, payLoad) as string
        })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        : ((key?: TDataKey, payLoad?: any) => {
            return `${key}.json` as string
        }),
    generateFileSubdir: env.workerData.handle.generateFileSubdir
        ? ((key?: TDataKey, payLoad?: any) => {
            const sf = `function ${env.workerData.handle.generateFileSubdir.substring(env.workerData.handle.generateKey.indexOf('('))}`
            const f = new Function(`return ${sf}`)()
            return f(key, payLoad) as string
        })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        : ((key?: TDataKey, payLoad?: any) => {
            return path.join(...key.substring(0, 4)) as string
        }),
    getFileFromKey: env.workerData.handle.getFileFromKey
    ? ((key: TDataKey) => {
        const sf = `function ${env.workerData.handle.getFileFromKey.substring(env.workerData.handle.generateKey.indexOf('('))}`
        const f = new Function(`return ${sf}`)()
        return f(key) as string
    })
    : ((key: TDataKey) => {
        return `${key}.json` as string
    }),
    getSubdirFromKey: env.workerData.handle.getSubdirFromKey
    ? ((key: TDataKey) => {
        const sf = `function ${env.workerData.handle.getSubdirFromKey.substring(env.workerData.handle.generateKey.indexOf('('))}`
        const f = new Function(`return ${sf}`)()
        return f(key) as string
    })
    : ((key: TDataKey) => {
        return path.join(...key.substring(0, 4)) as string
    }),
    queryQueueProcess: (calback: () => void) => {
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
                handle.queryQueueProcess(calback)
            })
        } else if (queryQueue.query.kind === EnumQuery.update) {
            onQueryUpdate(result as TResultUpdate, queryQueue.query, (result) => {
                result.key = queryQueue.queueKey
                parentPort.postMessage(result)
                handle.queryQueueProcess(calback)
            })
        } else {
            result.error = `unknown kind "${queryQueue.query.kind}"`
            parentPort.postMessage(result as TResult)
            handle.queryQueueProcess(calback)
        }
    }
}

parentPort.on('message', (message: { queueKey: TQueryKey, query: TQuery }) => {
    env.queryQueue.push(message)
})

const timer = new vv.Timer(50, () => {
    handle.queryQueueProcess(() => {
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




