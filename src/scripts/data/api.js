import API_CONFIG from "../config/api-config.js";

class Api {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.defaultHeaders = API_CONFIG.DEFAULT_HEADERS;
  }

  _getToken() {
    return localStorage.getItem("auth_token");
  }

  _getAuthHeader() {
    const token = this._getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async _handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData.message || response.statusText || "Server error";
      throw new Error(message);
    }

    return response.json();
  }

  _buildUrl(endpoint, params = {}) {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    return `${this.baseURL}${endpoint}${queryString ? `?${queryString}` : ""}`;
  }

  _createHeaders(auth = true, contentType = null) {
    const headers = {};

    if (auth) {
      Object.assign(headers, this._getAuthHeader());
    }

    if (contentType) {
      headers["Content-Type"] = contentType;
    } else if (contentType !== false) {
      Object.assign(headers, this.defaultHeaders);
    }

    return headers;
  }

  async get(endpoint, params = {}, auth = true) {
    const url = this._buildUrl(endpoint, params);
    const headers = this._createHeaders(auth);

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    return this._handleResponse(response);
  }

  async post(endpoint, data = {}, auth = true) {
    const url = this._buildUrl(endpoint);
    const headers = this._createHeaders(auth, "application/json");

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    return this._handleResponse(response);
  }

  async postForm(endpoint, formData, auth = true) {
    const url = this._buildUrl(endpoint);
    const headers = this._createHeaders(auth, false);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    return this._handleResponse(response);
  }

  async put(endpoint, data = {}, auth = true) {
    const url = this._buildUrl(endpoint);
    const headers = this._createHeaders(auth, "application/json");

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });

    return this._handleResponse(response);
  }

  async patch(endpoint, data = {}, auth = true) {
    const url = this._buildUrl(endpoint);
    const headers = this._createHeaders(auth, "application/json");

    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });

    return this._handleResponse(response);
  }

  async delete(endpoint, data = {}, auth = true) {
    const url = this._buildUrl(endpoint);
    const headers = this._createHeaders(auth, "application/json");

    const response = await fetch(url, {
      method: "DELETE",
      headers,
      body: JSON.stringify(data),
    });

    return this._handleResponse(response);
  }
}

const api = new Api();
export default api;
