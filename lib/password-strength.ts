// Fuerza de la contraseña para el medidor del registro. Solo informa: la regla mínima del formulario
// sigue siendo 8 caracteres. 0 = vacía, 1 = débil, 2 = media, 3 = fuerte.
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  if (pw.length < 8) return 1;
  const variety = [/[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  return variety <= 1 ? 1 : variety === 2 ? 2 : 3;
}

// Autoverificación (no hay test runner):
//   node --experimental-strip-types -e "import('./lib/password-strength.ts').then((m) => m.checkPasswordStrength())"
export function checkPasswordStrength() {
  const cases: [string, 0 | 1 | 2 | 3][] = [
    ["", 0],
    ["Ab1!", 1], // corta aunque mezcle
    ["abcdefgh", 1],
    ["abcdefg1", 1],
    ["Abcdefg1", 2],
    ["abcdef1!", 2],
    ["Abcdef1!", 3],
    ["Contraseña 2026", 3],
  ];
  for (const [pw, want] of cases) {
    const got = passwordStrength(pw);
    if (got !== want) throw new Error(`passwordStrength(${JSON.stringify(pw)}) = ${got}, esperaba ${want}`);
  }
  console.log(`passwordStrength: ${cases.length} casos OK`);
}
