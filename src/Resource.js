const _ = require('lodash');

class ResourceManager {

  constructor( scheduler ) {
    this.resourcesMap = {};
    this.scheduler = scheduler;
  }

  getResourceById ( resourceId ) {
    // Fix: shouldn't dynimacaly create a resource
    return this.resourcesMap[resourceId] != null
      ? this.resourcesMap[resourceId]
      : this.resourcesMap[resourceId] = new Resource(resourceId);
  }
  //[{
  //  id: string, limit: number
  //}]
  initializeResources( resourcesInfo ) {
    this.resourcesMap = resourcesInfo.reduce( (map, resourceInfo)=>{
      return _.assign(map, {
        [resourceInfo.id] : new Resource(
          resourceId,
          resourceInfo.limit
        )
      });
    }, {});
    // prealocate all the resources
  }
  // need to add another parameter for a number of resources
  request( resourceId, userProcess ) {
    let resource = this.getResourceById(resourceId);
    resource.request(userProcess);
    //if process requested resource, but didn't get it
    //remove it from scheduler since it's blocked now
    if ( resource.userProcess !== userProcess ) {
      this.scheduler.removeProcessFromScheduler(userProcess);
    }
    this.scheduler.run();
  }

  // need to add another parameter for a number of resources
  release( resourceId ) {
    let resource = this.getResourceById( resourceId );
    resource.release();
    //if after releasing a resource it has its userProcess set
    //then need to put it back into schedulers queue
    if ( resource.userProcess ) {
      this.scheduler.enqueue(resource.userProcess);
    }
    this.scheduler.run();
  }

}

// need to add ResourceUnit class that is used internally by Resource class

class Resource {

  constructor( id, limit ) {
    this.id = id;
    this.unitsLimit = limit;
    this.queue = [];
    this.userProcess = null;
    this.unitsUsed = 0;
  }


  request( processToSetAsUser, numUnitsNeeded ) {

    if ( this.unitsLimit < this.unitsUsed + numUnitsNeeded ) {
      throw new Error(`do not have enough units of resource ${this.id}. Available: ${this.unitsLimit - this.unitsUsed}, Requested: ${numUnitsNeeded}`);
    }

    this.unitsUsed += numUnitsNeeded;

    if ( this.userProcess == null ) {
      this.userProcess = processToSetAsUser;
      this.userProcess.otherResources.push(this);
    } else {
      this.queue.push(processToSetAsUser);
      processToSetAsUser.status.list.push(this);
    }
  }

  release() {

    //need to know how many units of the resource this process was using

    if ( this.userProcess ) {
      _.remove(this.userProcess.otherResources, { id: this.id });
      this.userProcess = null;
    }

    let processToSetAsUser = this.queue.shift();
    if ( processToSetAsUser ) {
      this.userProcess = processToSetAsUser;
      this.userProcess.otherResources.push(this);
      _.remove(processToSetAsUser.status.list, { id: this.id });
      //will need to put process back to the running queue
    }
  }

  releaseAll() {
    let processToSetAsUser;
    while ( processToSetAsUser = this.queue.unshift() ) {
      this.userProcess = processToSetAsUser;
      this.userProcess.otherResources.push(this);
      processToSetAsUser.status.list = null;
    }
  }

  //NOTE: added this method
  //in case if need to implement
  //the more complex queue
  getNextProcessInQueue () {
    return this.queue[0];
  }
}

exports.ResourceManager = ResourceManager;
exports.Resource = Resource;
