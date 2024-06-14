import { useEffect } from 'preact/hooks'
import { useSignal, signal, useSignalEffect } from '@preact/signals'
import { invoke } from '../../runtime.ts'
import debounce from '../../sdk/debounce.ts'
import useCEP from '../../sdk/useCEP.ts'
import { useUser } from 'apps/wake/hooks/useUser.ts'
import Icon from '../ui/Icon.tsx'
import { Total, formatShipping } from '../carrinho/carrinho.tsx'
import { useCart } from 'apps/wake/hooks/useCart.ts'
import type { Product } from 'apps/commerce/types.ts'
import Image from 'apps/website/components/Image.tsx'
import { useOffer } from '../../sdk/useOffer.ts'
import { formatPrice } from '../../sdk/format.ts'

const address = signal<Awaited<ReturnType<typeof invoke.wake.loaders.userAddresses>>>(null)
const shipping = signal<Awaited<ReturnType<typeof invoke.wake.actions.shippingSimulation>>>(null)
const selectedAddress = signal<Awaited<ReturnType<typeof invoke.wake.loaders.selectedAddress>>>(null)
const selectedShipping = signal<Awaited<ReturnType<typeof invoke.wake.loaders.selectedShipping>>>(null)
const products = signal([] as Product[])

const { user } = useUser()
const { cart, updateItem, addCoupon, removeCoupon } = useCart()

export default function () {
    const loading = useSignal(true)

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
        ;(async () => {
            address.value = await invoke.wake.loaders.userAddresses()
            selectedAddress.value = await invoke.wake.loaders.selectedAddress()
            selectedShipping.value = await invoke.wake.loaders.selectedShipping()
            shipping.value = await invoke.wake.actions.shippingSimulation({
                simulateCartItems: true,
                useSelectedAddress: true,
            })

            loading.value = false
        })()
    }, [])

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

            console.log(products.value)
        })()
    })

    if (loading.value) return null

    return (
        <div class='container mx-auto max-w-[1330px] py-6 px-4 flex flex-col gap-4 min-h-screen'>
            <Breadcrumb />

            <div class='flex gap-4'>
                <div class='flex flex-col gap-4 w-full'>
                    <ShippingAddress />
                    <ShippingOptions />
                </div>
                <div class='flex flex-col w-full'>
                    <Summary />
                </div>
            </div>
        </div>
    )
}

function Summary() {
    const loadingCoupon = useSignal(false)

    return (
        <>
            <div class='px-4 py-3 flex flex-col gap-2 w-full border border-stone-400'>
                <div class='w-full flex justify-between items-center bg-stone-200 px-3 py-2'>
                    <h2 class='font-bold text-lg'>OPÇÕES DE FRETE</h2>
                    <span class='text-sm'>
                        {cart.value.products?.reduce((acc, cur) => acc + cur!.quantity, 0)} itens
                    </span>
                </div>

                <div class='flex flex-col gap-4'>
                    {products.value.map(i => {
                        const { seller, listPrice = 0 } = useOffer(i.offers)

                        const cartProduct = cart.value.products!.find(
                            ii => ii?.productVariantId === Number(i?.productID),
                        )
                        if (!cartProduct) return null

                        const price = cartProduct.price

                        return (
                            <div class='flex items-center'>
                                <Image
                                    src={i.image?.[0].url ?? ''}
                                    alt={i.name ?? ''}
                                    width={80}
                                    height={80}
                                    class='border border-stone-300'
                                />
                                <div class='flex flex-col gap-1 ml-5 w-1/3'>
                                    <h3 class='font-black uppercase text-xs sm:text-sm'>{seller}</h3>
                                    <h4 class='text-xs'>{i.name}</h4>
                                    <div class='flex flex-col gap-1'>
                                        {i.additionalProperty?.map(i => (
                                            <div class='text-xs'>
                                                {i.name}: {i.value}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div class='flex justify-center ml-auto'>
                                    <span class='text-lg font-medium w-10 border border-stone-300 flex items-center justify-center'>
                                        {cartProduct.quantity}
                                    </span>
                                    <div class='flex flex-col'>
                                        <button
                                            type='button'
                                            class='w-5 h-5 text-xl flex items-center justify-center border border-stone-300'
                                            onClick={async () => {
                                                await updateItem({
                                                    productVariantId: Number(i.productID),
                                                    quantity: cartProduct.quantity + 1,
                                                })
                                            }}
                                        >
                                            +
                                        </button>
                                        <button
                                            type='button'
                                            class='w-5 h-5 text-xl flex items-center justify-center border border-stone-300'
                                            onClick={async () => {
                                                await updateItem({
                                                    productVariantId: Number(i.productID),
                                                    quantity: cartProduct.quantity - 1,
                                                })
                                            }}
                                        >
                                            -
                                        </button>
                                    </div>
                                </div>

                                <div class='flex flex-col gap-1 ml-auto'>
                                    <span class={`block ${listPrice > price ? 'line-through' : ''}`}>
                                        {formatPrice(Math.max(listPrice, price))}
                                    </span>
                                    {listPrice > price && <span class='text-red-700'>{formatPrice(price)}</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div class='my-4 py-1 border-y border-stone-400 px-2 flex items-center justify-between gap-4'>
                    <p class='text-sm'>CÓDIGO DE DESCONTO</p>

                    <div class='flex-1'>
                        <form
                            class='flex gap-3 justify-end items-center'
                            onSubmit={async e => {
                                e.preventDefault()

                                loadingCoupon.value = true
                                if (cart.value.coupon) {
                                    await removeCoupon({ coupon: cart.value.coupon })
                                } else {
                                    await addCoupon({ coupon: e.currentTarget.coupon.value })
                                }
                                loadingCoupon.value = false
                            }}
                        >
                            <input
                                type='text'
                                name='coupon'
                                class='w-full bg-stone-100 text-stone-500 p-2 outline-0 disabled:opacity-40'
                                placeholder='Digite Aqui'
                                required
                                defaultValue={cart.value.coupon ?? undefined}
                                disabled={!!cart.value.coupon || loadingCoupon.value}
                            />
                            <button
                                type='submit'
                                disabled={loadingCoupon.value}
                                class='border border-stone-500 text-sm p-2 cursor-pointer hover:bg-black hover:border-black hover:text-stone-100 transition-colors disabled:opacity-40'
                            >
                                {cart.value.coupon ? 'REMOVER' : 'APLICAR'}
                            </button>
                        </form>
                    </div>
                </div>

                <Total shippingPrice={selectedShipping.value?.value} />
            </div>
            <a
                href='/pagamento'
                disabled={!selectedShipping.value}
                class='bg-yellow-800 text-center text-white font-bold text-sm py-2.5 w-full transition-all ease-in-out duration-300 hover:brightness-90 mt-2 disabled:cursor-not-allowed disabled:opacity-50'
            >
                IR PARA PAGAMENTO
            </a>
        </>
    )
}

function ShippingOptions() {
    return (
        <div class='flex flex-col gap-2'>
            <div class='border border-stone-400 w-full'>
                <h2 class='w-full px-3 py-2 font-bold text-lg bg-stone-200'>OPÇÕES DE FRETE</h2>
            </div>

            <div class='border border-stone-400 w-full'>
                <div class='px-3 py-3 flex justify-between items-center bg-stone-200'>
                    <h2 class='text-sm font-bold text-stone-500'>ENVIO 01</h2>
                    <p class='text-sm'>
                        Vendido e entregue por: <span class='uppercase font-black ml-2'>SHOP2GETHER</span>
                    </p>
                </div>

                <div class='px-3 py-5 flex items-center gap-4'>
                    <span class='text-sm font-bold whitespace-nowrap'>OPÇÕES DE FRETE</span>
                    <select
                        name='shipping'
                        class='w-full px-4 py-2 text-sm text-black border border-stone-500 outline-0'
                        onChange={async e => {
                            await invoke.wake.actions.selectShipping({ shippingQuoteId: e.currentTarget.value })
                        }}
                    >
                        <option disabled selected={!selectedShipping.value}>
                            Selecione
                        </option>
                        {shipping
                            .value!.toSorted((a, b) => a!.value - b!.value)
                            .map(i => (
                                <option
                                    value={i!.shippingQuoteId!}
                                    selected={selectedShipping.value?.shippingQuoteId === i?.shippingQuoteId}
                                >
                                    {formatShipping(i)}
                                </option>
                            ))}
                    </select>
                </div>

                <div class='w-full h-px bg-stone-500' />

                <div class='flex flex-col divide-y divide-stone-300'>
                    {products.value.map(i => {
                        const { seller, listPrice = 0 } = useOffer(i.offers)

                        const cartProduct = cart.value.products!.find(
                            ii => ii?.productVariantId === Number(i?.productID),
                        )
                        if (!cartProduct) return null

                        const price = cartProduct.price

                        return (
                            <div class='p-3 flex items-center'>
                                <Image
                                    src={i.image?.[0].url ?? ''}
                                    alt={i.name ?? ''}
                                    width={140}
                                    height={140}
                                    class='border border-stone-300'
                                />
                                <div class='flex flex-col gap-1 ml-5'>
                                    <h3 class='font-black uppercase text-xs sm:text-sm'>{seller}</h3>
                                    <h4 class='text-xs'>{i.name}</h4>
                                    <div class='flex flex-col gap-1'>
                                        {i.additionalProperty?.map(i => (
                                            <div class='text-xs'>
                                                {i.name}: {i.value}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div class='flex flex-col gap-1 ml-auto'>
                                    <p class='font-bold text-stone-300 whitespace-nowrap text-xs sm:text-sm'>
                                        PREÇO UN.
                                    </p>
                                    <span class={`block ${listPrice > price ? 'line-through' : ''}`}>
                                        {formatPrice(Math.max(listPrice, price))}
                                    </span>
                                    {listPrice > price && <span class='text-red-700'>{formatPrice(price)}</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function ShippingAddress() {
    if (!address.value) return null

    const cep = useCEP()
    const cepDebounce = debounce(500)

    return (
        <div class='border border-stone-400 w-full'>
            <h2 class='w-full px-3 py-2 font-bold text-lg bg-stone-200'>ENDEREÇO DE ENVIO</h2>
            <div class='px-3 py-5 flex flex-col items-start gap-4'>
                <div class='flex flex-wrap gap-4'>
                    {address.value.map(a => (
                        <button
                            type='button'
                            class='border border-stone-800 p-3 max-w-72 flex flex-col hover:bg-stone-300 transition-colors relative'
                            onClick={async () => {
                                await invoke.wake.actions.selectAddress({ addressId: a!.id! })
                            }}
                        >
                            {selectedAddress.value?.id === a?.id && (
                                <span class='absolute top-0 right-0 bg-black flex items-center p-1'>
                                    <Icon id='AddressCheck' size={18} strokeWidth={1} />
                                </span>
                            )}

                            <span class='text-sm'>{a!.name}</span>
                            <span class='text-sm'>
                                {a!.street ?? ''}, {a!.addressNumber ?? ''}
                            </span>
                            <span class='text-sm'>
                                {a!.city ?? ''}, {a!.neighborhood ?? ''}, {a!.state ?? ''}, {a!.cep ?? ''},{' '}
                                {a!.country ?? ''} - Tel: {a!.phone ?? ''}
                            </span>
                        </button>
                    ))}
                </div>

                <input type='checkbox' id='add-new-address' class='hidden peer' />
                <label
                    for='add-new-address'
                    class='border border-stone-500 text-sm font-bold p-2 cursor-pointer hover:bg-black hover:border-black hover:text-stone-100 transition-colors disabled:opacity-40 peer-checked:hidden'
                >
                    NOVO ENDEREÇO
                </label>

                <form
                    class='px-3.5 pt-2 pb-6 gap-2.5 grid-cols-2 w-full hidden peer-checked:grid'
                    onSubmit={async e => {
                        e.preventDefault()

                        const addressDetails = e.currentTarget.addressDetails.value
                        const addressNumber = e.currentTarget.addressNumber.value
                        const city = e.currentTarget.city.value
                        const neighborhood = e.currentTarget.neighborhood.value
                        const phone = e.currentTarget.phone.value
                        const name = e.currentTarget.receiverName.value
                        const state = e.currentTarget.state.value
                        const street = e.currentTarget.street.value
                        const cep = e.currentTarget.cep.value

                        console.log(
                            await invoke.wake.actions.createAddress({
                                addressDetails,
                                addressNumber,
                                city,
                                cep,
                                country: 'BR',
                                email: user.value!.email,
                                name,
                                neighborhood,
                                phone,
                                state,
                                street,
                            }),
                        )
                    }}
                >
                    <input
                        type='text'
                        placeholder='Nome do Destinatário *'
                        name='receiverName'
                        required
                        class='col-span-2 text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2'
                    />
                    <input
                        type='text'
                        placeholder='Cep *'
                        name='cep'
                        required
                        class='text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2'
                        onInput={e => {
                            const v = e.currentTarget.value
                                .replace(/\D/g, '')
                                .replace(/^(\d{0,5})(\d{0,3})(.*)$/, (all, $1, $2) => {
                                    let s = ''

                                    if ($1) s += $1
                                    if ($2) s += `-${$2}`

                                    return s
                                })

                            e.currentTarget.value = v
                            const form = e.currentTarget.form

                            if (!form) return

                            if (e.currentTarget.value.length === 9) {
                                cepDebounce(async () => {
                                    await cep.set(v.replace('-', ''))

                                    form.neighborhood.value = cep.data.value.neighborhood ?? form.neighborhood.value
                                    form.state.value = cep.data.value.state
                                    form.city.value = cep.data.value.city
                                    form.street.value = cep.data.value.street ?? ''
                                })
                            }
                        }}
                    />

                    <a
                        href='https://buscacepinter.correios.com.br/app/endereco/index.php'
                        target='_blank'
                        class='font-medium text-stone-500 text-sm flex items-center underline'
                        rel='noreferrer'
                    >
                        Não sei o CEP
                    </a>
                    <input
                        type='text'
                        placeholder='Rua *'
                        name='street'
                        required
                        class='col-span-2 text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2'
                    />
                    <input
                        type='text'
                        placeholder='Número *'
                        name='addressNumber'
                        required
                        class='text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2'
                        onInput={e => {
                            e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '')
                        }}
                    />
                    <input
                        type='text'
                        placeholder='Complemento'
                        name='addressDetails'
                        class='text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2'
                    />
                    <input
                        type='text'
                        placeholder='Bairro *'
                        name='neighborhood'
                        required
                        class='text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2'
                    />
                    <input
                        type='text'
                        placeholder='Cidade *'
                        name='city'
                        required
                        class='text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2'
                    />
                    <select
                        required
                        name='state'
                        class='text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2'
                    >
                        <option value='' disabled selected>
                            Estado *
                        </option>
                        <option value='AC'>Acre</option>
                        <option value='AL'>Alagoas</option>
                        <option value='AP'>Amapá</option>
                        <option value='AM'>Amazonas</option>
                        <option value='BA'>Bahia</option>
                        <option value='CE'>Ceará</option>
                        <option value='DF'>Distrito Federal</option>
                        <option value='ES'>Espírito Santo</option>
                        <option value='GO'>Goiás</option>
                        <option value='MA'>Maranhão</option>
                        <option value='MT'>Mato Grosso</option>
                        <option value='MS'>Mato Grosso do Sul</option>
                        <option value='MG'>Minas Gerais</option>
                        <option value='PA'>Pará</option>
                        <option value='PB'>Paraíba</option>
                        <option value='PR'>Paraná</option>
                        <option value='PE'>Pernambuco</option>
                        <option value='PI'>Piauí</option>
                        <option value='RJ'>Rio de Janeiro</option>
                        <option value='RN'>Rio Grande do Norte</option>
                        <option value='RS'>Rio Grande do Sul</option>
                        <option value='RO'>Rondônia</option>
                        <option value='RR'>Roraima</option>
                        <option value='SC'>Santa Catarina</option>
                        <option value='SP'>São Paulo</option>
                        <option value='SE'>Sergipe</option>
                        <option value='TO'>Tocantins</option>
                    </select>
                    <input
                        type='text'
                        placeholder='Telefone *'
                        name='phone'
                        required
                        class='text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2'
                        onInput={e => {
                            e.currentTarget.value = e.currentTarget.value
                                .replace(/\D/g, '')
                                .replace(/^(\d?)(\d?)(\d{0,5})(\d{0,4})(.*)$/, (all, $1, $2, $3, $4) => {
                                    let s = ''

                                    if ($1) s += `(${$1}${$2}`
                                    if ($3) s += `) ${$3}`
                                    if ($4) s += `-${$4}`

                                    return s
                                })
                        }}
                    />
                    <button
                        type='submit'
                        class='col-span-2 mt-2 border border-stone-500 text-sm hover:bg-black hover:border-black hover:text-stone-100 transition-colors py-2 disabled:opacity-40'
                    >
                        CADASTRAR
                    </button>
                </form>
            </div>
        </div>
    )
}

function Breadcrumb() {
    return (
        <div class='flex items-center gap-2'>
            <a href='/carrinho' class='text-sm'>
                Carrinho
            </a>
            <span class='text-sm'>{'>'}</span>
            <a href='/frete' class='text-sm font-bold'>
                Frete
            </a>
            <span class='text-sm'>{'>'}</span>
            <a href='/pagamento' class='text-sm'>
                Pagamento
            </a>
        </div>
    )
}
