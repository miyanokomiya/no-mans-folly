import { useCallback, useEffect, useState } from "react";
import * as Y from "yjs";
import { newShapeStore } from "./stores/shapes.ts";
import { generateUuid } from "./utils/random.ts";
import { Entity } from "./models/index.ts";

const ydoc = new Y.Doc();
const store = newShapeStore(ydoc);

function App() {
  const onClick = useCallback(() => {
    const id = generateUuid();
    store.addEntity({ id, findex: id });
  }, []);

  const [shapes, setShapes] = useState<Entity[]>([]);

  useEffect(() => {
    ydoc.on("update", () => {
      setShapes(() => store.getEntities());
    });
  }, []);

  const list = shapes.map((s) => <div>{s.id}</div>);

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold underline">Hello world!</h1>
        <button onClick={onClick}>Add</button>
        {list}
      </div>
    </>
  );
}

export default App;
