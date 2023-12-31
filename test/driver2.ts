import { CreateDriver, DriverMaster } from '../src'
import {TPerson, TPersonCache} from './index'

export function GetDriver2 (driverIdx: number, dir: string, errors: {driverIdx: number, err: Error}[]): DriverMaster<TPerson,TPersonCache> {
    const dirDeep = 2
    console.log(`driver${driverIdx}: deep${dirDeep}, nocache, noredefine`)
    const driver = CreateDriver<TPerson,TPersonCache>()
    driver.connect({dir, dirDeep}, (err) => {
        errors.push({driverIdx, err})
    })
    return driver
}