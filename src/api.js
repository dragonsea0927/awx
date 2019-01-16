const API_ROOT = '/api/';
const API_LOGIN = `${API_ROOT}login/`;
const API_LOGOUT = `${API_ROOT}logout/`;
const API_V2 = `${API_ROOT}v2/`;
const API_CONFIG = `${API_V2}config/`;
const API_ORGANIZATIONS = `${API_V2}organizations/`;
const API_INSTANCE_GROUPS = `${API_V2}instance_groups/`;

const LOGIN_CONTENT_TYPE = 'application/x-www-form-urlencoded';

class APIClient {
  static getCookie () {
    return document.cookie;
  }

  constructor (httpAdapter) {
    this.http = httpAdapter;
  }

  isAuthenticated () {
    const cookie = this.constructor.getCookie();
    const parsed = (`; ${cookie}`).split('; userLoggedIn=');

    let authenticated = false;

    if (parsed.length === 2) {
      authenticated = parsed.pop().split(';').shift() === 'true';
    }

    return authenticated;
  }

  async login (username, password, redirect = API_CONFIG) {
    const un = encodeURIComponent(username);
    const pw = encodeURIComponent(password);
    const next = encodeURIComponent(redirect);

    const data = `username=${un}&password=${pw}&next=${next}`;
    const headers = { 'Content-Type': LOGIN_CONTENT_TYPE };

    await this.http.get(API_LOGIN, { headers });
    const response = await this.http.post(API_LOGIN, data, { headers });

    return response;
  }

  logout () {
    return this.http.get(API_LOGOUT);
  }

  getRoot () {
    return this.http.get(API_ROOT);
  }

  getConfig () {
    return this.http.get(API_CONFIG);
  }

  getOrganizations (params = {}) {
    return this.http.get(API_ORGANIZATIONS, { params });
  }

  createOrganization (data) {
    return this.http.post(API_ORGANIZATIONS, data);
  }

  getOrganizationDetails (id) {
    const endpoint = `${API_ORGANIZATIONS}${id}/`;

    return this.http.get(endpoint);
  }

  getInstanceGroups () {
    return this.http.get(API_INSTANCE_GROUPS);
  }

  createInstanceGroups (url, id) {
    return this.http.post(url, { id });
  }
}

export default APIClient;
