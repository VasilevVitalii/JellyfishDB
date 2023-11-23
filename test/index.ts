import * as vv from 'vv-common'
import path from 'path'
import * as fs from 'fs-extra'
import { DriverMaster, EnumQuery } from '../src/driverMaster'


const dataDir = path.join(__dirname, '../../test/data')
fs.ensureDirSync(dataDir)

const dataPersonDir = path.join(dataDir, 'person')

const driver = new DriverMaster({
    generateKey (keyRaw?: string, payLoad?: any) {
        const key = `psn-${keyRaw}`
        payLoad.key = key
        return {keyRaw, key}
    },
    getFileFromKey(key: string) {
        return key.substring(4)
    },
    getSubdirFromKey(key: string) {
        return path.join(...key.substring(4, 8)) as string
    },
})

driver.connect({ dir: dataPersonDir })

const keys = [] as string[]

// keys.push(driver.execOne({ kind: EnumQuery.insert, payLoad: { login: 'peter', email: 'peter@gmail.com' } }))
// keys.push(driver.execOne({ kind: EnumQuery.insert, payLoad: { login: 'anna', email: 'anna@gmail.com' } }))

keys.push(driver.execOne({ kind: EnumQuery.update, key: 'psn-1414bd8f24aca7134532b5c6693f1a633a45', payLoad: {country: 'Spb'} }))

const t = new vv.Timer(50, () => {
    if (keys.length > 0) {
        const key = keys[0]
        const result = driver.checkResult(key)
        if (result) {
            console.log(result)
            keys.splice(0,1)
        }
        t.nextTick(50)
    } else {
        console.log('empty!!!')
    }
})
