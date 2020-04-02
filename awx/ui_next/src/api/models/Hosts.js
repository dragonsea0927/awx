import Base from '../Base';
import { TintSlashIcon } from '@patternfly/react-icons';

class Hosts extends Base {
  constructor(http) {
    super(http);
    this.baseUrl = '/api/v2/hosts/';

    this.readFacts = this.readFacts.bind(this);
    this.readGroups = this.readGroups.bind(this);
    this.readGroupsOptions = this.readGroupsOptions.bind(this);
    this.associateGroup = this.associateGroup.bind(this);
    this.disassociateGroup = this.disassociateGroup.bind(this);
  }

  readFacts(id) {
    return this.http.get(`${this.baseUrl}${id}/ansible_facts/`);
  }

  readGroups(id, params) {
    return this.http.get(`${this.baseUrl}${id}/groups/`, { params });
  }

  readGroupsOptions(id) {
    return this.http.options(`${this.baseUrl}${id}/groups/`);
  }

  associateGroup(id, groupId) {
    return this.http.post(`${this.baseUrl}${id}/groups/`, { id: groupId });
  }

  disassociateGroup(id, group) {
    return this.http.post(`${this.baseUrl}${id}/groups/`, {
      id: group.id,
      disassociate: true,
    });
  }
}

export default Hosts;
