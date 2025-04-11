import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import Chart from 'chart.js/auto';
import { CategoryScale } from 'chart.js';

// Register the CategoryScale component
Chart.register(CategoryScale);

createRoot(document.getElementById("root")!).render(<App />);
