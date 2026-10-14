import React from "react";
import { createRoot } from "react-dom/client";
import { TariffsApp } from "../../src/TariffsApp.jsx";
import "./styles.css";
createRoot(document.getElementById("root")).render(<React.StrictMode><TariffsApp /></React.StrictMode>);
