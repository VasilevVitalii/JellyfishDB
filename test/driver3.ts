import { CreateDriver, DriverMaster } from '../src'
import {TPerson, TPersonCache} from './index'
import path from 'path'

export function GetDriver3 (driverIdx: number, dir: string, errors: {driverIdx: number, err: Error}[]): DriverMaster<TPerson,TPersonCache> {
    const dirDeep = 3
    const prefix = 'psn-'
    const prefixLen = prefix.length
    console.log(`driver${driverIdx}: deep${dirDeep}, cache, redefine`)
    const driver = CreateDriver<TPerson,TPersonCache>({
        cacheDelete(stamp, cache) {
            const fnd = cache.find(f => f.key === stamp.data.payload.key)
            if (fnd) {
                fnd.ddm = stamp.data.wrap.ddm
            }
        },
        cacheShrink: (cache) => {
            let fndIdx = cache.findIndex(f => f.ddm)
            while (fndIdx >= 0) {
                cache.splice(fndIdx, 1)
                fndIdx = cache.findIndex(f => f.ddm)
            }
        },
        cacheInsert: (stamp, cache) => {
            cache.push({ login: stamp.data.payload.login, key: stamp.data.payload.key, ddm: stamp.data.wrap.ddm })
        },
        cacheUpdate: (stamp, cache) => {
            const fnd = cache.find(f => f.key === stamp.data.payload.key)
            if (fnd) {
                fnd.login = stamp.data.payload.login
                fnd.ddm = stamp.data.wrap.ddm
            } else {
                cache.push({ login: stamp.data.payload.login, key: stamp.data.payload.key, ddm: stamp.data.wrap.ddm })
            }
        },
        generateKey: (keyRaw, payLoad) => {
            const key = `${prefix}${keyRaw}`
            payLoad.key = key
            return key
        },
        generateFileName: (keyRaw) => {
            return `${prefix}${keyRaw}.json`
        },
        getSubdirFromKey: (key) => {
            return path.join(...key.substring(prefixLen, prefixLen + dirDeep).split(''))
        },
    })
    driver.connect({dir, dirDeep}, (err) => {errors.push({driverIdx, err})})
    return driver
}