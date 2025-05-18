import "./views/components/app-bar.js";
import Router from "./routes/routes.js";

document.addEventListener("DOMContentLoaded", () => {
  const skipLink = document.querySelector(".skip-link");
  if (skipLink) {
    skipLink.addEventListener("click", (event) => {
      event.preventDefault();

      const mainContent = document.getElementById("mainContent");
      if (mainContent) {
        if (!mainContent.hasAttribute("tabindex")) {
          mainContent.setAttribute("tabindex", "-1");
        }

        mainContent.focus();
        mainContent.scrollIntoView();
      }
    });
  }

  const appBarContainer = document.getElementById("appBar");
  const appBar = document.createElement("app-bar");
  appBarContainer.appendChild(appBar);

  const router = new Router();
  router.init();
});
