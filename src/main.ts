import "./ui/styles/tokens.css";
import "./style.css";
import "./ui/styles/stage-layout.css";
import "./ui/styles/components.css";
import { resumeSavedGame } from "./state/game";
import { mountApp } from "./ui/app";

// pick up a run saved in localStorage before the first render
resumeSavedGame();

mountApp(document.querySelector<HTMLDivElement>("#app")!);
