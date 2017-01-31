const _ = require('lodash');

module.exports = class Scheduler {
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
  // need to check priority and if process is blocked
  getNextProcessToRun() {
    let processToRun = this.queue.reduce(( maxPriorityProcessSoFar, priorityLevel ) => {
      //let maxPriorityProcess = ( priorityLevel || [] ).filter(process => !process.isBlocked())[0];
      let maxPriorityProcess = ( priorityLevel || [] )[0];

      return maxPriorityProcessSoFar.priority > this.getProcessPriorityOrNegInfinity(maxPriorityProcess)
        ? maxPriorityProcessSoFar
        : maxPriorityProcess;
    }, {priority: -1});

    return processToRun.priority > -1
      ? processToRun
      : null;
  }

  removeProcessFromScheduler ( process ) {
    //if process is currently running then remove it
    // else remove it from queue
    if ( this.runningProcess === process ) {
      this.runningProcess = null;
    } else {
      this.removeProcessFromQueue( process );
    }
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

    if ( shouldPreempt ) {
      this.preemptRunningProcess();
    }

    process.stdout.write(`${this.runningProcess.id} `);
  }
}
