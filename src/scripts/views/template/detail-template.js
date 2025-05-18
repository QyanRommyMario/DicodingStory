const createDetailTemplate = ({
  isLoading = false,
  error = null,
  story = null,
}) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (isLoading) {
    return `
        <section class="detail">
          <div class="detail__header">
            <h2 class="detail__title">Story Details</h2>
            <a href="#/" class="button secondary">
              <i class="fas fa-arrow-left"></i> Back to Home
            </a>
          </div>
          
          <div class="loading-indicator">
            <div class="loading-spinner"></div>
            <p>Loading story details...</p>
          </div>
        </section>
      `;
  }

  if (error) {
    return `
        <section class="detail">
          <div class="detail__header">
            <h2 class="detail__title">Story Details</h2>
            <a href="#/" class="button secondary">
              <i class="fas fa-arrow-left"></i> Back to Home
            </a>
          </div>
          
          <div class="error-container">
            <i class="fas fa-exclamation-circle error-icon"></i>
            <p class="error-message">${error}</p>
            <button class="button" id="retryButton">
              <i class="fas fa-redo"></i> Try Again
            </button>
          </div>
        </section>
      `;
  }

  if (!story) {
    return `
        <section class="detail">
          <div class="detail__header">
            <h2 class="detail__title">Story Details</h2>
            <a href="#/" class="button secondary">
              <i class="fas fa-arrow-left"></i> Back to Home
            </a>
          </div>
          
          <div class="error-container">
            <i class="fas fa-search error-icon"></i>
            <p class="error-message">Story not found</p>
            <a href="#/" class="button">
              <i class="fas fa-home"></i> Back to Home
            </a>
          </div>
        </section>
      `;
  }

  const mapTemplate =
    story.lat && story.lon
      ? `
        <div class="story-detail__map-container">
          <h4 class="story-detail__map-title">
            <i class="fas fa-map-marker-alt"></i> Story Location
          </h4>
          <div id="detailMap" class="story-detail__map"></div>
        </div>
      `
      : "";

  return `
      <section class="detail">
        <div class="detail__header">
          <h2 class="detail__title">Story Details</h2>
          <a href="#/" class="button secondary">
            <i class="fas fa-arrow-left"></i> Back to Home
          </a>
        </div>
        
        <article class="story-detail">
          <div class="story-detail__image-container">
            <img 
              src="${story.photoUrl}" 
              alt="Story by ${story.name}"
              class="story-detail__image"
            />
          </div>
          
          <div class="story-detail__content">
            <div class="story-detail__meta">
              <div class="story-detail__author">
                <i class="fas fa-user"></i>
                <span>${story.name}</span>
              </div>
              <div class="story-detail__date">
                <i class="fas fa-calendar-alt"></i>
                <span>${formatDate(story.createdAt)}</span>
              </div>
            </div>
            
            <h3 class="story-detail__title">Story by ${story.name}</h3>
            
            <div class="story-detail__description">
              ${story.description}
            </div>
            
            ${mapTemplate}
          </div>
        </article>
      </section>
    `;
};

export default createDetailTemplate;
