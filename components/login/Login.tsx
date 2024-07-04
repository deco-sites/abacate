import { useSignal } from '@preact/signals'
import { useCart } from 'apps/wake/hooks/useCart.ts'
import { useUser } from 'apps/wake/hooks/useUser.ts'
import { useEffect } from 'preact/hooks'
import { invoke } from '../../runtime.ts'
import CheckoutBreadcrumb from '../ui/CheckoutBreadcrumb.tsx'
import Icon from '../ui/Icon.tsx'

export default function () {
    useCart()
    const socialLoginSetupEnded = useSignal(false)
    const { updateUser } = useUser()

    useEffect(() => {
        // @ts-ignore -
        globalThis.handleGSI = async ({
            credential,
        }: { clientId: string; client_id: string; credential: string; select_by: string }) => {
            const { hasAccount } = (await invoke.wake.actions.loginGoogle({ userCredential: credential })) || {}

            const returnUrl = new URLSearchParams(location.search).get('returnUrl') ?? '/'

            if (hasAccount) {
                location.href = returnUrl
            } else {
                location.href = `/signup?partial=1&returnUrl=${returnUrl}`
            }

            await updateUser()
        }

        socialLoginSetupEnded.value = true
    }, [])

    return (
        <div class='container mx-auto max-w-[1330px] py-6 px-4 flex flex-col gap-4 min-h-screen'>
            <CheckoutBreadcrumb />

            <div class='max-w-[520px] w-full mx-auto'>
                <form
                    id='form-person'
                    class='flex flex-col gap-4 w-full p-4 m-auto pb-20'
                    onSubmit={async e => {
                        e.preventDefault()

                        const form = e.currentTarget as HTMLFormElement

                        const email = form.email.value
                        const password = form.password.value

                        await invoke.wake.actions.login({ input: email, pass: password }).then(console.log)
                        await invoke.wake.actions.associateCheckout()

                        await updateUser()
                    }}
                >
                    <div class='flex flex-col gap-4'>
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

                <div class='flex flex-col gap-4'>
                    {socialLoginSetupEnded.value && (
                        <div>
                            <script
                                src='https://accounts.google.com/gsi/client'
                                async
                                defer
                                onLoad={() => {
                                    const googleLoginWrapper = document.createElement('div')
                                    googleLoginWrapper.style.display = 'none'
                                    googleLoginWrapper.classList.add('google-login-wrapper')

                                    document.body.appendChild(googleLoginWrapper)

                                    // @ts-ignore -
                                    globalThis.google.accounts.id.renderButton(googleLoginWrapper, {
                                        type: 'icon',
                                        width: '200',
                                    })
                                }}
                            />

                            <div
                                id='g_id_onload'
                                data-client_id='131433210613-pcl0q19802bpcg3a73sk6682rbp7glsl.apps.googleusercontent.com'
                                data-callback='handleGSI'
                            />

                            <button
                                type='button'
                                class='flex items-center h-10 w-full bg-[#518ef8]'
                                onClick={() => {
                                    ;(document.querySelector('div[role=button]') as HTMLElement).click()
                                }}
                            >
                                <div class='h-full w-10 flex justify-center items-center bg-white border border-[#ccc] border-r-0'>
                                    <Icon id='Google' size={20} />
                                </div>
                                <span class='text-sm font-bold text-white w-full flex items-center justify-center'>
                                    ENTRAR COM GOOGLE
                                </span>
                            </button>
                        </div>
                    )}
                    <button
                        type='button'
                        class='border border-stone-500 text-sm font-bold p-2 cursor-pointer hover:bg-black hover:border-black hover:text-stone-100 transition-colors'
                        onClick={() => {
                            const returnUrl = new URLSearchParams(location.search).get('returnUrl') ?? '/'

                            location.href = `/signup?partial=1&returnUrl=${returnUrl}`
                        }}
                    >
                        CADASTRE-SE EM NOSSA LOJA
                    </button>
                </div>
            </div>
        </div>
    )
}
