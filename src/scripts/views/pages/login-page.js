import createLoginTemplate from "../template/login-template.js";

class LoginPage {
  constructor({ error = null, isLoading = false, container }) {
    this._error = error;
    this._isLoading = isLoading;
    this._container = container;
    this._loginHandler = null;
  }

  render() {
    this._container.innerHTML = createLoginTemplate({
      error: this._error,
      isLoading: this._isLoading,
    });

    this._attachEventListeners();
  }

  _attachEventListeners() {
    const form = document.getElementById("loginForm");

    if (form && !this._isLoading) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();

        if (this._validateForm()) {
          const email = document.getElementById("email").value.trim();
          const password = document.getElementById("password").value;

          if (this._loginHandler) {
            this._loginHandler({ email, password });
          }
        }
      });
    }
  }

  _validateForm() {
    const email = document.getElementById("email");
    const password = document.getElementById("password");

    if (!email.validity.valid) {
      this._showFieldError(email, "Please enter a valid email address");
      return false;
    }

    if (password.value.length < 8) {
      this._showFieldError(
        password,
        "Password must be at least 8 characters long"
      );
      return false;
    }

    return true;
  }

  _showFieldError(field, message) {
    field.classList.add("form-input--error");

    let errorElement = field.nextElementSibling;
    if (!errorElement || !errorElement.classList.contains("form-error")) {
      errorElement = document.createElement("p");
      errorElement.className = "form-error";
      field.parentNode.insertBefore(errorElement, field.nextSibling);
    }

    errorElement.textContent = message;

    field.addEventListener(
      "input",
      () => {
        field.classList.remove("form-input--error");
        if (errorElement && errorElement.parentNode) {
          errorElement.parentNode.removeChild(errorElement);
        }
      },
      { once: true }
    );
  }

  setLoginHandler(handler) {
    this._loginHandler = handler;
  }

  setLoading(isLoading) {
    this._isLoading = isLoading;

    const loginButton = document.getElementById("loginButton");
    if (loginButton) {
      loginButton.disabled = isLoading;
      loginButton.innerHTML = isLoading
        ? '<i class="fas fa-spinner fa-spin"></i> Logging in...'
        : '<i class="fas fa-sign-in-alt"></i> Login';
    }

    const formFields = this._container.querySelectorAll(".form-input");
    formFields.forEach((field) => {
      field.disabled = isLoading;
    });
  }

  cleanup() {
    const form = document.getElementById("loginForm");
    if (form) {
      form.removeEventListener("submit", this._handleSubmit);
    }
  }
}

export default LoginPage;
