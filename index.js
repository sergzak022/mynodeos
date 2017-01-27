const _ = require('lodash');
const Process = require('./src/Process');
const Resource = require('./src/Resource');
const Scheduler = require('./src/Scheduler');




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
      // remove all the prcesses from the run queue besides init
      // remove all the processes from resources queues
      break;
    case 'cr':
      runningProcess.create(
        args[0],
        +args[1]
      );
      break;
    case 'de':
      runningProcess.destroyProcessById( args[0] );
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

//process.stdin.on('end', ()=>{
//  console.log('stdin closed');
//})

