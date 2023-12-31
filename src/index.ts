import { TDriverHandle } from "./driverHandle"
import { DriverMaster } from "./driverMaster"

export type TDataKey = string

export enum EnumQuery {
    insert = 'insert',
    update = 'update',
    delete = 'delete',
    shrink = 'shrink',
    loadByKey = 'loadByKey',
    loadAll = 'loadAll',
}

export { TDriverHandle } from "./driverHandle"
export { DriverMaster } from "./driverMaster"

export function CreateDriver<TAbstractPayLoad, TAbstractPayLoadCache>(handle?: TDriverHandle<TAbstractPayLoad, TAbstractPayLoadCache>) {
    return new DriverMaster<TAbstractPayLoad, TAbstractPayLoadCache>(handle)
}