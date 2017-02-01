const _ = require('lodash');
//const Process = require('./src/Process');
//const { Resource } = require('./src/Resource');
//const Scheduler = require('./src/Scheduler');
//const { isValidCommandAndArguments, runCommand } = require('./src/util');
const { CommandRunner } = require('./src/util');

// used to generate a unique process id
//let processCounter = 0;

//let scheduler = new Scheduler();

// initial parent process
//let runningProcess = new Process(
//  'init',
//  0,
//  scheduler
//);
//
//scheduler.enqueue(runningProcess);
//scheduler.run();
let commandRunner = new CommandRunner();

process.stdin.on('readable', ()=>{
  var chunk = process.stdin.read();

  if ( chunk == null ) return;

  let lines = chunk.toString()
    .split('\n');

  lines.forEach( line => {

    let trimedLine = line.trim();

    if ( !trimedLine || !trimedLine.length ) return;

    let params = trimedLine.split(' ');

    let commandName = params[0];
    let args = params.slice(1);

    if ( commandRunner.isValidCommandAndArguments(commandName, args || []) ) {
      commandRunner.run(
        commandName,
        args
      );
    } else {
      throw new Error('Invalid command ' + params);
    }

  });

});

//process.stdin.on('end', ()=>{
//  console.log('stdin closed');
//})

