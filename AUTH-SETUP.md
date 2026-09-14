# Autenticación del APK RankingUp

El APK usa Supabase Auth. La clave pública de Supabase puede ir en `EXPO_PUBLIC_*`;
los secretos de Google, Meta y SMTP se configuran solo en sus consolas y en Supabase.

## Confirmación por correo

1. En el proyecto Supabase `mpshqfizadislsqjispd`, abre **Authentication > URL Configuration**.
2. Añade `rankingup://auth/callback` a **Redirect URLs**. El registro y el reenvío
   usan exactamente esa URL. Conserva las URLs ya existentes.
3. En **Authentication > Email > SMTP Settings**, configura un SMTP propio antes de
   probar con correos externos. El SMTP predeterminado de Supabase solo envía a
   direcciones autorizadas del equipo y tiene un límite muy bajo.
4. Mantén **Confirm email** habilitado. El template de confirmación debe conservar
   `{{ .ConfirmationURL }}`; no hace falta cambiarlo para el enlace nativo.
5. Genera e instala un APK nuevo después de añadir el esquema `rankingup` al app config.

El enlace abre el APK; la app intercambia el código o guarda los tokens recibidos y
Supabase actualiza la sesión. Si el correo no llega, consulta **Authentication > Logs**
para distinguir `email_address_not_authorized`, límite de envío y fallos del SMTP.

## Google y Facebook

Los dos proveedores están **desactivados actualmente** en Supabase. El APK oculta sus
botones mientras no estén listos. Para activar uno:

1. Crea la aplicación OAuth en Google Cloud o Meta for Developers.
2. En el proveedor correspondiente de **Supabase Authentication > Providers**, carga
   el Client ID y Client Secret. En la consola del proveedor, registra como callback
   `https://mpshqfizadislsqjispd.supabase.co/auth/v1/callback`.
3. Comprueba que `rankingup://auth/callback` esté en Redirect URLs de Supabase.
4. Configura `EXPO_PUBLIC_AUTH_GOOGLE_ENABLED=true` o
   `EXPO_PUBLIC_AUTH_FACEBOOK_ENABLED=true` en EAS `preview` y recompila el APK.
   Estas flags no son secretos; los Client Secrets nunca deben ir en el APK.

Prueba de aceptación: registro con Gmail externo, recepción y apertura de enlace en
Android, sesión iniciada, cierre/reinicio de app y reingreso. Después prueba cada
proveedor con una cuenta no registrada y una ya existente.
