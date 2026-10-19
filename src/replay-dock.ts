type Panel = "timeline" | "location" | "menu" | "settings";

/** One set of replay controls, available in the scene in both viewing modes. */
export class ReplayDock {
  private active: Panel | null = null;
  private fullscreen = false;
  private homes: { element: HTMLElement; marker: Comment }[] = [];
  private root = document.createElement("div");

  constructor(
    private viewport: HTMLElement,
    icon: (name: string) => string,
    private onOpen: () => void,
  ) {
    const panels: { id: Panel; label: string; hint: string }[] = [
      { id: "timeline", label: "Timeline", hint: "Scrub back. See it again." },
      { id: "location", label: "Location", hint: "Find your perspective." },
      { id: "menu", label: "Menu", hint: "Explore the story behind the play." },
      { id: "settings", label: "Settings", hint: "Make the moment yours." },
    ];
    this.root.className = "replay-controls";
    this.root.innerHTML = `${panels
      .map(
        ({ id, label, hint }) => `
      <section class="dock-panel" id="dock-${id}" aria-labelledby="dock-${id}-title" hidden>
        <div class="dock-panel-heading"><div><h2 id="dock-${id}-title">${label}</h2><p>${hint}</p></div><button class="icon-button" data-close-panel aria-label="Close ${label.toLowerCase()}">${icon("close")}</button></div>
        <div class="dock-panel-body" data-slot="${id}"></div>
      </section>`,
      )
      .join("")}
      <div class="dock-status" data-slot="status"></div>
      <nav class="replay-dock" aria-label="Replay navigation">${panels
        .map(
          ({ id, label }) => `
        <button id="dock-button-${id}" class="dock-pill" data-panel="${id}" aria-controls="dock-${id}" aria-expanded="false">${icon(id)}<span>${label}</span></button>`,
        )
        .join("")}</nav>`;
    viewport.append(this.root);
    viewport.classList.add("dock-enabled");
    document.getElementById("main")!.classList.add("dock-layout");
    this.mountControls();
    // Fit panels to the embedded stadium as well as the fullscreen viewport.
    new ResizeObserver(([entry]) => {
      viewport.style.setProperty(
        "--replay-height",
        `${entry.contentRect.height}px`,
      );
    }).observe(viewport);
    this.root
      .querySelectorAll<HTMLButtonElement>("[data-panel]")
      .forEach((button) => {
        button.onclick = () =>
          this.open(
            this.active === button.dataset.panel
              ? null
              : (button.dataset.panel as Panel),
          );
      });
    this.root
      .querySelectorAll<HTMLButtonElement>("[data-close-panel]")
      .forEach((button) => {
        button.onclick = () => this.closePanel();
      });
    document.addEventListener("fullscreenchange", () => this.sync(icon));
  }

  open(panel: Panel | null) {
    if (panel) this.onOpen();
    this.active = panel;
    this.viewport.classList.toggle("dock-panel-open", panel !== null);
    this.root
      .querySelectorAll<HTMLElement>(".dock-panel")
      .forEach((element) => {
        element.hidden = element.id !== `dock-${panel}`;
      });
    this.root
      .querySelectorAll<HTMLElement>("[data-panel]")
      .forEach((element) => {
        element.setAttribute(
          "aria-expanded",
          String(element.dataset.panel === panel),
        );
      });
  }

  closePanel() {
    const previous = this.active;
    const focused = document.activeElement;
    this.open(null);
    if (
      previous &&
      focused instanceof HTMLElement &&
      focused.closest(".dock-panel")
    ) {
      this.root
        .querySelector<HTMLButtonElement>(`#dock-button-${previous}`)
        ?.focus({ preventScroll: true });
    }
  }

  private transfer(selector: string, destination: HTMLElement) {
    const element = document.querySelector<HTMLElement>(selector)!;
    const marker = document.createComment(`Fullscreen home: ${selector}`);
    element.before(marker);
    destination.append(element);
    this.homes.push({ element, marker });
  }

  private mountControls() {
    const contents: Record<string, string[]> = {
      // Move settings first: the speed select originally lives inside transport.
      settings: [".speed-label", ".analyst-settings", "#layers"],
      timeline: [".transport", ".timeline-wrap", ".moment-list"],
      location: [".view-strip", "#move-mode", ".tactical"],
      menu: [
        ".insight-heading",
        ".selected-player",
        ".question-list",
        "#answer",
        "#command-form",
        ".data-strip",
      ],
      status: [".status-line"],
    };
    for (const [slot, selectors] of Object.entries(contents)) {
      const destination = this.root.querySelector<HTMLElement>(
        `[data-slot="${slot}"]`,
      )!;
      selectors.forEach((selector) =>
        destination.append(document.querySelector(selector)!),
      );
    }
    document.querySelector(".replay-desk")!.remove();
    document.querySelector(".insight-column")!.remove();
    this.viewport.append(document.getElementById("help-dialog")!);
    const actions = document.createElement("div");
    actions.className = "dock-menu-actions";
    actions.innerHTML =
      '<button class="text-button" id="dock-help">Controls and help</button>';
    actions.querySelector<HTMLButtonElement>("#dock-help")!.onclick = () =>
      document.getElementById("help")!.click();
    this.root.querySelector('[data-slot="menu"]')!.append(actions);
  }

  private sync(icon: (name: string) => string) {
    const fullscreen = document.fullscreenElement === this.viewport;
    if (fullscreen === this.fullscreen) return;
    this.fullscreen = fullscreen;
    const expand = document.getElementById("fullscreen")!;
    expand.innerHTML = icon(fullscreen ? "collapse" : "expand");
    expand.setAttribute(
      "aria-label",
      fullscreen ? "Exit fullscreen" : "Expand replay",
    );
    this.viewport.classList.toggle("fullscreen-active", fullscreen);
    if (fullscreen) {
      const actions =
        this.root.querySelector<HTMLElement>(".dock-menu-actions")!;
      this.transfer("#enter-vr", actions);
      this.open(this.active ?? "timeline");
      this.root
        .querySelector<HTMLButtonElement>(`#dock-button-${this.active}`)!
        .focus({ preventScroll: true });
    } else {
      for (const { element, marker } of this.homes.reverse())
        marker.replaceWith(element);
      this.homes = [];
      expand.focus({ preventScroll: true });
    }
  }
}
