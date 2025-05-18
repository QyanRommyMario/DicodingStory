const createLoginTemplate = ({ error = null, isLoading = false }) => {
  const errorComponent = error
    ? `
        <div class="auth-error">
          <i class="fas fa-exclamation-circle"></i>
          <p>${error}</p>
        </div>
      `
    : "";

  const buttonContent = isLoading
    ? '<i class="fas fa-spinner fa-spin"></i> Logging in...'
    : '<i class="fas fa-sign-in-alt"></i> Login';

  return `
      <section class="auth">
        <div class="auth-container">
          <h2 class="auth__title">Login</h2>
          
          ${errorComponent}
          
          <form id="loginForm" class="auth-form">
            <div class="form-group">
              <label for="email" class="form-label">Email</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                class="form-input" 
                placeholder="your.email@example.com" 
                required
                ${isLoading ? "disabled" : ""}
              />
            </div>
            
            <div class="form-group">
              <label for="password" class="form-label">Password</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                class="form-input" 
                placeholder="Your password" 
                required
                minlength="8"
                ${isLoading ? "disabled" : ""}
              />
            </div>
            
            <div class="form-actions">
              <button 
                type="submit" 
                id="loginButton" 
                class="button"
                ${isLoading ? "disabled" : ""}
              >
                ${buttonContent}
              </button>
            </div>
          </form>
          
          <div class="auth-footer">
            <p>Don't have an account?</p>
            <a href="#/register" class="auth-link">Register here</a>
          </div>
        </div>
      </section>
    `;
};

export default createLoginTemplate;
