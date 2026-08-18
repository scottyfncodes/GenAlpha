export function createInputHandler(el, onDown, onUp) {
  let enabled = true;
  let held = false;

  function press() {
    if (held) return;
    held = true;
    onDown();
  }

  function release() {
    if (!held) return;
    held = false;
    onUp();
  }

  function handlePointerDown(e) {
    if (!enabled) return;
    e.preventDefault();
    press();
  }

  function handlePointerUp(e) {
    release();
  }

  function handleKeyDown(e) {
    if (!enabled) return;
    if ((e.code === "Space" || e.code === "ArrowUp") && !e.repeat) {
      e.preventDefault();
      press();
    }
  }

  function handleKeyUp(e) {
    if (e.code === "Space" || e.code === "ArrowUp") {
      release();
    }
  }

  function blockContextMenu(e) {
    e.preventDefault();
  }

  el.addEventListener("pointerdown", handlePointerDown, { passive: false });
  window.addEventListener("pointerup", handlePointerUp, { passive: true });
  window.addEventListener("pointercancel", handlePointerUp, { passive: true });
  window.addEventListener("blur", release);
  window.addEventListener("keydown", handleKeyDown, { passive: false });
  window.addEventListener("keyup", handleKeyUp, { passive: true });
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
      if (!v) release();
    },
    destroy() {
      el.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", release);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      el.removeEventListener("contextmenu", blockContextMenu);
    },
  };
}
