const { CommandRunner } = require('./src/util');

let commandRunner = new CommandRunner();

let input = `cr x 1
req R2 2
req R2 1

init
cr x 1
req R2 1
req R2 2`


let lines = input
  .split('\n');

lines.forEach( line =>{

  if ( !line || !line.length ) return;

  let params = line.toString()
    .split(' ');

  let commandName = params[0];
  let args = params.slice(1);

  if ( commandRunner.isValidCommandAndArguments(commandName, args || []) ) {
    commandRunner.run(
      commandName,
      args
    );
  } else {
    throw new Error('Invalid command' + params);
  }

});
