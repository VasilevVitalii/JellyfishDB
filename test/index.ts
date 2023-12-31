import * as vv from 'vv-common'
import * as path from 'path'
import * as fs from 'fs-extra'
import { GetDriver1 } from './driver1'
import { GetDriver2 } from './driver2'
import { GetDriver3 } from './driver3'
import { GetDriver4 } from './driver4'
import { DriverMaster, EnumQuery } from '../src'

export type TPerson = {key: string, login: string, email: string, country: string }
export type TPersonCache = {key: string, login: string, ddm: string }

export const personTestList: TPerson[] = [
    { key: null, login: 'peter', email: 'peter@gmail.com', country: null },
    { key: null, login: 'anna', email: 'anna@gmail.com', country: 'France' },
    { key: null, login: 'felix', email: null, country: 'Spain' },
    { key: null, login: null, email: 'unknown@gmail.com', country: null },
]

const dataDir = path.join(__dirname, '../../test/data')
fs.ensureDirSync(dataDir)
fs.emptyDirSync(dataDir)

const errors = [] as {driverIdx: number, err: Error}[]

const drivers = [
    //{driverIdx: 1, driver: GetDriver1(1, path.join(dataDir, 'driver1'), errors)},
    {driverIdx: 2, driver: GetDriver2(2, path.join(dataDir, 'driver2'), errors)},
    //{driverIdx: 3, driver: GetDriver3(3, path.join(dataDir, 'driver3'), errors)},
    //{driverIdx: 4, driver: GetDriver4(4, path.join(dataDir, 'driver4'), errors)},
] as {driverIdx: number, driver: DriverMaster<TPerson,TPersonCache>}[]

const tasks = [] as {driverIdx: number, key: string}[]

tasks.splice(0)
step1(() => {
    console.log('ok')
})

function step1(callback: () => void) {
    personTestList.forEach(p => {
        drivers.forEach(d => {
            tasks.push({driverIdx: d.driverIdx, key: d.driver.exec({kind: EnumQuery.insert, payLoad: p})})
        })
    })
    callback()
}

const t = new vv.Timer(5000, () => {
    console.log(errors)
})

// drivers.forEach(drivers => {
//     drivers.result()
// })

// deep1, cache, noredefine
// deep2, nocache, noredefine
// deep3, cache, redefine
// deep4, nocache, redefine