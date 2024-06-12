export default function (ms: number) {
    let timer: number
    return (fn: () => Promise<void> | void) => {
        clearTimeout(timer)
        timer = setTimeout(fn, ms)
    }
}
