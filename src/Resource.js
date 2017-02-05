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
    if ( this.resourcesMap[resourceId] ) {
      return this.resourcesMap[resourceId];
    } else {
      throw new Error(`Cant't fetch a resource that wasn't initialized`);
    }
  }

  initializeResources( resourcesInfo ) {
    this.resourcesMap = resourcesInfo.reduce( (map, resourceInfo)=>{
      return _.assign(map, {
        [resourceInfo.id] : new Resource(
          resourceInfo.id,
          resourceInfo.limit
        )
      });
    }, {});
  }

  request( resourceId, userProcess, numUnitsNeeded ) {
    let resource = this.getResourceById(resourceId);

    resource.request(userProcess, numUnitsNeeded);

    if ( !resource.isUserProcess(userProcess.id) ) {
      this.scheduler.removeProcessFromScheduler(userProcess);
    }
    this.scheduler.run();
  }

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

    this.scheduler.run();
  }

}

class Resource {

  constructor( id, limit ) {
    this.id = id;
    this.unitsLimit = limit;
    this.queue = [];
    this.userProcess = null;
    this.unitsUsed = 0;

    this.userProcesses = [];
  }

  getUserProcessInfo( processId ) {
    return _.find(
      this.userProcesses,
      { process: {id: processId } }
    );
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

  // remove user process from resource
  // and release units of the resource
  removeUserProcess( processId ) {
    return _.head(
      _.remove(
        this.userProcesses,
        { process: { id: processId } }
      )
    );

//    if ( userProcessInfo ) {
//      _.remove(userProcessInfo.process.otherResources, { id: processId });
//      this.unitsUsed -= userProcessInfo.units;
//    }
//
//    return userProcessInfo;
  }

  removeUserProcessAndReleaseUnitsOfResource( processId ) {
    let userProcessInfo = this.removeUserProcess( processId );

    if ( userProcessInfo ) {
      _.remove(userProcessInfo.process.otherResources, { id: this.id });
      this.unitsUsed -= userProcessInfo.units;
    }
  }

  isProcessInWaitQueue( processId ) {
    return _.some( this.queue, { process: { id: processId } });
  }

  removeProcessFromQueue( processId ) {
    _.remove(this.queue, { process: { id: processId } });
  }

  getIsNotEnoughUnitsOfResource( requesterProcessId, numUnitsRequested ) {
    let requesterProcess = this.isUserProcess( requesterProcessId ) && this.getUserProcessInfo( requesterProcessId );

    return ( this.unitsLimit < numUnitsRequested )
      || ( !!requesterProcess && ( ( requesterProcess.units + numUnitsRequested )  > this.unitsLimit ) );
  }

  // need to handle a case when processToSetAsUser is already a user
  request( processToSetAsUser, numUnitsNeeded ) {
    if ( this.getIsNotEnoughUnitsOfResource( processToSetAsUser.id, numUnitsNeeded ) ) {
      throw new Error(`do not have enough units of resource ${this.id}. Available: ${this.unitsLimit - this.unitsUsed}, Requested: ${numUnitsNeeded}`);
    }

    if ( this.unitsLimit >= ( this.unitsUsed + numUnitsNeeded ) ) {
      this.setAsUserProcess(processToSetAsUser, numUnitsNeeded);
    } else if ( this.isUserProcess(processToSetAsUser.id) ) {
      //need to remove process from user list, so resource manager can remove it from run queue
      this.removeUserProcess(processToSetAsUser.id);
      this.enqueProcessIntoWaitList(
        processToSetAsUser,
        numUnitsNeeded
      );
    } else { // not enough resources and process is not currently a user process of resource
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
  //init can't request resource
  release( releaseProcess ) {

    if ( !this.isUserProcess( releaseProcess.id ) && !this.isProcessInWaitQueue( releaseProcess.id ) ) {
      throw new Error('can not release unused by a process resource');
    }

    if ( this.isUserProcess( releaseProcess.id ) ) {

      this.removeUserProcessAndReleaseUnitsOfResource( releaseProcess.id );
      //_.remove(releaseProcess.otherResources, { id: this.id });

    } else if ( this.isProcessInWaitQueue( releaseProcess.id ) ) {
      this.removeProcessFromQueue(releaseProcess.id);
    }

    let processToSetAsUserInfo = _.find(this.queue, waitProcessInfo => waitProcessInfo.units < this.unitsUsed);

    if ( processToSetAsUserInfo ) {
      this.setAsUserProcess(
        processToSetAsUserInfo.process,
        processToSetAsUserInfo.units
      );
    }
  }

  setAsUserProcess( process, numUnitsNeeded ) {
    this.userProcesses.push({
      units: numUnitsNeeded,
      process: process
    });

    process.otherResources.push(this);

    this.unitsUsed += numUnitsNeeded;
  }

  releaseAll() {

    _.each(this.userProcesses, userProcess => {
      userProcesses.releaseResources();
      userProcesses.leaveResourcesQueue();
    });

    throw new Error('releaseAll of Process is not implemented');
  }

  getNextProcessInQueue () {
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
