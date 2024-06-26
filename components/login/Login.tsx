import { useCart } from 'apps/wake/hooks/useCart.ts'
import { invoke } from '../../runtime.ts'
import CheckoutBreadcrumb from '../ui/CheckoutBreadcrumb.tsx'

export default function () {
    useCart()

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
        </div>
    )
}
