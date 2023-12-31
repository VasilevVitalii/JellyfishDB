import * as vv from 'vv-common'
import * as path from 'path'
import * as fs from 'fs-extra'
import { CreateDriver, EnumQuery } from '../src'

const dataDir = path.join(__dirname, '../../test/data')
fs.ensureDirSync(dataDir)

const dataPersonDir = path.join(dataDir, 'person')

type TPerson = {key: string, login: string, email: string, country: string }
type TPersonCache = {key: string, login: string, ddm: string }

const driver = CreateDriver<TPerson,TPersonCache>({
    generateKey: (keyRaw, payLoad) => {
        const key = `psn-${keyRaw}`
        payLoad.key = key
        return key
    },
    generateFileName: (keyRaw) => {
        return `psn-${keyRaw}.json`
    },
    getSubdirFromKey: (key) => {
        return path.join(...key.substring(4, 8).split(''))
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
    cacheDelete: (stamp, cache) => {
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
})

driver.connect({ dir: dataPersonDir })

const keys = [] as string[]

//keys.push(driver.exec({ kind: EnumQuery.insert, payLoad: { login: 'peter', email: 'peter@gmail.com' } }))
//keys.push(driver.exec({ kind: EnumQuery.insert, payLoad: { login: 'anna', email: 'anna@gmail.com' } }))
//keys.push(driver.exec({ kind: EnumQuery.insert, payLoad: { login: 'anna4', email: 'anna@gmail.com' } }))
//keys.push(driver.execOne({ kind: EnumQuery.update, key: 'psn-4067fe1a5c6f646f4e65a69de191fe81e317', payLoad: {country: 'Spb'} }))
//keys.push(driver.execOne({ kind: EnumQuery.delete, key: 'psn-4067fe1a5c6f646f4e65a69de191fe81e317' }))
//keys.push(driver.execOne({ kind: EnumQuery.load, key: ['psn-4067fe1a5c6f646f4e65a69de191fe81e317', 'psn-406701fe8a2d73da4797abe32824fdff7c6f'] }))

keys.push(driver.exec({ kind: EnumQuery.loadAll, target: 'cache' }))

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
        console.log(driver.cache)
    }
})

