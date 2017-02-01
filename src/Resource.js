const _ = require('lodash');

class ResourceManager {

  constructor( scheduler, resourcesInfo ) {
    this.resourcesMap = {};
    this.scheduler = scheduler;
    if ( Array.isArray(resourcesInfo) ) {
      this.initializeResources(resourcesInfo);
    }
  }

  getResourceById ( resourceId ) {
    // Fix: shouldn't dynimacaly create a resource
//    return this.resourcesMap[resourceId] != null
//      ? this.resourcesMap[resourceId]
//      : this.resourcesMap[resourceId] = new Resource(resourceId);
    return this.resourcesMap[resourceId];
  }
  //[{
  //  id: string, limit: number
  //}]
  initializeResources( resourcesInfo ) {
    this.resourcesMap = resourcesInfo.reduce( (map, resourceInfo)=>{
      return _.assign(map, {
        [resourceInfo.id] : new Resource(
          resourceInfo.id,
          resourceInfo.limit
        )
      });
    }, {});
    // prealocate all the resources
  }
  // need to add another parameter for a number of resources
  request( resourceId, userProcess, numUnitsNeeded ) {
    let resource = this.getResourceById(resourceId);
    resource.request(userProcess, numUnitsNeeded);
    //if process requested resource, but didn't get it
    //remove it from scheduler since it's blocked now
    // resource.isUserProcess(userProcess.id)
//    if ( resource.userProcess !== userProcess ) {
//      this.scheduler.removeProcessFromScheduler(userProcess);
//    }
    if ( !resource.isUserProcess(userProcess.id) ) {
      this.scheduler.removeProcessFromScheduler(userProcess);
    }
    this.scheduler.run();
  }

  // need to add another parameter for a number of resources
  release( resourceId, userProcess ) {
    let resource = this.getResourceById( resourceId );

    let processBeforeReleas = resource.getUserProcesses();

    resource.release( userProcess );

    let processAfterReleas = resource.getUserProcesses();

    let difference = _.difference(
      processBeforeReleas,
      processAfterReleas,
      _.property('process.id')
    );

    if ( difference.length ) {
      this.scheduler.enqueue(_.head(difference));
    }

    //if after releasing a resource it has its userProcess set
    //then need to put it back into schedulers queue
    // need a way to find out if new process was unqueued
    // resource.getUserProcessesIds(); before release and compare them to userProcesses after the release
    // enqueue new user processes
//    if ( resource.userProcess ) {
//      this.scheduler.enqueue(resource.userProcess);
//    }
    this.scheduler.run();
  }

}

class Resource {

  constructor( id, limit ) {
    this.id = id;
    this.unitsLimit = limit;
    //{units: number; process Process}
    this.queue = [];
    this.userProcess = null;
    this.unitsUsed = 0;

    //{units: number; process Process}
    this.userProcesses = [];
  }

  getUserProcesses() {
    return this.userProcesses.map(userProcesses => userProcesses.process);
  }

  getUserProcessesIds() {
    return _.map(
      this.getUserProcesses(),
      _.property('process.id')
    );
  }

  isUserProcess( processId ) {
    return _.some(
      this.userProcesses,
      { process: { id: processId } }
    );
  }

  removeUserProcess( processId ) {
    let userProcessInfo = _.head(
      _.remove(
        this.userProcesses,
        { process: { id: processId } }
      )
    );

    if ( userProcessInfo ) {
      _.remove(userProcessInfo.process.otherResources, { id: processId });
      this.unitsUsed -= userProcessInfo.units;
    }
  }

  isProcessInWaitQueue( processId ) {
    return _.some( this.queue, { process: { id: processId } });
  }

  removeProcessFromQueue( processId ) {
    _.remove(this.queue, { process: { id: processId } });
  }

  request( processToSetAsUser, numUnitsNeeded ) {

    if ( this.unitsLimit < numUnitsNeeded ) {
      throw new Error(`do not have enough units of resource ${this.id}. Available: ${this.unitsLimit - this.unitsUsed}, Requested: ${numUnitsNeeded}`);
    }

    if ( this.unitsLimit >= ( this.unitsUsed + numUnitsNeeded ) ) {
      this.setAsUserProcess(processToSetAsUser, numUnitsNeeded);
    } else {
      this.enqueProcessIntoWaitList(
        processToSetAsUser,
        numUnitsNeeded
      );
    }
  }

    enqueProcessIntoWaitList( process, units ) {
      this.queue.push({
        units,
        process
      });

      process.status.list.push(this);
    }
//  request( processToSetAsUser, numUnitsNeeded ) {
//
//    if ( this.unitsLimit < this.unitsUsed + numUnitsNeeded ) {
//      throw new Error(`do not have enough units of resource ${this.id}. Available: ${this.unitsLimit - this.unitsUsed}, Requested: ${numUnitsNeeded}`);
//    }
//
//    this.unitsUsed += numUnitsNeeded;
//
//    if ( this.userProcess == null ) {
//      this.userProcess = processToSetAsUser;
//      this.userProcess.otherResources.push(this);
//    } else {
//      this.queue.push(processToSetAsUser);
//      processToSetAsUser.status.list.push(this);
//    }
//  }


  release( releaseProcess ) {

//    if ( this.userProcess ) {
//      _.remove(this.userProcess.otherResources, { id: this.id });
//      this.userProcess = null;
//    }

    if ( this.isUserProcess( releaseProcess.id ) ) {

      this.removeUserProcess( releaseProcess.id );
      _.remove(releaseProcess.otherResources, { id: this.id });

    } else if ( this.isProcessInWaitQueue( releaseProcess.id ) ) {
      this.removeProcessFromQueue(releaseProcess.id);
    }

    let processToSetAsUserInfo = _.find(this.queue, waitProcessInfo => waitProcessInfo.units < this.unitsUsed);

//    this.userProcesses.push(processToSetAsUserInfo);
//
//    processToSetAsUserInfo.process.otherResources.push(this);
//
//    this.unitsUsed += numUnitsNeeded;
    if ( processToSetAsUserInfo ) {
      this.setAsUserProcess(
        processToSetAsUserInfo.process,
        processToSetAsUserInfo.units
      );
    }
    // need to deque the first process that we have enough units for
//    let processToSetAsUser = this.queue.shift();
//    if ( processToSetAsUser ) {
//      this.userProcess = processToSetAsUser;
//      this.userProcess.otherResources.push(this);
//      _.remove(processToSetAsUser.status.list, { id: this.id });
//      //will need to put process back to the running queue
//    }
  }

  setAsUserProcess( process, numUnitsNeeded ) {
    this.userProcesses.push({
      units: numUnitsNeeded,
      process: process
    });

    process.otherResources.push(this);

    this.unitsUsed += numUnitsNeeded;
  }


//  release() {
//
//    //need to know how many units of the resource this process was using
//
//    if ( this.userProcess ) {
//      _.remove(this.userProcess.otherResources, { id: this.id });
//      this.userProcess = null;
//    }
//
//    let processToSetAsUser = this.queue.shift();
//    if ( processToSetAsUser ) {
//      this.userProcess = processToSetAsUser;
//      this.userProcess.otherResources.push(this);
//      _.remove(processToSetAsUser.status.list, { id: this.id });
//      //will need to put process back to the running queue
//    }
//  }

  releaseAll() {
    throw new Error('releaseAll of Process is not implemented');
//    let processToSetAsUser;
//    while ( processToSetAsUser = this.queue.unshift() ) {
//      this.userProcess = processToSetAsUser;
//      this.userProcess.otherResources.push(this);
//      processToSetAsUser.status.list = null;
//    }
  }

  //NOTE: added this method
  //in case if need to implement
  //the more complex queue
  getNextProcessInQueue () {
    //return this.queue[0];

    return _.find(
      this.queue,
      waitProcessInfo =>
        ( waitProcessInfo.units + this.unitsUsed ) <= this.unitsLimit
    );
  }

  giveResourceToNextProcess () {
    let waitProcessInfo =  this.getNextProcessInQueue();
    if ( waitProcessInfo ) {
      this.setAsUserProcess(
        waitProcessInfo.process,
        waitProcessInfo.units
      );

      return waitProcessInfo.process;
    }
  }

}

exports.ResourceManager = ResourceManager;
exports.Resource = Resource;
