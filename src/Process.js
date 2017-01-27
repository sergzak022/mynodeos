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
  }

  isBlocked() {
    return this.status.list.length > 0;
  }

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

    this._destroyAllChildren();

    this.detachProcessFromParent();
    this.detachImmediateChildren();

    this.scheduler.removeProcessFromQueue(this);

    if ( this.scheduler.runningProcess === this ) {
      this.scheduler.runningProcess = null;
    }
  }

  // this function removes parent reference from creationTree.parent of children
  detachImmediateChildren() {
    this.creationTree.children.forEach( child =>{
      child.creationTree.parent = null;
    });
  }

  // private method
  _destroyAllChildren() {
    let childCount = this.creationTree.children.length;
    if ( childCount > 0 ) {
      while ( childCount-- ) {
       this.creationTree.children[childCount]._destroy();
      }
    }
  }

  //only this method should be used to remove a process
  destroyProcessById ( id ) {
    let rootProcess = this.getRoot();
    let processToDestroy = rootProcess.findProcessById(id);
    processToDestroy._destroy();
    this.scheduler.run();
  }

  getRoot() {
    if ( !this.creationTree.parent ) return this;
    return this.creationTree.parent.getRoot();
  }

  findProcessById ( id ) {
    if ( this.id === id ) {
      return this;
    }

    return this.creationTree.children
      .find( child => {
        return !!child.findProcessById(id);
      });
  }

}
