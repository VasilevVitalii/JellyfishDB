/* eslint-disable @typescript-eslint/no-unused-vars */
import { TResultQueue, TStamp } from '../driverMaster'

type TDriverHandleCacheInsert<TAbstractPayLoad,TAbstractPayLoadCache> = (stamp: TStamp<TAbstractPayLoad>, cache: TAbstractPayLoadCache[]) => void
type TDriverHandleCacheUpdate<TAbstractPayLoad,TAbstractPayLoadCache> = (stamp: TStamp<TAbstractPayLoad>, cache: TAbstractPayLoadCache[]) => void
type TDriverHandleCacheDelete<TAbstractPayLoad,TAbstractPayLoadCache> = (stamp: TStamp<TAbstractPayLoad>, cache: TAbstractPayLoadCache[]) => void
type TDriverHandleCacheShrink = (cache: any[]) => void
type TDriverHandleOnResult<TAbstractPayLoad> = (result: TResultQueue<TAbstractPayLoad>) => void

export type TMasterDriverHandle<TAbstractPayLoad, TAbstractPayLoadCache> = {
    /** read (with the possibility of change) all message with result from workers to general result queue */
    onResult?: TDriverHandleOnResult<TAbstractPayLoad>
    /** functions for cache system */
    cache?: {
        /** add data to cache */
        onInsert: TDriverHandleCacheInsert<TAbstractPayLoad,TAbstractPayLoadCache>,
        /** update data in cache */
        onUpdate: TDriverHandleCacheUpdate<TAbstractPayLoad,TAbstractPayLoadCache>,
        /** mark data as "deleted" in cache */
        onDelete: TDriverHandleCacheDelete<TAbstractPayLoad,TAbstractPayLoadCache>,
        /** remove "deleted" data from cache */
        onShrink: TDriverHandleCacheShrink
    }
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