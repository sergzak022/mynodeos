let _ = require('lodash');

class Resource {
  constructor(id) {
    this.id = id;
    this.queue = [];
  }

  request() {

  }

  release() {

  }
}

class Scheduler {
  constructor(){
    this.queue = [];
    this.runningProcess = null;
  }

  enqueue( process ) {

    if ( !isNaN(process.priority) &&  typeof process.priority !== 'number') {
      throw Error(`process #${process.id} has invalid priority`);
    }

    if ( !this.queue[process.priority] ) {
      this.queue[process.priority] = [];
    }

    this.queue[process.priority].push(process);
  }

  dequeue () {
    let nextProcess = this.getNextProcessToRun();
    this.removeProcessFromQueue(nextProcess);
    return nextProcess;
  }

  getProcessPriorityOrNegInfinity( process ) {
    return ( process && process.priority != null )
      ? process.priority
      : -Infinity;
  }

  getNextProcessToRun() {
    let processToRun = this.queue.reduce(( maxPriorityProcessSoFar, priorityLevel ) => {
      let maxPriorityProcess = ( priorityLevel || [] )[0];

      return maxPriorityProcessSoFar.priority > this.getProcessPriorityOrNegInfinity(maxPriorityProcess)
        ? maxPriorityProcessSoFar
        : maxPriorityProcess;
    }, {priority: -1});

    return processToRun.priority > -1
      ? processToRun
      : null;
  }

  removeProcessFromQueue( process ) {
    this.queue.forEach( priorityLevel => {
      let idx = priorityLevel.indexOf(process);
      if (idx === -1) return;
      priorityLevel.splice(idx, 1);
    });
  }
  // run only preempts a process if it finds a process
  // with a higher priority
  // processes should probably use this method (not timeout)
  run() {
    let highestPriorityProcessInQueue = this.getNextProcessToRun();

    let shouldPreempt = !!highestPriorityProcessInQueue
      && highestPriorityProcessInQueue.priority > this.getProcessPriorityOrNegInfinity(this.runningProcess);

    if ( shouldPreempt ) {
      this.preemptRunningProcess();
    }

    process.stdout.write(`${this.runningProcess.id} `);
  }

  preemptRunningProcess() {
    // what if running process is the same as the next process???
    let processToRun = this.dequeue();
    if ( this.runningProcess ) {
      this.enqueue( this.runningProcess );
    }
    this.runningProcess = processToRun;
  }

  // timeout preempts a process if it finds a process
  // with the same or higher priority
  timeout() {
    let highestPriorityProcessInQueue = this.getNextProcessToRun();

    let shouldPreempt = !!highestPriorityProcessInQueue
      && highestPriorityProcessInQueue !== this.runningProcess
      && highestPriorityProcessInQueue.priority >= this.getProcessPriorityOrNegInfinity(this.runningProcess);

    //console.log('timeout', shouldPreempt, !!this.highestPriorityProcessInQueue, highestPriorityProcessInQueue !== this.runningProcess,this.highestPriorityProcessInQueue.priority >= this.getProcessPriorityOrNegInfinity(this.runningProcess) )

    if ( shouldPreempt ) {
      this.preemptRunningProcess();
    }

    process.stdout.write(`${this.runningProcess.id} `);
  }
}

class Process {
  constructor( id, priority, scheduler ) {
    this.id = id;
    this.memory = null;
    this.otherResources = [];
    this.status = {
      type: null, // 'ready', 'running', 'blocked'
      list: null
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

  detachProcessFromParent() {
    let parent = this.creationTree.parent;

    if ( !parent ) return;

    let idx = _.findIndex(
      parent.creationTree.children,
      { id: this.id }
    );

    if ( idx === -1 ) return;

    parent.creationTree.children.splice(idx, 1);
  }

  destroy() {
    // remove parent reference
    // // remove reference from scheduler, if in queue
    // remove reference from resources, if in queue

    this.destroyAllChildren();

    this.detachProcessFromParent();
    this.schedule.removeProcessFromQueue(this);
  }

  destroyChild( id ) {
    if ( this.creationTree.children.length === 0 ) return;
    let child =  _.find(this.creationTree.children, {id: id});
    child.destroy();
  }

  destroyAllChildren() {
    if ( this.creationTree.children.length > 0 ) {
      this.creationTree.children.forEach(child => {
        child.destroy();
      });
    }
  }
}

let isValidCommandAndArguments = ( commanName, args ) => {
  switch ( commanName ) {
    case 'cr':
      return args.length > 1;
    case 'de':
      return args.length > 0;
    case 'req':
      return args.length > 1;
    case 'rel':
      return args.length > 1;
    case 'to':
      return true;
    default:
      return false;
  }
}

let runCommand = (runningProcess, name, args) => {
  switch ( name ) {
    case 'init':
      // reset everything
      break;
    case 'cr':
      runningProcess.create(
        args[0],
        +args[1]
      );
      break;
    case 'de':
      runningProcess.destroy( id );
      break;
    case 'req':
      // runningProcess.request(rid);
      break;
    case 'rel':
      // runningProcess.release(rid);
      break;
    case 'to':
      scheduler.timeout();
      break;
  }
}

// used to generate a unique process id
let processCounter = 0;

let scheduler = new Scheduler();

// initial parent process
let runningProcess = new Process(
  'init',
  0,
  scheduler
);

scheduler.enqueue(runningProcess);
scheduler.run();

process.stdin.on('readable', ()=>{
  var chunk = process.stdin.read();

  if ( chunk == null ) return;

  let lines = chunk.toString()
    .split('\n');

  lines.forEach( line =>{

    if ( !line || !line.length ) return;

    let params = line.toString()
      .split(' ');

    let commandName = params[0];
    let args = params.slice(1);

    if ( isValidCommandAndArguments(commandName, args || []) ) {
      runCommand(
        scheduler.runningProcess,
        commandName,
        args
      );
    } else {
      throw new Error('Invalid command' + params);
    }

  });

});

process.stdin.on('end', ()=>{
  console.log('stdin closed');
})

