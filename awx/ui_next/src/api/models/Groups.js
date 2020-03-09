import Base from '../Base';

class Groups extends Base {
  constructor(http) {
    super(http);
    this.baseUrl = '/api/v2/groups/';

    this.createHost = this.createHost.bind(this);
    this.readAllHosts = this.readAllHosts.bind(this);
    this.disassociateHost = this.disassociateHost.bind(this);
  }

  createHost(id, data) {
    return this.http.post(`${this.baseUrl}${id}/hosts/`, data);
  }

  readAllHosts(id, params) {
    return this.http.get(`${this.baseUrl}${id}/all_hosts/`, { params });
  }

  disassociateHost(id, host) {
    return this.http.post(`${this.baseUrl}${id}/hosts/`, {
      id: host.id,
      disassociate: true,
    });
  }
}

export default Groups;
