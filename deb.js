const { CommandRunner } = require('./src/util');

let commandRunner = new CommandRunner();

let input = `cr x 2
cr y 2
req R2 1
to
req R2 1
to
req R2 1
de y` // x should start running


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
