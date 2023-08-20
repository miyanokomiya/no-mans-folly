import { Shape } from "../models";
import { ShapeStruct } from "./core";

export interface RectangleShape extends Shape {
  width: number;
  height: number;
}

export const struct: ShapeStruct<RectangleShape> = {
  label: "Rectangle",
  create(arg) {
    return {
      id: "",
      findex: "",
      type: "rectangle",
      p: { x: 0, y: 0 },
      width: 100,
      height: 100,
      ...(arg ?? {}),
    };
  },
  render(ctx, shape) {
    ctx.fillStyle = "#888888";
    ctx.fillRect(shape.p.x, shape.p.y, shape.width, shape.height);
    ctx.strokeStyle = "#000000";
    ctx.strokeRect(shape.p.x, shape.p.y, shape.width, shape.height);
  },
};
