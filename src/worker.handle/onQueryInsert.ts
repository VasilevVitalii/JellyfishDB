import * as vv from 'vv-common';
import * as path from 'path';
import * as fs from 'fs-extra';
import { TData, TQueryInsert, TResultInsert } from '../driverMaster';
import { handle, env } from '../driverWorker';

export function OnQueryInsert(result: TResultInsert<any>, query: TQueryInsert<any>, calback: () => void) {
    const p = {
        dm: vv.dateFormat(new Date(), '126'),
        gkey: undefined as { keyRaw: string; key: string; },
        fileName: undefined as string,
        fileSubdir: undefined as string,
        fileDir: undefined as string,
        fileFullName: undefined as string
    };

    try {
        p.gkey = handle.generateKey(query.payLoad);
    } catch (error) {
        result.error = `on generateKey(${query.payLoad}) - ${error}`;
        calback();
        return;
    }

    try {
        p.fileName = handle.generateFileName(p.gkey.keyRaw, query.payLoad);
    } catch (error) {
        result.error = `on generateFileName(${p.gkey.keyRaw}, ${query.payLoad}) - ${error}`;
        calback();
        return;
    }

    try {
        p.fileSubdir = handle.generateFileSubdir(p.gkey.keyRaw, query.payLoad);
    } catch (error) {
        result.error = `on generateFileSubdir(${p.gkey.keyRaw}, ${query.payLoad}) - ${error}`;
        calback();
        return;
    }

    try {
        p.fileDir = path.join(env.workerData.dir.data, p.fileSubdir);
        p.fileFullName = path.join(p.fileDir, p.fileName);
    } catch (error) {
        result.error = `on build dir - ${error}`;
        calback();
        return;
    }

    const data: TData<any> = {
        wrap: {
            key: p.gkey.key,
            fdm: p.dm,
            ldm: p.dm,
            ddm: "",
        },
        payload: query.payLoad
    }

    result.stamp = {
        data: data,
        position: {
            file: p.fileName,
            subdir: p.fileSubdir
        }
    }

    fs.ensureDir(p.fileDir, error => {
        if (error) {
            result.error = `on ensure dir "${p.fileDir}" - ${error}`;
            calback();
            return;
        }
        fs.writeJSON(p.fileFullName, data, { encoding: 'utf8', spaces: `\t` }, error => {
            if (error) {
                result.error = `on write json "${p.fileFullName}" - ${error}`;
            }
            calback();
        });
    });
}
