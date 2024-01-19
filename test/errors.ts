export const errors = [] as {driverKey: string, err: string}[]
export function CheckError(prefix: string) {
    if (errors.length > 0) {
        console.warn(prefix)
        errors.forEach(e => {
            console.warn(e)
        })
        process.exit(0)
    } else {
        console.log(`${prefix} NOT FOUND`)
    }
}