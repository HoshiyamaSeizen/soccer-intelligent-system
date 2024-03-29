const strategy = require('./strategy');

const FL = 'flag',
	KI = 'kick',
	CA = 'catch';

const LSPEED = 60;
const FSPEED = 100;

const DT = {
	player: {
		init() {
			this.state = {
				next: 0,
				increaseNext() {
					this.next = (this.next + 1) % this.sequence.length;
				},
				sequence: strategy.player,
				command: null,
			};
			return this;
		},
		root: {
			exec(mgr, state) {
				state.action = state.sequence[state.next];
				state.command = null;
			},
			next: 'goalVisible',
		},
		goalVisible: {
			condition: (mgr, state) => mgr.getVisible(state.action.fl),
			trueCond: 'rootNext',
			falseCond: 'rotate',
		},
		rotate: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: '90' };
			},
			next: 'sendCommand',
		},
		rootNext: {
			condition: (mgr, state) => state.action.act == FL,
			trueCond: 'flagSeek',
			falseCond: 'ballSeek',
		},
		flagSeek: {
			condition: (mgr, state) => 3 > mgr.getDistance(state.action.fl),
			trueCond: 'closeFlag',
			falseCond: 'farGoal',
		},
		closeFlag: {
			exec(mgr, state) {
				state.increaseNext();
				state.action = state.sequence[state.next];
			},
			next: 'goalVisible',
		},
		farGoal: {
			condition: (mgr, state) => Math.abs(mgr.getAngle(state.action.fl)) > 4,
			trueCond: 'rotateToGoal',
			falseCond: 'runToGoal',
		},
		rotateToGoal: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: mgr.getAngle(state.action.fl) };
			},
			next: 'sendCommand',
		},
		runToGoal: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 100 };
			},
			next: 'sendCommand',
		},
		sendCommand: {
			command: (mgr, state) => state.command,
		},
		ballSeek: {
			condition: (mgr, state) => 0.5 > mgr.getDistance(state.action.fl),
			trueCond: 'closeBall',
			falseCond: 'farGoal',
		},
		closeBall: {
			// exec(mgr, state) {
			// 	state.command = { n: 'kick', v: `100 ${mgr.getKickAngle(state.action.goal)}` };
			// },
			// next: 'sendCommand',
			condition: (mgr, state) => mgr.getVisible(state.action.goal),
			trueCond: 'ballGoalVisible',
			falseCond: 'ballGoalInvisible',
		},
		ballGoalVisible: {
			exec(mgr, state) {
				state.command = { n: 'kick', v: `100 ${mgr.getAngle(state.action.goal)}` };
			},
			next: 'sendCommand',
		},
		ballGoalInvisible: {
			exec(mgr, state) {
				state.command = { n: 'kick', v: '10 45' };
			},
			next: 'sendCommand',
		},
	},
	goalkeeper: {
		init() {
			this.state = {
				next: 0,
				increaseNext() {
					this.next = (this.next + 1) % this.sequence.length;
				},
				sequence: strategy.goalkeeper,
				command: null,
			};
			return this;
		},
		root: {
			exec(mgr, state) {
				state.action = state.sequence[state.next];
				state.command = null;
			},
			next: 'checkBall',
		},
		checkBall: {
			condition: (mgr, state) =>
				state.action.act === FL &&
				mgr.inPenaltyZone() &&
				mgr.getVisible('b') &&
				3 > mgr.getDistance('b'),
			trueCond: 'switchToBall',
			falseCond: 'goalVisible',
		},
		switchToBall: {
			exec(mgr, state) {
				state.next = state.sequence.length - 1;
				state.action = state.sequence[state.next];
			},
			next: 'goalVisible',
		},
		goalVisible: {
			condition: (mgr, state) => mgr.getVisible(state.action.fl),
			trueCond: 'rootNext1',
			falseCond: 'rotate',
		},
		rotate: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: '90' };
			},
			next: 'sendCommand',
		},
		rootNext1: {
			condition: (mgr, state) => state.action.act == FL,
			trueCond: 'flagSeek',
			falseCond: 'rootNext2',
		},
		rootNext2: {
			condition: (mgr, state) => state.action.act == CA,
			trueCond: 'ballSeek',
			falseCond: 'goToBall',
		},
		flagSeek: {
			condition: (mgr, state) => 5 > mgr.getDistance(state.action.fl),
			trueCond: 'closeFlag',
			falseCond: 'farGoal',
		},
		closeFlag: {
			exec(mgr, state) {
				state.increaseNext();
				state.action = state.sequence[state.next];
			},
			next: 'goalVisible',
		},
		farGoal: {
			condition: (mgr, state) => Math.abs(mgr.getAngle(state.action.fl)) > 4,
			trueCond: 'rotateToGoal',
			falseCond: 'runToGoal',
		},
		rotateToGoal: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: mgr.getAngle(state.action.fl) };
			},
			next: 'sendCommand',
		},
		runToGoal: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 100 };
			},
			next: 'sendCommand',
		},
		sendCommand: {
			command: (mgr, state) => state.command,
		},
		ballSeek: {
			condition: (mgr, state) => 16 > mgr.getDistance(state.action.fl),
			trueCond: 'ballClose',
			falseCond: 'stay',
		},
		ballClose: {
			condition: (mgr, state) => 2 > mgr.getDistance(state.action.fl) && mgr.inPenaltyZone(),
			trueCond: 'ballTooClose',
			falseCond: 'runToGoal',
		},
		ballTooClose: {
			condition: (mgr, state) => 0.5 > mgr.getDistance(state.action.fl),
			trueCond: 'ballKick',
			falseCond: 'catchBall',
		},
		catchBall: {
			exec(mgr, state) {
				state.command = { n: 'catch', v: `${mgr.getAngle(state.action.fl)}` };
				state.increaseNext();
			},
			next: 'sendCommand',
		},
		goToBall: {
			condition: (mgr, state) => 0.5 > mgr.getDistance(state.action.fl) && mgr.inPenaltyZone(),
			trueCond: 'ballKick',
			falseCond: 'runToGoal',
		},
		ballKick: {
			exec(mgr, state) {
				state.command = { n: 'kick', v: `100 ${mgr.getKickAngle(state.action.goal)}` };
				state.increaseNext();
			},
			next: 'sendCommand',
		},
		stay: {
			exec(mgr, state) {
				state.command = null;
			},
			next: 'sendCommand',
		},
	},
	groupPlayer: {
		init() {
			this.state = {
				next: 0,
				increaseNext() {
					this.next = (this.next + 1) % this.sequence.length;
				},
				sequence: strategy.player,
				command: null,
			};
			return this;
		},
		root: {
			exec(mgr, state) {
				state.action = state.sequence[state.next];
				state.command = null;
			},
			next: 'isLeader',
		},
		isLeader: {
			condition: (mgr, state) => mgr.isLeader,
			trueCond: 'goalVisible',
			falseCond: 'leaderVisible',
		},
		leaderVisible: {
			condition: (mgr, state) => mgr.teammates.length > 0,
			trueCond: 'closeToLeader',
			falseCond: 'rotate90',
		},
		closeToLeader: {
			condition: (mgr, state) =>
				mgr.teammates[0].dist <= 1 && Math.abs(mgr.teammates[0].angle) < 40,
			trueCond: 'rotate30',
			falseCond: 'farToLeader',
		},
		farToLeader: {
			condition: (mgr, state) => mgr.teammates[0].dist > 20,
			trueCond: 'goToLeader',
			falseCond: 'midDistToLeader',
		},
		midDistToLeader: {
			condition: (mgr, state) => mgr.teammates[0].angle > 35 || mgr.teammates[0].angle < 25,
			trueCond: 'rotateTo30',
			falseCond: 'midMidDistToLeader',
		},
		midMidDistToLeader: {
			condition: (mgr, state) => mgr.teammates[0].dist < 7,
			trueCond: 'littleDistToLeader',
			falseCond: `dash${FSPEED}`,
		},
		littleDistToLeader: {
			condition: (mgr, state) => mgr.teammates[0].dist < 3,
			trueCond: 'dash20',
			falseCond: 'dash40',
		},
		goToLeader: {
			condition: (mgr, state) => Math.abs(mgr.teammates[0].angle) > 5,
			trueCond: 'rotateToLeader',
			falseCond: `dash${FSPEED}`,
		},
		rotateToLeader: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: mgr.teammates[0].angle };
			},
			next: 'sendCommand',
		},
		goalVisible: {
			condition: (mgr, state) => mgr.getVisible(state.action.fl),
			trueCond: 'rootNext',
			falseCond: 'rotate90',
		},
		rotate90: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: '90' };
			},
			next: 'sendCommand',
		},
		rotate30: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: '30' };
			},
			next: 'sendCommand',
		},
		rotateTo30: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: `${mgr.teammates[0].angle - 30}` };
			},
			next: 'sendCommand',
		},
		rootNext: {
			condition: (mgr, state) => state.action.act == FL,
			trueCond: 'flagSeek',
			falseCond: 'ballSeek',
		},
		flagSeek: {
			condition: (mgr, state) => 3 > mgr.getDistance(state.action.fl),
			trueCond: 'closeFlag',
			falseCond: 'farGoal',
		},
		closeFlag: {
			exec(mgr, state) {
				state.increaseNext();
				state.action = state.sequence[state.next];
			},
			next: 'goalVisible',
		},
		farGoal: {
			condition: (mgr, state) => Math.abs(mgr.getAngle(state.action.fl)) > 4,
			trueCond: 'rotateToGoal',
			falseCond: `dash${LSPEED}`,
		},
		rotateToGoal: {
			exec(mgr, state) {
				state.command = { n: 'turn', v: mgr.getAngle(state.action.fl) };
			},
			next: 'sendCommand',
		},
		dash20: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 20 };
			},
			next: 'sendCommand',
		},
		dash40: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 40 };
			},
			next: 'sendCommand',
		},
		dash60: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 60 };
			},
			next: 'sendCommand',
		},
		dash80: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 80 };
			},
			next: 'sendCommand',
		},
		dash100: {
			exec(mgr, state) {
				state.command = { n: 'dash', v: 100 };
			},
			next: 'sendCommand',
		},
		sendCommand: {
			command: (mgr, state) => state.command,
		},
		ballSeek: {
			condition: (mgr, state) => 0.5 > mgr.getDistance(state.action.fl),
			trueCond: 'closeBall',
			falseCond: 'farGoal',
		},
		closeBall: {
			// exec(mgr, state) {
			// 	state.command = { n: 'kick', v: `100 ${mgr.getKickAngle(state.action.goal)}` };
			// },
			// next: 'sendCommand',
			condition: (mgr, state) => mgr.getVisible(state.action.goal),
			trueCond: 'ballGoalVisible',
			falseCond: 'ballGoalInvisible',
		},
		ballGoalVisible: {
			exec(mgr, state) {
				state.command = { n: 'kick', v: `100 ${mgr.getAngle(state.action.goal)}` };
			},
			next: 'sendCommand',
		},
		ballGoalInvisible: {
			exec(mgr, state) {
				state.command = { n: 'kick', v: '10 45' };
			},
			next: 'sendCommand',
		},
	},
};

module.exports = { DT };
