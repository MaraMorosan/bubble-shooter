import { init } from "./index";
class BubbleShooterElement extends HTMLElement {
  controller?: ReturnType<typeof init>;
  connectedCallback() {
    this.style.display = "block";
    this.style.width = "100%";
    this.style.height = "100%";
    this.controller = init(this, { muted: true, difficulty: "ramp" });
    this.controller.start();
  }
  disconnectedCallback() {
    this.controller?.destroy();
  }
}
customElements.define("bubble-shooter", BubbleShooterElement);
