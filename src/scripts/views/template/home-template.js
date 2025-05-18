const createHomeTemplate = ({
  isLoading = false,
  error = null,
  stories = [],
}) => {
  if (isLoading) {
    return `
      <section class="home">
        <h2 class="home__title">Recent Stories</h2>
        
        <div class="loading-indicator">
          <div class="loading-spinner"></div>
          <p>Loading stories...</p>
        </div>
      </section>
    `;
  }

  if (error) {
    return `
      <section class="home">
        <h2 class="home__title">Recent Stories</h2>
        
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

  const mapTemplate = `
    <div class="map-container">
      <h3 class="map-title">
        <i class="fas fa-map-marked-alt"></i>
        Story Locations
      </h3>
      <div id="storyMap" class="story-map"></div>
    </div>
  `;

  const emptyTemplate = `
    <div class="stories-empty">
      <i class="fas fa-book-open stories-empty__icon"></i>
      <p>No stories available yet. Be the first to share your story!</p>
      <a href="#/add" class="button">
        <i class="fas fa-plus-circle"></i> Add New Story
      </a>
    </div>
  `;

  const storiesTemplate =
    stories.length > 0
      ? `<div class="stories-list" id="storiesList"></div>`
      : emptyTemplate;

  return `
    <section class="home">
      <h2 class="home__title">Recent Stories</h2>
      
      ${stories.some((story) => story.lat && story.lon) ? mapTemplate : ""}
      
      <div class="home__content">
        ${storiesTemplate}
      </div>
    </section>
  `;
};

export default createHomeTemplate;
