import { signal, useComputed, useSignal, useSignalEffect } from '@preact/signals'
import { invoke } from '../../runtime.ts'
import debounce from '../../sdk/debounce.ts'
import useCEP from '../../sdk/useCEP.ts'
import { useCart } from 'apps/wake/hooks/useCart.ts'
import { useEffect } from 'preact/hooks'
import type { Product } from 'apps/commerce/types.ts'
import { useOffer } from '../../sdk/useOffer.ts'
import { formatPrice } from '../../sdk/format.ts'
import Icon from '../ui/Icon.tsx'
import { useShipping } from 'apps/wake/hooks/useShipping.ts'

const { cart, updateItem, addCoupon } = useCart()
const { selectedShipping, selectShipping } = useShipping()

const shippingLoading = signal(false)
const shipping = signal<Awaited<ReturnType<typeof invoke.wake.actions.shippingSimulation>>>(null)
const checkoutCoupon = signal<Awaited<ReturnType<typeof invoke.wake.loaders.checkoutCoupon>>>(null)

export default function () {
    const user = useSignal<Awaited<ReturnType<typeof invoke.wake.loaders.user>> | null>(null)
    const logged = useComputed(() => user.value !== null)
    const loading = useSignal(true)
    const products = useSignal([] as Product[])

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

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
        ;(async () => {
            user.value = await invoke.wake.loaders.user()
            checkoutCoupon.value = await invoke.wake.loaders.checkoutCoupon()

            if (!user.value) {
                loading.value = false
                return
            }

            loading.value = false
        })()
    }, [])

    if (loading.value) return null

    return (
        <div class='p-4 flex flex-col gap-4 min-h-screen container mx-auto max-w-[1330px]'>
            <Breadcrumb />

            <div class='flex gap-4'>
                {!logged.value && (
                    <>
                        <Signup />
                        <Login />
                    </>
                )}
            </div>

            {products.value.length > 0 && (
                <div class='flex items-start gap-6'>
                    <div class='flex flex-col w-full'>
                        <div class='px-3 py-3 flex justify-between items-center bg-stone-200'>
                            <h2 class='text-sm font-bold text-stone-500'>ENVIO 01</h2>
                            <p class='text-sm'>
                                Vendido e entregue por: <span class='uppercase font-black ml-2'>SHOP2GETHER</span>
                            </p>
                        </div>

                        <Products products={products.value} />
                        <ShippingOptions />
                    </div>
                    <div class='p-4 border border-stone-300 flex flex-col gap-4 divider-y divider-stone-300'>
                        <Shipping />
                        <div class='w-full h-px bg-stone-400 my-2' />
                        <Coupon />
                        <div class='w-full h-px bg-stone-400 my-2' />
                        <Total shippingPrice={selectedShipping.value?.value} />
                        <a
                            href='/frete'
                            class='bg-yellow-800 text-center text-white font-bold text-sm py-2.5 w-full transition-all ease-in-out duration-300 hover:brightness-90 mt-2 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                            FINALIZAR COMPRA
                        </a>
                    </div>
                </div>
            )}
        </div>
    )
}

export function formatShipping(
    shipping: NonNullable<Awaited<ReturnType<typeof invoke.wake.actions.shippingSimulation>>>[number],
) {
    if (!shipping) throw new Error('Shipping null or undefined')

    const price = shipping.value === 0 ? 'Grátis' : formatPrice(shipping.value)
    const name = shipping.name
    const deadline =
        shipping.type === 'Retirada'
            ? shipping.deadline === 0
                ? 'Poderá ser retirado hoje'
                : `Poderá ser retirado em ${shipping.deadline} dias úteis`
            : shipping.deadline === 0
              ? 'Será entrege hoje'
              : `Até ${shipping.deadline} dias úteis para a entrega`

    return `${price} - ${name} - ${deadline}`
}

function ShippingOptions() {
    return (
        <div class='flex items-center border border-stone-300 px-3 py-2 ml-4 gap-4 h-14'>
            {shipping.value && (
                <>
                    <span class='text-sm font-bold text-stone-500 whitespace-nowrap'>OPÇÕES DE FRETE</span>
                    <select
                        name='shipping'
                        class='w-full px-4 py-2 text-sm text-black border border-stone-300 outline-0'
                        onChange={e => selectShipping({ shippingQuoteId: e.currentTarget.value })}
                    >
                        <option disabled selected>
                            Selecione
                        </option>
                        {shipping
                            .value!.toSorted((a, b) => a!.value - b!.value)
                            .map(i => (
                                <option value={i!.shippingQuoteId!}>{formatShipping(i)}</option>
                            ))}
                    </select>
                </>
            )}

            <div class='flex items-center gap-3 ml-auto'>
                <span class='text-sm font-bold text-stone-500'>SUBTOTAL</span>
                <span class='text-sm font-bold text-stone-950'>{formatPrice(cart.value.subtotal)}</span>
            </div>
        </div>
    )
}

function Shipping() {
    async function onSubmit(cep: string) {
        shippingLoading.value = true
        shipping.value = await invoke.wake.actions.shippingSimulation({ simulateCartItems: true, cep })
        shippingLoading.value = false
    }

    return (
        <form
            class='flex flex-col gap-4'
            onSubmit={e => {
                e.preventDefault()
                onSubmit(e.currentTarget.cep.value.replace(/\D/g, ''))
            }}
        >
            <span class='text-sm font-bold'>ESTIMATIVA DE FRETE</span>
            <input
                type='text'
                name='cep'
                class='p-2 border border-stone-300 h-11 text-stone-800 outline-0'
                placeholder='01001-000'
                required
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
                }}
            />
            <button
                type='submit'
                class='border border-stone-300 text-sm hover:bg-black hover:border-black hover:text-stone-100 transition-colors py-2 disabled:opacity-40'
                disabled={shippingLoading.value}
            >
                {shippingLoading.value ? 'CALCULANDO' : 'CALCULAR'}
            </button>
        </form>
    )
}

function Coupon() {
    const loading = useSignal(false)

    async function onSubmit(coupon: string) {
        loading.value = true
        await addCoupon({ coupon })
        checkoutCoupon.value = coupon
        loading.value = false
    }

    return (
        <form
            class='flex flex-col gap-4'
            onSubmit={e => {
                e.preventDefault()
                onSubmit(e.currentTarget.coupon.value)
            }}
        >
            <span class='text-sm font-bold'>CÓDIGO DE DESCONTO / GIFT CARD</span>
            <input
                type='text'
                name='coupon'
                class='p-2 border border-stone-300 h-11 text-stone-800 outline-0 disabled:opacity-40'
                placeholder='Digite aqui'
                required
                defaultValue={checkoutCoupon.value || undefined}
                disabled={loading.value || !!checkoutCoupon.value}
            />
            <button
                type='submit'
                class='border border-stone-300 text-sm hover:bg-black hover:border-black hover:text-stone-100 transition-colors py-2 disabled:opacity-40'
                disabled={loading.value || !!checkoutCoupon.value}
            >
                {loading.value ? 'APLICANDO' : checkoutCoupon.value ? 'CUPOM APLICADO COM SUCESSO!' : 'APLICAR'}
            </button>
        </form>
    )
}

export function Total({ shippingPrice }: { shippingPrice?: number }) {
    return (
        <div class='flex flex-col gap-1'>
            <div class='flex justify-between items-center'>
                <span class='text-sm'>SUBTOTAL</span>
                <span class='text-sm'>{formatPrice(cart.value.subtotal)}</span>
            </div>
            <div class='flex justify-between items-center'>
                <span class='text-sm'>FRETE TOTAL</span>
                <span class='text-sm'>{shippingPrice ? formatPrice(shippingPrice) : 'FRETE GRÁTIS'}</span>
            </div>
            <div class='flex justify-between items-center'>
                <span class='text-sm font-bold'>TOTAL</span>
                <span class='text-sm font-bold'>{formatPrice(cart.value.subtotal + (shippingPrice ?? 0))}</span>
            </div>
        </div>
    )
}

function Login() {
    return (
        <form
            id='form-person'
            class='flex flex-col gap-4 w-full max-w-[444px] p-4'
            onSubmit={e => {
                e.preventDefault()

                const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value
                const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value

                invoke.wake.actions.login({ input: email, pass: password }).then(console.log)
            }}
        >
            <div class='flex gap-4'>
                <div class='flex flex-col gap-2 w-full'>
                    <span class='font-medium'>Email *</span>
                    <input type='email' name='email' class='p-2 border border-zinc-500 h-11' required />
                </div>
                <div class='flex flex-col gap-2 w-full'>
                    <span class='font-medium'>Senha *</span>
                    <input type='text' name='password' class='p-2 border border-zinc-500 h-11' required />
                </div>
            </div>

            <button type='submit' class='cool-btn py-2 px-4 bg-[#005CB1] rounded text-zinc-100 text-lg mt-6'>
                Login
            </button>
        </form>
    )
}

function Signup() {
    const customerType = useSignal<'PERSON' | 'COMPANY'>('PERSON')

    const cep = useCEP()
    const cepDebounce = debounce(500)

    return (
        <>
            <label class='flex items-center gap-4 p-4 cursor-pointer select-none'>
                <input
                    type='checkbox'
                    onInput={e => {
                        customerType.value = e.currentTarget.checked ? 'COMPANY' : 'PERSON'
                    }}
                />
                {customerType.value === 'COMPANY' ? 'Company' : 'Person'}
            </label>

            {customerType.value === 'PERSON' ? (
                <form
                    id='form-person'
                    class='flex flex-col gap-4 w-full max-w-[444px] p-4'
                    // biome-ignore format: ...
                    onSubmit={e => {
                    e.preventDefault()

                    const address = (e.currentTarget.elements.namedItem('address') as HTMLInputElement).value
                    const addressComplement = (e.currentTarget.elements.namedItem('addressComplement') as HTMLInputElement).value
                    const addressNumber = (e.currentTarget.elements.namedItem('addressNumber') as HTMLInputElement).value
                    const cep = (e.currentTarget.elements.namedItem('cep') as HTMLInputElement).value
                    const city = (e.currentTarget.elements.namedItem('city') as HTMLInputElement).value
                    const cpf = (e.currentTarget.elements.namedItem('cpf') as HTMLInputElement).value
                    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value
                    const fullName = (e.currentTarget.elements.namedItem('fullName') as HTMLInputElement).value
                    const gender = (e.currentTarget.elements.namedItem('gender') as HTMLSelectElement).value as 'MALE' | 'FEMALE'
                    const neighborhood = (e.currentTarget.elements.namedItem('neighborhood') as HTMLInputElement).value
                    const newsletter = (e.currentTarget.elements.namedItem('newsletter') as HTMLInputElement).checked
                    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value
                    const passwordConfirmation = (e.currentTarget.elements.namedItem('passwordConfirmation') as HTMLInputElement).value
                    const receiverName = (e.currentTarget.elements.namedItem('receiverName') as HTMLInputElement).value
                    const reference = (e.currentTarget.elements.namedItem('reference') as HTMLInputElement).value
                    const reseller = (e.currentTarget.elements.namedItem('reseller') as HTMLInputElement).checked
                    const state = (e.currentTarget.elements.namedItem('state') as HTMLInputElement).value

                    const _birthDate = new Date((e.currentTarget.elements.namedItem('birthDate') as HTMLInputElement).value)
                    const birthDate = `${_birthDate.getDate()}/${_birthDate.getMonth() + 1}/${_birthDate.getFullYear()}`

                    const _primaryPhoneNumber = (e.currentTarget.elements.namedItem('primaryPhoneNumber') as HTMLInputElement).value
                    const primaryPhoneAreaCode = _primaryPhoneNumber.replace(/\D/g, '').slice(0, 2)
                    const primaryPhoneNumber = _primaryPhoneNumber.slice(5)

                    const _secondaryPhoneNumber = (e.currentTarget.elements.namedItem('secondaryPhoneNumber') as HTMLInputElement).value
                    const secondaryPhoneAreaCode = _secondaryPhoneNumber.replace(/\D/g, '').slice(0, 2)
                    const secondaryPhoneNumber = _secondaryPhoneNumber.slice(5)

                    const data = {
                        address,
                        addressComplement,
                        addressNumber,
                        birthDate,
                        cep,
                        city,
                        cpf,
                        email,
                        fullName,
                        gender,
                        newsletter,
                        neighborhood,
                        password,
                        passwordConfirmation,
                        receiverName,
                        reference,
                        reseller,
                        state,
                        primaryPhoneAreaCode,
                        primaryPhoneNumber,
                    } as Record<string, string | boolean>

                    if (_secondaryPhoneNumber) {
                        data.secondaryPhoneAreaCode = secondaryPhoneAreaCode
                        data.secondaryPhoneNumber = secondaryPhoneNumber
                    }

                    console.log(data)

                    invoke.wake.actions.signupPerson(data).then(console.log)
                }}
                >
                    <input type='hidden' name='address' />
                    <input type='hidden' name='state' />
                    <input type='hidden' name='city' />

                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>Email *</span>
                            <input type='email' name='email' class='p-2 border border-zinc-500 h-11' required />
                        </div>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>CPF *</span>
                            <input
                                type='text'
                                name='cpf'
                                class='p-2 border border-zinc-500 h-11'
                                required
                                onInput={(e: { currentTarget: { value: string } }) => {
                                    e.currentTarget.value = e.currentTarget.value
                                        .replace(/\D/g, '')
                                        .replace(
                                            /^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})(.*)$/,
                                            (all, $1, $2, $3, $4) => {
                                                let s = ''

                                                if ($1) s += $1
                                                if ($2) s += `.${$2}`
                                                if ($3) s += `.${$3}`
                                                if ($4) s += `-${$4}`

                                                return s
                                            },
                                        )
                                }}
                            />
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-full'>
                            <span class='font-medium'>Nome completo *</span>
                            <input type='text' name='fullName' class='p-2 border border-zinc-500 h-11' required />
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>Data de Nascimento *</span>
                            <input type='date' name='birthDate' class='p-2 border border-zinc-500 h-11' required />
                        </div>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>Gênero *</span>
                            <select type='text' name='gender' class='p-2 border border-zinc-500 h-11' required>
                                <option value=''>Selecione...</option>
                                <option value='MALE'>Masculino</option>
                                <option value='FEMALE'>Feminino</option>
                            </select>
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>Senha *</span>
                            <input type='text' name='password' class='p-2 border border-zinc-500 h-11' required />
                        </div>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>Confirme a senha *</span>
                            <input
                                type='text'
                                name='passwordConfirmation'
                                class='p-2 border border-zinc-500 h-11'
                                required
                            />
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>Telefone principal *</span>
                            <input
                                type='tel'
                                name='primaryPhoneNumber'
                                class='p-2 border border-zinc-500 h-11'
                                required
                                onInput={(e: { currentTarget: { value: string } }) => {
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
                        </div>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>Telefone secundário</span>
                            <input
                                type='tel'
                                name='secondaryPhoneNumber'
                                class='p-2 border border-zinc-500 h-11'
                                onInput={(e: { currentTarget: { value: string } }) => {
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
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <label class='font-medium flex items-center gap-2 cursor-pointer'>
                            <input type='checkbox' name='newsletter' class='p-2 border border-zinc-500 h-11' />
                            Receber newsletter
                        </label>
                    </div>
                    <div class='flex gap-4'>
                        <label class='font-medium flex items-center gap-2 cursor-pointer'>
                            <input type='checkbox' name='reseller' class='p-2 border border-zinc-500 h-11' />
                            Desejo ser revendedor
                        </label>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-full'>
                            <span class='font-medium'>Quem vai receber a entrega? *</span>
                            <input type='text' name='receiverName' class='p-2 border border-zinc-500 h-11' required />
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>CEP *</span>
                            <input
                                type='text'
                                name='cep'
                                class='p-2 border border-zinc-500 h-11'
                                required
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

                                            const neighborhood = form.elements.namedItem(
                                                'neighborhood',
                                            ) as HTMLInputElement
                                            const state = form.elements.namedItem('state') as HTMLInputElement
                                            const city = form.elements.namedItem('city') as HTMLInputElement
                                            const address = form.elements.namedItem('address') as HTMLInputElement

                                            neighborhood.value = cep.data.value.neighborhood ?? neighborhood.value
                                            state.value = cep.data.value.state
                                            city.value = cep.data.value.city
                                            address.value = cep.data.value.street ?? ''
                                        })
                                    }
                                }}
                            />
                        </div>
                        <div class='flex flex-col justify-center items-center translate-y-3 underline gap-2 w-1/2'>
                            <a
                                href='https://buscacepinter.correios.com.br/app/endereco/index.php'
                                target='_blank'
                                class='font-medium text-blue-500'
                                rel='noreferrer'
                            >
                                Não sei o CEP
                            </a>
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-1/5'>
                            <span class='font-medium'>Número *</span>
                            <input
                                type='text'
                                name='addressNumber'
                                class='p-2 border border-zinc-500 h-11'
                                required
                                onInput={e => {
                                    e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '')
                                }}
                            />
                        </div>
                        <div class='flex flex-col gap-2 w-4/5'>
                            <span class='font-medium'>Complemento</span>
                            <input type='text' name='addressComplement' class='p-2 border border-zinc-500 h-11' />
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-full'>
                            <span class='font-medium'>Bairro *</span>
                            <input type='text' name='neighborhood' class='p-2 border border-zinc-500 h-11' required />
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-full'>
                            <span class='font-medium'>Referência de Entrega</span>
                            <input type='text' name='reference' class='p-2 border border-zinc-500 h-11' />
                        </div>
                    </div>
                    <button type='submit' class='cool-btn py-2 px-4 bg-[#005CB1] rounded text-zinc-100 text-lg mt-6'>
                        Cadastrar
                    </button>
                </form>
            ) : (
                <form
                    id='form-company'
                    class='flex flex-col gap-4 w-full max-w-[444px] p-4'
                    // biome-ignore format: ...
                    onSubmit={e => {
                    e.preventDefault()

                    const address = (e.currentTarget.elements.namedItem('address') as HTMLInputElement).value
                    const addressComplement = (e.currentTarget.elements.namedItem('addressComplement') as HTMLInputElement).value
                    const addressNumber = (e.currentTarget.elements.namedItem('addressNumber') as HTMLInputElement).value
                    const cep = (e.currentTarget.elements.namedItem('cep') as HTMLInputElement).value
                    const city = (e.currentTarget.elements.namedItem('city') as HTMLInputElement).value
                    const cnpj = (e.currentTarget.elements.namedItem('cnpj') as HTMLInputElement).value
                    const corporateName = (e.currentTarget.elements.namedItem('corporateName') as HTMLInputElement).value
                    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value
                    const neighborhood = (e.currentTarget.elements.namedItem('neighborhood') as HTMLInputElement).value
                    const newsletter = (e.currentTarget.elements.namedItem('newsletter') as HTMLInputElement).checked
                    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value
                    const passwordConfirmation = (e.currentTarget.elements.namedItem('passwordConfirmation') as HTMLInputElement).value
                    const receiverName = (e.currentTarget.elements.namedItem('receiverName') as HTMLInputElement).value
                    const reference = (e.currentTarget.elements.namedItem('reference') as HTMLInputElement).value
                    const reseller = (e.currentTarget.elements.namedItem('reseller') as HTMLInputElement).checked
                    const state = (e.currentTarget.elements.namedItem('state') as HTMLInputElement).value

                    const _primaryPhoneNumber = (e.currentTarget.elements.namedItem('primaryPhoneNumber') as HTMLInputElement).value
                    const primaryPhoneAreaCode = _primaryPhoneNumber.replace(/\D/g, '').slice(0, 2)
                    const primaryPhoneNumber = _primaryPhoneNumber.slice(5)

                    const _secondaryPhoneNumber = (e.currentTarget.elements.namedItem('secondaryPhoneNumber') as HTMLInputElement).value
                    const secondaryPhoneAreaCode = _secondaryPhoneNumber.replace(/\D/g, '').slice(0, 2)
                    const secondaryPhoneNumber = _secondaryPhoneNumber.slice(5)

                    const data = {
                        address,
                        addressComplement,
                        addressNumber,
                        cep,
                        city,
                        cnpj,
                        corporateName,
                        email,
                        neighborhood,
                        newsletter,
                        password,
                        passwordConfirmation,
                        primaryPhoneAreaCode,
                        primaryPhoneNumber,
                        receiverName,
                        reference,
                        reseller,
                        state,
                    } as Record<string, string | boolean>

                    if (_secondaryPhoneNumber) {
                        data.secondaryPhoneAreaCode = secondaryPhoneAreaCode
                        data.secondaryPhoneNumber = secondaryPhoneNumber
                    }

                    console.log(data)

                    invoke.wake.actions.signupCompany(data).then(console.log)
                }}
                >
                    <input type='hidden' name='address' />
                    <input type='hidden' name='state' />
                    <input type='hidden' name='city' />

                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>Email *</span>
                            <input type='email' name='email' class='p-2 border border-zinc-500 h-11' required />
                        </div>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>CNPJ *</span>
                            <input
                                type='text'
                                name='cnpj'
                                class='p-2 border border-zinc-500 h-11'
                                required
                                onInput={(e: { currentTarget: { value: string } }) => {
                                    e.currentTarget.value = e.currentTarget.value
                                        .replace(/\D/g, '')
                                        .replace(
                                            /^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})(.*)$/,
                                            (all, $1, $2, $3, $4, $5) => {
                                                let s = ''

                                                if ($1) s += $1
                                                if ($2) s += `.${$2}`
                                                if ($3) s += `.${$3}`
                                                if ($4) s += `/${$4}`
                                                if ($5) s += `-${$5}`

                                                return s
                                            },
                                        )
                                }}
                            />
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-full'>
                            <span class='font-medium'>Nome da empresa *</span>
                            <input type='text' name='corporateName' class='p-2 border border-zinc-500 h-11' required />
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>Senha *</span>
                            <input type='text' name='password' class='p-2 border border-zinc-500 h-11' required />
                        </div>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>Confirme a senha *</span>
                            <input
                                type='text'
                                name='passwordConfirmation'
                                class='p-2 border border-zinc-500 h-11'
                                required
                            />
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>Telefone principal *</span>
                            <input
                                type='tel'
                                name='primaryPhoneNumber'
                                class='p-2 border border-zinc-500 h-11'
                                required
                                onInput={(e: { currentTarget: { value: string } }) => {
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
                        </div>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>Telefone secundário</span>
                            <input
                                type='tel'
                                name='secondaryPhoneNumber'
                                class='p-2 border border-zinc-500 h-11'
                                onInput={(e: { currentTarget: { value: string } }) => {
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
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <label class='font-medium flex items-center gap-2 cursor-pointer'>
                            <input type='checkbox' name='newsletter' class='p-2 border border-zinc-500 h-11' />
                            Receber newsletter
                        </label>
                    </div>
                    <div class='flex gap-4'>
                        <label class='font-medium flex items-center gap-2 cursor-pointer'>
                            <input type='checkbox' name='reseller' class='p-2 border border-zinc-500 h-11' />
                            Desejo ser revendedor
                        </label>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-full'>
                            <span class='font-medium'>Quem vai receber a entrega? *</span>
                            <input type='text' name='receiverName' class='p-2 border border-zinc-500 h-11' required />
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-1/2'>
                            <span class='font-medium'>CEP *</span>
                            <input
                                type='text'
                                name='cep'
                                class='p-2 border border-zinc-500 h-11'
                                required
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

                                            const neighborhood = form.elements.namedItem(
                                                'neighborhood',
                                            ) as HTMLInputElement
                                            const state = form.elements.namedItem('state') as HTMLInputElement
                                            const city = form.elements.namedItem('city') as HTMLInputElement
                                            const address = form.elements.namedItem('address') as HTMLInputElement

                                            neighborhood.value = cep.data.value.neighborhood ?? neighborhood.value
                                            state.value = cep.data.value.state
                                            city.value = cep.data.value.city
                                            address.value = cep.data.value.street ?? ''
                                        })
                                    }
                                }}
                            />
                        </div>
                        <div class='flex flex-col justify-center items-center translate-y-3 underline gap-2 w-1/2'>
                            <a
                                href='https://buscacepinter.correios.com.br/app/endereco/index.php'
                                target='_blank'
                                class='font-medium text-blue-500'
                                rel='noreferrer'
                            >
                                Não sei o CEP
                            </a>
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-1/5'>
                            <span class='font-medium'>Número *</span>
                            <input
                                type='text'
                                name='addressNumber'
                                class='p-2 border border-zinc-500 h-11'
                                required
                                onInput={e => {
                                    e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '')
                                }}
                            />
                        </div>
                        <div class='flex flex-col gap-2 w-4/5'>
                            <span class='font-medium'>Complemento</span>
                            <input type='text' name='addressComplement' class='p-2 border border-zinc-500 h-11' />
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-full'>
                            <span class='font-medium'>Bairro *</span>
                            <input type='text' name='neighborhood' class='p-2 border border-zinc-500 h-11' required />
                        </div>
                    </div>
                    <div class='flex gap-4'>
                        <div class='flex flex-col gap-2 w-full'>
                            <span class='font-medium'>Referência de Entrega</span>
                            <input type='text' name='reference' class='p-2 border border-zinc-500 h-11' />
                        </div>
                    </div>
                    <button type='submit' class='cool-btn py-2 px-4 bg-[#005CB1] rounded text-zinc-100 text-lg mt-6'>
                        Cadastrar
                    </button>
                </form>
            )}
        </>
    )
}

function Products({ products }: { products: Product[] }) {
    return (
        <div class='flex flex-col px-4 divide-y divide-stone-300'>
            {products.map(p => {
                const { listPrice = 0, seller } = useOffer(p.offers)
                const cartProduct = cart.value.products!.find(i => i?.productVariantId === Number(p.productID))

                if (!cartProduct) return null

                const price = cartProduct.price

                return (
                    <div class='py-4'>
                        <div class='flex gap-4 items-center'>
                            <img
                                src={p.image?.[0].url || ''}
                                alt={p.name || ''}
                                class='size-32 border border-stone-300'
                            />
                            <div class='flex justify-between w-full'>
                                <div class='flex flex-col'>
                                    <div class='font-black uppercase'>{seller || 'ABACATE'}</div>
                                    <div class='text-sm'>{p.name}</div>
                                    <div class='flex flex-col gap-0.5 mt-5'>
                                        {p.additionalProperty?.map(i => (
                                            <div class='text-xs'>
                                                {i.name}: {i.value}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <table class='max-w-96 w-full'>
                                    <thead>
                                        <tr>
                                            <th class='pb-4 font-bold text-sm text-stone-400 text-center'>PREÇO</th>
                                            <th class='pb-4 font-bold text-sm text-stone-400 text-center'>
                                                QUANTIDADE
                                            </th>
                                            <th class='pb-4 font-bold text-sm text-stone-400 text-center'>SUBTOTAL</th>
                                            <th class='pb-4 font-bold text-sm text-stone-400 text-center' />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td class='text-center'>
                                                <span class={`block ${listPrice > price ? 'line-through' : ''}`}>
                                                    {formatPrice(Math.max(listPrice, price))}
                                                </span>
                                                {listPrice > price && (
                                                    <span class='text-red-700'>{formatPrice(price)}</span>
                                                )}
                                            </td>
                                            <td>
                                                <div class='flex gap-1 justify-center'>
                                                    <span class='text-lg font-medium w-12 border border-stone-300 flex items-center justify-center'>
                                                        {cartProduct.quantity}
                                                    </span>
                                                    <div class='flex flex-col gap-1'>
                                                        <button
                                                            type='button'
                                                            class='w-6 h-6 text-xl flex items-center justify-center border border-stone-300'
                                                            onClick={async () => {
                                                                await updateItem({
                                                                    productVariantId: Number(p.productID),
                                                                    quantity: cartProduct.quantity + 1,
                                                                })
                                                            }}
                                                        >
                                                            +
                                                        </button>
                                                        <button
                                                            type='button'
                                                            class='w-6 h-6 text-xl flex items-center justify-center border border-stone-300'
                                                            onClick={async () => {
                                                                await updateItem({
                                                                    productVariantId: Number(p.productID),
                                                                    quantity: cartProduct.quantity - 1,
                                                                })
                                                            }}
                                                        >
                                                            -
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class='text-center'>{formatPrice(price * cartProduct.quantity)}</td>
                                            <td class='text-center'>
                                                <button
                                                    type='button'
                                                    onClick={() =>
                                                        updateItem({
                                                            productVariantId: Number(p.productID),
                                                            quantity: 0,
                                                        })
                                                    }
                                                >
                                                    <Icon id='Trash' size={24} class='text-stone-500' />
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function Breadcrumb() {
    return (
        <div class='flex items-center gap-2'>
            <a href='/carrinho' class='text-sm font-bold'>
                Carrinho
            </a>
            <span class='text-sm'>{'>'}</span>
            <a href='/frete' class='text-sm'>
                Frete
            </a>
            <span class='text-sm'>{'>'}</span>
            <a href='/pagamento' class='text-sm'>
                Pagamento
            </a>
        </div>
    )
}
