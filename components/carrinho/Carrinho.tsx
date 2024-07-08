import {
  signal,
  useComputed,
  useSignal,
  useSignalEffect,
} from "@preact/signals";
import type { Product } from "apps/commerce/types.ts";
import { useCart } from "apps/wake/hooks/useCart.ts";
import { useEffect } from "preact/hooks";
import { invoke } from "../../runtime.ts";
import { formatPrice } from "../../sdk/format.ts";
import getFullProducts from "../../sdk/getFullProducts.ts";
import nonNullable from "../../sdk/nonNullable.ts";
import { useOffer } from "../../sdk/useOffer.ts";
import CheckoutBreadcrumb from "../ui/CheckoutBreadcrumb.tsx";
import Icon from "../ui/Icon.tsx";
import { useUser } from "apps/wake/hooks/useUser.ts";
import Loading from "../Loading.tsx";

const { cart, updateItem, addCoupon } = useCart();
const { user } = useUser();

const shippingLoading = signal(false);
const shipping = signal<
  Awaited<ReturnType<typeof invoke.wake.actions.shippingSimulation>>
>(null);
const checkoutCoupon = signal<
  Awaited<ReturnType<typeof invoke.wake.loaders.checkoutCoupon>>
>(null);
const products = signal([] as Product[]);

export default function () {
  const loading = useSignal(true);
  const cartProducts = useComputed(() =>
    (cart.value?.products || []).filter(nonNullable)
  );

  if (Object.keys(cart.value || {}).length === 0) return null;
  if (cartProducts.value.length === 0) {
    return (
      <div class="flex flex-col gap-4 justify-center items-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <span class="text-sm">NENHUM PRODUTO ADICIONADO AO CARRINHO</span>
        <a
          href="/"
          class="block text-sm font-bold text-white bg-black px-4 py-2"
        >
          CONTINUAR COMPRANDO
        </a>
      </div>
    );
  }

  useSignalEffect(() => {
    (async () => {
      products.value = await getFullProducts();
    })();
  });

  useEffect(() => {
    (async () => {
      checkoutCoupon.value = await invoke.wake.loaders.checkoutCoupon();

      loading.value = false;
    })();
  }, []);

  if (loading.value) return <Loading />;

  return (
    <div class="p-4 flex flex-col gap-4 min-h-screen container mx-auto max-w-[1330px]">
      <CheckoutBreadcrumb />

      <div class="flex items-start gap-6">
        <div class="flex flex-col w-full">
          <div class="px-3 py-3 flex justify-between items-center bg-stone-200">
            <h2 class="text-sm font-bold text-stone-500">ENVIO 01</h2>
            <p class="text-sm">
              Vendido e entregue por:{" "}
              <span class="uppercase font-black ml-2">ABACATE</span>
            </p>
          </div>

          <Products />
          <ShippingOptions />
        </div>
        <div class="p-4 border border-stone-300 flex flex-col gap-4 divider-y divider-stone-300">
          <Shipping />
          <div class="w-full h-px bg-stone-400 my-2" />
          <Coupon />
          <div class="w-full h-px bg-stone-400 my-2" />
          <Total shippingPrice={cart.value?.selectedShipping?.value} />
          <a
            href={user.value ? "/frete" : "/login?returnUrl=/frete"}
            class="bg-yellow-800 text-center text-white font-bold text-sm py-2.5 w-full transition-all ease-in-out duration-300 hover:brightness-90 mt-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            FINALIZAR COMPRA
          </a>
        </div>
      </div>
    </div>
  );
}

export function formatShipping(
  shipping: NonNullable<
    Awaited<ReturnType<typeof invoke.wake.actions.shippingSimulation>>
  >[number],
) {
  if (!shipping) throw new Error("Shipping null or undefined");

  const price = shipping.value === 0 ? "Grátis" : formatPrice(shipping.value);
  const name = shipping.name;
  const deadline = shipping.type === "Retirada"
    ? shipping.deadline === 0
      ? "Poderá ser retirado hoje"
      : `Poderá ser retirado em ${shipping.deadline} dias úteis`
    : shipping.deadline === 0
    ? "Será entrege hoje"
    : `Até ${shipping.deadline} dias úteis para a entrega`;

  return `${price} - ${name} - ${deadline}`;
}

function ShippingOptions() {
  return (
    <div class="flex items-center border border-stone-300 px-3 py-2 ml-4 gap-4 h-14">
      {shipping.value && (
        <>
          <span class="text-sm font-bold text-stone-500 whitespace-nowrap">
            OPÇÕES DE FRETE
          </span>
          <select
            name="shipping"
            class="w-full px-4 py-2 text-sm text-black border border-stone-300 outline-0"
            onChange={(e) =>
              invoke.wake.actions.selectShipping({
                shippingQuoteId: e.currentTarget.value,
              })}
          >
            <option disabled selected>
              Selecione
            </option>
            {shipping.value
              .filter(nonNullable)
              .toSorted((a, b) => a.value - b.value)
              .map((i) => (
                <option value={i.shippingQuoteId}>{formatShipping(i)}</option>
              ))}
          </select>
        </>
      )}

      <div class="flex items-center gap-3 ml-auto">
        <span class="text-sm font-bold text-stone-500">SUBTOTAL</span>
        <span class="text-sm font-bold text-stone-950">
          {formatPrice(cart.value.subtotal)}
        </span>
      </div>
    </div>
  );
}

function Shipping() {
  async function onSubmit(cep: string) {
    shippingLoading.value = true;
    shipping.value = await invoke.wake.actions.shippingSimulation({
      simulateCartItems: true,
      cep,
    });
    shippingLoading.value = false;
  }

  return (
    <form
      class="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e.currentTarget.cep.value.replace(/\D/g, ""));
      }}
    >
      <span class="text-sm font-bold">ESTIMATIVA DE FRETE</span>
      <input
        type="text"
        name="cep"
        class="p-2 border border-stone-300 h-11 text-stone-800 outline-0"
        placeholder="01001-000"
        required
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
        }}
      />
      <button
        type="submit"
        class="border border-stone-300 text-sm hover:bg-black hover:border-black hover:text-stone-100 transition-colors py-2 disabled:opacity-40"
        disabled={shippingLoading.value}
      >
        {shippingLoading.value ? "CALCULANDO" : "CALCULAR"}
      </button>
    </form>
  );
}

function Coupon() {
  const loading = useSignal(false);

  async function onSubmit(coupon: string) {
    loading.value = true;
    await addCoupon({ coupon });
    checkoutCoupon.value = coupon;
    loading.value = false;
  }

  return (
    <form
      class="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e.currentTarget.coupon.value);
      }}
    >
      <span class="text-sm font-bold">CÓDIGO DE DESCONTO / GIFT CARD</span>
      <input
        type="text"
        name="coupon"
        class="p-2 border border-stone-300 h-11 text-stone-800 outline-0 disabled:opacity-40"
        placeholder="Digite aqui"
        required
        defaultValue={checkoutCoupon.value || undefined}
        disabled={loading.value || !!checkoutCoupon.value}
      />
      <button
        type="submit"
        class="border border-stone-300 text-sm hover:bg-black hover:border-black hover:text-stone-100 transition-colors py-2 disabled:opacity-40"
        disabled={loading.value || !!checkoutCoupon.value}
      >
        {loading.value
          ? "APLICANDO"
          : checkoutCoupon.value
          ? "CUPOM APLICADO COM SUCESSO!"
          : "APLICAR"}
      </button>
    </form>
  );
}

export function Total({ shippingPrice }: { shippingPrice?: number }) {
  return (
    <div class="flex flex-col gap-1">
      <div class="flex justify-between items-center">
        <span class="text-sm">SUBTOTAL</span>
        <span class="text-sm">{formatPrice(cart.value.subtotal)}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-sm">FRETE TOTAL</span>
        <span class="text-sm">
          {shippingPrice ? formatPrice(shippingPrice) : "FRETE GRÁTIS"}
        </span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-sm font-bold">TOTAL</span>
        <span class="text-sm font-bold">
          {formatPrice(cart.value.subtotal + (shippingPrice ?? 0))}
        </span>
      </div>
    </div>
  );
}

function Products() {
  return (
    <div class="flex flex-col px-4 divide-y divide-stone-300">
      {products.value.map((p) => {
        const { listPrice = 0, seller } = useOffer(p.offers);

        const cartProducts = (cart.value?.products || []).filter(nonNullable);
        const cartProduct = cartProducts.find((i) =>
          i.productVariantId === Number(p.productID)
        );

        if (!cartProduct) return null;

        const price = cartProduct.price;

        const giftText = cartProduct.customization?.values?.filter(nonNullable)
          .find((i) => i.name === "text");

        return (
          <div class="py-4">
            <div class="flex gap-4 items-center">
              <img
                src={p.image?.[0].url || ""}
                alt={p.name || ""}
                class="size-32 border border-stone-300"
              />
              <div class="flex justify-between w-full">
                <div class="flex flex-col">
                  <div class="font-black uppercase">{seller || "ABACATE"}</div>
                  <div class="text-sm">{p.name}</div>
                  <div class="flex flex-col gap-0.5 mt-5">
                    {p.additionalProperty?.map((i) => (
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
                <table class="max-w-96 w-full">
                  <thead>
                    <tr>
                      <th class="pb-4 font-bold text-sm text-stone-400 text-center">
                        PREÇO
                      </th>
                      <th class="pb-4 font-bold text-sm text-stone-400 text-center">
                        QUANTIDADE
                      </th>
                      <th class="pb-4 font-bold text-sm text-stone-400 text-center">
                        SUBTOTAL
                      </th>
                      <th class="pb-4 font-bold text-sm text-stone-400 text-center" />
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="text-center">
                        <span
                          class={`block ${
                            listPrice > price ? "line-through" : ""
                          }`}
                        >
                          {formatPrice(Math.max(listPrice, price))}
                        </span>
                        {listPrice > price && (
                          <span class="text-red-700">{formatPrice(price)}</span>
                        )}
                      </td>
                      <td>
                        <div class="flex gap-1 justify-center">
                          <span class="text-lg font-medium w-12 border border-stone-300 flex items-center justify-center">
                            {cartProduct.quantity}
                          </span>
                          <div class="flex flex-col gap-1">
                            <button
                              type="button"
                              class="w-6 h-6 text-xl flex items-center justify-center border border-stone-300"
                              onClick={async () => {
                                await updateItem({
                                  productVariantId: Number(p.productID),
                                  quantity: cartProduct.quantity + 1,
                                });
                              }}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              class="w-6 h-6 text-xl flex items-center justify-center border border-stone-300"
                              onClick={async () => {
                                await updateItem({
                                  productVariantId: Number(p.productID),
                                  quantity: cartProduct.quantity - 1,
                                });
                              }}
                            >
                              -
                            </button>
                          </div>
                        </div>
                      </td>
                      <td class="text-center">
                        {formatPrice(price * cartProduct.quantity)}
                      </td>
                      <td class="text-center">
                        <button
                          type="button"
                          onClick={() =>
                            updateItem({
                              productVariantId: Number(p.productID),
                              quantity: 0,
                            })}
                        >
                          <Icon id="Trash" size={24} class="text-stone-500" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
