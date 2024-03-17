import React from "react";
import ReactDOM from "react-dom/client";
import "../../index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <div className="w-screen h-screen flex flex-col items-center justify-center gap-4 text-center text-lg">
      <div>
        <p>Auth to the workspace is retrieved.</p>
        <p>Data syncing will work on next update in the original page.</p>
      </div>
      <button
        type="button"
        className="w-52 p-2 rounded bg-blue-400 text-white flex items-center justify-center gap-2"
        onClick={() => window.close()}
      >
        Close this page
      </button>
      <div>
        <p>Above button may not work depending on the situation.</p>
        <p>Please, manually close this page in such case.</p>
      </div>
    </div>
  </React.StrictMode>,
);
