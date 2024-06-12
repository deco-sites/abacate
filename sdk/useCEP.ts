import { useSignal } from '@preact/signals'

// https://brasilapi.com.br/docs#tag/CEP-V2
export default function () {
    const loading = useSignal(false)
    const data = useSignal({} as Data)

    async function set(cep: string) {
        loading.value = true

        const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`)
        const d = (await r.json()) as Data

        if (!r.ok) {
            throw new Error(JSON.stringify(d, null, 4))
        }

        data.value = d
        loading.value = false
    }

    return {
        loading,
        set,
        data,
    }
}

export interface Data {
    cep: string
    state: string
    city: string
    neighborhood?: string
    street?: string
    service: string
    location: Location
}

export interface Location {
    type: string
    coordinates: Coordinates
}

export interface Coordinates {
    longitude?: string
    latitude?: string
}
