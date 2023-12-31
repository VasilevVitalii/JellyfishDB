import * as vv from 'vv-common';
import * as path from 'path';
import * as fs from 'fs-extra';
import { TData, TResultLoadAll } from '../driverMaster';
import { handle, env } from '../driverWorker';

export function OnQueryLoadAll(result: TResultLoadAll<any>, calback: () => void) {
    result.stamp = []
    vv.dir(env.workerData.dir.data, { mode: 'files' }, (error, resultDir) => {
        if (error) {
            result.error = `on build file list - ${error}`
            calback()
            return
        }
        onQueryLoadAllInternal(result, resultDir.filter(f => handle.getSubdirVerify(f.subpath) === true).map(m => {
            return {
                fileFullName: path.join(m.path, m.file),
                subpath: m.subpath
            }
        }), 0, () => {
            calback()
            return
        })
    })
}

function onQueryLoadAllInternal(result: TResultLoadAll<any>, files: { fileFullName: string; subpath: string; }[], fileIdx: number, calback: () => void) {
    const file = files.at(fileIdx);
    if (!file) {
        calback();
        return;
    }

    fs.readJSON(file.fileFullName, { encoding: 'utf8' }, (error, data: TData<any>) => {
        if (error) {
            result.error = (result.error ? ';' : '') + `on read file "${file.fileFullName}" - ${error}`;
            fileIdx++;
            onQueryLoadAllInternal(result, files, fileIdx, calback);
            return;
        }
        result.stamp.push({
            data: data,
            position: {
                file: path.basename(file.fileFullName),
                subdir: file.subpath
            }
        });
        fileIdx++;
        onQueryLoadAllInternal(result, files, fileIdx, calback);
    });
}
