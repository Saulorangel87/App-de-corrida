// Foto de perfil: a imagem é reduzida e regravada no próprio aparelho antes de ir para o servidor.
// Sai sempre um JPEG quadrado pequeno, sem os dados da câmera (local, modelo) que a foto original
// carrega, e o servidor só aceita esse formato.

export const AVATAR_SIZE = 256;
export const AVATAR_MAX_BYTES = 58 * 1024; // abaixo do limite de 60 KB da API
const SOURCE_MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export type AvatarError = "type" | "size" | "decode" | "too_big";

export class AvatarProblem extends Error {
  constructor(readonly kind: AvatarError) {
    super(kind);
  }
}

/** Recorta o centro, reduz para 256 x 256 e devolve um JPEG de até ~58 KB. */
export async function toAvatarJpeg(file: File): Promise<Blob> {
  if (!ACCEPTED.includes(file.type)) throw new AvatarProblem("type");
  if (file.size > SOURCE_MAX_BYTES) throw new AvatarProblem("size");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new AvatarProblem("decode");
  }
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new AvatarProblem("decode");
    // Fundo branco: PNG com transparência não vira preto no JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    for (const quality of [0.85, 0.75, 0.65, 0.55, 0.45]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= AVATAR_MAX_BYTES) return blob;
    }
    throw new AvatarProblem("too_big");
  } finally {
    bitmap.close();
  }
}
