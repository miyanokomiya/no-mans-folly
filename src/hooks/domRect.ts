import { IRectangle, IVec2 } from "okageo";
import { Ref, useCallback, useMemo, useState, useRef } from "react";
import { isRectOverlapped } from "../utils/geometry";
import { Direction2, Size } from "../models";
import { fulfilRef } from "./utils";

/**
 * Fulfils "externalRef" as well as returned ref object when it's provided.
 */
export function useRefWithDOMRect<T extends HTMLElement>(
  externalRef?: Ref<T>,
): [(node: T | null) => void, DOMRect | undefined] {
  const [box, setBox] = useState<DOMRect>();
  const observerRef = useRef<ResizeObserver>(null);

  const internalRef = useCallback(
    (node: T | null) => {
      fulfilRef(externalRef, node);
      observerRef.current?.disconnect();
      setBox(node?.getBoundingClientRect());
      if (!node) return;

      const observer = new ResizeObserver(([entry]) => {
        if (entry) setBox(entry.target.getBoundingClientRect());
      });
      observer.observe(node);
      observerRef.current = observer;
    },
    [externalRef],
  );

  return [internalRef, box];
}

/**
 * Returns position adjustment vector to place the target within the area once the bounds are provided.
 * Attempts to place the target away from the obstacle if it's provided.
 */
export function useWithinArea(
  targetBounds?: IRectangle,
  areaBounds?: Size & Partial<IVec2>,
  obstacle?: [IRectangle, avoidTo: Direction2],
): IVec2 | undefined {
  return useMemo(() => {
    if (!targetBounds || !areaBounds) return;

    const [top, right, bottom, left] = [
      targetBounds.y,
      targetBounds.x + targetBounds.width,
      targetBounds.y + targetBounds.height,
      targetBounds.x,
    ];

    let dx = 0;
    let dy = 0;

    const [areaTop, areaRight, areaBottom, areaLeft] = [
      areaBounds.y ?? 0,
      (areaBounds.x ?? 0) + areaBounds.width,
      (areaBounds.y ?? 0) + areaBounds.height,
      areaBounds.x ?? 0,
    ];

    if (left < areaLeft) {
      dx = areaLeft - left;
    } else if (areaRight < right) {
      dx = areaRight - right;
    }

    if (top < areaTop) {
      dy = areaTop - top;
    } else if (areaBottom < bottom) {
      dy = areaBottom - bottom;
    }

    if (obstacle) {
      const targetBoundsInArea = {
        x: left + dx,
        y: top + dy,
        width: targetBounds.width,
        height: targetBounds.height,
      };

      const [obstacleBounds, avoidTo] = obstacle;
      const [obstacleTop, obstacleRight, obstacleBottom, obstacleLeft] = [
        obstacleBounds.y,
        obstacleBounds.x + obstacleBounds.width,
        obstacleBounds.y + obstacleBounds.height,
        obstacleBounds.x,
      ];

      if (isRectOverlapped(targetBoundsInArea, obstacleBounds)) {
        // Slide the target away from the obstacle
        if (avoidTo === 1) {
          const leftAvoidable = areaLeft <= obstacleLeft - targetBoundsInArea.width;
          const rightAvoidable = obstacleRight + targetBoundsInArea.width <= areaRight;
          const toLeft = left + targetBoundsInArea.width / 2 < obstacleLeft + obstacleBounds.width / 2;

          if (toLeft) {
            // Try to slide to left and check if it's within the area
            if (leftAvoidable) {
              dx = obstacleLeft - targetBoundsInArea.width - left;
            } else {
              // Try to slide to right and check if it's within the area
              if (rightAvoidable) {
                dx = obstacleRight - left;
              } else {
                // If not, the obstacle is unavoidable
                // => Slide to the left edge of the area
                dx = areaLeft - left;
              }
            }
          } else {
            // Try to slide to right and check if it's within the area
            if (rightAvoidable) {
              dx = obstacleRight - left;
            } else {
              // Try to slide to right and check if it's within the area
              if (leftAvoidable) {
                dx = obstacleLeft - targetBoundsInArea.width - left;
              } else {
                // If not, the obstacle is unavoidable
                // => Slide to the right edge of the area
                dx = areaRight - targetBoundsInArea.width - left;
              }
            }
          }
        } else {
          const topAvoidable = areaTop <= obstacleTop - targetBoundsInArea.height;
          const bottomAvoidable = obstacleBottom + targetBoundsInArea.height <= areaBottom;
          const toTop = top + targetBoundsInArea.height / 2 < obstacleTop + obstacleBounds.height / 2;

          if (toTop) {
            // Try to slide to top and check if it's within the area
            if (topAvoidable) {
              dy = obstacleTop - targetBoundsInArea.height - top;
            } else {
              // Try to slide to bottom and check if it's within the area
              if (bottomAvoidable) {
                dy = obstacleBottom - top;
              } else {
                // If not, the obstacle is unavoidable
                // => Slide to the top edge of the area
                dy = areaTop - top;
              }
            }
          } else {
            // Try to slide to bottom and check if it's within the area
            if (bottomAvoidable) {
              dy = obstacleBottom - top;
            } else {
              // Try to slide to bottom and check if it's within the area
              if (topAvoidable) {
                dy = obstacleTop - targetBoundsInArea.height - top;
              } else {
                // If not, the obstacle is unavoidable
                // => Slide to the bottom edge of the area
                dy = areaBottom - targetBoundsInArea.height - top;
              }
            }
          }
        }
      }
    }

    return { x: dx, y: dy };
  }, [targetBounds, areaBounds, obstacle]);
}
