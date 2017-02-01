const _ = require('lodash');

module.exports = class Process {
  constructor( id, priority, scheduler ) {
    this.id = id;
    this.memory = null;
    this.otherResources = [];
    // ready - process that is in Scheduler queue
    // running - process that is runningProces in the Scheduler instance
    // blocked - process that is in resource queue
    this.status = {
      type: null, // 'ready', 'running', 'blocked'
      list: []
    };
    this.creationTree = {
      parent: null,
      children: []
    };
    this.priority = priority;
    this.scheduler = scheduler;
  }

  create( id, priority ) {
    let canAdd = this.creationTree.children
      .every( existingChild => existingChild.id !== id);

    if ( !canAdd ) {
      throw new Error('New child id is not unique among parent children');
    }

    let newChild = new Process(
      id,
      priority,
      this.scheduler
    );

    newChild.creationTree.parent = this;

    this.creationTree.children.push(newChild);

    this.scheduler.enqueue(newChild);
    this.scheduler.run();

    return newChild;
  }

//  isBlocked() {
//    return this.status.list.length > 0;
//  }

  detachProcessFromParent() {
    let parent = this.creationTree.parent;

    if ( !parent ) return;

    _.remove(
      parent.creationTree.children,
      { id: this.id }
    );

//    let idx = _.findIndex(
//      parent.creationTree.children,
//      { id: this.id }
//    );
//
//    if ( idx === -1 ) return;
//
//    parent.creationTree.children.splice(idx, 1);
  }

  // private method
  _destroy() {
    // remove parent reference DONE
    // remove reference from scheduler, if in queue DONE
    // remove reference from resources, if in queue
    // what if this process is running and is not in a queue?
    // when parent removed should I remove parent ref from a child?
    // need to release resources
    this.destroyAllChildren();

    this.detachProcessFromParent();
    this.detachImmediateChildren();

    this.scheduler.removeProcessFromQueue(this);

    if ( this.scheduler.runningProcess === this ) {
      this.scheduler.runningProcess = null;
    }

    this.leaveResourcesQueue();
    this.releaseResources();

  }

  leaveResourcesQueue () {
    this.status.list.forEach(resource => {
      resource.removeProcessFromQueue( this.id );
    });

    this.status.list = [];
  }

  releaseResources() {
    _.eachRight( this.otherResources, resource => {
      resource.removeUserProcess(this.id);

      let nextUserProcess = resource.giveResourceToNextProcess();

      if ( nextUserProcess ) {
        this.scheduler.enqueue(nextUserProcess);
      }
    });
  }

  // this function removes parent reference from creationTree.parent of children
  detachImmediateChildren() {
    this.creationTree.children.forEach( child =>{
      child.creationTree.parent = null;
    });
  }

  // private method
  // NOTE: this method  doesn't trigger scheuduler
  destroyAllChildren() {
    let childCount = this.creationTree.children.length;
    if ( childCount > 0 ) {
      while ( childCount-- ) {
       this.creationTree.children[childCount]._destroy();
      }
    }
  }

  //only this method should be used to remove a process
  destroyProcessById ( id ) {
    let processToDestroy = this.findProcessById(id);
    if ( processToDestroy ) {
      processToDestroy._destroy();
    } else {
      throw Error(`Can't remove the process because it's not a descendend`);
    }
    this.scheduler.run();
  }

  getRoot() {
    if ( !this.creationTree.parent ) return this;
    return this.creationTree.parent.getRoot();
  }
// init -> x -> z
  findProcessById ( id ) {
    if ( this.id === id ) {
      return this;
    }
    var process;
    for ( var i = 0; i < this.creationTree.children.length; i++ ) {
      if ( process = this.creationTree.children[i].findProcessById(id) ) {
        return process;
      }
    }

//    return this.creationTree.children
//      .find( child => {
//        return !!child.findProcessById(id);
//      });
  }

}
