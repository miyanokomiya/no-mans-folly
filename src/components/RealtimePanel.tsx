import { useCallback, useContext, useState } from "react";
import { TextInput } from "./atoms/inputs/TextInput";
import { closeWSClient, initWSClient } from "../composables/realtime/websocketChannel";
import { InlineField } from "./atoms/InlineField";
import { FormButton } from "./atoms/buttons/FormButton";
import { GetAppStateContext } from "../contexts/AppContext";

export const RealtimePanel: React.FC = () => {
  const [roomIdDraft, setRoomIdDraft] = useState("");
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");

  const getCtx = useContext(GetAppStateContext);

  const handleConnect = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!roomIdDraft || status !== "disconnected") return;

      setStatus("connecting");
      try {
        await initWSClient({
          roomId: roomIdDraft,
          onClose: () => {
            setStatus("disconnected");
          },
        });
        setStatus("connected");
      } catch {
        const ctx = getCtx();
        ctx.showToastMessage({
          type: "error",
          text: "Failed to connect to the room.",
        });
        setStatus("disconnected");
      }
    },
    [roomIdDraft, status, getCtx],
  );

  const handleDisconnect = useCallback(() => {
    closeWSClient();
    setStatus("disconnected");
  }, []);

  return (
    <div>
      <div className="flex flex-col gap-1">
        {status ? (
          <form onSubmit={handleConnect} className="flex flex-col gap-1">
            <InlineField label="Room ID">
              <TextInput value={roomIdDraft} onChange={setRoomIdDraft} placeholder="ROOM_ID" />
            </InlineField>
            <FormButton type="submit" variant="submit" disabled={!roomIdDraft || status !== "disconnected"}>
              {status === "connecting" ? "Connecting" : "Connect"}
            </FormButton>
          </form>
        ) : (
          <FormButton variant="delete" disabled={status !== "disconnected"} onClick={handleDisconnect}>
            Disconnect
          </FormButton>
        )}
      </div>
    </div>
  );
};
