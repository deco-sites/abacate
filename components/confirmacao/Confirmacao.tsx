import { computed, signal, useSignal, useSignalEffect } from "@preact/signals";
import type { Product } from "apps/commerce/types.ts";
import { invoke } from "../../runtime.ts";
import nonNullable from "../../sdk/nonNullable.ts";
import Icon from "../ui/Icon.tsx";
import { useUser } from "apps/wake/hooks/useUser.ts";
import Loading from "../Loading.tsx";
import { formatPrice } from "../../sdk/format.ts";
import { useEffect } from "preact/hooks";
import CheckoutBreadcrumb from "../ui/CheckoutBreadcrumb.tsx";
import { useOffer } from "../../sdk/useOffer.ts";
import Image from "apps/website/components/Image.tsx";

const products = signal([] as Product[]);

const cart = signal<
  Awaited<ReturnType<typeof invoke.wake.loaders.cart>> | null
>(null);
const address = signal<
  Awaited<ReturnType<typeof invoke.wake.loaders.userAddresses>>
>([]);
const cartProducts = computed(() =>
  (cart.value?.products || []).filter(nonNullable)
);

const { user } = useUser();

export default function ({ id }: ReturnType<typeof loader>) {
  const loading = useSignal(true);
  console.log({ loading: loading.value, cart: cart.value, user: user.value });

  useEffect(() => {
    (async () => {
      address.value = await invoke.wake.loaders.userAddresses();
    })();
  }, []);

  useSignalEffect(() => {
    (async () => {
      cart.value = await invoke.wake.loaders.cart({ cartId: id });
      const cartProducts = (cart.value?.products || []).filter(nonNullable);

      const p = (await invoke.wake.loaders.productList({
        first: 10,
        sortDirection: "ASC",
        sortKey: "NAME",
        filters: { sku: cartProducts.map((i) => i.sku as string) },
      })) || [];

      const cartSkus = cartProducts.map((i) => i.sku);

      products.value = p
        .filter((i) => cartSkus.includes(i.sku))
        .sort((a, b) => {
          const aIndex = cartProducts.findIndex((i) => i.sku === a.sku);
          const bIndex = cartProducts.findIndex((i) => i.sku === b.sku);

          return aIndex - bIndex;
        });

      loading.value = false;
    })();
  });

  if (loading.value || !cart.value || !user.value) return <Loading />;

  const order = cart.value.orders?.at(-1);

  if (!order) throw new Error("Missing order");

  return (
    <div class="container mx-auto max-w-[1330px] py-6 px-4 flex flex-col gap-4 min-h-screen">
      <CheckoutBreadcrumb />

      <Icon id="CheckoutRoundCheck" size={64} class="mx-auto" />

      <div class="flex flex-col items-center">
        <h2 class="text-xl font-bold text-black">
          OBRIGADO POR COMPRAR NO ABACATE
        </h2>
        <span class="text-sm">
          O número do seu pedido é:{" "}
          <span class="font-bold">{order.orderId}</span>
        </span>
        <span class="text-sm">
          A confirmação foi enviada para o e-mail:{" "}
          <span class="font-bold">{user.value.email}</span>
        </span>
      </div>

      <a
        href="/"
        class="block mb-4 mx-auto text-sm font-bold text-white bg-black px-4 py-2"
      >
        CONTINUAR COMPRANDO
      </a>

      <div class="px-2 py-4 flex flex-col items-center gap-5 bg-stone-100">
        <span class="text-sm font-bold">INFORMAÇÕES DO PEDIDO</span>

        <div class="flex flex-col items-center text-sm">
          <span>
            Status: {order.orderStatus === "AWAITING_PAYMENT"
              ? "Aguardando Pagamento"
              : order.orderStatus === "PAID"
              ? "Pago"
              : order.orderStatus}
          </span>
          <span>
            Você pode acompanhar o status do seu pedido em Minha Conta {">"}
            {" "}
            <a href="/MinhaConta/Pedido/" class="underline">
              Meus Pedidos
            </a>
          </span>
          <span>
            Data do pedido: {new Date(order.date).toLocaleDateString("pt-BR")}
          </span>
          <span>Forma de pagamento: ???</span>
          {order.discountValue > 0 && (
            <span>
              Desconto:{" "}
              {formatPrice(order.discountValue)?.replace(/R\$\s+/, "R$ -")}
            </span>
          )}
          <span>Preço final: {formatPrice(order.totalValue)}</span>
        </div>

        {order.delivery && (
          <div class="flex flex-col items-center text-sm gap-1">
            <span>Frete: {`( ${order.delivery.name} )`}</span>
            <span>
              {order.delivery.cost
                ? formatPrice(order.delivery.cost)
                : "Frete Grátis"}
            </span>
            <span>
              Prazo de entrega {order.delivery.name} {order.dispatchTimeText}
              {" "}
              {order.delivery.deliveryTime}
            </span>
          </div>
        )}
      </div>

      <div class="flex flex-col px-4 gap-4">
        {cart.value.selectedAddress && (
          <>
            <span class="text-lg font-medium block mt-2">
              Endereço de Entrega:
            </span>
            <div class="flex flex-col text-sm">
              <span>Endereço: {cart.value.selectedAddress.street}</span>
              <span>Bairro: {cart.value.selectedAddress.neighborhood}</span>
              <span>Cidade: {cart.value.selectedAddress.city}</span>
              <span>
                CEP: {cart.value.selectedAddress.cep.toString().replace(
                  /(\d{5})(\d{3})/,
                  "$1-$2",
                )}
              </span>
              <span>Complemento: {cart.value.selectedAddress.complement}</span>
            </div>
          </>
        )}

        <div class="flex flex-col divide-y divide-stone-300 border-b border-b-stone-300 mt-2">
          {products.value.map((i) => {
            const { seller } = useOffer(i.offers);

            const cartProduct = cartProducts.value.find((ii) =>
              ii?.productVariantId === Number(i?.productID)
            );
            if (!cartProduct) return null;

            const giftText = cartProduct.customization?.values
              ?.filter(nonNullable)
              .find((i) => i.name === "text");

            return (
              <div class="flex items-center py-6">
                <Image
                  src={i.image?.[0].url ?? ""}
                  alt={i.name ?? ""}
                  width={80}
                  height={100}
                  class="border border-stone-300 aspect-[1/1.3]"
                />
                <div class="flex flex-col gap-0.5 ml-5">
                  <div class="font-medium text-sm uppercase">
                    {seller || "ABACATE"}
                  </div>
                  <h4 class="font-medium text-sm">{i.name}</h4>
                  <div class="flex flex-col gap-1">
                    {i.additionalProperty?.map((i) => (
                      <div class="text-xs">
                        {i.name}: {i.value}
                      </div>
                    ))}
                  </div>
                  <div class="text-xs">Quantidade: {cartProduct.quantity}</div>
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
                  {formatPrice(cartProduct.price)}
                </div>
              </div>
            );
          })}
        </div>

        <div class="mt-7 flex justify-end">
          <button
            type="button"
            onClick={globalThis.print}
            class="px-7 h-9 font-bold border border-stone-500 text-sm p-2 cursor-pointer hover:bg-black hover:border-black hover:text-stone-100 transition-all"
          >
            IMPRIMIR PÁGINA
          </button>
        </div>
      </div>
    </div>
  );
}

export function loader(props: object, req: Request) {
  const id = new URL(req.url).searchParams.get("id");

  if (!id) throw new Error("Missing id");

  return { ...props, id };
}
