const readline = require('readline');
const Agent = require('./agent');
const Socket = require('./socket');
const VERSION = 7;
const INPUT = true;

let teamNameA = 'teamA';
let teamNameB = 'teamB';

(async () => {
	let c1, c2, s;
	if (INPUT) {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		const it = rl[Symbol.asyncIterator]();

		console.log('First player coordinates (x y):');
		c1 = (await it.next()).value.split(' ').map((a) => +a);
		console.log('Second player coordinates (x y):');
		c2 = (await it.next()).value.split(' ').map((a) => +a);
		console.log('First player rotation speed (s):');
		s = +(await it.next()).value;
		rl.close();
	} else {
		[c1, c2, s] = [[-15, 0], [5, 10], 20];
	}

	console.log([c1, c2, s]);

	let pA1 = new Agent(teamNameA, { name: 'spin', speed: s });
	let pB1 = new Agent(teamNameB);

	await Socket(pA1, pA1.team, VERSION);
	await Socket(pB1, pB1.team, VERSION);

	await pA1.socketSend('move', `${c1[0]} ${c1[1]}`);
	await pB1.socketSend('move', `${-c2[0]} ${-c2[1]}`);
})();
