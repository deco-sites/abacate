var Fbits = Fbits || {}

Fbits.Debug = {
    IsDebug: false
}
Fbits.Gateway = {
    Payments: new Array(),
    Pagamento: {
        Adicionar: (id, validate, pay, loaded) => {
            const asyncFunction = (async () => {}).constructor
            Fbits.Gateway.Payments.push({
                id,
                Validate: async () => {
                    if (validate) {
                        return validate instanceof asyncFunction ? await validate() : validate()
                    }
                    return true // Default to true if no validation function provided
                },
                Pay: async () => {
                    if (pay) {
                        try {
                            return pay instanceof asyncFunction ? await pay() : pay()
                        } catch (error) {
                            throw new Error(`Error in Pay method: ${error.message}`)
                        }
                    }
                    return // Return undefined if no pay function provided
                },
                Loaded: async () => {
                    if (loaded) {
                        try {
                            return loaded instanceof asyncFunction ? await loaded() : loaded()
                        } catch (e) {
                            console.error('Error in Loaded method: ', e.message)
                        }
                    } else {
                        console.log('There is no Loaded callback')
                    }
                },
            })
        },
    },
    ExecuteValidateCallbacks: async () =>
        await Promise.all(Fbits.Gateway.Payments.map(async payment => await payment.Validate())),
    ExecutePayCallbacks: async () =>
        await Promise.all(Fbits.Gateway.Payments.map(async payment => await payment.Pay())),
    ExecuteLoadedCallbacks: async () =>
        await Promise.all(Fbits.Gateway.Payments.map(async payment => await payment.Loaded())),
    ResetPaymentSelection: () => {
        Fbits.Gateway.Payments = new Array()
    },
}

function InitializeJpCardLibrary() {
    if (!document.querySelector('.card-wrapper')) {
        console.log('.card-wrapper não encontrado');
        return;
    }
    Fbits.Gateway.Framework._card = new Fbits.Gateway.Framework.Identificad
    o({
        form: '.fake-form',
        container: '.card-wrapper',
        // width: 200, // optional — default 350px
        // formatting: true, // optional - default true
        messages: {
            validDate: 'expiração\ndata', // optional - default 'valid\nthru'
            monthYear: 'mm/yyyy', // optional - default 'month/year'
        },
        placeholders: {
            number: '•••• •••• •••• ••••',
            name: 'Nome do Titular',
            expiry: '••/••',
            cvc: '•••'
        },
        masks: {
            cardNumber: '•' // optional - mask card number
        },
        // if true, will log helpful messages for setting up Card
        // debug: false // optional - default false
    });
}