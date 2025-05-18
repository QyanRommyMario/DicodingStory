import LoginPage from "../views/pages/login-page.js";
import authRepository from "../data/auth-repository.js";
import { applyCustomAnimation } from "../utils/view-transition.js";
import Swal from "sweetalert2";

class LoginPresenter {
  constructor(params = {}) {
    this._params = params;
    this._view = null;
    this._container = document.querySelector("#pageContent");
    this._error = null;
    this._isLoading = false;

    this._handleLogin = this._handleLogin.bind(this);
  }

  async init() {
    if (authRepository.isAuthenticated()) {
      window.location.hash = "#/";
      return;
    }

    applyCustomAnimation("#pageContent", {
      name: "login-transition",
      duration: 400,
    });

    this._renderView();
  }

  /**
   * Render the view with current state
   */
  _renderView() {
    this._view = new LoginPage({
      error: this._error,
      isLoading: this._isLoading,
      container: this._container,
    });

    this._view.render();
    this._view.setLoginHandler(this._handleLogin);
  }

  /**
   * Handle login form submission
   * @param {Object} credentials - Login credentials
   */
  async _handleLogin(credentials) {
    if (this._isLoading) {
      return;
    }

    try {
      this._isLoading = true;

      if (this._view) {
        this._view.setLoading(true);
      }

      await authRepository.login(credentials);

      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener("mouseenter", Swal.stopTimer);
          toast.addEventListener("mouseleave", Swal.resumeTimer);
        },
      });

      Toast.fire({
        icon: "success",
        title: "Login berhasil",
      });

      window.location.hash = "#/";
    } catch (error) {
      console.error("Login failed:", error);

      this._error =
        error.message ||
        "Login failed. Please check your credentials and try again.";
      this._isLoading = false;
      this._renderView();
    } finally {
      this._isLoading = false;

      if (this._view) {
        this._view.setLoading(false);
      }
    }
  }

  cleanup() {
    if (this._view) {
      this._view.cleanup();
    }
  }
}

export default LoginPresenter;
