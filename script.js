// Pequenas interações da página.
// O modelo 3D é renderizado pelo viewer incorporado do Sketchfab.

document.addEventListener("DOMContentLoaded", () => {
  const viewer = document.querySelector(".sketchfab-frame iframe");

  viewer.addEventListener("load", () => {
    document.documentElement.classList.add("viewer-loaded");
  });

  // Scroll suave para links internos.
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const id = link.getAttribute("href");
      if (id === "#") return;

      const target = document.querySelector(id);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
});
