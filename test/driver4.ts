import { CreateDriver, DriverMaster } from '../src'
import {TPerson, TPersonCache} from './index'
import path from 'path'

export function GetDriver4 (driverIdx: number, dir: string, errors: {driverIdx: number, err: Error}[]): DriverMaster<TPerson,TPersonCache> {
    const dirDeep = 3
    const prefix = 'user-'
    const prefixLen = prefix.length
    console.log(`driver${driverIdx}: deep${dirDeep}, nocache, redefine`)
    const driver = CreateDriver<TPerson,TPersonCache>({
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