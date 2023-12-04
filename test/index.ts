import * as vv from 'vv-common'
import * as path from 'path'
import * as fs from 'fs-extra'
import { CreateDriver, EnumQuery, TDataKey } from '../src'

const dataDir = path.join(__dirname, '../../test/data')
fs.ensureDirSync(dataDir)

const dataPersonDir = path.join(dataDir, 'person')

const driver = CreateDriver({
    generateKey: (keyRaw?: string, payLoad?: any) => {
        const key = `psn-${keyRaw}`
        payLoad.key = key
        return key
    },
    generateFileName: (keyRaw: TDataKey) => {
        return `psn-${keyRaw}.json`
    },
    // getFileFromKey: (key: TDataKey) => {
    //     return `${key.substring(4)}.json`
    // },
    getSubdirFromKey: (key: TDataKey) => {
        return path.join(...key.substring(4, 8).split(''))
    },
    cacheInsert(payLoad: any, cache: any[]) {
        cache.push({ login: payLoad?.login, key: payLoad?.key })
    },
    cacheUpdate(payLoad: any, cache: any[]) {
        const fnd = cache.find(f => f.key === payLoad.key)
        if (fnd) {
            fnd.login = payLoad?.login
        } else {
            cache.push({ login: payLoad?.login, key: payLoad?.key })
        }
    }
})

driver.connect({ dir: dataPersonDir })

const keys = [] as string[]

//keys.push(driver.execOne({ kind: EnumQuery.insert, payLoad: { login: 'peter', email: 'peter@gmail.com' } }))
//keys.push(driver.execOne({ kind: EnumQuery.insert, payLoad: { login: 'anna', email: 'anna@gmail.com' } }))
//keys.push(driver.execOne({ kind: EnumQuery.insert, payLoad: { login: 'anna4', email: 'anna@gmail.com' } }))
//keys.push(driver.execOne({ kind: EnumQuery.update, key: 'psn-4067fe1a5c6f646f4e65a69de191fe81e317', payLoad: {country: 'Spb'} }))
//keys.push(driver.execOne({ kind: EnumQuery.delete, key: 'psn-4067fe1a5c6f646f4e65a69de191fe81e317' }))
//keys.push(driver.execOne({ kind: EnumQuery.load, key: ['psn-4067fe1a5c6f646f4e65a69de191fe81e317', 'psn-406701fe8a2d73da4797abe32824fdff7c6f'] }))

keys.push(driver.exec({ kind: EnumQuery.load, key: 'all' }))

const t = new vv.Timer(50, () => {
    if (keys.length > 0) {
        const key = keys[0]
        const result = driver.result(key)
        if (result) {
            console.log(result)
            keys.splice(0, 1)
        }
        t.nextTick(50)
    } else {
        console.log('empty!!!')
    }
})

