import { init } from "./index";

const root = document.getElementById("app")!;
const ctrl = init(root, { theme: "light", muted: true, difficulty: "ramp" });
ctrl.start();
