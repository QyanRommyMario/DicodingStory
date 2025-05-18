const createAddStoryTemplate = ({ isLoading = false }) => {
  const buttonContent = isLoading
    ? '<i class="fas fa-spinner fa-spin"></i> Posting...'
    : '<i class="fas fa-paper-plane"></i> Post Story';

  return `
      <section class="add-story">
        <div class="add-story__header">
          <h2 class="add-story__title">Add New Story</h2>
          <a href="#/" class="button secondary">
            <i class="fas fa-arrow-left"></i> Back to Home
          </a>
        </div>
        
        <form id="addStoryForm" class="add-story-form">
          <div class="form-group">
            <label for="description" class="form-label">Description</label>
            <textarea 
              id="description" 
              name="description" 
              class="form-textarea" 
              placeholder="Share your story..." 
              required
              ${isLoading ? "disabled" : ""}
            ></textarea>
          </div>
          
          <div class="form-group">
            <label class="form-label">Photo</label>
            <div class="photo-capture">
              <div class="photo-capture__preview-container">
                <video id="cameraPreview" class="photo-capture__camera" autoplay playsinline></video>
                <canvas id="photoCanvas" class="photo-capture__canvas"></canvas>
                <div id="photoPreview" class="photo-capture__preview"></div>
              </div>
              
              <div class="photo-capture__actions">
                <button 
                  type="button" 
                  id="startCameraButton" 
                  class="button photo-capture__button"
                  ${isLoading ? "disabled" : ""}
                >
                  <i class="fas fa-camera"></i> Open Camera
                </button>
                
                <button 
                  type="button" 
                  id="takePictureButton" 
                  class="button photo-capture__button" 
                  disabled
                >
                  <i class="fas fa-camera-retro"></i> Take Photo
                </button>
                
                <button 
                  type="button" 
                  id="switchCameraButton" 
                  class="button photo-capture__button" 
                  disabled
                >
                  <i class="fas fa-sync"></i> Switch Camera
                </button>
                
                <button 
                  type="button" 
                  id="resetPhotoButton" 
                  class="button photo-capture__button" 
                  disabled
                >
                  <i class="fas fa-trash"></i> Reset
                </button>
              </div>
              
              <div class="photo-capture__file-input">
                <label for="photoInput" class="form-label">Or upload a photo:</label>
                <input 
                  type="file" 
                  id="photoInput" 
                  name="photo" 
                  accept="image/*" 
                  class="form-input"
                  ${isLoading ? "disabled" : ""}
                />
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Location (Optional)</label>
            <div class="location-picker">
              <div id="locationMap" class="location-picker__map"></div>
              
              <div class="location-picker__actions">
                <button 
                  type="button" 
                  id="getUserLocationButton" 
                  class="button location-picker__button"
                  ${isLoading ? "disabled" : ""}
                >
                  <i class="fas fa-map-marker-alt"></i> Use My Location
                </button>
                
                <p class="location-picker__hint">
                  <i class="fas fa-info-circle"></i> 
                  Or click on the map to select a location
                </p>
                
                <div id="selectedLocation" class="location-picker__selected">
                  No location selected
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-actions">
            <button 
              type="submit" 
              id="submitButton" 
              class="button"
              ${isLoading ? "disabled" : ""}
            >
              ${buttonContent}
            </button>
          </div>
        </form>
      </section>
    `;
};

export default createAddStoryTemplate;
