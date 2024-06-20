import { signal, useSignal, useSignalEffect } from '@preact/signals'
import type { Product } from 'apps/commerce/types.ts'
import { useCart } from 'apps/wake/hooks/useCart.ts'
import Image from 'apps/website/components/Image.tsx'
import { invoke } from '../../runtime.ts'

const products = signal([] as Product[])

const { cart } = useCart()

export default function ({ id }: ReturnType<typeof loader>) {
    if (!cart.value.products) return null

    const loading = useSignal(true)

    useSignalEffect(() => {
        ;(async () => {
            const cartProducts = cart.value.products || []

            if (!cartProducts.length) {
                products.value = []
                return
            }

            const p =
                (await invoke.wake.loaders.productList({
                    first: 10,
                    sortDirection: 'ASC',
                    sortKey: 'NAME',
                    filters: { sku: cartProducts.map(i => i!.sku!) },
                })) || []

            const cartSkus = cartProducts.map(i => i!.sku)

            products.value = p
                .filter(i => cartSkus.includes(i!.sku))
                .sort((a, b) => {
                    const aIndex = cartProducts.findIndex(i => i!.sku === a.sku)
                    const bIndex = cartProducts.findIndex(i => i!.sku === b.sku)

                    return aIndex - bIndex
                })

            loading.value = false
            console.log(products.value, id)
        })()
    })

    if (loading.value || !cart.value) return null

    console.log(cart.value?.selectedPaymentMethod?.html, cart.value?.selectedPaymentMethod?.html ?? '')

    return <div class='container mx-auto max-w-[1330px] py-6 px-4 flex flex-col gap-4 min-h-screen'></div>
}

export function loader(props: object, req: Request) {
    const id = new URL(req.url).searchParams.get('id')

    return { ...props, id }
}
