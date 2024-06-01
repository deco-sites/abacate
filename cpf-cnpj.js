export function calculateCPFValidationDigits(cpf) {
  let sum = 0;
  for (let w = 0; w < 2; w++) {
    for (let i = 0, j = cpf.length + 1; i < cpf.length; i++, j--) {
      sum += parseInt(cpf.charAt(i)) * j;
    }
    sum = (sum * 10) % 11;
    if (sum === 10) sum = 0;
    cpf += sum.toString();
    sum = 0;
  }
  return cpf.substring(9, 11);
}

export function isCPFValid(cpf) {
  cpf = cpf.replace(/[^0-9]/g, "");
  if (cpf.length === 11) {
    const calculatedCPF = cpf.substr(0, 9) +
      calculateCPFValidationDigits(cpf.substr(0, 9));
    return calculatedCPF === cpf;
  }
  return false;
}

export function formatCPF(cpf) {
  cpf = cpf.replace(/[^0-9]/g, "");
  return cpf
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1-$2");
}

export function generateCPF(format = false, cpfSeed = "") {
  let cpf = cpfSeed
    ? (cpfSeed.length > 9 ? cpfSeed.substring(0, 9) : cpfSeed)
    : "";
  const padding = "x".repeat(9 - cpf.length);
  cpf += padding.replace(/[x]/g, () => Math.floor(Math.random() * 10));
  cpf += calculateCPFValidationDigits(cpf);
  if (format) cpf = formatCPF(cpf);
  return cpf;
}

export function calculateCNPJValidationDigits(cnpj) {
  cnpj = cnpj.substr(0, 12);
  let sum = 0;
  let mult = "543298765432";
  for (let w = 0; w < 2; w++) {
    for (let i = 0; i < cnpj.length; i++) {
      sum += parseInt(cnpj.charAt(i)) * parseInt(mult.charAt(i));
    }
    sum = (sum * 10) % 11;
    if (sum == 10) sum = 0;
    cnpj += sum;
    sum = 0;
    mult = "6" + mult;
  }
  return cnpj.substr(12, 14);
}

export function isCNPJValid(cnpj) {
  cnpj = cnpj.replace(/[^0-9]/g, "");
  if (cnpj.length === 14) {
    const calculatedCNPJ = cnpj.substr(0, 12) +
      calculateCNPJValidationDigits(cnpj.substr(0, 12));
    return calculatedCNPJ === cnpj;
  }
  return false;
}

export function formatCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^0-9]/g, "");
  return cnpj
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function generateCNPJ(format = false, cnpjSeed = "") {
  let cnpj = cnpjSeed
    ? (cnpjSeed.length > 12 ? cnpjSeed.substring(0, 12) : cnpjSeed)
    : "";
  const padding = "x".repeat(12 - cnpj.length);
  cnpj += padding.replace(/[x]/g, () => Math.floor(Math.random() * 10));
  cnpj += calculateCNPJValidationDigits(cnpj);
  if (format) cnpj = formatCNPJ(cnpj);
  return cnpj;
}
