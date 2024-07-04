import { useCart } from "apps/wake/hooks/useCart.ts";
import { invoke } from "../runtime.ts";
import nonNullable from "./nonNullable.ts";

const { cart } = useCart();

export default async function () {
  const cartProducts = (cart.value?.products || []).filter(nonNullable);

  if (!cartProducts.length) {
    return [];
  }

  const cartSkus = cartProducts.map((i) => i.sku).filter(nonNullable);

  const p = (
    (await invoke.wake.loaders.productList({
      first: 10,
      sortDirection: "ASC",
      sortKey: "NAME",
      filters: { sku: cartSkus },
    })) || []
  ).filter(nonNullable);

  return p
    .filter((i) => cartSkus.includes(i.sku))
    .sort((a, b) => {
      const aIndex = cartProducts.findIndex((i) => i.sku === a.sku);
      const bIndex = cartProducts.findIndex((i) => i.sku === b.sku);

      return aIndex - bIndex;
    });
}
