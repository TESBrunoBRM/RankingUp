import { preparePhoto, type FoodPhoto } from "./foodImageService";
import { rankingUpApiClient } from "./rankingUpApiClient";
import { getSupabaseClient } from "../lib/supabase";

export async function uploadBugScreenshot(photo: FoodPhoto): Promise<string> {
  const bytes = await preparePhoto(photo);
  const signed = await rankingUpApiClient.createBugUploadUrl({
    contentType: "image/jpeg",
    sizeBytes: bytes.byteLength,
  });
  const { error } = await getSupabaseClient()
    .storage.from("bug-evidence")
    .uploadToSignedUrl(signed.path, signed.token, bytes, {
      contentType: "image/jpeg",
    });
  if (error)
    throw new Error("No se pudo subir la captura. Inténtalo de nuevo.");
  return signed.path;
}
