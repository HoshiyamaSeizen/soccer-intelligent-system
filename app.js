const Agent = require('./agent');
const Socket = require('./socket');
const VERSION = 7;

let teamNameA = 'teamA';
let teamNameB = 'teamB';

let pA1 = new Agent(teamNameA);
let pB1 = new Agent(teamNameB);

(async () => {
	await Socket(pA1, pA1.team, VERSION);
	await Socket(pB1, pB1.team, VERSION);

	await pA1.socketSend('move', `-15 0`);
	await pB1.socketSend('move', `-5 10`);
})();
