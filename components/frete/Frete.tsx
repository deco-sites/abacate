import { computed, signal, useSignal, useSignalEffect } from "@preact/signals";
import type { Product } from "apps/commerce/types.ts";
import { useCart } from "apps/wake/hooks/useCart.ts";
import { useUser } from "apps/wake/hooks/useUser.ts";
import Image from "apps/website/components/Image.tsx";
import { invoke } from "../../runtime.ts";
import debounce from "../../sdk/debounce.ts";
import { formatPrice } from "../../sdk/format.ts";
import getFullProducts from "../../sdk/getFullProducts.ts";
import nonNullable from "../../sdk/nonNullable.ts";
import useCEP from "../../sdk/useCEP.ts";
import { useId } from "../../sdk/useId.ts";
import { useOffer } from "../../sdk/useOffer.ts";
import { formatShipping, Total } from "../carrinho/Carrinho.tsx";
import CheckoutBreadcrumb from "../ui/CheckoutBreadcrumb.tsx";
import Icon from "../ui/Icon.tsx";

const address = signal<
  Awaited<ReturnType<typeof invoke.wake.loaders.userAddresses>>
>([]);
const shipping = signal<
  Awaited<ReturnType<typeof invoke.wake.actions.shippingSimulation>>
>(null);
const customizations = signal<
  Record<
    string,
    Awaited<ReturnType<typeof invoke.wake.loaders.productCustomizations>>
  >
>({});

const products = signal([] as Product[]);

const cartProducts = computed(() =>
  (cart.value?.products || []).filter(nonNullable)
);

const { user, loading: loadingUser } = useUser();
const { cart, updateItem, addCoupon, removeCoupon, updateCart, addItem } =
  useCart();

export default function () {
  const loading = useSignal(true);
  const isFirstLoad = useSignal(true);

  useSignalEffect(() => {
    (async () => {
      if (!isFirstLoad.value || (!user.value && loadingUser.value)) return;

      if (user.value) {
        address.value = await invoke.wake.loaders.userAddresses();

        if (address.value.length && cart.value?.selectedAddress) {
          shipping.value = await invoke.wake.actions.shippingSimulation({
            simulateCartItems: true,
            useSelectedAddress: true,
          });
        }
      }

      loading.value = false;
      isFirstLoad.value = false;
    })();
  });

  useSignalEffect(() => {
    (async () => {
      products.value = await getFullProducts();

      const cartProducts = (cart.value?.products || []).filter(nonNullable);
      if (!cartProducts.length) return;

      customizations.value = Object.fromEntries(
        await Promise.all(
          cartProducts.map(async (p) => [
            p.productId,
            await invoke.wake.loaders.productCustomizations({
              productId: p.productId,
            }),
          ]),
        ),
      );

      console.log({
        products: products.value,
        customizations: customizations.value,
      });
    })();
  });

  if (loading.value) return null;

  return (
    <div class="container mx-auto max-w-[1330px] py-6 px-4 flex flex-col gap-4 min-h-screen">
      <CheckoutBreadcrumb />

      <div class="flex gap-4">
        <div class="flex flex-col gap-4 w-full">
          <ShippingAddress />
          <ShippingOptions />
          <Gift />
        </div>
        <div class="flex flex-col w-full">
          <Summary />
        </div>
      </div>
    </div>
  );
}

function Gift() {
  const step = useSignal<"select" | "message">("select");
  const selectedProducts = useSignal([] as Product[]);

  return (
    <div class="w-full border border-stone-400">
      <input type="checkbox" checked class="peer hidden" id="gift-checkbox" />

      <label
        for="gift-checkbox"
        class="w-full flex justify-between items-center bg-stone-200 px-3 py-2 group cursor-pointer"
      >
        <h2 class="font-bold text-lg">EMBALAGEM PARA PRESENTE</h2>
        <span class="hidden peer-checked:group-[]:block text-xl select-none">
          -
        </span>
        <span class="block peer-checked:group-[]:hidden text-xl select-none">
          +
        </span>
      </label>

      <div class="grid grid-rows-[0fr] peer-checked:grid-rows-[1fr] transition-all">
        <div class="overflow-hidden">
          <div class="px-4 py-3 flex flex-col">
            <div class="flex flex-col gap-2 text-black">
              <span class="text-sm">
                Selecione quais itens você deseja incluir embalagem para
                presente:
              </span>
              <span class="text-xs">
                Os itens serão todos embalados separadamente
              </span>
            </div>

            <div class="flex flex-col divide-y divide-stone-300 border-y border-y-stone-300 mb-2 mt-4">
              {step.value === "select"
                ? (
                  <>
                    {products.value.map((i) => {
                      if (
                        !i.inProductGroupWithID ||
                        !customizations.value[i.inProductGroupWithID]
                          ?.customizations?.length
                      ) {
                        return null;
                      }

                      const { seller } = useOffer(i.offers);
                      const cartProduct = cartProducts.value.find(
                        (ii) => ii?.productVariantId === Number(i?.productID),
                      );

                      if (!cartProduct) return null;

                      return (
                        <label class="flex items-center gap-5 py-3 px-1 cursor-pointer">
                          <input
                            type="checkbox"
                            class="peer hidden"
                            onInput={(e) => {
                              if (e.currentTarget.checked) {
                                selectedProducts.value = [
                                  ...selectedProducts.value,
                                  i,
                                ];
                              } else {
                                selectedProducts.value = selectedProducts.value
                                  .filter(
                                    (ii) => ii.productID !== i.productID,
                                  );
                              }
                            }}
                          />

                          <div class="size-4 border border-black flex justify-center items-center peer-checked:bg-black">
                            <Icon id="Check" size={16} class="text-white" />
                          </div>

                          <Image
                            src={i.image?.[0].url ?? ""}
                            alt={i.name ?? ""}
                            width={48}
                            height={56}
                            class="border border-stone-300"
                          />

                          <div class="flex flex-col gap-2">
                            <h3 class="font-black uppercase text-xs sm:text-sm">
                              {seller || "ABACATE"}
                            </h3>
                            <h4 class="text-black text-sm">{i.name}</h4>
                          </div>

                          <span class="text-sm block ml-auto whitespace-nowrap">
                            Qtd: {cartProduct.quantity}
                          </span>
                        </label>
                      );
                    })}
                  </>
                )
                : (
                  <>
                    {selectedProducts.value.map((i) => {
                      const { seller } = useOffer(i.offers);
                      const cartProduct = cartProducts.value.find(
                        (ii) => ii?.productVariantId === Number(i?.productID),
                      );

                      if (!cartProduct) return null;
                      const id = useId();

                      return (
                        <div
                          data-product-id={i.inProductGroupWithID}
                          class="flex flex-col py-3"
                        >
                          <div class="flex items-center gap-5 px-1">
                            <Image
                              src={i.image?.[0].url ?? ""}
                              alt={i.name ?? ""}
                              width={48}
                              height={56}
                              class="border border-stone-300"
                            />

                            <div class="flex flex-col gap-2">
                              <h3 class="font-black uppercase text-xs sm:text-sm">
                                {seller || "ABACATE"}
                              </h3>
                              <h4 class="text-black text-sm">{i.name}</h4>
                            </div>
                          </div>

                          <input
                            id={`yes-${id}`}
                            type="radio"
                            name={`gift-message-${id}`}
                            class="peer/yes hidden"
                          />
                          <input
                            id={`no-${id}`}
                            type="radio"
                            name={`gift-message-${id}`}
                            class="peer/no hidden"
                            checked
                          />

                          <div class="flex items-center mt-6 group">
                            <span class="text-sm text-black font-bold">
                              GOSTARIA DE ADICIONAR UMA MENSAGEM?
                            </span>

                            <div class="flex items-center gap-2 ml-auto">
                              <label
                                for={`yes-${id}`}
                                class="cursor-pointer py-2 px-4 font-bold border border-black hover:bg-stone-300 transition-colors peer-checked/yes:group-[]:bg-stone-300"
                              >
                                SIM
                              </label>
                              <label
                                for={`no-${id}`}
                                class="cursor-pointer py-2 px-4 font-bold border border-black hover:bg-stone-300 transition-colors peer-checked/no:group-[]:bg-stone-300"
                              >
                                NÃO
                              </label>
                            </div>
                          </div>

                          <form class="hidden peer-checked/yes:flex flex-col gap-2 mt-2">
                            <div class="flex items-center gap-2">
                              <input
                                type="text"
                                name="from"
                                placeholder="De"
                                class="w-full border border-stone-300 p-2 outline-0"
                              />
                              <input
                                type="text"
                                name="to"
                                placeholder="Para"
                                class="w-full border border-stone-300 p-2 outline-0"
                              />
                            </div>
                            <textarea
                              name="message"
                              placeholder="Mensagem"
                              class="w-full border border-stone-300 p-2 outline-0 h-24"
                            />
                          </form>
                        </div>
                      );
                    })}
                  </>
                )}
            </div>

            <div class="flex items-center justify-end gap-4">
              {step.value !== "select" && (
                <button
                  type="button"
                  onClick={() => {
                    step.value = "select";
                  }}
                  class="underline text-black text-sm hover:no-underline cursor-pointer"
                >
                  VOLTAR
                </button>
              )}
              <button
                type="button"
                disabled={selectedProducts.value.length === 0}
                onClick={async () => {
                  if (step.value === "select") {
                    step.value = "message";
                  } else {
                    for (
                      const i of document.querySelectorAll("[data-product-id]")
                    ) {
                      const productID = i?.getAttribute("data-product-id");
                      if (!productID) {
                        throw new Error("Product ID not found in cart");
                      }

                      const yes = i?.querySelector<HTMLInputElement>(
                        '[id^="yes"]',
                      )?.checked;
                      const no = i?.querySelector<HTMLInputElement>(
                        '[id^="no"]',
                      )?.checked;
                      const customization = customizations.value[productID];
                      const isGift = customization?.customizations
                        ?.filter(nonNullable)
                        .find((i) => i.name === "isGift");
                      const text = customization?.customizations
                        ?.filter(nonNullable)
                        .find((i) => i.name === "text");
                      const form = i?.querySelector<HTMLFormElement>("form");

                      if (!isGift) {
                        throw new Error("isGift not found in customization");
                      }
                      if (!text) {
                        throw new Error("text not found in customization");
                      }
                      if (!form) throw new Error("Form not found in product");
                      if (!customization) {
                        throw new Error(
                          `Customization not found for product ${productID}`,
                        );
                      }

                      const from = form.from.value;
                      const to = form.to.value;
                      const message = form.message.value;

                      await updateItem({
                        productVariantId: Number(productID),
                        quantity: 0,
                      });

                      if (yes) {
                        await addItem({
                          productVariantId: customization.productVariantId,
                          quantity: 1,
                          customization: [
                            {
                              customizationId: isGift.customizationId,
                              value: "Sim",
                            },
                            {
                              customizationId: text.customizationId,
                              value: `De: ${from} \nPara: ${to} \n${message}`,
                            },
                          ],
                        });
                      } else if (no) {
                        await addItem({
                          productVariantId: customization.productVariantId,
                          quantity: 1,
                          customization: [
                            {
                              customizationId: isGift.customizationId,
                              value: "Sim",
                            },
                          ],
                        });
                      }
                    }
                  }
                }}
                class="mt-2 w-full max-w-[240px] border border-stone-500 text-sm p-2 cursor-pointer hover:bg-black hover:border-black hover:text-stone-100 transition-all disabled:opacity-40 peer-checked:hidden"
              >
                {step.value === "select" ? "SELECIONAR" : "ADICIONAR"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Summary() {
  const loadingCoupon = useSignal(false);

  return (
    <>
      <div class="px-4 py-3 flex flex-col gap-2 w-full border border-stone-400">
        <div class="w-full flex justify-between items-center bg-stone-200 px-3 py-2">
          <h2 class="font-bold text-lg">RESUMO DO PEDIDO</h2>
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
              ii?.productVariantId === Number(i?.productID)
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
                  <div class="font-black uppercase">{seller || "ABACATE"}</div>
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
        onClick={() => {
          location.href = "/pagamento";
        }}
        disabled={!cart.value?.selectedShipping}
        class="bg-yellow-800 text-center text-white font-bold text-sm py-2.5 w-full transition-all ease-in-out duration-300 hover:brightness-90 mt-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        IR PARA PAGAMENTO
      </button>
    </>
  );
}

function ShippingOptions() {
  return (
    <div class="flex flex-col gap-2">
      <div class="border border-stone-400 w-full">
        <h2 class="w-full px-3 py-2 font-bold text-lg bg-stone-200">
          OPÇÕES DE FRETE
        </h2>
      </div>

      <div class="border border-stone-400 w-full">
        <div class="px-3 py-3 flex justify-between items-center bg-stone-200">
          <h2 class="text-sm font-bold text-stone-500">ENVIO 01</h2>
          <p class="text-sm">
            Vendido e entregue por:{" "}
            <span class="uppercase font-black ml-2">ABACATE</span>
          </p>
        </div>

        <div class="px-3 py-5 flex items-center gap-4">
          <span class="text-sm font-bold whitespace-nowrap">
            OPÇÕES DE FRETE
          </span>

          <select
            name="shipping"
            class="w-full px-4 py-2 text-sm text-black border border-stone-500 outline-0"
            onChange={async (e) => {
              await invoke.wake.actions.selectShipping({
                shippingQuoteId: e.currentTarget.value,
              });
              await updateCart();
            }}
          >
            <option disabled selected={!cart.value?.selectedShipping?.value}>
              Selecione
            </option>
            {(shipping.value ?? [])
              .filter(nonNullable)
              .toSorted((a, b) => a.value - b.value)
              .map((i) => (
                <option
                  value={i.shippingQuoteId}
                  selected={cart.value?.selectedShipping?.shippingQuoteId ===
                    i.shippingQuoteId}
                >
                  {formatShipping(i)}
                </option>
              ))}
          </select>
        </div>

        <div class="w-full h-px bg-stone-500" />

        <div class="flex flex-col divide-y divide-stone-300">
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
              <div class="p-3 flex items-center">
                <Image
                  src={i.image?.[0].url ?? ""}
                  alt={i.name ?? ""}
                  width={140}
                  height={140}
                  class="border border-stone-300"
                />
                <div class="flex flex-col gap-1 ml-5">
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

                <div class="flex flex-col gap-1 ml-auto">
                  <p class="font-bold text-stone-300 whitespace-nowrap text-xs sm:text-sm">
                    PREÇO UN.
                  </p>
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
      </div>
    </div>
  );
}

function ShippingAddress() {
  if (!address.value) return null;

  const cep = useCEP();
  const cepDebounce = debounce(500);

  return (
    <div class="border border-stone-400 w-full">
      <h2 class="w-full px-3 py-2 font-bold text-lg bg-stone-200">
        ENDEREÇO DE ENVIO
      </h2>
      <div class="px-3 py-5 flex flex-col items-start gap-4">
        <div class="flex flex-wrap gap-4">
          {address.value.map((a) => {
            if (!a.id) throw new Error("a.id is nullable");
            const id = a.id;

            return (
              <button
                type="button"
                class="border border-stone-800 p-3 max-w-72 flex flex-col hover:bg-stone-300 transition-colors relative"
                onClick={async () => {
                  await invoke.wake.actions.selectAddress({ addressId: id });
                  await updateCart();
                  shipping.value = await invoke.wake.actions.shippingSimulation(
                    {
                      simulateCartItems: true,
                      useSelectedAddress: true,
                    },
                  );
                }}
              >
                {cart.value?.selectedAddress?.id === id && (
                  <span class="absolute top-0 right-0 bg-black flex items-center p-1">
                    <Icon id="AddressCheck" size={18} strokeWidth={1} />
                  </span>
                )}

                <span class="text-sm">{a.name}</span>
                <span class="text-sm">
                  {a.street ?? ""}, {a.addressNumber ?? ""}
                </span>
                <span class="text-sm">
                  {a.city ?? ""}, {a.neighborhood ?? ""}, {a.state ?? ""},{" "}
                  {a.cep ?? ""}, {a.country ?? ""} - Tel: {a.phone ?? ""}
                </span>
              </button>
            );
          })}
        </div>

        <input type="checkbox" id="add-new-address" class="hidden peer" />
        <label
          for="add-new-address"
          class="border border-stone-500 text-sm font-bold p-2 cursor-pointer hover:bg-black hover:border-black hover:text-stone-100 transition-colors disabled:opacity-40 peer-checked:hidden"
        >
          NOVO ENDEREÇO
        </label>

        <form
          class="px-3.5 pt-2 pb-6 gap-2.5 grid-cols-2 w-full hidden peer-checked:grid"
          onSubmit={async (e) => {
            e.preventDefault();

            const addressDetails = e.currentTarget.addressDetails.value;
            const addressNumber = e.currentTarget.addressNumber.value;
            const city = e.currentTarget.city.value;
            const neighborhood = e.currentTarget.neighborhood.value;
            const phone = e.currentTarget.phone.value;
            const name = e.currentTarget.receiverName.value;
            const state = e.currentTarget.state.value;
            const street = e.currentTarget.street.value;
            const cep = e.currentTarget.cep.value;

            console.log(
              await invoke.wake.actions.createAddress({
                addressDetails,
                addressNumber,
                city,
                cep,
                country: "BR",
                email: user.value!.email,
                name,
                neighborhood,
                phone,
                state,
                street,
              }),
            );

            address.value = await invoke.wake.loaders.userAddresses();

            if (!cart.value?.selectedAddress) {
              await invoke.wake.actions.selectAddress({
                addressId: address.value.at(-1)?.id ?? "",
              });
            }

            await Promise.all([
              updateCart(),
              async () => {
                shipping.value = await invoke.wake.actions.shippingSimulation({
                  simulateCartItems: true,
                  useSelectedAddress: true,
                });
              },
            ]);

            document.getElementById("add-new-address")?.click();
          }}
        >
          <input
            type="text"
            placeholder="Nome do Destinatário *"
            name="receiverName"
            required
            class="col-span-2 text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2"
          />
          <input
            type="text"
            placeholder="Cep *"
            name="cep"
            required
            class="text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2"
            onInput={(e) => {
              const v = e.currentTarget.value
                .replace(/\D/g, "")
                .replace(/^(\d{0,5})(\d{0,3})(.*)$/, (_, $1, $2) => {
                  let s = "";

                  if ($1) s += $1;
                  if ($2) s += `-${$2}`;

                  return s;
                });

              e.currentTarget.value = v;
              const form = e.currentTarget.form;

              if (!form) return;

              if (e.currentTarget.value.length === 9) {
                cepDebounce(async () => {
                  await cep.set(v.replace("-", ""));

                  form.neighborhood.value = cep.data.value.neighborhood ??
                    form.neighborhood.value;
                  form.state.value = cep.data.value.state;
                  form.city.value = cep.data.value.city;
                  form.street.value = cep.data.value.street ?? "";
                });
              }
            }}
          />

          <a
            href="https://buscacepinter.correios.com.br/app/endereco/index.php"
            target="_blank"
            class="font-medium text-stone-500 text-sm flex items-center underline"
            rel="noreferrer"
          >
            Não sei o CEP
          </a>
          <input
            type="text"
            placeholder="Rua *"
            name="street"
            required
            class="col-span-2 text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2"
          />
          <input
            type="text"
            placeholder="Número *"
            name="addressNumber"
            required
            class="text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2"
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
            }}
          />
          <input
            type="text"
            placeholder="Complemento"
            name="addressDetails"
            class="text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2"
          />
          <input
            type="text"
            placeholder="Bairro *"
            name="neighborhood"
            required
            class="text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2"
          />
          <input
            type="text"
            placeholder="Cidade *"
            name="city"
            required
            class="text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2"
          />
          <select
            required
            name="state"
            class="text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2"
          >
            <option value="" disabled selected>
              Estado *
            </option>
            <option value="AC">Acre</option>
            <option value="AL">Alagoas</option>
            <option value="AP">Amapá</option>
            <option value="AM">Amazonas</option>
            <option value="BA">Bahia</option>
            <option value="CE">Ceará</option>
            <option value="DF">Distrito Federal</option>
            <option value="ES">Espírito Santo</option>
            <option value="GO">Goiás</option>
            <option value="MA">Maranhão</option>
            <option value="MT">Mato Grosso</option>
            <option value="MS">Mato Grosso do Sul</option>
            <option value="MG">Minas Gerais</option>
            <option value="PA">Pará</option>
            <option value="PB">Paraíba</option>
            <option value="PR">Paraná</option>
            <option value="PE">Pernambuco</option>
            <option value="PI">Piauí</option>
            <option value="RJ">Rio de Janeiro</option>
            <option value="RN">Rio Grande do Norte</option>
            <option value="RS">Rio Grande do Sul</option>
            <option value="RO">Rondônia</option>
            <option value="RR">Roraima</option>
            <option value="SC">Santa Catarina</option>
            <option value="SP">São Paulo</option>
            <option value="SE">Sergipe</option>
            <option value="TO">Tocantins</option>
          </select>
          <input
            type="text"
            placeholder="Telefone *"
            name="phone"
            required
            class="text-sm text-stone-500 border border-stone-400 placeholder:text-stone-400 px-3.5 py-2"
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value
                .replace(/\D/g, "")
                .replace(
                  /^(\d?)(\d?)(\d{0,5})(\d{0,4})(.*)$/,
                  (_, $1, $2, $3, $4) => {
                    let s = "";

                    if ($1) s += `(${$1}${$2}`;
                    if ($3) s += `) ${$3}`;
                    if ($4) s += `-${$4}`;

                    return s;
                  },
                );
            }}
          />
          <button
            type="submit"
            class="col-span-2 mt-2 border border-stone-500 text-sm hover:bg-black hover:border-black hover:text-stone-100 transition-colors py-2 disabled:opacity-40"
          >
            CADASTRAR
          </button>
        </form>
      </div>
    </div>
  );
}
