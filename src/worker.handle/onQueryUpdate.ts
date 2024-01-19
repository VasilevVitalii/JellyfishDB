import * as path from 'path'
import * as vv from 'vv-common';
import * as fs from 'fs-extra';
import { TQueryUpdate, TResultUpdate } from '../driverMaster';
import { env, handle } from '../driverWorker';
import { GetStamp } from '.';

export function OnQueryUpdate<TAbstractPayLoad>(result: TResultUpdate<TAbstractPayLoad>, query: TQueryUpdate<TAbstractPayLoad>, calback: () => void) {
    const p = {
        dm: vv.dateFormat(new Date(), '126'),
        key: undefined as string
    }

    try {
        p.key = handle.getKeyFromPayload(query.payLoad)
    } catch (error) {
        result.error = `on getKeyFromPayload(${query.payLoad}) - ${error}`
        calback()
        return
    }

    if (vv.isEmpty(p.key)) {
        result.error = `key not found`
        calback()
        return
    }

    GetStamp<TAbstractPayLoad>(p.key, {wrap: true, data: true})
        .then(res => {
            result.error = res.error
            result.stamp = res.stamp
            if (res.error) {
                calback()
                return
            }

            result.stamp.wrapStamp.wrap = result.stamp.wrapStamp.wrap ? {...result.stamp.wrapStamp.wrap, ldm: p.dm } : {fdm: p.dm, ldm: p.dm, ddm: null}
            result.stamp.payLoadStamp.data = result.stamp.payLoadStamp.data ? {...result.stamp.payLoadStamp.data, ...query.payLoad} : query.payLoad

            const wrapDirFullName = path.join(env.workerData.dir.wrap, result.stamp.wrapStamp.fileSubdir)
            const dataDirFullName = path.join(env.workerData.dir.data, result.stamp.wrapStamp.fileSubdir)

            fs.ensureDir(wrapDirFullName, error => {
                if (error) {
                    result.error = `on ensure wrap dir "${wrapDirFullName}" - ${error}`;
                    calback()
                    return
                }
                fs.ensureDir(dataDirFullName, error => {
                    if (error) {
                        result.error = `on ensure data dir "${wrapDirFullName}" - ${error}`;
                        calback()
                        return
                    }
                    fs.writeJSON(result.stamp.wrapStamp.fileFullName, result.stamp.wrapStamp.wrap, { encoding: 'utf8', spaces: `\t` }, error => {
                        if (error) {
                            result.error = `on write json "${result.stamp.wrapStamp.fileFullName}" - ${error}`;
                            calback()
                            return
                        }
                        fs.writeJSON(result.stamp.payLoadStamp.fileFullName, result.stamp.payLoadStamp.data, { encoding: 'utf8', spaces: `\t` }, error => {
                            if (error) {
                                result.error = `on write json "${result.stamp.payLoadStamp.fileFullName}" - ${error}`
                                calback()
                                return
                            }
                            calback()
                        })
                    })
                })
            })
        })
        .catch(err => {
            result.error = `on FilePrepare(${p.key}) - ${err}`
            calback()
        })
}
