const _ = require('lodash');
const { ResourceManager } = require('./Resource');
const Scheduler = require('./Scheduler');
const Process = require('./Process');

//const resourceManager = new ResourceManager();

exports.CommandRunner = class CommandRunner {
  constructor( ) {
    this.scheduler = new Scheduler();
    // initial parent process
    this.runningProcess = new Process(
      'init',
      0,
      this.scheduler
    );

    this.resourceManager = new ResourceManager(
      this.scheduler,
      [
        {id: 'R1', limit: 1},
        {id: 'R2', limit: 2},
        {id: 'R3', limit: 3},
        {id: 'R4', limit: 4}
      ]
    );

    this.scheduler.enqueue(this.runningProcess);
    this.scheduler.run();
  }

  isValidCommandAndArguments ( commandName, args ) {
    switch ( commandName ) {
      case 'cr':
        return args.length > 1 && _.inRange(+args[1], 1, 3);
      case 'de':
        return args.length > 0 && args[0] !== 'init';
      case 'req':
        return args.length > 0;
      case 'rel':
        return args.length > 0;
      case 'to':
      case 'init':
        return true;
      default:
        return false;
    }
  }

  run ( commanName, args ) {
    try {
      if ( commanName === 'req' && this.scheduler.runningProcess.id === 'init'  ) {
        throw new Error('init can not request resources');
      }

      this.runCommand(
        this.scheduler.runningProcess,
        commanName,
        args,
        this.resourceManager
      );
    } catch (e) {
      process.stdout.write('error ');
    }
  }

  runCommand ( runningProcess, name, args, resourceManager ) {
    switch ( name ) {
      case 'init':
        process.stdout.write('\n');
        let root = runningProcess.getRoot();

        root.destroyAllChildren();
        // destroyAllChildren doesn't rerun scheduler,
        // hence need to call it here
        root.scheduler.run();
        break;
      case 'cr': {
        let [processId, priority]= args;
        runningProcess.create(
          processId,
          +priority
        );
        break;
      }
      case 'de': {
        let [processId]= args;
        runningProcess.destroyProcessById( processId );
        break;
      }
      case 'req': {
        let [
          resourceId,
          numResourceUnitsNeeded
        ] = args;

        resourceManager.request(
          resourceId,
          runningProcess,
          +numResourceUnitsNeeded
        );
        break;
      }
      case 'rel': {
        let [resourceId] = args;
        resourceManager.release(
          resourceId,
          runningProcess
        );
        break;
      }
      case 'to':
        runningProcess.scheduler.timeout();
        break;
    }
  }


}

//exports.isValidCommandAndArguments = ( commanName, args ) => {
//  switch ( commanName ) {
//    case 'cr':
//      return args.length > 1;
//    case 'de':
//      return args.length > 0;
//    case 'req':
//      return args.length > 0;
//    case 'rel':
//      return args.length > 0;
//    case 'to':
//    case 'init':
//      return true;
//    default:
//      return false;
//  }
//}

//exports.runCommand = ( runningProcess, name, args, resourceManager ) => {
//  switch ( name ) {
//    case 'init':
//      let root = runningProcess.getRoot();
//
//      root.destroyAllChildren();
//      // destroyAllChildren doesn't rerun scheduler,
//      // hence need to call it here
//      root.scheduler.run();
//      break;
//    case 'cr': {
//      let [processId, priority]= args;
//      runningProcess.create(
//        processId,
//        +priority
//      );
//      break;
//    }
//    case 'de': {
//      let [processId]= args;
//      runningProcess.destroyProcessById( processId );
//      break;
//    }
//    case 'req': {
//      let [resourceId] = args;
//      resourceManager.request( resourceId, runningProcess );
//      break;
//    }
//    case 'rel': {
//      let [resourceId] = args;
//      resourceManager.release( runningProcess );
//      break;
//    }
//    case 'to':
//      runningProcess.scheduler.timeout();
//      break;
//  }
//}
