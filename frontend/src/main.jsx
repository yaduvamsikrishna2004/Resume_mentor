import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";
import { ResumeMentorProvider } from "./context/ResumeMentorContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ResumeMentorProvider>
        <App />
      </ResumeMentorProvider>
    </BrowserRouter>
  </React.StrictMode>
);
