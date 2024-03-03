const Agent = require('./agent');
const Socket = require('./socket');
const VERSION = 7;

let teamNameA = 'teamA';
let teamNameB = 'teamB';

(async () => {
	let pA1 = new Agent(teamNameA, [-20, 0], 'passer');
	let pA2 = new Agent(teamNameA, [-20, -20], 'goaler');

	let pB1 = new Agent(teamNameB, [-52, 7], 'bolvan');
	let pB2 = new Agent(teamNameB, [-52, -7], 'bolvan');

	await Socket(pA1, pA1.team, VERSION);
	await Socket(pA2, pA2.team, VERSION);

	await Socket(pB1, pB1.team, VERSION);
	await Socket(pB2, pB2.team, VERSION);

	await pA1.socketSend('move', `-20 0`);
	await pA2.socketSend('move', '-20 -20');

	await pB1.socketSend('move', '-52 7');
	await pB2.socketSend('move', '-52 -7');
})();
