const strategy = require('./strategy');

const FL = 'flag',
	KI = 'kick',
	CA = 'catch';

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
};

module.exports = { DT };
