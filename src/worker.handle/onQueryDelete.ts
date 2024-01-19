import * as vv from 'vv-common';
import * as fs from 'fs-extra';
import { TResultDelete, TQueryDelete } from '../driverMaster';
import { GetStamp } from '.';

export function OnQueryDelete<TAbstractPayLoad>(result: TResultDelete<TAbstractPayLoad>, query: TQueryDelete, calback: () => void) {
    const dm = vv.dateFormat(new Date(), '126')

    GetStamp<TAbstractPayLoad>(query.key, {wrap: true, data: true})
        .then(res => {
            result.error = res.error
            result.stamp = res.stamp
            if (res.error) {
                calback()
                return
            }

            result.stamp.wrapStamp.wrap = result.stamp.wrapStamp.wrap ? {...result.stamp.wrapStamp.wrap, ddm: dm } : {fdm: null, ldm: null, ddm: dm}

            fs.writeJSON(result.stamp.wrapStamp.fileFullName, result.stamp.wrapStamp.wrap, { encoding: 'utf8', spaces: `\t` }, error => {
                if (error) {
                    result.error = `on write json "${result.stamp.wrapStamp.fileFullName}" - ${error}`;
                }
                calback()
            })
        })
        .catch(err => {
            result.error = `on FilePrepare(${query.key}) - ${err}`
            calback()
        })
}
