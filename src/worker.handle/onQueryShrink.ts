import * as vv from 'vv-common';
import * as path from 'path';
import * as fs from 'fs-extra';
import { TDataWrap, TResultShrink } from '../driverMaster';
import { env } from '../driverWorker';

export function OnQueryShrink(result: TResultShrink, calback: () => void) {
    vv.dir(env.workerData.dir.wrap, { mode: 'files' }, (error, resultDir) => {
        if (error) {
            result.error = `on build file list - ${error}`
            calback()
            return
        }
        const errorList = [] as string[]
        const fileList = resultDir.map(m => { return path.join(m.path, m.file) })
        checkWrap(fileList, errorList, () => {
            if (errorList.length > 0) {
                result.error = errorList.join(';')
            }
            calback()
        })
    })
}

function checkWrap (
    fileList: string[],
    errorList: string[],
    calback: () => void
) {
    const wrapFile = fileList.shift()
    if (!wrapFile) {
        calback()
        return
    }
    fs.readJSON(wrapFile, {encoding: 'utf8'}, (err, data: TDataWrap) => {
        if (err) {
            errorList.push(`on read file "${wrapFile}": ${err}`)
            checkWrap(fileList, errorList, calback)
            return
        }
        if (vv.isEmpty(data?.ddm)) {
            checkWrap(fileList, errorList, calback)
            return
        }

        const fp = path.parse(wrapFile)
        const dataFile = path.join(env.workerData.dir.data, fp.dir.substring(env.workerData.dir.wrap.length), fp.base.substring(5))

        fs.unlink(wrapFile, err => {
            if (err) {
                errorList.push(`on delete file "${wrapFile}": ${err}`)
            }
            fs.unlink(dataFile, err => {
                if (err) {
                    errorList.push(`on delete file "${dataFile}": ${err}`)
                }
                checkWrap(fileList, errorList, calback)
            })
        })
    })
}