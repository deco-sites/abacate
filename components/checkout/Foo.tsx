import { useSignal } from "@preact/signals";
import { invoke } from "../../runtime.ts";
import { fakerPT_BR as faker } from "npm:@faker-js/faker";
import { generateCNPJ, generateCPF } from "../../cpf-cnpj.js";

export default function () {
  // deno-lint-ignore no-explicit-any
  const user = useSignal({} as Record<string, any>);

  function signupP() {
    const data = {
      address: "Rua Santa Luzia",
      addressComplement: "_",
      addressNumber: "0",
      birthDate: "01/01/2001",
      cep: "79903390",
      city: faker.location.city(),
      cpf: generateCPF(),
      email: faker.internet.email(),
      fullName: faker.person.fullName(),
      gender: (Math.random() > 0.5 ? "MALE" : "FEMALE") as "MALE" | "FEMALE",
      neighborhood: "Jardim Progresso",
      password: "abacate123",
      passwordConfirmation: "abacate123",
      primaryPhoneAreaCode: "67",
      primaryPhoneNumber: faker.phone.number().match(/\d{4,5}-\d{4}/)![0],
      receiverName: "sadsad sadsad asdasdasd",
      state: "MS",
    };

    invoke.checkout.actions
      .signupPerson(data)
      .then(console.log)
      .then(() => {
        user.value = data;
      });
  }

  function signupC() {
    const data = {
      address: "Rua Santa Luzia",
      addressComplement: "_",
      addressNumber: "0",
      cep: "79903390",
      city: faker.location.city(),
      cnpj: generateCNPJ(),
      corporateName: faker.company.name(),
      email: faker.internet.email(),
      neighborhood: "Jardim Progresso",
      password: "abacate123",
      passwordConfirmation: "abacate123",
      primaryPhoneAreaCode: "67",
      primaryPhoneNumber: faker.phone.number().match(/\d{4,5}-\d{4}/)![0],
      receiverName: "sadsad sadsad asdasdasd",
      state: "MS",
    };

    invoke.checkout.actions
      .signupCompany(data)
      .then(console.log)
      .then(() => {
        user.value = data;
      });
  }

  function login() {
    invoke.checkout.actions.login({
      input: user.value.email,
      pass: user.value.password,
    }).then(console.log);
  }

  return (
    <div class="flex flex-col gap-4 p-4 w-[240px]">
      <button
        type="button"
        onClick={signupP}
        class="btn py-2 px-4 bg-[#005CB1] rounded text-zinc-100 text-lg"
      >
        Signup Person
      </button>
      <button
        type="button"
        onClick={signupC}
        class="btn py-2 px-4 bg-[#005CB1] rounded text-zinc-100 text-lg"
      >
        Signup Company
      </button>

      {Object.keys(user.value).length > 0 && (
        <>
          <button
            type="button"
            onClick={login}
            class="btn py-2 px-4 bg-[#005CB1] rounded text-zinc-100 text-lg mt-6"
          >
            Login
          </button>
        </>
      )}
    </div>
  );
}
