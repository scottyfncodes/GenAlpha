export function createInputHandler(el, onTap) {
  let enabled = true;

  function handlePointer(e) {
    if (!enabled) return;
    e.preventDefault();
    onTap(performance.now() / 1000);
  }

  function handleKey(e) {
    if (!enabled) return;
    if ((e.code === "Space" || e.code === "ArrowUp") && !e.repeat) {
      e.preventDefault();
      onTap(performance.now() / 1000);
    }
  }

  function blockContextMenu(e) {
    e.preventDefault();
  }

  el.addEventListener("pointerdown", handlePointer, { passive: false });
  window.addEventListener("keydown", handleKey, { passive: false });
  el.addEventListener("contextmenu", blockContextMenu);
  document.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
    },
    { passive: false }
  );

  return {
    setEnabled(v) {
      enabled = v;
    },
    destroy() {
      el.removeEventListener("pointerdown", handlePointer);
      window.removeEventListener("keydown", handleKey);
      el.removeEventListener("contextmenu", blockContextMenu);
    },
  };
}
