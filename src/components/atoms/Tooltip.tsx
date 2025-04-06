import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  children: React.ReactNode;
  content: React.ReactNode;
  // "top" by default
  direction?: "top" | "right";
};

export const Tooltip = ({ children, content, direction }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [contentAttrs, setContentAttrs] = useState<{ className: string; style: React.CSSProperties }>();

  const handleMouseEnter = useCallback(() => {
    setShow(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShow(false);
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    if (!show) {
      setContentAttrs(undefined);
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    switch (direction) {
      case "right":
        setContentAttrs({
          className: "-translate-y-1/2 pl-4",
          style: { top: `${(rect.top + rect.bottom) / 2}px`, left: `${rect.right}px` },
        });
        return;
      default:
        setContentAttrs({
          className: "-translate-x-1/2 pb-4",
          style: { bottom: `${rect.bottom}px`, left: `${(rect.left + rect.right) / 2}px` },
        });
        return;
    }
  }, [show, direction]);

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div ref={ref}>{children}</div>
      {contentAttrs
        ? createPortal(
            <div className={"fixed " + contentAttrs.className} style={contentAttrs.style}>
              <div className="border border-gray-200">{content}</div>
              {direction === "right" ? (
                <div
                  className="bg-gray-200 w-4 h-6 absolute left-0 top-1/2 -translate-y-1/2"
                  style={{ clipPath: "polygon(100% 0, 0 50%, 100% 100%)" }}
                />
              ) : (
                <div
                  className="bg-gray-200 w-6 h-4 absolute left-1/2 top-0 -translate-x-1/2"
                  style={{ clipPath: "polygon(0 0, 50% 100%, 100% 0)" }}
                />
              )}
            </div>,
            document.body,
          )
        : undefined}
    </div>
  );
};
