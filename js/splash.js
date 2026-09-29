/* Pantalla de carga: se cierra sola a los ~4 s o al hacer clic / pulsar una tecla */
(() => {
  const el = document.getElementById("splash");
  if (!el) return;

  const leave = () => {
    el.classList.add("leave");
    setTimeout(() => el.remove(), 800);
  };
  const timer = setTimeout(leave, 4200);
  const skip = () => { clearTimeout(timer); leave(); };

  el.addEventListener("click", skip);
  window.addEventListener("keydown", skip, { once: true });

  // La "linterna" sigue al puntero
  el.addEventListener("pointermove", (e) => {
    el.style.setProperty("--x", e.clientX + "px");
    el.style.setProperty("--y", e.clientY + "px");
  });
})();
