const _ = require('lodash');

module.exports = class Resource {
  constructor( id ) {
    this.id = id;
    this.queue = [];
    this.userProcess = null;
  }

  request( processToSetAsUser ) {
    if ( this.userProcess == null ) {
      this.userProcess = processToSetAsUser;
      this.userProcess.otherResources.push(this);
    } else {
      this.queue.push(processToSetAsUser);
      processToSetAsUser.status.list.push(this);
    }
    //now scheduler has to make sure that process is not blocked by the resource
    this.userProcess.scheduler.run();
  }

  release() {
   if ( !this.userProcess.otherResources ) return;
    _.remove(this.userProcess.otherResources, { id: this.id });

    let processToSetAsUser = this.queue.unshift();
    if ( !processToSetAsUser ) return;

    this.userProcess = processToSetAsUser;
    this.userProcess.otherResources.push(this);

    _.remove(processToSetAsUser.status.list, { id: this.id });

    this.userProcess.scheduler.run();
  }

  releaseAll() {
    let processToSetAsUser;
    while ( processToSetAsUser = this.queue.unshift() ) {
      this.userProcess = processToSetAsUser;
      this.userProcess.otherResources.push(this);
      processToSetAsUser.status.list = null;
    }
  }
}
