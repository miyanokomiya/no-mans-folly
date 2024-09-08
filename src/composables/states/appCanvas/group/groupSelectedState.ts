import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { CONTEXT_MENU_ITEM_SRC, getMenuItemsForSelectedShapes } from "../contextMenuItems";

export const newGroupSelectedState = defineSingleSelectedHandlerState((getters) => {
  return {
    getLabel: () => "GroupSelected",
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdoubleclick": {
          const targetShape = getters.getTargetShape();
          const shapeComposite = ctx.getShapeComposite();
          const child = shapeComposite.findShapeAt(
            event.data.point,
            { parentId: targetShape.id },
            undefined,
            undefined,
            ctx.getScale(),
          );
          if (child) {
            ctx.selectShape(child.id);
            return null;
          }
          return;
        }
        case "contextmenu": {
          ctx.setContextMenuList({
            items: [
              CONTEXT_MENU_ITEM_SRC.UNGROUP,
              CONTEXT_MENU_ITEM_SRC.SEPARATOR,
              ...getMenuItemsForSelectedShapes(ctx),
            ],
            point: event.data.point,
          });
          return null;
        }
      }
    },
  };
});
