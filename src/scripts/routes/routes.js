import HomePresenter from "../presenters/home-presenter.js";
import DetailPresenter from "../presenters/detail-presenter.js";
import AddStoryPresenter from "../presenters/add-story-presenter.js";
import LoginPresenter from "../presenters/login-presenter.js";
import RegisterPresenter from "../presenters/register-presenter.js";
import { applyViewTransition } from "../utils/view-transition.js";
import authRepository from "../data/auth-repository.js";
import Swal from "sweetalert2";

const routes = {
  "/": HomePresenter,
  "/detail/:id": DetailPresenter,
  "/add": AddStoryPresenter,
  "/login": LoginPresenter,
  "/register": RegisterPresenter,
};

const knownFragments = ["mainContent", "pageContent"];

class Router {
  constructor() {
    this._currentPage = null;
    this._routes = routes;

    this._loadPage = this._loadPage.bind(this);
    this.navigate = this.navigate.bind(this);
  }

  init() {
    window.addEventListener("hashchange", this._loadPage);
    this._loadPage();
  }

  async _loadPage() {
    const hash = window.location.hash.slice(1) || "/";

    if (knownFragments.includes(hash)) {
      const fragment = document.getElementById(hash);
      if (fragment) {
        if (!fragment.hasAttribute("tabindex")) {
          fragment.setAttribute("tabindex", "-1");
        }
        fragment.focus();
        fragment.scrollIntoView();
      }
      return;
    }

    let page = null;
    let params = {};

    for (const [pattern, presenter] of Object.entries(this._routes)) {
      const regex = this._convertRouteToRegex(pattern);
      const match = hash.match(regex);

      if (match) {
        if (pattern.includes(":")) {
          const paramNames = pattern
            .split("/")
            .filter((segment) => segment.startsWith(":"))
            .map((param) => param.slice(1));

          const paramValues = match.slice(1);

          paramNames.forEach((name, index) => {
            params[name] = paramValues[index];
          });
        }

        page = presenter;
        break;
      }
    }

    if (this._currentPage && typeof this._currentPage.cleanup === "function") {
      this._currentPage.cleanup();
    }

    if (page) {
      if (this._isProtectedRoute(hash) && !this._isAuthenticated()) {
        Swal.fire({
          title: "Login Required",
          text: "Please login to access this page",
          icon: "info",
          confirmButtonColor: "#2563EB",
        }).then(() => {
          this.navigate("/login");
        });
        return;
      }

      try {
        await applyViewTransition(async () => {
          this._currentPage = new page(params);
          await this._currentPage.init();
        });
      } catch (error) {
        console.error("Failed to load page:", error);
        document.querySelector("#pageContent").innerHTML = `
          <div class="error-container">
            <i class="fas fa-exclamation-circle error-icon"></i>
            <h2>Oops! Something went wrong</h2>
            <p class="error-message">${error.message}</p>
            <button class="button" onclick="window.location.reload()">
              <i class="fas fa-redo"></i> Try Again
            </button>
          </div>
        `;
      }
    } else {
      document.querySelector("#pageContent").innerHTML = `
        <div class="error-container">
          <i class="fas fa-search error-icon"></i>
          <h2>Page Not Found</h2>
          <p class="error-message">The page you're looking for doesn't exist.</p>
          <button class="button" onclick="window.location.hash = '#'">
            <i class="fas fa-home"></i> Go to Homepage
          </button>
        </div>
      `;
    }
  }

  navigate(path) {
    window.location.hash = path;
  }

  _isProtectedRoute(route) {
    const protectedRoutes = ["/add", "/detail"];
    return protectedRoutes.some((r) => route.startsWith(r));
  }

  _isAuthenticated() {
    return authRepository.isAuthenticated();
  }

  _convertRouteToRegex(route) {
    const pattern = route.replace(/\//g, "\\/").replace(/:\w+/g, "([^/]+)");

    return new RegExp(`^${pattern}$`);
  }
}

export default Router;
