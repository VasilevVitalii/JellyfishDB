import path from 'path'
import { CreateDriver } from '../src'
import { TPerson, TPersonCache } from './state'
import { errors } from './errors'
import { TDriverList } from '.'

export function GetDriver0 (rootTestDataDir: string): TDriverList {
    const driverKey = 'driver0'
    const dir = path.join(rootTestDataDir, driverKey)
    const dirDeep = 0
    console.log(`${driverKey}: deep${dirDeep}, nocache`)
    const driver = CreateDriver<TPerson,TPersonCache>({
        getKeyFromPayload(payLoad) {
            return payLoad.key
        },
        setKeyToPayload(payLoad, keyDefault) {
            payLoad.key = keyDefault
            return keyDefault
        }
    })
    driver.connect({dir}, (err) => {
        errors.push({driverKey, err})
    })
    return {key: driverKey, driver, deep: dirDeep, hasCache: false}
}