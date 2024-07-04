import { useSignal } from "@preact/signals";
import { invoke } from "../../runtime.ts";
import debounce from "../../sdk/debounce.ts";
import useCEP from "../../sdk/useCEP.ts";
import CheckoutBreadcrumb from "../ui/CheckoutBreadcrumb.tsx";
import { clx } from "../../sdk/clx.ts";

export default function ({ isPartialSignup }: ReturnType<typeof loader>) {
  console.log({ isPartialSignup });
  const customerType = useSignal<"PERSON" | "COMPANY">("PERSON");

  const cep = useCEP();
  const cepDebounce = debounce(500);

  return (
    <div class="container mx-auto max-w-[1330px] py-6 px-4 flex flex-col gap-4 min-h-screen">
      <CheckoutBreadcrumb />

      <div class="flex flex-col m-auto pb-20">
        <label class="flex items-center gap-4 p-4 cursor-pointer select-none">
          <input
            type="checkbox"
            onInput={(e) => {
              customerType.value = e.currentTarget.checked
                ? "COMPANY"
                : "PERSON";
            }}
          />
          {customerType.value === "COMPANY" ? "Company" : "Person"}
        </label>

        {customerType.value === "PERSON"
          ? (
            <form
              id="form-person"
              class={clx(
                "flex gap-4 w-full p-4",
                isPartialSignup && "flex-col",
              )}
              // biome-ignore format: ...
              onSubmit={(e) => {
                e.preventDefault();

                const form = e.target as HTMLFormElement;

                const address = form.address?.value;
                const addressComplement = form.addressComplement?.value;
                const addressNumber = form.addressNumber?.value;
                const cep = form.cep?.value;
                const city = form.city?.value;
                const cpf = form.cpf.value;
                const email = form.email.value;
                const fullName = form.fullName.value;
                const gender = form.gender?.value;
                const neighborhood = form.neighborhood?.value;
                const newsletter = form.newsletter?.checked;
                const password = form.password?.value;
                const passwordConfirmation = form.passwordConfirmation?.value;
                const receiverName = form.receiverName?.value;
                const reference = form.reference?.value;
                const reseller = form.reseller?.checked;
                const state = form.state?.value;

                const _birthDate = new Date(form.birthDate.value);
                const birthDate = `${_birthDate.getDate()}/${
                  _birthDate.getMonth() + 1
                }/${_birthDate.getFullYear()}`;

                const _primaryPhoneNumber = form.primaryPhoneNumber.value;
                const primaryPhoneAreaCode = _primaryPhoneNumber.replace(
                  /\D/g,
                  "",
                ).slice(0, 2);
                const primaryPhoneNumber = _primaryPhoneNumber.slice(5);

                const _secondaryPhoneNumber = form.secondaryPhoneNumber?.value;
                const secondaryPhoneAreaCode = _secondaryPhoneNumber?.replace(
                  /\D/g,
                  "",
                ).slice(0, 2);
                const secondaryPhoneNumber = _secondaryPhoneNumber?.slice(5);

                const data = {
                  address,
                  addressComplement,
                  addressNumber,
                  birthDate,
                  cep,
                  city,
                  cpf,
                  email,
                  fullName,
                  gender,
                  newsletter,
                  neighborhood,
                  password,
                  passwordConfirmation,
                  receiverName,
                  reference,
                  reseller,
                  state,
                  primaryPhoneAreaCode,
                  primaryPhoneNumber,
                } as Record<string, string | boolean>;

                if (_secondaryPhoneNumber) {
                  data.secondaryPhoneAreaCode = secondaryPhoneAreaCode;
                  data.secondaryPhoneNumber = secondaryPhoneNumber;
                }

                console.log(data);

                if (isPartialSignup) {
                  invoke.wake.actions.signupPartialPerson(data).then(
                    console.log,
                  );
                } else {
                  invoke.wake.actions.signupPerson(data).then(console.log);
                }
              }}
            >
              <input type="hidden" name="address" />
              <input type="hidden" name="state" />
              <input type="hidden" name="city" />

              <div class="flex flex-col gap-4">
                <div class="flex gap-4">
                  <div class="flex flex-col gap-2 w-1/2">
                    <span class="font-medium">Email *</span>
                    <input
                      type="email"
                      name="email"
                      class="p-2 border border-zinc-500 h-11"
                      required
                    />
                  </div>
                  <div class="flex flex-col gap-2 w-1/2">
                    <span class="font-medium">CPF *</span>
                    <input
                      type="text"
                      name="cpf"
                      class="p-2 border border-zinc-500 h-11"
                      required
                      onInput={(e: { currentTarget: { value: string } }) => {
                        e.currentTarget.value = e.currentTarget.value
                          .replace(/\D/g, "")
                          .replace(
                            /^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})(.*)$/,
                            (_, $1, $2, $3, $4) => {
                              let s = "";

                              if ($1) s += $1;
                              if ($2) s += `.${$2}`;
                              if ($3) s += `.${$3}`;
                              if ($4) s += `-${$4}`;

                              return s;
                            },
                          );
                      }}
                    />
                  </div>
                </div>
                <div class="flex gap-4">
                  <div class="flex flex-col gap-2 w-full">
                    <span class="font-medium">Nome completo *</span>
                    <input
                      type="text"
                      name="fullName"
                      class="p-2 border border-zinc-500 h-11"
                      required
                    />
                  </div>
                </div>
                <div class="flex gap-4">
                  <div class="flex flex-col gap-2 w-1/2">
                    <span class="font-medium">Data de Nascimento *</span>
                    <input
                      type="date"
                      name="birthDate"
                      class="p-2 border border-zinc-500 h-11"
                      required
                    />
                  </div>
                  {!isPartialSignup && (
                    <div class="flex flex-col gap-2 w-1/2">
                      <span class="font-medium">Gênero *</span>
                      <select
                        type="text"
                        name="gender"
                        class="p-2 border border-zinc-500 h-11"
                        required
                      >
                        <option value="">Selecione...</option>
                        <option value="MALE">Masculino</option>
                        <option value="FEMALE">Feminino</option>
                      </select>
                    </div>
                  )}
                </div>
                {!isPartialSignup && (
                  <div class="flex gap-4">
                    <div class="flex flex-col gap-2 w-1/2">
                      <span class="font-medium">Senha *</span>
                      <input
                        type="text"
                        name="password"
                        class="p-2 border border-zinc-500 h-11"
                        required
                      />
                    </div>
                    <div class="flex flex-col gap-2 w-1/2">
                      <span class="font-medium">Confirme a senha *</span>
                      <input
                        type="text"
                        name="passwordConfirmation"
                        class="p-2 border border-zinc-500 h-11"
                        required
                      />
                    </div>
                  </div>
                )}
                <div class="flex gap-4">
                  <div class="flex flex-col gap-2 w-1/2">
                    <span class="font-medium">Telefone principal *</span>
                    <input
                      type="tel"
                      name="primaryPhoneNumber"
                      class="p-2 border border-zinc-500 h-11"
                      required
                      onInput={(e: { currentTarget: { value: string } }) => {
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
                  </div>
                  {!isPartialSignup && (
                    <div class="flex flex-col gap-2 w-1/2">
                      <span class="font-medium">Telefone secundário</span>
                      <input
                        type="tel"
                        name="secondaryPhoneNumber"
                        class="p-2 border border-zinc-500 h-11"
                        onInput={(e: { currentTarget: { value: string } }) => {
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
                    </div>
                  )}
                </div>
                {!isPartialSignup && (
                  <>
                    <div class="flex gap-4">
                      <label class="font-medium flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="newsletter"
                          class="p-2 border border-zinc-500 h-11"
                        />
                        Receber newsletter
                      </label>
                    </div>
                    <div class="flex gap-4">
                      <label class="font-medium flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="reseller"
                          class="p-2 border border-zinc-500 h-11"
                        />
                        Desejo ser revendedor
                      </label>
                    </div>
                  </>
                )}
              </div>

              {!isPartialSignup && (
                <div class="flex flex-col gap-4">
                  <div class="flex gap-4">
                    <div class="flex flex-col gap-2 w-full">
                      <span class="font-medium">
                        Quem vai receber a entrega? *
                      </span>
                      <input
                        type="text"
                        name="receiverName"
                        class="p-2 border border-zinc-500 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div class="flex gap-4">
                    <div class="flex flex-col gap-2 w-1/2">
                      <span class="font-medium">CEP *</span>
                      <input
                        type="text"
                        name="cep"
                        class="p-2 border border-zinc-500 h-11"
                        required
                        onInput={(e) => {
                          const v = e.currentTarget.value
                            .replace(/\D/g, "")
                            .replace(
                              /^(\d{0,5})(\d{0,3})(.*)$/,
                              (_, $1, $2) => {
                                let s = "";

                                if ($1) s += $1;
                                if ($2) s += `-${$2}`;

                                return s;
                              },
                            );

                          e.currentTarget.value = v;
                          const form = e.currentTarget.form;

                          if (!form) return;

                          if (e.currentTarget.value.length === 9) {
                            cepDebounce(async () => {
                              await cep.set(v.replace("-", ""));

                              const neighborhood = form.elements.namedItem(
                                "neighborhood",
                              ) as HTMLInputElement;
                              const state = form.elements.namedItem(
                                "state",
                              ) as HTMLInputElement;
                              const city = form.elements.namedItem(
                                "city",
                              ) as HTMLInputElement;
                              const address = form.elements.namedItem(
                                "address",
                              ) as HTMLInputElement;

                              neighborhood.value =
                                cep.data.value.neighborhood ??
                                  neighborhood.value;
                              state.value = cep.data.value.state;
                              city.value = cep.data.value.city;
                              address.value = cep.data.value.street ?? "";
                            });
                          }
                        }}
                      />
                    </div>
                    <div class="flex flex-col justify-center items-center translate-y-3 underline gap-2 w-1/2">
                      <a
                        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                        target="_blank"
                        class="font-medium text-blue-500"
                        rel="noreferrer"
                      >
                        Não sei o CEP
                      </a>
                    </div>
                  </div>
                  <div class="flex gap-4">
                    <div class="flex flex-col gap-2 w-1/5">
                      <span class="font-medium">Número *</span>
                      <input
                        type="text"
                        name="addressNumber"
                        class="p-2 border border-zinc-500 h-11"
                        required
                        onInput={(e) => {
                          e.currentTarget.value = e.currentTarget.value.replace(
                            /\D/g,
                            "",
                          );
                        }}
                      />
                    </div>
                    <div class="flex flex-col gap-2 w-4/5">
                      <span class="font-medium">Complemento</span>
                      <input
                        type="text"
                        name="addressComplement"
                        class="p-2 border border-zinc-500 h-11"
                      />
                    </div>
                  </div>
                  <div class="flex gap-4">
                    <div class="flex flex-col gap-2 w-full">
                      <span class="font-medium">Bairro *</span>
                      <input
                        type="text"
                        name="neighborhood"
                        class="p-2 border border-zinc-500 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div class="flex gap-4">
                    <div class="flex flex-col gap-2 w-full">
                      <span class="font-medium">Referência de Entrega</span>
                      <input
                        type="text"
                        name="reference"
                        class="p-2 border border-zinc-500 h-11"
                      />
                    </div>
                  </div>
                </div>
              )}
              <button
                type="submit"
                class="cool-btn py-2 px-4 bg-[#005CB1] rounded text-zinc-100 text-lg mt-6"
              >
                Cadastrar
              </button>
            </form>
          )
          : (
            <form
              id="form-company"
              class={clx(
                "flex gap-4 w-full p-4",
                isPartialSignup && "flex-col",
              )}
              // biome-ignore format: ...
              onSubmit={(e) => {
                e.preventDefault();

                const form = e.target as HTMLFormElement;

                const address = form.address?.value;
                const addressComplement = form.addressComplement?.value;
                const addressNumber = form.addressNumber?.value;
                const cep = form.cep?.value;
                const city = form.city?.value;
                const cnpj = form.cnpj.value;
                const corporateName = form.corporateName.value;
                const email = form.email.value;
                const neighborhood = form.neighborhood?.value;
                const newsletter = form.newsletter?.checked;
                const password = form.password?.value;
                const passwordConfirmation = form.passwordConfirmation?.value;
                const receiverName = form.receiverName?.value;
                const reference = form.reference?.value;
                const reseller = form.reseller?.checked;
                const state = form.state?.value;

                const _primaryPhoneNumber = form.primaryPhoneNumber.value;
                const primaryPhoneAreaCode = _primaryPhoneNumber.replace(
                  /\D/g,
                  "",
                ).slice(0, 2);
                const primaryPhoneNumber = _primaryPhoneNumber.slice(5);

                const _secondaryPhoneNumber = form.secondaryPhoneNumber?.value;
                const secondaryPhoneAreaCode = _secondaryPhoneNumber?.replace(
                  /\D/g,
                  "",
                ).slice(0, 2);
                const secondaryPhoneNumber = _secondaryPhoneNumber?.slice(5);

                const data = {
                  address,
                  addressComplement,
                  addressNumber,
                  cep,
                  city,
                  cnpj,
                  corporateName,
                  email,
                  neighborhood,
                  newsletter,
                  password,
                  passwordConfirmation,
                  primaryPhoneAreaCode,
                  primaryPhoneNumber,
                  receiverName,
                  reference,
                  reseller,
                  state,
                } as Record<string, string | boolean>;

                if (_secondaryPhoneNumber) {
                  data.secondaryPhoneAreaCode = secondaryPhoneAreaCode;
                  data.secondaryPhoneNumber = secondaryPhoneNumber;
                }

                console.log(data);

                if (isPartialSignup) {
                  invoke.wake.actions.signupPartialCompany(data).then(
                    console.log,
                  );
                } else {
                  invoke.wake.actions.signupCompany(data).then(console.log);
                }
              }}
            >
              <input type="hidden" name="address" />
              <input type="hidden" name="state" />
              <input type="hidden" name="city" />

              <div class="flex flex-col gap-4">
                <div class="flex gap-4">
                  <div class="flex flex-col gap-2 w-1/2">
                    <span class="font-medium">Email *</span>
                    <input
                      type="email"
                      name="email"
                      class="p-2 border border-zinc-500 h-11"
                      required
                    />
                  </div>
                  <div class="flex flex-col gap-2 w-1/2">
                    <span class="font-medium">CNPJ *</span>
                    <input
                      type="text"
                      name="cnpj"
                      class="p-2 border border-zinc-500 h-11"
                      required
                      onInput={(e: { currentTarget: { value: string } }) => {
                        e.currentTarget.value = e.currentTarget.value
                          .replace(/\D/g, "")
                          .replace(
                            /^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})(.*)$/,
                            (_, $1, $2, $3, $4, $5) => {
                              let s = "";

                              if ($1) s += $1;
                              if ($2) s += `.${$2}`;
                              if ($3) s += `.${$3}`;
                              if ($4) s += `/${$4}`;
                              if ($5) s += `-${$5}`;

                              return s;
                            },
                          );
                      }}
                    />
                  </div>
                </div>
                <div class="flex gap-4">
                  <div class="flex flex-col gap-2 w-full">
                    <span class="font-medium">Nome da empresa *</span>
                    <input
                      type="text"
                      name="corporateName"
                      class="p-2 border border-zinc-500 h-11"
                      required
                    />
                  </div>
                </div>
                {!isPartialSignup && (
                  <div class="flex gap-4">
                    <div class="flex flex-col gap-2 w-1/2">
                      <span class="font-medium">Senha *</span>
                      <input
                        type="text"
                        name="password"
                        class="p-2 border border-zinc-500 h-11"
                        required
                      />
                    </div>
                    <div class="flex flex-col gap-2 w-1/2">
                      <span class="font-medium">Confirme a senha *</span>
                      <input
                        type="text"
                        name="passwordConfirmation"
                        class="p-2 border border-zinc-500 h-11"
                        required
                      />
                    </div>
                  </div>
                )}
                <div class="flex gap-4">
                  <div class="flex flex-col gap-2 w-1/2">
                    <span class="font-medium">Telefone principal *</span>
                    <input
                      type="tel"
                      name="primaryPhoneNumber"
                      class="p-2 border border-zinc-500 h-11"
                      required
                      onInput={(e: { currentTarget: { value: string } }) => {
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
                  </div>
                  {!isPartialSignup && (
                    <div class="flex flex-col gap-2 w-1/2">
                      <span class="font-medium">Telefone secundário</span>
                      <input
                        type="tel"
                        name="secondaryPhoneNumber"
                        class="p-2 border border-zinc-500 h-11"
                        onInput={(e: { currentTarget: { value: string } }) => {
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
                    </div>
                  )}
                </div>
                {!isPartialSignup && (
                  <>
                    <div class="flex gap-4">
                      <label class="font-medium flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="newsletter"
                          class="p-2 border border-zinc-500 h-11"
                        />
                        Receber newsletter
                      </label>
                    </div>
                    <div class="flex gap-4">
                      <label class="font-medium flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="reseller"
                          class="p-2 border border-zinc-500 h-11"
                        />
                        Desejo ser revendedor
                      </label>
                    </div>
                  </>
                )}
              </div>

              {!isPartialSignup && (
                <div class="flex flex-col gap-4">
                  <div class="flex gap-4">
                    <div class="flex flex-col gap-2 w-full">
                      <span class="font-medium">
                        Quem vai receber a entrega? *
                      </span>
                      <input
                        type="text"
                        name="receiverName"
                        class="p-2 border border-zinc-500 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div class="flex gap-4">
                    <div class="flex flex-col gap-2 w-1/2">
                      <span class="font-medium">CEP *</span>
                      <input
                        type="text"
                        name="cep"
                        class="p-2 border border-zinc-500 h-11"
                        required
                        onInput={(e) => {
                          const v = e.currentTarget.value
                            .replace(/\D/g, "")
                            .replace(
                              /^(\d{0,5})(\d{0,3})(.*)$/,
                              (_, $1, $2) => {
                                let s = "";

                                if ($1) s += $1;
                                if ($2) s += `-${$2}`;

                                return s;
                              },
                            );

                          e.currentTarget.value = v;
                          const form = e.currentTarget.form;

                          if (!form) return;

                          if (e.currentTarget.value.length === 9) {
                            cepDebounce(async () => {
                              await cep.set(v.replace("-", ""));

                              const neighborhood = form.elements.namedItem(
                                "neighborhood",
                              ) as HTMLInputElement;
                              const state = form.elements.namedItem(
                                "state",
                              ) as HTMLInputElement;
                              const city = form.elements.namedItem(
                                "city",
                              ) as HTMLInputElement;
                              const address = form.elements.namedItem(
                                "address",
                              ) as HTMLInputElement;

                              neighborhood.value =
                                cep.data.value.neighborhood ??
                                  neighborhood.value;
                              state.value = cep.data.value.state;
                              city.value = cep.data.value.city;
                              address.value = cep.data.value.street ?? "";
                            });
                          }
                        }}
                      />
                    </div>
                    <div class="flex flex-col justify-center items-center translate-y-3 underline gap-2 w-1/2">
                      <a
                        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                        target="_blank"
                        class="font-medium text-blue-500"
                        rel="noreferrer"
                      >
                        Não sei o CEP
                      </a>
                    </div>
                  </div>
                  <div class="flex gap-4">
                    <div class="flex flex-col gap-2 w-1/5">
                      <span class="font-medium">Número *</span>
                      <input
                        type="text"
                        name="addressNumber"
                        class="p-2 border border-zinc-500 h-11"
                        required
                        onInput={(e) => {
                          e.currentTarget.value = e.currentTarget.value.replace(
                            /\D/g,
                            "",
                          );
                        }}
                      />
                    </div>
                    <div class="flex flex-col gap-2 w-4/5">
                      <span class="font-medium">Complemento</span>
                      <input
                        type="text"
                        name="addressComplement"
                        class="p-2 border border-zinc-500 h-11"
                      />
                    </div>
                  </div>
                  <div class="flex gap-4">
                    <div class="flex flex-col gap-2 w-full">
                      <span class="font-medium">Bairro *</span>
                      <input
                        type="text"
                        name="neighborhood"
                        class="p-2 border border-zinc-500 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div class="flex gap-4">
                    <div class="flex flex-col gap-2 w-full">
                      <span class="font-medium">Referência de Entrega</span>
                      <input
                        type="text"
                        name="reference"
                        class="p-2 border border-zinc-500 h-11"
                      />
                    </div>
                  </div>
                </div>
              )}
              <button
                type="submit"
                class="cool-btn py-2 px-4 bg-[#005CB1] rounded text-zinc-100 text-lg mt-6"
              >
                Cadastrar
              </button>
            </form>
          )}
      </div>
    </div>
  );
}

export function loader(_props: object, req: Request) {
  const isPartialSignup = new URL(req.url).searchParams.get("partial");

  return { isPartialSignup: !!isPartialSignup };
}
