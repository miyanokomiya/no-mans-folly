import { useEffect, useState } from "react";
import { iswebsocketChannelActive, websocketChannelCallback } from "../composables/realtime/websocketChannel";

export function useWebsocketChannelActive(): boolean {
  const [state, setState] = useState(() => iswebsocketChannelActive());
  useEffect(() => {
    return websocketChannelCallback.bind((val) => {
      setState(val);
    });
  }, []);

  return state;
}
