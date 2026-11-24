import Image from "next/image";
import { useImageFallback } from "../hooks/useImageFallback";
import type { RecipePhotoProps } from "./models/RecipePhotoProps.interface";

/**
 * Foto 4:3 de una receta o, sin foto o si no carga, un marcador decorativo.
 * next/image con `unoptimized`: la foto es un enlace firmado de Storage (o una
 * vista previa local `blob:`), así que no hace falta configurar dominios y el
 * optimizador no guarda copias de un bucket privado.
 */
export const RecipePhoto = ({ alt, fallback, url }: RecipePhotoProps): React.JSX.Element => {
  const { onImageError, visibleUrl } = useImageFallback(url);

  return visibleUrl ? (
    <div className="relative aspect-[4/3]">
      <Image src={visibleUrl} alt={alt} fill unoptimized className="object-cover" onError={onImageError} />
    </div>
  ) : (
    <div
      aria-hidden="true"
      className="flex aspect-[4/3] items-center justify-center bg-tacha-chipbg font-display text-5xl text-tacha-teal"
    >
      {fallback}
    </div>
  );
};
