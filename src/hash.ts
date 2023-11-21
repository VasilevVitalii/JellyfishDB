export function Hash(str: string, len: number): string {
    let hash = 5381
    let i = str.length

    while (i) {
        hash = (hash * 33) ^ str.charCodeAt(--i);
    }

    const res = (hash >>> 0).toString()
    const reslen = res.length
    if (len > reslen) {
        return `${res}${Array(len - reslen).fill(0).join('')}`
    } else if (reslen > len) {
        return res.substring(0, len)
    }
    return res
}