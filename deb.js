const { CommandRunner } = require('./src/util');

let commandRunner = new CommandRunner();

let input = `cr x 2
cr y 1
to
cr z 2
to
req R1 1
to
req R1 1
de z
rel R1 1
de x

init
cr x 1
cr p 1
cr q 1
cr r 1
to
req R2 2
to
req R3 2
to
req R4 1
to
to
req R3 2
req R4 4
req R2 1
to
de q
to
to
req R1 2`


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
