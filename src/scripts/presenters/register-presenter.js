import RegisterPage from "../views/pages/register-page.js";
import authRepository from "../data/auth-repository.js";
import { applyCustomAnimation } from "../utils/view-transition.js";
import Swal from "sweetalert2";

class RegisterPresenter {
  constructor(params = {}) {
    this._params = params;
    this._view = null;
    this._container = document.querySelector("#pageContent");
    this._error = null;
    this._isLoading = false;

    this._handleRegister = this._handleRegister.bind(this);
  }

  async init() {
    if (authRepository.isAuthenticated()) {
      Swal.fire({
        title: "Already Logged In",
        text: "You are already logged in. Please log out first to register a new account.",
        icon: "info",
        confirmButtonColor: "#2563EB",
      }).then(() => {
        window.location.hash = "#/";
      });
      return;
    }

    applyCustomAnimation("#pageContent", {
      name: "register-transition",
      duration: 400,
    });

    this._renderView();
  }

  _renderView() {
    this._view = new RegisterPage({
      error: this._error,
      isLoading: this._isLoading,
      container: this._container,
    });

    this._view.render();
    this._view.setRegisterHandler(this._handleRegister);
  }

  /**
   * Handle registration form submission
   * @param {Object} userData - User registration data
   */
  async _handleRegister(userData) {
    if (this._isLoading) {
      return;
    }

    try {
      this._isLoading = true;

      if (this._view) {
        this._view.setLoading(true);
      }

      await authRepository.register(userData);

      if (this._view) {
        this._view.showSuccessMessage();
      }

      Swal.fire({
        title: "Registration Successful!",
        text: "Your account has been created. You can now log in.",
        icon: "success",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "Login Now",
      }).then(() => {
        window.location.hash = "#/login";
      });
    } catch (error) {
      console.error("Registration failed:", error);

      this._error = error.message || "Registration failed. Please try again.";
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

export default RegisterPresenter;
