import * as fs from 'fs-extra';
import * as path from 'path';
import * as vv from 'vv-common';
import { TData, TQueryShrink, TResult, TResultShrink } from '../driverMaster';
import { handle, env } from '../driverWorker';

export function OnQueryShrink(result: TResultShrink, query: TQueryShrink, calback: (result: TResult<any>) => void) {
    vv.dir(env.workerData.dir.data, { mode: 'files' }, (error, resultDir) => {
        if (error) {
            result.error = `on build file list - ${error}`
            calback(result as TResult<any>)
            return
        }
        onQueryShrinkInternal(result, resultDir.filter(f => handle.getSubdirVerify(f.subpath) === true).map(m => {
            return {
                fileFullName: path.join(m.path, m.file),
                subpath: m.subpath
            }
        }), 0, () => {
            calback(result as TResult<any>)
            return
        })
    })
}

function onQueryShrinkInternal(result: TResultShrink, files: { fileFullName: string; subpath: string; }[], fileIdx: number, calback: () => void) {
    const file = files.at(fileIdx);
    if (!file) {
        calback();
        return;
    }

    fs.readJSON(file.fileFullName, { encoding: 'utf8' }, (error, data: TData<any>) => {
        if (error) {
            result.error = (result.error ? ';' : '') + `on read file "${file.fileFullName}" - ${error}`;
            fileIdx++;
            onQueryShrinkInternal(result, files, fileIdx, calback);
            return;
        }
        if (!data.wrap.ddm) {
            fileIdx++;
            onQueryShrinkInternal(result, files, fileIdx, calback);
            return;
        }
        fs.remove(file.fileFullName, error => {
            if (error) {
                result.error = (result.error ? ';' : '') + `on remove file "${file.fileFullName}" - ${error}`;
            }
            fileIdx++;
            onQueryShrinkInternal(result, files, fileIdx, calback);
        });
    });
}
