import { useState } from "react";
import { API_URL } from "../lib/api";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .slice(0, 2)
    .join("");

/**
 * Foto de perfil, ou as iniciais quando não há foto (ou ela não carrega). A foto vem da API, só para
 * quem está logado; `photoVersion` muda a cada envio e renova o cache do navegador.
 */
export function Avatar({
  name,
  photoVersion,
  className = "size-[38px] text-sm",
}: {
  name: string;
  photoVersion: number | null | undefined;
  className?: string;
}) {
  const [failedVersion, setFailedVersion] = useState<number | null>(null);
  const showPhoto = !!photoVersion && failedVersion !== photoVersion;
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-linear-to-br from-orange-400 to-rose-500 font-bold text-white ${className}`}
    >
      {showPhoto ? (
        <img
          src={`${API_URL}/profile/photo?v=${photoVersion}`}
          alt=""
          className="size-full object-cover"
          onError={() => setFailedVersion(photoVersion)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
