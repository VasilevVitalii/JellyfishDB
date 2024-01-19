import path from 'path'
import fs from 'fs'
import * as vv from 'vv-common'
import { CreateGeneratorId } from '../src'

export type TPerson = {key: string, login: string, email: string, country: string }
export type TPersonCache = {key: string, login: string, ddm: string }

const genaratorId = CreateGeneratorId()
const key0 = `psn-${genaratorId.getId()}`
const key1 = `psn-${genaratorId.getId()}`
const key2 = `psn-${genaratorId.getId()}`
const key3 = `psn-${genaratorId.getId()}`

export const personListStart: TPerson[] = [
    { key: key0, login: 'peter', email: 'peter@gmail.com', country: null },
    { key: key1, login: 'anna', email: 'anna@gmail.com', country: 'France' },
    { key: key2, login: 'felix', email: null, country: 'Spain' },
    { key: key3, login: null, email: 'unknown@gmail.com', country: null },
]

export const personListTrue = [
    {
        step: 1,
        list: personListStart
    },
    {
        step: 2,
        list: [
            { key: key0, login: 'peter', email: 'peter@gmail.com', country: null },
            { key: key1, login: 'anna', email: 'anna@gmail.com', country: null },
            { key: key2, login: 'felix', email: null, country: 'Finland' },
            { key: key3, login: 'alex', email: 'alex@gmail.com', country: 'Japan' },
        ]
    },
    {
        step: 3,
        list: [
            { key: key1, login: 'anna', email: 'anna@gmail.com', country: null },
            { key: key2, login: 'felix', email: null, country: 'Finland' },
            { key: key3, login: 'alex', email: 'alex@gmail.com', country: 'Japan' },
        ]
    },
    {
        step: 4,
        list: [
            { key: key1, login: 'anna', email: 'anna@gmail.com', country: null },
            { key: key2, login: 'felix', email: null, country: 'Finland' },
            { key: key3, login: 'alex', email: 'alex@gmail.com', country: 'Japan' },
        ]
    },
] as {step: number, list: TPerson[]}[]

export function CompareWhithPersonList(list1: TPerson[], list2: TPerson[]): boolean {
    const s1 = list1.map(m => { return `${m.key};${m.login};${m.email};${m.country}` }).sort().join(`\n`)
    const s2 = list2.map(m => { return `${m.key};${m.login};${m.email};${m.country}` }).sort().join(`\n`)
    return s1 === s2
}

export function CompareWithStorage(list: TPerson[], dataDir: string, wrapDir: string, deep: number) : boolean {
    const storageList = readPersonFromStorage(dataDir, wrapDir, deep)
    return CompareWhithPersonList(list, storageList)
}

function readPersonFromStorage(dataDir: string, wrapDir: string, deep: number): TPerson[] {
    const scanData = [] as {deep: number, name: string, kind: 'file' | 'dir'}[]
    const scanWrap = [] as {deep: number, name: string, kind: 'file' | 'dir'}[]
    scanData.push({deep: -1, name: dataDir, kind: 'dir'})
    scanWrap.push({deep: -1, name: wrapDir, kind: 'dir'})

    for (let i = 0; i <= deep; i++) {
        scanData.filter(f => f.deep === i - 1 && f.kind === 'dir').forEach(s => {
            fs.readdirSync(s.name).forEach(rd => {
                const name = path.join(s.name, rd)
                const fsstat = fs.statSync(name)
                scanData.push({deep: i, name, kind: fsstat.isFile() ? 'file' : 'dir'})
            })
        })
    }

    for (let i = 0; i <= deep; i++) {
        scanWrap.filter(f => f.deep === i - 1 && f.kind === 'dir').forEach(s => {
            fs.readdirSync(s.name).forEach(rd => {
                const name = path.join(s.name, rd)
                const fsstat = fs.statSync(name)
                scanWrap.push({deep: i, name, kind: fsstat.isFile() ? 'file' : 'dir'})
            })
        })
    }

    const personList = [] as TPerson[]
    scanData.filter(f => f.deep === deep && f.kind === 'file').forEach(s => {
        const data = JSON.parse(fs.readFileSync(s.name, 'utf8'))
        const dataFileName = path.parse(s.name).name
        const dataDir = path.parse(s.name).dir
        const wrapFile = scanWrap.find(f => path.parse(f.name).name === `wrap.${dataFileName}` && vv.replace('wrap','data',path.parse(f.name).dir) === dataDir)
        if (!wrapFile) {
            return
        }
        const wrap = JSON.parse(fs.readFileSync(wrapFile.name, 'utf8'))
        if (!wrap?.ddm) {
            personList.push(data)
        }
    })

    return personList
}
