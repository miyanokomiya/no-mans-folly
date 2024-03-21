import React from "react";
import ReactDOM from "react-dom/client";
import "../../index.css";
import { getBackHomeFlag, getCallbackAction } from "../../utils/route";
import { AuthResult } from "./AuthResult";

const callbackAction = getCallbackAction();
const backHome = getBackHomeFlag();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <div className="w-screen h-screen flex items-center justify-center bg-gray-300">
      <div className="p-12 bg-white">
        <AuthResult callbackAction={callbackAction} backHome={backHome} />
      </div>
    </div>
  </React.StrictMode>,
);
