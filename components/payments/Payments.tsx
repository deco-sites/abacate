import { computed, signal, useSignal, useSignalEffect } from "@preact/signals";
import type { Product } from "apps/commerce/types.ts";
import { useCart } from "apps/wake/hooks/useCart.ts";
import Image from "apps/website/components/Image.tsx";
import { invoke } from "../../runtime.ts";
import { formatPrice } from "../../sdk/format.ts";
import { useOffer } from "../../sdk/useOffer.ts";
import { Total } from "../carrinho/Carrinho.tsx";

// https://github.com/denoland/fresh/discussions/432#discussioncomment-3182480
import Cards from "https://esm.sh/react-credit-cards-2@1.0.2?alias=react:preact/compat&external=preact";

import { useUser } from "apps/wake/hooks/useUser.ts";
import type { AppContext } from "apps/wake/mod.ts";
import getFullProducts from "../../sdk/getFullProducts.ts";
import nonNullable from "../../sdk/nonNullable.ts";
import Loading from "../Loading.tsx";
import CheckoutBreadcrumb from "../ui/CheckoutBreadcrumb.tsx";
import { asset } from "$fresh/runtime.ts";

const paymentMethods = signal<
  Awaited<ReturnType<typeof invoke.wake.loaders.paymentMethods>>
>([]);
const paymentMethodsPrices = signal<
  Awaited<ReturnType<typeof invoke.wake.loaders.calculatePrices>>
>(null);
const products = signal([] as Product[]);
const paymentIsSet = signal(false);
const _loadedScripts = signal(0);

const number = signal("");
const month = signal("");
const year = signal("");
const expiry = signal("");
const cvc = signal("");
const name = signal("");

const { cart, updateItem, addCoupon, removeCoupon } = useCart();
const { user } = useUser();

const _deferredScripts = [
  "https://static.fbits.net/scripts/checkout/Fbits.Mask.js",
  "https://static.fbits.net/scripts/checkout/Fbits.Log.js",
  "https://static.fbits.net/app/ValidacaoCartaoCredito/fbits.cardPattern.js",
  "https://static.fbits.net/scripts/checkout/Fbits.Util.js",
  "https://static.fbits.net/scripts/checkout/Fbits.Gateway.Framework.js",
];

const _normalScripts = [
  asset("/scripts/fbits-gateway.js"),
  "https://code.jquery.com/jquery-3.7.1.min.js",
  "https://static.fbits.net/j/jquery.mask.min.js",
];

const cartProducts = computed(() =>
  (cart.value?.products || []).filter(nonNullable)
);

export default function () {
  // useSignalEffect(() => {
  //     if (loadedScripts.value < normalScripts.length) return

  //     for (const i of deferredScripts) {
  //         const script = document.createElement('script')
  //         script.src = i
  //         document.head.appendChild(script)
  //     }
  // })

  if (!cart.value.products) return <Loading />;

  const loading = useSignal(true);

  useSignalEffect(() => {
    (async () => {
      products.value = await getFullProducts();

      paymentMethods.value = await invoke.wake.loaders.paymentMethods();
      paymentMethodsPrices.value = await invoke.wake.loaders.calculatePrices({
        products: cartProducts.value.map((i) => ({
          productVariantId: i.productVariantId,
          quantity: i.quantity,
        })) || [],
      });

      loading.value = false;
      console.log(products.value);
    })();
  });

  if (loading.value) return <Loading />;

  return (
    <>
      {
        /* {normalScripts.map(i => (
                <script src={i} onLoad={() => loadedScripts.value++} />
            ))} */
      }

      <div class="container mx-auto max-w-[1330px] py-6 px-4 flex flex-col gap-4 min-h-screen">
        <CheckoutBreadcrumb />

        <div class="flex gap-4">
          <div class="flex flex-col gap-4 w-full">
            <PaymentMethods />
          </div>
          <div class="flex flex-col w-full">
            <Summary />
          </div>
        </div>
      </div>
    </>
  );
}

function Summary() {
  const loadingCoupon = useSignal(false);

  return (
    <>
      <div class="px-4 py-3 flex flex-col gap-2 w-full border border-stone-400">
        <div class="w-full flex justify-between items-center bg-stone-200 px-3 py-2">
          <h2 class="font-bold text-lg">RESUMO DE PEDIDO</h2>
          <span class="text-sm">
            {cartProducts.value.reduce((acc, cur) => acc + cur.quantity, 0)}
            {" "}
            itens
          </span>
        </div>

        <div class="flex flex-col gap-4">
          {products.value.map((i) => {
            const { seller, listPrice = 0 } = useOffer(i.offers);

            const cartProduct = cartProducts.value.find((ii) =>
              ii.productVariantId === Number(i.productID)
            );
            if (!cartProduct) return null;

            const price = cartProduct.price;

            const giftText = cartProduct.customization?.values
              ?.filter(nonNullable)
              .find((i) => i.name === "text");

            return (
              <div class="flex items-center">
                <Image
                  src={i.image?.[0].url ?? ""}
                  alt={i.name ?? ""}
                  width={80}
                  height={80}
                  class="border border-stone-300"
                />
                <div class="flex flex-col gap-1 ml-5 w-1/3">
                  <h3 class="font-black uppercase text-xs sm:text-sm">
                    {seller || "ABACATE"}
                  </h3>
                  <h4 class="text-xs">{i.name}</h4>
                  <div class="flex flex-col gap-1">
                    {i.additionalProperty?.map((i) => (
                      <div class="text-xs">
                        {i.name}: {i.value}
                      </div>
                    ))}
                  </div>
                  <div class="text-sm mt-2">
                    {cartProduct.customization?.values
                        ?.filter(nonNullable)
                        .some((i) => i.name === "isGift")
                      ? "Será entregue como presente"
                      : ""}
                  </div>
                  <div class="text-sm">{giftText ? giftText.value : ""}</div>
                </div>

                <div class="flex justify-center ml-auto">
                  <span class="text-lg font-medium w-10 border border-stone-300 flex items-center justify-center">
                    {cartProduct.quantity}
                  </span>
                  <div class="flex flex-col">
                    <button
                      type="button"
                      class="w-5 h-5 text-xl flex items-center justify-center border border-stone-300"
                      onClick={async () => {
                        await updateItem({
                          productVariantId: Number(i.productID),
                          quantity: cartProduct.quantity + 1,
                        });
                      }}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      class="w-5 h-5 text-xl flex items-center justify-center border border-stone-300"
                      onClick={async () => {
                        await updateItem({
                          productVariantId: Number(i.productID),
                          quantity: cartProduct.quantity - 1,
                        });
                      }}
                    >
                      -
                    </button>
                  </div>
                </div>

                <div class="flex flex-col gap-1 ml-auto">
                  <span
                    class={`block ${listPrice > price ? "line-through" : ""}`}
                  >
                    {formatPrice(Math.max(listPrice, price))}
                  </span>
                  {listPrice > price && (
                    <span class="text-red-700">{formatPrice(price)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div class="my-4 py-1 border-y border-stone-400 px-2 flex items-center justify-between gap-4">
          <p class="text-sm">CÓDIGO DE DESCONTO</p>

          <div class="flex-1">
            <form
              class="flex gap-3 justify-end items-center"
              onSubmit={async (e) => {
                e.preventDefault();

                loadingCoupon.value = true;
                if (cart.value.coupon) {
                  await removeCoupon({ coupon: cart.value.coupon });
                } else {
                  await addCoupon({ coupon: e.currentTarget.coupon.value });
                }
                loadingCoupon.value = false;
              }}
            >
              <input
                type="text"
                name="coupon"
                class="w-full bg-stone-100 text-stone-500 p-2 outline-0 disabled:opacity-40"
                placeholder="Digite Aqui"
                required
                defaultValue={cart.value.coupon ?? undefined}
                disabled={!!cart.value.coupon || loadingCoupon.value}
              />
              <button
                type="submit"
                disabled={loadingCoupon.value}
                class="border border-stone-500 text-sm p-2 cursor-pointer hover:bg-black hover:border-black hover:text-stone-100 transition-colors disabled:opacity-40"
              >
                {cart.value.coupon ? "REMOVER" : "APLICAR"}
              </button>
            </form>
          </div>
        </div>

        <Total shippingPrice={cart.value?.selectedShipping?.value} />
      </div>
      <button
        type="button"
        onClick={async () => {
          console.log(await invoke.wake.loaders.user(), user.value);

          const input = [
            ...(document.getElementsByName("payment") as NodeListOf<
              HTMLInputElement
            >),
          ].find(
            (i) => i.checked,
          ) as HTMLInputElement;

          const isCard =
            input.getAttribute("id")?.toLowerCase().startsWith("cartão") ??
              false;
          const isPix =
            input.getAttribute("id")?.toLowerCase().startsWith("pix") ?? false;
          const isBoleto =
            input.getAttribute("id")?.toLowerCase().startsWith("boleto") ??
              false;

          console.log({ isCard, isPix, isBoleto });

          if (isCard) {
            const cardForm = document.getElementById(
              "card-form",
            ) as HTMLFormElement;
            if (!cardForm.reportValidity()) return;

            console.log(user.value, {
              paymentData: {
                number: number.value,
                name: name.value,
                month: month.value,
                year: year.value,
                cvc: cvc.value,
                expiry: `${month.value}/${year.value}`,
                cpf: user.value?.cpf!,
              },
            });

            console.log(
              await invoke.wake.actions.completeCheckout({
                paymentData: {
                  number: number.value,
                  name: name.value,
                  month: month.value,
                  year: year.value,
                  cvc: cvc.value,
                  expiry: `${month.value}/${year.value}`,
                  cpf: user.value?.cpf!,
                },
                comments: `Comentário Card ${Date.now()}`,
              }),
            );

            console.log(cart.value?.orders);
            // location.href = '/confirmacao'
          } else if (isPix) {
            console.log(
              await invoke.wake.actions.completeCheckout({
                comments: `Comentário Pix ${Date.now()}`,
              }),
            );
          } else if (isBoleto) {
            console.log(
              await invoke.wake.actions.completeCheckout({
                paymentData: {
                  cpf: user.value?.cpf!,
                  telefone: user.value?.phoneNumber!,
                },
                comments: `Comentário Boleto ${Date.now()}`,
              }),
            );
          }

          await invoke.wake.loaders.cart();
          await invoke.wake.actions.associateCheckout();

          location.href = `/confirmacao?id=${cart.value.checkoutId}`;
        }}
        disabled={!paymentIsSet.value}
        class="bg-yellow-800 text-center text-white font-bold text-sm py-2.5 w-full transition-all ease-in-out duration-300 hover:brightness-90 mt-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        FINALIZAR COMPRA
      </button>
    </>
  );
}

function PaymentMethods() {
  const focused = useSignal<"name" | "number" | "expiry" | "cvc" | "">("");
  const paymentScripts = useSignal([] as string[]);

  return (
    <div class="flex flex-col gap-2 w-full border border-stone-400">
      <div class="w-full flex justify-between items-center bg-stone-200 px-3 py-2">
        <h2 class="font-bold text-lg">FORMAS DE PAGAMENTO</h2>
      </div>

      <div class="px-4 py-3 flex flex-col">
        <div class="px-4 py-3 flex flex-col gap-1.5 peer">
          {paymentMethods.value.map((i) => {
            if (!i.id) throw new Error("Payment method Id is nullable");
            const id = i.id;

            return (
              <label class="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  id={i.name ?? ""}
                  class="hidden peer"
                  onInput={async () => {
                    await invoke.wake.actions.selectPayment({
                      paymentMethodId: id,
                    });
                    paymentIsSet.value = true;
                    cart.value = await invoke.wake.loaders.cart();
                    paymentScripts.value =
                      cart.value?.selectedPaymentMethod?.scripts?.filter(
                        nonNullable,
                      ) ?? [];

                    // function loadScript(url: string) {
                    //     return new Promise<void>((resolve, reject) => {
                    //         const script = document.createElement('script')
                    //         script.type = 'text/javascript'
                    //         script.onload = () => {
                    //             console.log('Script carregado:', url)
                    //             resolve()
                    //         }
                    //         script.onerror = () => {
                    //             console.error('Não foi possível carregar o script:', url)
                    //             reject(new Error(`Script load error for ${url}`))
                    //         }
                    //         script.src = url
                    //         document.head.appendChild(script)
                    //     })
                    // }

                    // Promise.all(paymentScripts.value.map(script => loadScript(script)))
                    //     .then(() => {
                    //         console.log('Todos os scripts foram carregados com sucesso.')
                    //         globalThis.Fbits.Gateway.ExecuteLoadedCallbacks()
                    //     })
                    //     .catch(error => {
                    //         console.error('Erro ao carregar os scripts:', error)
                    //     })

                    // Formas de pagamento que montam o próprio formulário de cartão, como por exemplo:
                    // mercado pago, paypal, adyen, não precisa dessa lib!

                    // globalThis.InitializeJpCardLibrary()
                  }}
                />
                <div class="size-4 border border-stone-500 rounded-full flex justify-center items-center peer-checked:bg-black peer-checked:border-black">
                  <div class="size-1.5 bg-stone-100 rounded-full" />
                </div>
                {i.name}
              </label>
            );
          })}
        </div>

        {
          /* {loadedScripts.value === normalScripts.length && (
                    <div class='hidden peer-has-[input:checked]:flex'>
                        <div dangerouslySetInnerHTML={{ __html: cart.value?.selectedPaymentMethod?.html ?? '' }} />
                    </div>
                )} */
        }
        <div class="hidden peer-has-[input[id^=Cartão]:checked]:flex">
          {
            /* <div
                        dangerouslySetInnerHTML={{
                            __html: cart.value?.selectedPaymentMethod?.html ?? '',
                        }}
                    /> */
          }
        </div>

        <div class="hidden flex-col gap-6 peer-has-[input[id^=Cartão]:checked]:flex">
          <Cards
            number={number.value}
            expiry={expiry.value}
            cvc={cvc.value}
            name={name.value}
            focused={focused.value}
          />

          <form id="card-form" class="flex flex-col gap-3">
            <div class="flex flex-col gap-1 w-full">
              <span class="font-medium text-sm">Número do cartão</span>
              <input
                type="text"
                class="p-2 border border-stone-400 h-11"
                required
                pattern="\d{4} \d{4} \d{4} \d{4}"
                onInput={(e: { currentTarget: { value: string } }) => {
                  e.currentTarget.value = e.currentTarget.value
                    .replace(/\D/g, "")
                    .replace(
                      /^(\d{0,4})(\d{0,4})(\d{0,4})(\d{0,4})(.*)$/,
                      (_, $1, $2, $3, $4) => {
                        let s = "";

                        if ($1) s += $1;
                        if ($2) s += ` ${$2}`;
                        if ($3) s += ` ${$3}`;
                        if ($4) s += ` ${$4}`;

                        return s;
                      },
                    );

                  number.value = e.currentTarget.value;
                }}
                onFocus={() => {
                  focused.value = "number";
                }}
              />
            </div>

            <div class="flex flex-col gap-1 w-full">
              <span class="font-medium text-sm">
                Nome do titular (Como escrito no cartão)
              </span>
              <input
                type="text"
                required
                class="p-2 border border-stone-400 h-11"
                onChange={(e) => {
                  name.value = e.currentTarget.value;
                  focused.value = "name";
                }}
                onFocus={() => {
                  focused.value = "name";
                }}
              />
            </div>

            <div class="flex flex-col gap-1 w-full">
              <span class="font-medium text-sm">Validade</span>
              <div class="flex gap-1 items-center">
                <select
                  class="p-2 border border-stone-400 w-1/4 h-11 text-sm"
                  required
                  onChange={(e) => {
                    month.value = e.currentTarget.value;

                    expiry.value = `${month.value}/${year.value}`;
                  }}
                  onFocus={() => {
                    focused.value = "expiry";
                  }}
                >
                  <option disabled selected>
                    Mês
                  </option>
                  <option>01</option>
                  <option>02</option>
                  <option>03</option>
                  <option>04</option>
                  <option>05</option>
                  <option>06</option>
                  <option>07</option>
                  <option>08</option>
                  <option>09</option>
                  <option>10</option>
                  <option>11</option>
                  <option>12</option>
                </select>
                <select
                  class="p-2 border border-stone-400 w-1/4 h-11 text-sm"
                  required
                  onChange={(e) => {
                    year.value = e.currentTarget.value;

                    expiry.value = `${month.value}/${year.value}`;
                    focused.value = "expiry";
                  }}
                  onFocus={() => {
                    focused.value = "expiry";
                  }}
                >
                  <option value="2000" disabled selected>
                    Ano
                  </option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>1<option value="2028">
                    2028
                  </option>
                  <option value="2029">2029</option>
                  <option value="2030">2030</option>
                  <option value="2031">2031</option>
                  <option value="2032">2032</option>
                  <option value="2033">2033</option>
                  <option value="2034">2034</option>
                  <option value="2035">2035</option>
                  <option value="2036">2036</option>
                  <option value="2037">2037</option>
                  <option value="2038">2038</option>
                  <option value="2039">2039</option>
                  <option value="2040">2040</option>
                  <option value="2041">2041</option>
                  <option value="2042">2042</option>
                  <option value="2043">2043</option>
                  <option value="2044">2044</option>
                </select>
              </div>
            </div>

            <div class="flex flex-col gap-1 w-1/5">
              <span class="font-medium text-sm">CVC</span>
              <input
                type="text"
                required
                pattern="\d{3,4}"
                class="p-2 border border-stone-400 h-11"
                onInput={(e: { currentTarget: { value: string } }) => {
                  e.currentTarget.value = e.currentTarget.value
                    .replace(/\D/g, "")
                    .replace(/^(\d{0,4})(.*)$/, "$1");

                  cvc.value = e.currentTarget.value;
                }}
                onFocus={() => {
                  focused.value = "cvc";
                }}
              />
            </div>

            <div class="flex flex-col gap-1 w-full">
              <span class="font-medium text-sm">Parcelamento</span>
              <div class="flex gap-1 items-center">
                <select
                  class="p-2 border border-stone-400 w-full h-11 text-sm"
                  onChange={async (e) => {
                    const installment = e.currentTarget.value;

                    await invoke.wake.actions.selectInstallment({
                      installmentNumber: Number(installment),
                      selectedPaymentMethodId: cart.value?.selectedPaymentMethod
                        ?.id as string,
                    });
                  }}
                >
                  {paymentMethodsPrices.value?.installmentPlans
                    ?.find((i) => i?.displayName?.startsWith("Cartão"))
                    ?.installments?.filter(nonNullable)
                    .map((i) => (
                      <option value={i.number}>
                        {`${
                          i.number === 1 ? "À vista" : `${i.number} parcelas`
                        } ${formatPrice(i.value)} ${
                          i.fees ? "com" : "sem"
                        } juros`}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export async function loader(props: object, req: Request, ctx: AppContext) {
  const isLogged =
    !!(await ctx.invoke.wake.loaders.user({}, { signal: req.signal }));

  if (!isLogged) {
    // return redirect('/login')
  }

  return { ...props };
}
