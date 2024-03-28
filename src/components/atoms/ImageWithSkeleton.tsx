import { useEffect, useRef, useState } from "react";
import { FadeIn } from "./effects/FadeIn";

interface Props {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
}

export const ImageWithSkeleton: React.FC<Props> = ({ src, alt, className, skeletonClassName }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!imgRef.current) return;

    imgRef.current.src = src;
    imgRef.current.onload = () => {
      setLoaded(true);
    };
  }, [src, className]);

  return (
    <>
      <img ref={imgRef} alt={alt} className={className + (loaded ? "" : " hidden")} />
      <FadeIn className="duration-1000 delay-100">
        <div className={skeletonClassName + " rounded bg-gray-200 animate-pulse" + (loaded ? " hidden" : "")} />
      </FadeIn>
    </>
  );
};
