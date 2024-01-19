import * as vv from 'vv-common';
import * as path from 'path';
import * as fs from 'fs-extra';
import { TResultLoadAll, TStamp } from '../driverMaster';
import { handle, env } from '../driverWorker';
import { GetStamp } from '.';

export function OnQueryLoadAll<TAbstractPayLoad>(result: TResultLoadAll<TAbstractPayLoad>, calback: () => void) {
    result.stamp = []

    vv.dir(env.workerData.dir.data, { mode: 'files' }, (error, resultDir) => {
        if (error) {
            result.error = `on build file list - ${error}`
            calback()
            return
        }

        const errorList = [] as string[]
        const fileList = resultDir.map(m => { return path.join(m.path, m.file) })
        const keyList = [] as string[]
        const stampList = [] as TStamp<TAbstractPayLoad>[]

        readAllPayLoadFiles(fileList, keyList, errorList, () => {
            GetStampList(keyList, stampList, errorList, () => {
                if (errorList.length > 0) {
                    result.error = errorList.join(';')
                } else {
                    result.stamp = stampList
                }
                calback()
            })
        })
    })
}

function readAllPayLoadFiles (
    fileList: string[],
    keyList: string[],
    errorList: string[],
    calback: () => void
) {
    const chunkList = fileList.splice(0, 10)
    const promiseList = []
    chunkList.forEach(item => {
        promiseList.push(
            fs.readJSON(item, { encoding: 'utf8' })
                .then(data => {
                    try {
                        const key = handle.getKeyFromPayload(data)
                        if (vv.isEmpty(key)) {
                            errorList.push(`empty key in file ${item}`)
                        } else {
                            keyList.push(key)
                        }
                    } catch (err) {
                        errorList.push(`on getKeyFromPayload(${data}) - ${err}`)
                    }
                })
                .catch(err => {
                    errorList.push(`on load file ${item}: ${err}`)
                })
        )
    })

    Promise.allSettled(promiseList).then(() => {
        if (fileList.length > 0) {
            readAllPayLoadFiles(fileList, keyList, errorList, calback)
        } else {
            calback()
        }
    })
}

export function GetStampList<TAbstractPayLoad> (
    keyList: string[],
    stampList: TStamp<TAbstractPayLoad>[],
    errorList: string[],
    calback: () => void
) {
    const chunkList = keyList.splice(0, 10)
    const promiseList = []
    chunkList.forEach(item => {
        promiseList.push(
            GetStamp<TAbstractPayLoad>(item, {wrap: true, data: true})
                .then(data => {
                    if (data.error) {
                        errorList.push(`on GetStamp(${item}): ${data.error}`)
                    } else {
                        stampList.push(data.stamp)
                    }
                })
                .catch(err => {
                    errorList.push(`on GetStamp(${item}): ${err}`)
                })
        )
    })

    Promise.allSettled(promiseList).then(() => {
        if (chunkList.length > 0) {
            GetStampList(keyList, stampList, errorList, calback)
        } else {
            calback()
        }
    })
}
