import HomePage from "../views/pages/home-page.js";
import storyRepository from "../data/story-repository.js";
import authRepository from "../data/auth-repository.js";
import { applyCustomAnimation } from "../utils/view-transition.js";
import Swal from "sweetalert2";

class HomePresenter {
  constructor(params = {}) {
    this._params = params;
    this._view = null;
    this._container = document.querySelector("#pageContent");
    this._isLoading = false;
    this._error = null;
    this._stories = [];

    this._fetchStories = this._fetchStories.bind(this);
    this._handleRetry = this._handleRetry.bind(this);
  }

  async init() {
    this._renderLoading();

    applyCustomAnimation("#pageContent", {
      name: "home-transition",
      duration: 400,
    });

    await this._fetchStories();
  }

  async _fetchStories() {
    try {
      this._isLoading = true;
      this._error = null;

      this._renderLoading();

      const isAuthenticated = authRepository.isAuthenticated();

      if (!isAuthenticated) {
        this._stories = [];
        this._isLoading = false;
        this._renderView();

        Swal.fire({
          title: "Welcome to Dicoding Story!",
          text: "Log in to see and share stories from the Dicoding community.",
          icon: "info",
          confirmButtonColor: "#2563EB",
          confirmButtonText: "Log In",
          showCancelButton: true,
          cancelButtonText: "Maybe Later",
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.hash = "#/login";
          }
        });

        return;
      }

      const response = await storyRepository.getStories({ location: 1 });

      this._stories = response.listStory || [];
      this._isLoading = false;

      this._renderView();
    } catch (error) {
      console.error("Failed to fetch stories:", error);

      this._isLoading = false;
      this._error =
        error.message || "Failed to load stories. Please try again.";

      this._renderError();
    }
  }

  _renderLoading() {
    this._view = new HomePage({
      isLoading: true,
      stories: [],
      error: null,
      container: this._container,
    });

    this._view.render();
  }

  _renderError() {
    this._view = new HomePage({
      isLoading: false,
      stories: [],
      error: this._error,
      container: this._container,
    });

    this._view.render();
    this._view.setRetryHandler(this._handleRetry);
  }

  _renderView() {
    this._view = new HomePage({
      isLoading: this._isLoading,
      stories: this._stories,
      error: this._error,
      container: this._container,
    });

    this._view.render();

    if (this._error) {
      this._view.setRetryHandler(this._handleRetry);
    }
  }

  _handleRetry() {
    this._fetchStories();
  }

  cleanup() {
    if (this._view) {
      this._view.cleanup();
    }
  }
}

export default HomePresenter;
