import * as vv from 'vv-common'
import * as path from 'path'
import * as fs from 'fs-extra'
import { DriverMaster, EnumQuery, EnumQueryTargetLoad, TQuery } from '../src'
import { CheckError, errors } from './errors'
import { CompareWhithPersonList as CompareWithPersonList, CompareWithStorage, TPerson, TPersonCache, personListTrue, personListStart } from './state'
import { GetDriver0 } from './driver0'
import { GetDriver1 } from './driver1'

export type TDriverList = {
    key: string,
    driver: DriverMaster<TPerson,TPersonCache>,
    deep: number,
    hasCache: boolean
}

const rootTestDataDir = path.join(__dirname, '../../test/data')
fs.ensureDirSync(rootTestDataDir)
fs.emptyDirSync(rootTestDataDir)

const drivers = [
    GetDriver0(rootTestDataDir),
    GetDriver1(rootTestDataDir),
] as TDriverList[]

CheckError('errors on connect:')

const tasks = [] as {driverIdx: number, taskKey: string, isUsed: boolean}[]
const resultPersonList = [] as {driverIdx: number, personList: TPerson[]}[]
const resultPersonLoadByKeyList = [] as {driverIdx: number, personList: TPerson[]}[]
const resultPersonLoadAllList = [] as {driverIdx: number, personList: TPerson[]}[]

step1(() => {
    CheckError('errors on step1:')
    step2(() => {
        CheckError('errors on step2:')
        step3(() => {
            CheckError('errors on step3:')
            step4(() => {
                CheckError('errors on step4:')
                stepStop()
            })
        })
    })
})

function step1(callback: () => void) {
    resultPersonList.splice(0)
    tasks.splice(0)
    personListStart.forEach(p => {
        drivers.forEach((d, idx) => {
            tasks.push({
                driverIdx: idx,
                taskKey: d.driver.exec({kind: EnumQuery.insert, payLoad: p}),
                isUsed: false
            })
        })
    })
    collectTask(1, false, callback)
}

function step2(callback: () => void) {
    resultPersonList.splice(0)
    tasks.splice(0)
    const pl = personListTrue.find(f => f.step === 1).list
    const queryList = [] as TQuery<TPerson>[]

    const item0 = pl.find(f => f.login === 'peter')
    queryList.push({kind: EnumQuery.update, payLoad: item0})
    const item1 = pl.find(f => f.login === 'anna')
    queryList.push({kind: EnumQuery.update, payLoad: {...item1, country: null}})
    const item2 = pl.find(f => f.login === 'felix')
    queryList.push({kind: EnumQuery.update, payLoad: {...item2, country: 'Finland'}})
    const item3 = pl.find(f => f.login === null)
    queryList.push({kind: EnumQuery.update, payLoad: {...item3, login: 'alex', email: 'alex@gmail.com', country: 'Japan'}})

    queryList.forEach(q => {
        drivers.forEach((d, idx) => {
            tasks.push({
                driverIdx: idx,
                taskKey: d.driver.exec(q),
                isUsed: false
            })
        })
    })
    collectTask(2, false, callback)
}

function step3(callback: () => void) {
    resultPersonList.splice(0)
    tasks.splice(0)
    const pl = personListTrue.find(f => f.step === 2).list
    const queryList = [] as TQuery<TPerson>[]

    const item0 = pl.find(f => f.login === 'peter')
    drivers.forEach((d, idx) => {
        tasks.push({
            driverIdx: idx,
            taskKey: d.driver.exec({kind: EnumQuery.delete, key: item0.key}),
            isUsed: false
        })
    })
    const item1 = pl.find(f => f.login === 'anna')
    queryList.push({kind: EnumQuery.update, payLoad: item1})
    const item2 = pl.find(f => f.login === 'felix')
    queryList.push({kind: EnumQuery.update, payLoad: item2})
    const item3 = pl.find(f => f.login === 'alex')
    queryList.push({kind: EnumQuery.update, payLoad: item3})

    queryList.forEach(q => {
        drivers.forEach((d, idx) => {
            tasks.push({
                driverIdx: idx,
                taskKey: d.driver.exec(q),
                isUsed: false
            })
        })
    })
    collectTask(3, false, callback)
}

function step4(callback: () => void) {
    resultPersonList.splice(0)
    tasks.splice(0)
    drivers.forEach((d, idx) => {
        tasks.push({
            driverIdx: idx,
            taskKey: d.driver.exec({kind: EnumQuery.shrink}),
            isUsed: false
        })
    })
    collectTask(4, false, callback)
}

function stepStop() {
    drivers.forEach((d, idx) => {
        console.log(`STOPPING DRIVER${idx}...`)
        d.driver.disconnect(() => {
            console.log(`STOP DRIVER${idx}`)
        })
    })
}

function collectTask(stepIdx: number, checkLoad: boolean, callback: () => void) {
    if (checkLoad) {
        resultPersonLoadAllList.splice(0)
        resultPersonLoadByKeyList.splice(0)

        drivers.forEach((d, idx) => {
            tasks.push({
                driverIdx: idx,
                taskKey: d.driver.exec({kind: EnumQuery.loadAll, target: EnumQueryTargetLoad.my}),
                isUsed: false
            })

            personListTrue.find(f => f.step === stepIdx).list.forEach(item => {
                tasks.push({
                    driverIdx: idx,
                    taskKey: d.driver.exec({kind: EnumQuery.loadByKey, key: item.key}),
                    isUsed: false
                })
            })
        })
    }

    const wait = new vv.Timer(200, () => {
        const tasksNonUsed = tasks.filter(f => !f.isUsed)
        if (tasksNonUsed.length <= 0) {

            if (checkLoad) {
                resultPersonLoadAllList.forEach(res => {
                    const d = drivers[res.driverIdx]
                    const listTrue = personListTrue.find(f => f.step === stepIdx).list
                    if (!CompareWithPersonList(listTrue, res.personList)) {
                        errors.push({driverKey: d.key, err: `step${stepIdx}, bad CompareWhithPersonList (load all)`})
                    }
                })
                resultPersonLoadByKeyList.forEach(res => {
                    const d = drivers[res.driverIdx]
                    const listTrue = personListTrue.find(f => f.step === stepIdx).list
                    if (!CompareWithPersonList(listTrue, res.personList)) {
                        errors.push({driverKey: d.key, err: `step${stepIdx}, bad CompareWhithPersonList (load by key)`})
                    }
                })

                callback()
            } else {
                resultPersonList.forEach(res => {
                    const d = drivers[res.driverIdx]
                    const listTrue = personListTrue.find(f => f.step === stepIdx).list
                    if (!CompareWithPersonList(listTrue, res.personList)) {
                        errors.push({driverKey: d.key, err: `step${stepIdx}, bad CompareWhithPersonList`})
                    }
                    if (!CompareWithStorage(listTrue, path.join(d.driver.param.dir, 'data'), path.join(d.driver.param.dir, 'wrap'), d.deep)) {
                        errors.push({driverKey: d.key, err: `step${stepIdx}, bad CompareWithStorage`})
                    }
                })
                const listCache1 = personListTrue.find(f => f.step === stepIdx).list.map(m => { return {key: m.key, login: m.login} })
                drivers.filter(f => f.hasCache).forEach(d => {
                    const listCache2 = d.driver.cache.filter(f => !f.ddm).map(m => { return {key: m.key, login: m.login} })
                    if (!CompareWithPersonList(listCache1 as any[], listCache2 as any[])) {
                        errors.push({driverKey: d.key, err: `step${stepIdx}, bad CompareWhithPersonList (cache)`})
                    }
                })

                collectTask(stepIdx, true, callback)
            }
        } else {
            tasksNonUsed.forEach(t => {
                const d = drivers[t.driverIdx]
                const result = d.driver.result(t.taskKey)
                if (!result) {
                    return
                }
                if (result?.error) {
                    errors.push({driverKey: d.key, err: result.error})
                } else if (result?.kind === EnumQuery.insert || result?.kind === EnumQuery.update) {
                    const s = resultPersonList.find(f => f.driverIdx === t.driverIdx)
                    if (s) {
                        s.personList.push(result.stamp.payLoadStamp.data)
                    } else {
                        resultPersonList.push({driverIdx: t.driverIdx, personList: [result.stamp.payLoadStamp.data]})
                    }
                } else if (result?.kind === EnumQuery.loadAll) {
                    resultPersonLoadAllList.push({driverIdx: t.driverIdx, personList: result.stamp.filter(f => !f.wrapStamp.wrap.ddm).map(m => {return m.payLoadStamp.data})})
                } else if (result?.kind === EnumQuery.loadByKey) {
                    const s = resultPersonLoadByKeyList.find(f => f.driverIdx === t.driverIdx)
                    if (s) {
                        s.personList.push(...result.stamp.filter(f => f.payLoadStamp.data).map(m => { return m.payLoadStamp.data }))
                    } else {
                        resultPersonLoadByKeyList.push({driverIdx: t.driverIdx, personList: [...result.stamp.filter(f => f.payLoadStamp.data).map(m => { return m.payLoadStamp.data })]})
                    }
                }
                t.isUsed = true
            })
            wait.nextTick(200)
        }
    })
}

// drivers.forEach(drivers => {
//     drivers.result()
// })

// deep1, cache, noredefine
// deep2, nocache, noredefine
// deep3, cache, redefine
// deep4, nocache, redefine