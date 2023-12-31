import * as path from 'path';
import * as fs from 'fs-extra';
import { TData, TQueryLoadByKey, TResultLoadByKey } from '../driverMaster';
import { TDataKey } from '..';
import { handle, env } from '../driverWorker';

export function OnQueryLoadByKey(result: TResultLoadByKey<any>, query: TQueryLoadByKey, calback: () => void) {
    result.stamp = []
    onQueryLoadByKeyInternal(result, Array.isArray(query.key) ? query.key : [query.key], 0, () => {
        calback()
        return
    })
}

function onQueryLoadByKeyInternal(result: TResultLoadByKey<any>, keys: TDataKey[], keyIdx: number, calback: () => void) {
    const key = keys.at(keyIdx);
    if (!key) {
        calback();
        return;
    }

    const p = {
        fileName: undefined as string,
        fileSubdir: undefined as string,
        fileDir: undefined as string,
        fileFullName: undefined as string
    };

    try {
        p.fileName = handle.getFileFromKey(key);
    } catch (error) {
        result.error = (result.error ? ';' : '') + `on getFileFromKey(${key}) - ${error}`;
        keyIdx++;
        onQueryLoadByKeyInternal(result, keys, keyIdx, calback);
        return;
    }

    try {
        p.fileSubdir = handle.getSubdirFromKey(key);
    } catch (error) {
        result.error = (result.error ? ';' : '') + `on getSubdirFromKey(${key}) - ${error}`;
        keyIdx++;
        onQueryLoadByKeyInternal(result, keys, keyIdx, calback);
        return;
    }

    try {
        p.fileDir = path.join(env.workerData.dir.data, p.fileSubdir);
        p.fileFullName = path.join(p.fileDir, p.fileName);
    } catch (error) {
        result.error = (result.error ? ';' : '') + `on build dir - ${error}`;
        keyIdx++;
        onQueryLoadByKeyInternal(result, keys, keyIdx, calback);
        return;
    }

    fs.stat(p.fileFullName, error => {
        if (error) {
            result.error = (result.error ? ';' : '') + `not exists file "${p.fileFullName}" - ${error}`;
            keyIdx++;
            onQueryLoadByKeyInternal(result, keys, keyIdx, calback);
            return;
        }
        fs.readJSON(p.fileFullName, { encoding: 'utf8' }, (error, data: TData<any>) => {
            if (error) {
                result.error = (result.error ? ';' : '') + `on read file "${p.fileFullName}" - ${error}`;
                keyIdx++;
                onQueryLoadByKeyInternal(result, keys, keyIdx, calback);
                return;
            }
            if (!data.wrap.ddm) {
                result.stamp.push({
                    data: data,
                    position: {
                        file: p.fileName,
                        subdir: p.fileSubdir
                    }
                });
            }
            keyIdx++;
            onQueryLoadByKeyInternal(result, keys, keyIdx, calback);
        });
    });
}
