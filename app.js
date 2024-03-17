const Agent = require('./agent');
const Socket = require('./socket');
const VERSION = 7;

let teamNameA = 'teamA';
let teamNameB = 'teamB';

const players = [
	{ team: 0, pos: [-40, 0], strat: 'goalie' },
	{ team: 0, pos: [-10, 0], strat: 'player' },
	{ team: 1, pos: [40, 0], strat: 'goalie' },
	{ team: 1, pos: [10, 0], strat: 'player' },
];

(async () => {
	const agents = players.map((p) => new Agent(p.team ? teamNameB : teamNameA, p.pos, p.strat));
	const sockets = agents.map((a) => Socket(a, a.team, VERSION));
	await Promise.all(sockets);
	const moves = agents.map((a) =>
		a.socketSend(
			'move',
			a.team === teamNameA
				? `${a.defaultPos[0]} ${a.defaultPos[1]}`
				: `${-a.defaultPos[0]} ${-a.defaultPos[1]}`
		)
	);
	await Promise.all(moves);
})();
