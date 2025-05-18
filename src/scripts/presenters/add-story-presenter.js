import AddStoryPage from "../views/pages/add-story-page.js";
import storyRepository from "../data/story-repository.js";
import authRepository from "../data/auth-repository.js";
import { applyCustomAnimation } from "../utils/view-transition.js";
import Swal from "sweetalert2";

class AddStoryPresenter {
  constructor(params = {}) {
    this._params = params;
    this._view = null;
    this._container = document.querySelector("#pageContent");
    this._isLoading = false;

    this._handleSubmit = this._handleSubmit.bind(this);
  }

  async init() {
    if (!authRepository.isAuthenticated()) {
      Swal.fire({
        title: "Authentication Required",
        text: "Please login to add a new story",
        icon: "warning",
        confirmButtonColor: "#2563EB",
      }).then(() => {
        window.location.hash = "#/login";
      });
      return;
    }

    applyCustomAnimation("#pageContent", {
      name: "add-story-transition",
      duration: 400,
    });

    this._renderView();
  }

  _renderView() {
    this._view = new AddStoryPage({
      isLoading: this._isLoading,
      container: this._container,
    });

    this._view.render();
    this._view.setSubmitHandler(this._handleSubmit);
  }

  /**
   * Handle form submission
   * @param {Object} storyData
   */
  async _handleSubmit(storyData) {
    if (this._isLoading) {
      return;
    }

    try {
      this._isLoading = true;

      if (this._view) {
        this._view.setLoading(true);
      }

      const isAuthenticated = authRepository.isAuthenticated();

      const response = await storyRepository.addStory(
        storyData,
        isAuthenticated
      );

      if (this._view) {
        this._view.showSuccessMessage();
      }

      Swal.fire({
        title: "Story Posted!",
        text: "Your story has been successfully shared",
        icon: "success",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      setTimeout(() => {
        window.location.hash = "#/";
      }, 2000);
    } catch (error) {
      console.error("Failed to submit story:", error);

      Swal.fire({
        title: "Failed to Post Story",
        text: error.message || "An error occurred while posting your story",
        icon: "error",
        confirmButtonColor: "#2563EB",
      });

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

export default AddStoryPresenter;
