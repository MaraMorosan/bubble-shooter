export class Input {
  public mouseX = 0;
  public mouseY = 0;
  public isDown = false;
  private el: HTMLCanvasElement;

  constructor(el: HTMLCanvasElement) {
    this.el = el;
    this.onMove = this.onMove.bind(this);
    this.onDown = this.onDown.bind(this);
    this.onUp = this.onUp.bind(this);

    el.addEventListener("mousemove", this.onMove);
    el.addEventListener("mousedown", this.onDown);
    window.addEventListener("mouseup", this.onUp);
  }

  private onMove(e: MouseEvent) {
    const rect = this.el.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }
  private onDown() {
    this.isDown = true;
  }
  private onUp() {
    this.isDown = false;
  }

  dispose() {
    this.el.removeEventListener("mousemove", this.onMove);
    this.el.removeEventListener("mousedown", this.onDown);
    window.removeEventListener("mouseup", this.onUp);
  }
}
