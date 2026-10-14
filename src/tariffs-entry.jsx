import React from "react";
import { createRoot } from "react-dom/client";
import { TariffsApp } from "./TariffsApp.jsx";
import "./tariffs.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TariffsApp />
  </React.StrictMode>,
);
