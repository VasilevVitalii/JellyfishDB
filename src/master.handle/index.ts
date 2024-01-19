/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vv from 'vv-common'
import { NumeratorUuid } from "../numerator"
import { transpile } from "typescript"
import { join } from 'path'
import { TDataKey } from '..'
import { TResultQueue, TStamp } from '../driverMaster'

type TDriverHandleCacheInsert<TAbstractPayLoad,TAbstractPayLoadCache> = (stamp: TStamp<TAbstractPayLoad>, cache: TAbstractPayLoadCache[]) => void
type TDriverHandleCacheUpdate<TAbstractPayLoad,TAbstractPayLoadCache> = (stamp: TStamp<TAbstractPayLoad>, cache: TAbstractPayLoadCache[]) => void
type TDriverHandleCacheDelete<TAbstractPayLoad,TAbstractPayLoadCache> = (stamp: TStamp<TAbstractPayLoad>, cache: TAbstractPayLoadCache[]) => void
type TDriverHandleCacheShrink = (cache: any[]) => void
type TDriverHandleOnResult<TAbstractPayLoad> = (result: TResultQueue<TAbstractPayLoad>) => void

export type TMasterDriverHandle<TAbstractPayLoad, TAbstractPayLoadCache> = {
    cacheInsert?: TDriverHandleCacheInsert<TAbstractPayLoad,TAbstractPayLoadCache>,
    cacheUpdate?: TDriverHandleCacheUpdate<TAbstractPayLoad,TAbstractPayLoadCache>,
    cacheDelete?: TDriverHandleCacheDelete<TAbstractPayLoad,TAbstractPayLoadCache>,
    cacheShrink?: TDriverHandleCacheShrink
    onResult?: TDriverHandleOnResult<TAbstractPayLoad>
}

export class MasterDriverHandle<TAbstractPayLoad> {
    private _funcCacheInsert = (stamp: TStamp<TAbstractPayLoad>, cache: any[]) => {}
    private _funcCacheUpdate = (stamp: TStamp<TAbstractPayLoad>, cache: any[]) => {}
    private _funcCacheDelete = (stamp: TStamp<TAbstractPayLoad>, cache: any[]) => {}
    private _funcCacheShrink = (cache: any[]) => {}
    private _funcOnResult = (result: TResultQueue<TAbstractPayLoad>) => {}

    public setCacheInsert(func?: (stamp: TStamp<TAbstractPayLoad>, cache: any[]) => void) {
        if (!func) return
        this._funcCacheInsert = func
    }
    public setCacheUpdate(func?: (stamp: TStamp<TAbstractPayLoad>, cache: any[]) => void) {
        if (!func) return
        this._funcCacheUpdate = func
    }
    public setCacheDelete(func?: (stamp: TStamp<TAbstractPayLoad>, cache: any[]) => void) {
        if (!func) return
        this._funcCacheDelete = func
    }
    public setCacheShrink(func?: (cache: any[]) => void) {
        if (!func) return
        this._funcCacheShrink = func
    }
    public setOnResult(func?: (result: TResultQueue<TAbstractPayLoad>) => void) {
        if (!func) return
        this._funcOnResult = func
    }

    public cacheInsert(stamp: TStamp<TAbstractPayLoad>, cache: any[]) {
        return this._funcCacheInsert(stamp, cache)
    }
    public cacheUpdate(stamp: TStamp<TAbstractPayLoad>, cache: any[]) {
        return this._funcCacheUpdate(stamp, cache)
    }
    public cacheDelete(stamp: TStamp<TAbstractPayLoad>, cache: any[]) {
        return this._funcCacheDelete(stamp, cache)
    }
    public cacheShrink(cache: any[]) {
        return this._funcCacheShrink(cache)
    }
    public onResult(result: TResultQueue<TAbstractPayLoad>) {
        return this._funcOnResult(result)
    }
}