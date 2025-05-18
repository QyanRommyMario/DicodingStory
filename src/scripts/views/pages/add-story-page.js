import createAddStoryTemplate from "../template/add-story-template.js";
import MapHelper from "../../utils/map-helper.js";
import CameraHelper from "../../utils/camera-helper.js";

class AddStoryPage {
  constructor({ isLoading = false, container }) {
    this._isLoading = isLoading;
    this._container = container;
    this._mapHelper = new MapHelper();
    this._cameraHelper = new CameraHelper();
    this._selectedLocation = null;
    this._photoFile = null;
    this._isCameraActive = false;
    this._submitHandler = null;

    this._bindMethods();
  }

  _bindMethods() {
    this._initCamera = this._initCamera.bind(this);
    this._stopCamera = this._stopCamera.bind(this);
    this._takePhoto = this._takePhoto.bind(this);
    this._switchCamera = this._switchCamera.bind(this);
    this._onLocationSelected = this._onLocationSelected.bind(this);
    this._getUserLocation = this._getUserLocation.bind(this);
    this._resetPhoto = this._resetPhoto.bind(this);
    this._handleFileInput = this._handleFileInput.bind(this);
  }

  render() {
    this._container.innerHTML = createAddStoryTemplate({
      isLoading: this._isLoading,
    });

    this._initMap();
    this._attachEventListeners();
  }

  _initMap() {
    const mapContainer = document.getElementById("locationMap");
    if (!mapContainer) return;

    this._mapHelper.initMap(mapContainer);
    this._mapHelper.setupLocationSelector(this._onLocationSelected);
  }

  _attachEventListeners() {
    const elements = {
      startCameraButton: document.getElementById("startCameraButton"),
      takePictureButton: document.getElementById("takePictureButton"),
      switchCameraButton: document.getElementById("switchCameraButton"),
      resetPhotoButton: document.getElementById("resetPhotoButton"),
      getUserLocationButton: document.getElementById("getUserLocationButton"),
      photoInput: document.getElementById("photoInput"),
      form: document.getElementById("addStoryForm"),
    };

    if (elements.startCameraButton) {
      elements.startCameraButton.addEventListener("click", this._initCamera);
    }

    if (elements.takePictureButton) {
      elements.takePictureButton.addEventListener("click", this._takePhoto);
    }

    if (elements.switchCameraButton) {
      elements.switchCameraButton.addEventListener("click", this._switchCamera);
    }

    if (elements.resetPhotoButton) {
      elements.resetPhotoButton.addEventListener("click", this._resetPhoto);
    }

    if (elements.getUserLocationButton) {
      elements.getUserLocationButton.addEventListener(
        "click",
        this._getUserLocation
      );
    }

    if (elements.photoInput) {
      elements.photoInput.addEventListener("change", this._handleFileInput);
    }

    if (elements.form) {
      elements.form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (this._validateForm() && typeof this._submitHandler === "function") {
          this._submitHandler(this._getFormData());
        }
      });
    }
  }

  async _initCamera() {
    if (this._isCameraActive) return;

    try {
      const videoElement = document.getElementById("cameraPreview");
      if (!videoElement) return;

      await this._cameraHelper.initCamera(videoElement);

      this._isCameraActive = true;
      this._updateCameraUI(true);
      this._showVideoPreview();
    } catch (error) {
      console.error("Failed to initialize camera:", error);
      alert(`Could not access camera: ${error.message}`);
    }
  }

  _stopCamera() {
    if (!this._isCameraActive) return;

    this._cameraHelper.stopCamera();
    this._isCameraActive = false;
    this._updateCameraUI(false);
  }

  async _takePhoto() {
    if (!this._isCameraActive) return;

    try {
      const canvasElement = document.getElementById("photoCanvas");
      if (!canvasElement) return;

      this._cameraHelper.takePhoto(canvasElement);
      this._photoFile = await this._cameraHelper.getPhotoFile();

      this._showPhotoPreview();
      this._updatePhotoUI(true);
      this._stopCamera();
    } catch (error) {
      console.error("Failed to take photo:", error);
      alert(`Could not take photo: ${error.message}`);
    }
  }

  async _switchCamera() {
    if (!this._isCameraActive) return;

    try {
      await this._cameraHelper.switchCamera();
    } catch (error) {
      console.error("Failed to switch camera:", error);
      alert(`Could not switch camera: ${error.message}`);
    }
  }

  _onLocationSelected(location) {
    this._selectedLocation = location;
    this._updateLocationUI();
  }

  async _getUserLocation() {
    try {
      this._selectedLocation = await this._mapHelper.getUserLocation();
      this._updateLocationUI();
    } catch (error) {
      console.error("Failed to get user location:", error);
      alert(`Could not get your location: ${error.message}`);
    }
  }

  _resetPhoto() {
    const photoPreview = document.getElementById("photoPreview");
    const canvas = document.getElementById("photoCanvas");
    const fileInput = document.getElementById("photoInput");

    if (photoPreview) {
      photoPreview.style.backgroundImage = "none";
    }

    if (canvas) {
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (fileInput) {
      fileInput.value = "";
    }

    this._photoFile = null;
    this._updatePhotoUI(false);
  }

  _handleFileInput(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      event.target.value = "";
      return;
    }

    this._photoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const photoPreview = document.getElementById("photoPreview");
      if (photoPreview) {
        photoPreview.style.backgroundImage = `url(${e.target.result})`;
        this._showPhotoPreview();
      }
    };
    reader.readAsDataURL(file);

    this._updatePhotoUI(true);
  }

  _validateForm() {
    const description = document.getElementById("description");
    if (!description || !description.value.trim()) {
      alert("Please enter a description for your story");
      return false;
    }

    if (!this._photoFile) {
      alert("Please take or upload a photo for your story");
      return false;
    }

    return true;
  }

  _getFormData() {
    const description = document.getElementById("description").value.trim();
    const formData = {
      description,
      photo: this._photoFile,
    };

    if (this._selectedLocation) {
      formData.lat = this._selectedLocation.lat;
      formData.lon = this._selectedLocation.lon;
    }

    return formData;
  }

  _showVideoPreview() {
    const elements = {
      videoElement: document.getElementById("cameraPreview"),
      photoPreview: document.getElementById("photoPreview"),
      canvas: document.getElementById("photoCanvas"),
    };

    if (!elements.videoElement || !elements.photoPreview || !elements.canvas)
      return;

    elements.videoElement.style.display = "block";
    elements.photoPreview.style.display = "none";
    elements.canvas.style.display = "none";
  }

  _showPhotoPreview() {
    const elements = {
      videoElement: document.getElementById("cameraPreview"),
      photoPreview: document.getElementById("photoPreview"),
      canvas: document.getElementById("photoCanvas"),
    };

    if (!elements.videoElement || !elements.photoPreview || !elements.canvas)
      return;

    elements.videoElement.style.display = "none";
    elements.photoPreview.style.display = "block";

    const photoUrl = elements.canvas.toDataURL("image/jpeg");
    elements.photoPreview.style.backgroundImage = `url(${photoUrl})`;
  }

  _updateCameraUI(isActive) {
    const elements = {
      startCameraButton: document.getElementById("startCameraButton"),
      takePictureButton: document.getElementById("takePictureButton"),
      switchCameraButton: document.getElementById("switchCameraButton"),
    };

    if (
      !elements.startCameraButton ||
      !elements.takePictureButton ||
      !elements.switchCameraButton
    )
      return;

    elements.startCameraButton.disabled = isActive;
    elements.takePictureButton.disabled = !isActive;
    elements.switchCameraButton.disabled = !isActive;
  }

  _updatePhotoUI(hasPhoto) {
    const resetPhotoButton = document.getElementById("resetPhotoButton");
    const startCameraButton = document.getElementById("startCameraButton");

    if (!resetPhotoButton || !startCameraButton) return;

    resetPhotoButton.disabled = !hasPhoto;
    startCameraButton.disabled = hasPhoto;
  }

  _updateLocationUI() {
    const selectedLocationElement = document.getElementById("selectedLocation");
    if (!selectedLocationElement) return;

    if (this._selectedLocation) {
      const { lat, lon } = this._selectedLocation;
      selectedLocationElement.innerHTML = `
        <i class="fas fa-check-circle"></i>
        Location selected: <br>
        <strong>Latitude:</strong> ${lat.toFixed(6)}, 
        <strong>Longitude:</strong> ${lon.toFixed(6)}
      `;
      selectedLocationElement.classList.add(
        "location-picker__selected--active"
      );
    } else {
      selectedLocationElement.textContent = "No location selected";
      selectedLocationElement.classList.remove(
        "location-picker__selected--active"
      );
    }
  }

  showSuccessMessage() {
    const formElement = document.getElementById("addStoryForm");
    if (!formElement) return;

    const successMessage = document.createElement("div");
    successMessage.className = "success-message";
    successMessage.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <p>Your story has been posted successfully!</p>
      <p>Redirecting to home page...</p>
    `;

    formElement.innerHTML = "";
    formElement.appendChild(successMessage);
  }

  setSubmitHandler(handler) {
    if (typeof handler === "function") {
      this._submitHandler = handler;
    }
  }

  setLoading(isLoading) {
    this._isLoading = isLoading;

    const submitButton = document.getElementById("submitButton");
    if (submitButton) {
      submitButton.disabled = isLoading;
      submitButton.innerHTML = isLoading
        ? '<i class="fas fa-spinner fa-spin"></i> Posting...'
        : '<i class="fas fa-paper-plane"></i> Post Story';
    }

    const formElements = this._container.querySelectorAll(
      "button, input, textarea"
    );
    formElements.forEach((el) => {
      if (
        el.id !== "takePictureButton" &&
        el.id !== "switchCameraButton" &&
        el.id !== "resetPhotoButton"
      ) {
        el.disabled = isLoading;
      }
    });
  }

  cleanup() {
    this._stopCamera();
  }
}

export default AddStoryPage;
