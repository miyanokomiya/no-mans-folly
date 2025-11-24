import { useCallback, useContext, useState } from "react";
import { TextInput } from "./atoms/inputs/TextInput";
import { closeWSClient, initWSClient } from "../composables/realtime/websocketChannel";
import { InlineField } from "./atoms/InlineField";
import { FormButton } from "./atoms/buttons/FormButton";
import { GetAppStateContext } from "../contexts/AppContext";
import { useTranslation } from "react-i18next";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { useWebsocketRoom } from "../hooks/realtimeHooks";

export const RealtimePanel: React.FC = () => {
  const { t } = useTranslation();
  const [roomIdDraft, setRoomIdDraft] = useState("");
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");

  const { canSyncWorkspace } = useContext(AppCanvasContext);
  const getCtx = useContext(GetAppStateContext);
  const room = useWebsocketRoom();

  const handleConnect = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!roomIdDraft || status !== "disconnected") return;

      setStatus("connecting");
      try {
        await initWSClient({
          canHost: canSyncWorkspace,
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
    [canSyncWorkspace, roomIdDraft, status, getCtx],
  );

  const handleDisconnect = useCallback(() => {
    closeWSClient();
    setStatus("disconnected");
  }, []);

  function getStatusLabel() {
    switch (status) {
      case "connected":
        return `${room.count} ${t("realtime.connected")}`;
      case "connecting":
        return t("realtime.connecting");
      default:
        return t("realtime.disconnected");
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-1">
        <p className="text-xl font-bold text-red-500">!Experimental!</p>
        <InlineField label="Status">
          <span>{getStatusLabel()}</span>
        </InlineField>
        <form onSubmit={handleConnect} className="flex flex-col gap-1">
          <InlineField label="Room ID" inert={status !== "disconnected"}>
            <TextInput value={roomIdDraft} onChange={setRoomIdDraft} placeholder="ROOM_ID" />
          </InlineField>
          {status !== "connected" ? (
            <FormButton type="submit" variant="submit" disabled={!roomIdDraft || status !== "disconnected"}>
              {t("realtime.connect")}
            </FormButton>
          ) : undefined}
        </form>
        {status === "connected" ? (
          <FormButton variant="delete" onClick={handleDisconnect}>
            {t("realtime.disconnect")}
          </FormButton>
        ) : undefined}
      </div>
    </div>
  );
};
