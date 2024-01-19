import path from 'path'
import { CreateDriver } from '../src'
import { TPerson, TPersonCache } from './state'
import { errors } from './errors'
import { TDriverList } from '.'

export function GetDriver1 (rootTestDataDir: string): TDriverList {
    const driverKey = 'driver1'
    const dir = path.join(rootTestDataDir, driverKey)
    const dirDeep = 3
    console.log(`${driverKey}: deep${dirDeep}, cache`)
    const driver = CreateDriver<TPerson,TPersonCache>({
        getKeyFromPayload(payLoad) {
            return payLoad.key
        },
        setKeyToPayload(payLoad, keyDefault) {
            payLoad.key = keyDefault
            return keyDefault
        },
        cache: {
            onDelete(stamp, cache) {
                const fnd = cache.find(f => f.key === stamp.payLoadStamp.data.key)
                if (fnd) {
                    fnd.ddm = stamp.wrapStamp.wrap.ddm
                }
            },
            onShrink: (cache) => {
                let fndIdx = cache.findIndex(f => f.ddm)
                while (fndIdx >= 0) {
                    cache.splice(fndIdx, 1)
                    fndIdx = cache.findIndex(f => f.ddm)
                }
            },
            onInsert: (stamp, cache) => {
                cache.push({ login: stamp.payLoadStamp.data.login, key: stamp.payLoadStamp.data.key, ddm: stamp.wrapStamp.wrap.ddm })
            },
            onUpdate: (stamp, cache) => {
                const fnd = cache.find(f => f.key === stamp.payLoadStamp.data.key)
                if (fnd) {
                    fnd.login = stamp.payLoadStamp.data.login
                    fnd.ddm = stamp.wrapStamp.wrap.ddm
                } else {
                    cache.push({ login: stamp.payLoadStamp.data.login, key: stamp.payLoadStamp.data.key, ddm: stamp.wrapStamp.wrap.ddm })
                }
            },
        },
        getFileSubdirFromKey(key) {
            const pathPart = key.substring(4, 7)
            return path.join(...pathPart)
        },
    })
    driver.connect({dir}, (err) => {errors.push({driverKey, err})})
    return {key: driverKey, driver, deep: dirDeep, hasCache: true}
}