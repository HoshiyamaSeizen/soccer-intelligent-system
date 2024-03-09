const Agent = require('./agent');
const Socket = require('./socket');
const VERSION = 7;

let teamNameA = 'teamA';
let teamNameB = 'teamB';

(async () => {
	let pA1 = new Agent(teamNameA, [-20, 0], 'player');
	let pB1 = new Agent(teamNameB, [30, 0], 'goalie');

	await Socket(pA1, pA1.team, VERSION);
	await Socket(pB1, pB1.team, VERSION);

	await pA1.socketSend('move', `-20 0`);
	await pB1.socketSend('move', '-30 0');
})();
