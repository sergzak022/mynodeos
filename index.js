const _ = require('lodash');
const { CommandRunner } = require('./src/util');

let commandRunner = new CommandRunner();

process.stdin.on('readable', ()=>{
  var chunk = process.stdin.read();

  if ( chunk == null ) return;

  let lines = chunk
    .toString()
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

