const readline = require('readline');
const Agent = require('./agent');
const Socket = require('./socket');
const VERSION = 7;
const INPUT = false;

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
		coords = [-20, 0];
	}

	let pA1 = new Agent(teamNameA, coords, 'passer');
	let pA2 = new Agent(teamNameA, coords, 'goaler');
	
	let pB1 = new Agent(teamNameB, coords, 'bolvan');
	let pB2 = new Agent(teamNameB, coords, 'bolvan');

	await Socket(pA1, pA1.team, VERSION);
	await Socket(pA2, pA2.team, VERSION);

	await Socket(pB1, pB1.team, VERSION);
	await Socket(pB2, pB2.team, VERSION);

	await pA1.socketSend('move', `${coords[0]} ${coords[1]}`);
	await pA2.socketSend('move', '-20 -20');

	await pB1.socketSend('move', '-52 7');
	await pB2.socketSend('move', '-52 -7');
})();
