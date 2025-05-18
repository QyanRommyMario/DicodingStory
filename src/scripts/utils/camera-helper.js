class CameraHelper {
  constructor() {
    this._stream = null;
    this._videoElement = null;
    this._canvasElement = null;
  }

  async initCamera(videoElement, constraints = {}) {
    if (!videoElement) {
      throw new Error("Video element is required");
    }

    this._videoElement = videoElement;

    const defaultConstraints = {
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    const mergedConstraints = { ...defaultConstraints, ...constraints };

    try {
      this.stopCamera();

      this._stream = await navigator.mediaDevices.getUserMedia(
        mergedConstraints
      );
      this._videoElement.srcObject = this._stream;
      await this._videoElement.play();

      return this._stream;
    } catch (error) {
      console.error("Camera initialization failed:", error);
      throw new Error(`Could not access camera: ${error.message}`);
    }
  }

  stopCamera() {
    if (this._stream) {
      this._stream.getTracks().forEach((track) => track.stop());
      this._stream = null;
    }

    if (this._videoElement) {
      this._videoElement.srcObject = null;
    }
  }

  takePhoto(canvasElement) {
    if (!canvasElement) {
      throw new Error("Canvas element is required");
    }

    if (!this._stream || !this._videoElement) {
      throw new Error("Camera not initialized. Call initCamera first.");
    }

    this._canvasElement = canvasElement;

    const width = this._videoElement.videoWidth;
    const height = this._videoElement.videoHeight;
    this._canvasElement.width = width;
    this._canvasElement.height = height;

    const context = this._canvasElement.getContext("2d");
    context.drawImage(this._videoElement, 0, 0, width, height);

    return this._getBlobFromCanvas();
  }

  getPhotoFile(filename = "photo.jpg") {
    if (!this._canvasElement) {
      throw new Error("No photo has been taken. Call takePhoto first.");
    }

    return this._getBlobFromCanvas().then((blob) => {
      return new File([blob], filename, { type: "image/jpeg" });
    });
  }

  async switchCamera() {
    if (!this._videoElement) {
      throw new Error("Camera not initialized. Call initCamera first.");
    }

    const currentTrack = this._stream.getVideoTracks()[0];
    const settings = currentTrack.getSettings();

    const newFacingMode =
      settings.facingMode === "user" ? "environment" : "user";

    const constraints = {
      video: {
        facingMode: newFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    return this.initCamera(this._videoElement, constraints);
  }

  static async isCameraSupported() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error("Camera not supported:", error);
      return false;
    }
  }

  _getBlobFromCanvas() {
    return new Promise((resolve) => {
      this._canvasElement.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
    });
  }
}

export default CameraHelper;
