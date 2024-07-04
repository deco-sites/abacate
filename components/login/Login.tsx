import { useCart } from 'apps/wake/hooks/useCart.ts'
import { invoke } from '../../runtime.ts'
import CheckoutBreadcrumb from '../ui/CheckoutBreadcrumb.tsx'
import { useEffect } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import { useUser } from 'apps/wake/hooks/useUser.ts'

export default function () {
    useCart()
    const socialLoginSetupEnded = useSignal(false)
    const { updateUser } = useUser()

    useEffect(() => {
        // @ts-ignore -
        globalThis.handleGSI = async ({
            credential,
        }: { clientId: string; client_id: string; credential: string; select_by: string }) => {
            const { logged } = (await invoke.wake.actions.loginGoogle({ userCredential: credential })) || {}

            location.href = '/signup?partial=1'
            if (!logged) {
            }

            await updateUser()
        }

        socialLoginSetupEnded.value = true
    }, [])

    return (
        <div class='container mx-auto max-w-[1330px] py-6 px-4 flex flex-col gap-4 min-h-screen'>
            <CheckoutBreadcrumb />

            <form
                id='form-person'
                class='flex flex-col gap-4 w-full max-w-[520px] p-4 m-auto pb-20'
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

            {socialLoginSetupEnded.value && (
                <>
                    <script src='https://accounts.google.com/gsi/client' async defer />
                    <div
                        id='g_id_onload'
                        data-client_id='131433210613-pcl0q19802bpcg3a73sk6682rbp7glsl.apps.googleusercontent.com'
                        data-callback='handleGSI'
                    />
                    <div class='g_id_signin' data-type='standard' />
                </>
            )}
        </div>
    )
}
