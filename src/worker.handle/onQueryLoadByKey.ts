import { TQueryLoadByKey, TResultLoadByKey, TStamp } from '../driverMaster';
import { GetStampList } from './onQueryLoadAll';

export function OnQueryLoadByKey<TAbstractPayLoad>(result: TResultLoadByKey<TAbstractPayLoad>, query: TQueryLoadByKey, calback: () => void) {
    const errorList = [] as string[]
    const keyList = Array.isArray(query.key) ? query.key : [query.key] as string[]
    const stampList = [] as TStamp<TAbstractPayLoad>[]

    GetStampList(keyList, stampList, errorList, () => {
        if (errorList.length > 0) {
            result.error = errorList.join(';')
        } else {
            result.stamp = stampList
        }
        calback()
    })
}
