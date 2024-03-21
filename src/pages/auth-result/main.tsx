import React from "react";
import ReactDOM from "react-dom/client";
import "../../index.css";
import { getBackHomeFlag, getCallbackAction } from "../../utils/route";

const callbackAction = getCallbackAction();
const backHome = getBackHomeFlag();

const titleBody =
  callbackAction === "auth_error" ? (
    <span className="text-red-500 font-semibold">Authentication failed</span>
  ) : (
    <span>Authentication successful</span>
  );

const messageBody =
  callbackAction === "retrieval" ? (
    <p>Data syncing will work on next update in the original page.</p>
  ) : callbackAction === "no_google_drive_scope" ? (
    <div className="text-red-500 font-semibold">
      <p>You have not yet granted Google Drive permission to this app.</p>
      <p>You may need to retry Google Auth process to grant it.</p>
    </div>
  ) : callbackAction === "auth_error" ? (
    <div className="text-red-500 font-semibold">
      <p>Please, retry Google Auth process from the beginning.</p>
    </div>
  ) : (
    <p>You can open external workspace in the original page.</p>
  );

const buttonBlock = backHome ? (
  <a href="/?google=1" className="w-52 p-2 rounded bg-blue-400 text-white flex items-center justify-center gap-2">
    Back
  </a>
) : (
  <>
    <button
      type="button"
      className="w-52 p-2 rounded bg-blue-400 text-white flex items-center justify-center gap-2"
      onClick={() => window.close()}
    >
      Close this page
    </button>
    <div>
      <p>Above button may not work depending on environment.</p>
      <p>Please, manually close this page in such case.</p>
    </div>
  </>
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <div className="w-screen h-screen flex items-center justify-center bg-gray-300">
      <div className="p-12 bg-white flex flex-col items-center justify-center gap-4 text-center text-lg">
        <h1 className="text-2xl font-semibold">{titleBody}</h1>
        <div className="mt-2">{messageBody}</div>
        {buttonBlock}
      </div>
    </div>
  </React.StrictMode>,
);
