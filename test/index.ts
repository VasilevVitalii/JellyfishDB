import * as vv from 'vv-common'
import path from 'path'
import * as fs from 'fs-extra'
import { DriverMaster, EnumQuery } from '../src/driverMaster'

const dataDir = path.join(__dirname, '../../test/data')
fs.ensureDirSync(dataDir)

const dataPersonDir = path.join(dataDir, 'person')

const driver = new DriverMaster({
    generateKey (keyRaw?: string, payLoad?: any) {
        return keyRaw
    }
})

driver.connect({ dir: dataPersonDir })

const keys = [] as string[]

keys.push(driver.execOne({ kind: EnumQuery.insert, payLoad: { login: 'peter', email: 'peter@gmail.com' } }))
keys.push(driver.execOne({ kind: EnumQuery.insert, payLoad: { login: 'anna', email: 'anna@gmail.com' } }))

const t = new vv.Timer(50, () => {
    if (keys.length > 0) {
        const key = keys[0]
        const result = driver.checkResult(key)
        if (result) {
            console.log(result)
            keys.splice(0,1)
        }
    } else {
        console.log('empty!!!')
    }
    t.nextTick(50)
})
