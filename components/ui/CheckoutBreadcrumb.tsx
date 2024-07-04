import { useUser } from "apps/wake/hooks/useUser.ts";
import { invoke } from "../../runtime.ts";

export default function () {
  const { user } = useUser();
  const path = location.pathname;

  return (
    <div class="flex items-center gap-2">
      <a
        href="/carrinho"
        class={`text-sm ${path === "/carrinho" ? "font-bold" : ""}`}
      >
        Carrinho
      </a>
      <span class="text-sm">{">"}</span>
      <a
        href="/frete"
        class={`text-sm ${path === "/frete" ? "font-bold" : ""}`}
      >
        Frete
      </a>
      <span class="text-sm">{">"}</span>
      <a
        href="/pagamento"
        class={`text-sm ${path === "/pagamento" ? "font-bold" : ""}`}
      >
        Pagamento
      </a>

      <div class="flex items-center gap-2 ml-auto">
        <span class="text-sm">
          {user.value ? user.value.givenName : "Not logged"}
        </span>

        <div class="flex items-center gap-2 mx-6">
          <button
            type="button"
            class={`text-sm ${path === "/login" ? "font-bold" : ""}`}
            onClick={() => {
              location.href = `/login?returnUrl=${location.pathname}`;
            }}
          >
            Login
          </button>
          <span class="text-sm">-</span>
          <button
            type="button"
            onClick={() => {
              location.href = `/signup?returnUrl=${location.pathname}`;
            }}
            class={`text-sm ${path === "/signup" ? "font-bold" : ""}`}
          >
            Signup
          </button>
        </div>

        <button
          type="button"
          onClick={async () => {
            await invoke.wake.actions.logout();
            location.reload();
          }}
          class="cool-btn py-2 px-4 bg-[#005CB1] rounded text-zinc-100 text-lg"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
