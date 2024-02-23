const readline = require('readline');
const Agent = require('./agent');
const Socket = require('./socket');
const VERSION = 7;
const INPUT = true;

let teamNameA = 'teamA';
let teamNameB = 'teamB';

(async () => {
	let coords;
	if (INPUT) {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		const it = rl[Symbol.asyncIterator]();
		console.log('Player coordinates (x y):');
		coords = (await it.next()).value.split(' ').map((a) => +a);
		rl.close();
	} else {
		coords = [-15, 0];
	}

	let pA1 = new Agent(teamNameA, coords);
	//let pB1 = new Agent(teamNameB);

	await Socket(pA1, pA1.team, VERSION);
	//await Socket(pB1, pB1.team, VERSION);

	await pA1.socketSend('move', `${coords[0]} ${coords[1]}`);
	//await pB1.socketSend('move', `${-c2[0]} ${-c2[1]}`);
})();
