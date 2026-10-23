// Run from the repository root with Node's --env-file flag. Never ship this
// service-role operation in a browser or mobile bundle.
const { createClient } = require("@supabase/supabase-js");

async function grantAdmin() {
  const emailIndex = process.argv.indexOf("--email");
  const email = process.argv[emailIndex + 1]?.trim().toLowerCase();
  if (emailIndex < 0 || !email || !email.includes("@"))
    throw new Error("Uso: --email correo@ejemplo.com");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY solo en el servidor.",
    );
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let user;
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw new Error("No se pudieron consultar las cuentas.");
    user = data.users.find((item) => item.email?.toLowerCase() === email);
    if (user || data.users.length < 100) break;
  }
  if (!user || !user.email_confirmed_at)
    throw new Error("Se requiere una cuenta existente con correo confirmado.");
  const { error } = await client.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, role: "admin" },
  });
  if (error) throw new Error("No se pudo habilitar el rol de administrador.");
  const verified = await client.auth.admin.getUserById(user.id);
  if (verified.error || verified.data.user.app_metadata.role !== "admin")
    throw new Error("No se pudo verificar el rol.");
  process.stdout.write(
    `Acceso administrativo habilitado y verificado para ${email}.\n`,
  );
}

grantAdmin().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
