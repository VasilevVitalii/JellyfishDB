import * as vv from 'vv-common';
import * as path from 'path';
import * as fs from 'fs-extra';
import { TData, TResultDelete, TQueryDelete } from '../driverMaster';
import { handle, env } from '../driverWorker';

export function OnQueryDelete(result: TResultDelete<any>, query: TQueryDelete, calback: () => void) {
    const p = {
        dm: vv.dateFormat(new Date(), '126'),
        fileName: undefined as string,
        fileSubdir: undefined as string,
        fileDir: undefined as string,
        fileFullName: undefined as string
    };

    try {
        p.fileName = handle.getFileFromKey(query.key);
    } catch (error) {
        result.error = `on getFileFromKey(${query.key}) - ${error}`;
        calback();
        return;
    }

    try {
        p.fileSubdir = handle.getSubdirFromKey(query.key);
    } catch (error) {
        result.error = `on getSubdirFromKey(${query.key}) - ${error}`;
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

    fs.stat(p.fileFullName, error => {
        if (error) {
            result.error = `not exists file "${p.fileFullName}" - ${error}`;
            calback();
            return;
        }
        fs.readJSON(p.fileFullName, { encoding: 'utf8' }, (error, data: TData<any>) => {
            if (error) {
                result.error = `on read file "${p.fileFullName}" - ${error}`;
                calback();
                return;
            }
            try {
                data.wrap.ddm = p.dm;

                result.stamp = {
                    data: data,
                    position: {
                        file: p.fileName,
                        subdir: p.fileSubdir
                    }
                };

                fs.writeJSON(p.fileFullName, data, { encoding: 'utf8', spaces: `\t` }, error => {
                    if (error) {
                        result.error = `on write json "${p.fileFullName}" - ${error}`;
                    }
                    calback();
                });
            } catch (error) {
                result.error = `on delete - ${error}`;
                calback();
                return;
            }
        });
    });
}
