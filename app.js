const Agent = require('./agent');
const Socket = require('./socket');
const VERSION = 7;

let teamNameA = 'teamA';
let teamNameB = 'teamB';

let pA1 = new Agent();
let pB1 = new Agent();

(async () => {
	await Socket(pA1, teamNameA, VERSION);
	// await Socket(pB1, teamNameB, VERSION);

	await pA1.socketSend('move', `-15 0`);
	// await pB1.socketSend('move', `-5 10`);
})();
