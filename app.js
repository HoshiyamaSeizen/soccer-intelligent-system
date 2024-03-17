const { setMaxListeners } = require('stream');
const Agent = require('./agent');
const Socket = require('./socket');
const VERSION = 7;

let teamNameA = 'teamA';
let teamNameB = 'teamB';

setMaxListeners(22);

const players = [
	{ team: 0, pos: [-40, 0], strat: 'goalie' },
	{ team: 0, pos: [-10, 0], strat: 'player', isLeader: true },
	{ team: 0, pos: [-36, -20], strat: 'bouncer', flag: 'fplt' },
	{ team: 0, pos: [-36, 0], strat: 'bouncer', flag: 'fplc' },
	{ team: 0, pos: [-36, 20], strat: 'bouncer', flag: 'fplb' },
	{ team: 0, pos: [-10, -20], strat: 'bouncer', flag: 'fprt' },
	{ team: 0, pos: [-10, 10], strat: 'bouncer', flag: 'fprc' },
	{ team: 0, pos: [-10, 20], strat: 'bouncer', flag: 'fprb' },
	{ team: 0, pos: [-10, 0], strat: 'bouncer', flag: 'fc' },
	{ team: 1, pos: [40, 0], strat: 'goalie' },
	{ team: 1, pos: [10, 0], strat: 'player', isLeader: true },
	{ team: 1, pos: [36, -20], strat: 'bouncer', flag: 'fprt' },
	{ team: 1, pos: [36, 0], strat: 'bouncer', flag: 'fprc' },
	{ team: 1, pos: [36, 20], strat: 'bouncer', flag: 'fprb' },
	{ team: 1, pos: [10, -20], strat: 'bouncer', flag: 'fplt' },
	{ team: 1, pos: [10, 0], strat: 'bouncer', flag: 'fplc' },
	{ team: 1, pos: [10, 20], strat: 'bouncer', flag: 'fplb' },
	{ team: 1, pos: [10, -10], strat: 'bouncer', flag: 'fc' },
];

(async () => {
	const agents = players.map(
		(p) => new Agent(p.team ? teamNameB : teamNameA, p.pos, p.strat, p.flag, p.isLeader)
	);
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
