const Taken = require('./taken');

const leaderPos = { a: null, b: null };
const LSPEED = 60;
const FSPEED = 100;

const CTRL_LOW = {
	init() {
		return this;
	},
	setTaken(team, side, isLeader) {
		this.taken = Object.create(Taken).init(team, side, isLeader);
	},
	setHear(input) {
		this.taken.setHear(input);
	},
	execute(input, controllers) {
		const next = controllers[0]; // Следующий уровень
		this.taken.setSee(input); // Выделение объектов
		this.taken.canKick = this.taken.ball && this.taken.ball.dist < 0.5;
		this.taken.canCatch = this.taken.ball && this.taken.ball.dist < 2;
		if (this.taken.isLeader && this.taken.pos)
			leaderPos[this.taken.side === 'l' ? 'a' : 'b'] = this.taken.pos;
		return next ? next.execute(this.taken, controllers.slice(1)) : null;
	},
};

const CTRL_MIDDLE_GOALIE = {
	init() {
		this.action = 'return';
		this.wait = 10;
		return this;
	},
	execute(input, controllers) {
		const next = controllers[0]; // Следующий уровень
		switch (this.action) {
			case 'return':
				input.cmd = this.actionReturn(input);
				break;
			case 'rotateCenter':
				input.cmd = this.rotateCenter(input);
				break;
			case 'seekBall':
				input.cmd = this.seekBall(input);
				break;
		}
		input.action = this.action;
		const command = next.execute(input, controllers.slice(1)) || input.cmd;
		if (input.newAction) this.action = input.newAction;
		input.newAction = null;
		if (!command) {
			if (this.wait === 0) {
				this.action = 'return';
				this.wait = 10;
			} else this.wait = Math.max(0, this.wait - 1);
		}
		return command;
	},
	actionReturn(input) {
		// Возврат к своим воротам
		if (!input.goalOwn) return { n: 'turn', v: 90 };
		if (Math.abs(input.goalOwn.angle) > 10) return { n: 'turn', v: input.goalOwn.angle };
		if (input.goalOwn.dist > 3) return { n: 'dash', v: 100 };
		this.action = 'rotateCenter';
		return { n: 'turn', v: 180 };
	},
	rotateCenter(input) {
		// Повернуться к центру
		if (!input.getVisible('fc')) return { n: 'turn', v: 90 };
		this.action = 'seekBall';
		return { n: 'turn', v: input.getAngle('fc') };
	},
	seekBall(input) {
		// Осмотр поля
		if (input.ball) return null;
		else return { n: 'turn', v: 90 };
	},
};

const CTRL_HIGH_GOALIE = {
	init() {
		return this;
	},
	execute(input, controllers) {
		if (!this.newAction) {
			const immediate = this.immidiateReaction(input);
			if (immediate) return immediate;
			const defend = this.defendGoal(input);
			if (defend) return defend;
		}
		if (input.action !== 'return') this.last = 'previous';
	},
	immidiateReaction(input) {
		// Немедленная реакция
		if (input.canKick) {
			this.last = 'kick';
			this.catch = false;
			input.newAction = 'return';
			if (input.goal) return { n: 'kick', v: `110 ${input.goal.angle}` };
			return { n: 'kick', v: `100 ${input.getKickAngle(input.side === 'r' ? 'gl' : 'gr')}` };
		} else if (input.canCatch && !this.catch) {
			this.catch = true;
			return { n: 'catch', v: input.ball.angle };
		}
	},
	defendGoal(input) {
		// Защита ворот
		if (
			input.ball &&
			input.ball.dist < 15 &&
			(input.pos ? input.inPenaltyZone(input.side) : true)
		) {
			this.last = 'defend';
			if (Math.abs(input.ball.angle) > 5) return { n: 'turn', v: input.ball.angle };
			return { n: 'dash', v: 110 };
		}
	},
};

const CTRL_MIDDLE_PLAYER = {
	init() {
		return this;
	},
	execute(input, controllers) {
		if (input.ball) {
			if (Math.abs(input.ball.angle) > 10) return { n: 'turn', v: input.ball.angle };
			if (input.ball.dist > 0.5) return { n: 'dash', v: input.isLeader ? LSPEED : 110 };
			if (input.goal) return { n: 'kick', v: `110 ${input.goal.angle}` };
			return { n: 'kick', v: `100 ${input.getKickAngle(input.side === 'r' ? 'gl' : 'gr')}` };
		} else return { n: 'turn', v: 90 };
	},
};

const CTRL_MIDDLE_FLAG = {
	init() {
		this.action = 'flag';
		this.onPosition = false;
		return this;
	},
	setFlag(fl, r) {
		this.flag = fl;
		this.r = r;
		this.wait = this.flag === 'fc' ? 20 : 0;
	},
	execute(input, controllers) {
		const next = controllers[0];

		if (this.onPosition) {
			input.r = this.r;
			const cmd = next.execute(input, controllers.slice(1));
			if (cmd) {
				if (cmd.n === 'kick') this.onPosition = false;
				return cmd;
			} else {
				if (this.wait === 0) {
					this.onPosition = false;
					this.wait = this.flag === 'fc' ? 20 : 0;
				} else this.wait = Math.max(0, this.wait - 1);
			}
		} else {
			if (!input.getVisible(this.flag)) return { n: 'turn', v: 90 };
			if (Math.abs(input.getAngle(this.flag)) > 10)
				return { n: 'turn', v: input.getAngle(this.flag) };
			if (input.getDistance(this.flag) > (this.flag === 'fc' ? 20 : 3))
				return { n: 'dash', v: 100 };
			if (this.wait === 0) {
				this.onPosition = true;
				this.wait = 20;
			} else this.wait = Math.max(0, this.wait - 1);
		}
	},
};

const CTRL_HIGH_FLAG = {
	init() {
		return this;
	},
	execute(input, controllers) {
		if (input.ball && input.ball.dist <= input.r) {
			if (Math.abs(input.ball.angle) > 10) return { n: 'turn', v: input.ball.angle };
			if (input.ball.dist > 0.5) return { n: 'dash', v: 110 };
			if (input.goal) return { n: 'kick', v: `110 ${input.goal.angle}` };
			return { n: 'kick', v: `100 ${input.getKickAngle(input.side === 'r' ? 'gl' : 'gr')}` };
		} else if (!input.ball) return { n: 'turn', v: 90 };
	},
};

const CTRL_MIDDLE_FOLLOW = {
	init() {
		return this;
	},
	setPos(followSide) {
		this.followSide = followSide;
	},
	execute(input, controllers) {
		const next = controllers[0];

		const leader = leaderPos[input.side === 'l' ? 'a' : 'b'];
		if (!leader) return;
		else if (!input.pos) return { n: 'turn', v: 60 };

		const dist = input.getDistancePos(leader);
		const angle = input.getAnglePos(leader);
		const absAngle = Math.abs(angle);
		const sideCoef = this.followSide === 'l' ? -1 : 1;

		if (dist < 20) {
			let command = null;

			if (dist <= 1 && absAngle < 40) {
				command = { n: 'turn', v: 0 };
			} else if (absAngle < 25 || absAngle > 35) {
				command = { n: 'turn', v: `${angle + 30 * sideCoef}` };
			} else if (dist < 7) {
				if (dist < 3) command = { n: 'dash', v: 20 };
				else command = { n: 'dash', v: 40 };
			} else {
				command = { n: 'dash', v: FSPEED };
			}

			return next.execute(input, controllers.slice(1)) || command;
		} else {
			if (Math.abs(angle) > 5) return { n: 'turn', v: angle };
			return { n: 'dash', v: FSPEED };
		}
	},
};

const CTRL_HIGH_FOLLOW = {
	init() {
		return this;
	},
	execute(input, controllers) {
		if (input.ball && input.ball.dist <= 0.5) {
			if (input.goal) return { n: 'kick', v: `110 ${input.goal.angle}` };
			return { n: 'kick', v: `100 ${input.getKickAngle(input.side === 'r' ? 'gl' : 'gr')}` };
		}
	},
};

const initController = (ctrl) => Object.create(ctrl).init();
const initGroup = (...ctrls) => ctrls.map((ctrl) => initController(ctrl));

const getControllers = (strat) => {
	switch (strat) {
		case 'goalie':
			return initGroup(CTRL_LOW, CTRL_MIDDLE_GOALIE, CTRL_HIGH_GOALIE);
		case 'player':
			return initGroup(CTRL_LOW, CTRL_MIDDLE_PLAYER);
		case 'bouncer':
			return initGroup(CTRL_LOW, CTRL_MIDDLE_FLAG, CTRL_HIGH_FLAG);
		case 'follower':
			return initGroup(CTRL_LOW, CTRL_MIDDLE_FOLLOW, CTRL_HIGH_FOLLOW);
	}
};

module.exports = getControllers;
