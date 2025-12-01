import { useEffect, useRef } from "react";
import { useIsInViewport } from "../../hooks/window";

interface Props {
  className: string;
  children: React.ReactNode;
  onRender?: () => void;
}

/**
 * Should set fixed height to avoid layout shift.
 */
export const LazyOnScreenRender: React.FC<Props> = ({ className, children, onRender }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const isInView = useIsInViewport(rootRef);

  useEffect(() => {
    if (isInView) {
      onRender?.();
    }
  }, [isInView, onRender]);

  return (
    <div ref={rootRef} className={className}>
      {isInView ? children : undefined}
    </div>
  );
};
