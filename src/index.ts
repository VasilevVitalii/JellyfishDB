import { TWorkerDriverHandle } from "./worker.handle"
import { TMasterDriverHandle } from "./master.handle"
import { DriverMaster } from "./driverMaster"
import { NumeratorUuid } from "./numerator"

export type TDataKey = string

export enum EnumQuery {
    insert = 'insert',
    update = 'update',
    delete = 'delete',
    shrink = 'shrink',
    loadByKey = 'loadByKey',
    loadAll = 'loadAll',
}

export enum EnumQueryTargetLoad {
    my = 'my',
    cache = 'cache'
}

export { TWorkerDriverHandle } from "./worker.handle"
export { TMasterDriverHandle } from "./master.handle"
export { DriverMaster } from "./driverMaster"
export { TQuery }  from "./driverMaster"
export { TExecResult }  from "./driverMaster"

export function CreateDriver<TAbstractPayLoad, TAbstractPayLoadCache>(handle?: TWorkerDriverHandle<TAbstractPayLoad> & TMasterDriverHandle<TAbstractPayLoad, TAbstractPayLoadCache>) {
    return new DriverMaster<TAbstractPayLoad, TAbstractPayLoadCache>(handle)
}

export function CreateGeneratorId(): NumeratorUuid {
    return new NumeratorUuid()
}

