import { TDriverHandle } from "./driverHandle";
import { DriverMaster } from "./driverMaster";

export type TDataKey = string

export enum EnumQuery {
    insert = 'insert',
    update = 'update',
    delete = 'delete',
    load = 'load',
}

export function CreateDriver(handle?: TDriverHandle) {
    return new DriverMaster(handle)
}