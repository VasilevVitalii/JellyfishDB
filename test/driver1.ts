import { CreateDriver, DriverMaster } from '../src'
import {TPerson, TPersonCache} from './index'

export function GetDriver1 (driverIdx: number, dir: string, errors: {driverIdx: number, err: Error}[]): DriverMaster<TPerson,TPersonCache> {
    const dirDeep = 1
    console.log(`driver${driverIdx}: deep${dirDeep}, cache, noredefine`)
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
    })
    driver.connect({dir, dirDeep}, (err) => {errors.push({driverIdx, err})})
    return driver
}