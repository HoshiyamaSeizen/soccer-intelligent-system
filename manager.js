const Flags = require('./flags');
const {
	calculatePos2P,
	calculatePos3P,
	calculateAngle,
	calculateRotationAngle,
} = require('./calculations');

const Manager = {
	init(cmd, p, team, x, y) {
		this.p = p;
		this.cmd = cmd;
		this.team = team;
		this.ball = null;
		this.observedFlags = [];
		this.uniqueXFlags = [];
		this.teammates = [];
		this.opponents = [];
		this.pos = { x, y };
		this.bodyAngle = 0;
		this.isLeader = false;
		this.didHearGo = false;
		this.processEnv(cmd, p);
		return this;
	},
	extractFlagCoordsAndDistance(observedFlag) {
		const flag = Flags[observedFlag.name];
		return [flag.x, flag.y, observedFlag.dist, observedFlag.angle]; // X, Y, расстояние до флага, угол
	},
	processEnv(cmd, p) {
		if (cmd == 'see') {
			const xs = [];
			const ys = [];

			for (let i = 1; i < p.length; i++) {
				let objectName = p[i].cmd.p.join(''); // имя видимого объекта на поле
				let angle = +p[i].p[1]; // угол, под которым виден объект
				let dist = +p[i].p[0]; // расстояние до объекта

				// ФЛАГИ
				if (Object.keys(Flags).includes(objectName) && p[i].p.length >= 2) {
					let x = Flags[objectName].x;
					let y = Flags[objectName].y;
					this.observedFlags.push({ name: objectName, angle, dist, p: p[i] });
					if (!xs.includes(x) && ys.filter((v) => v === y).length < 2) {
						this.uniqueXFlags.push({ name: objectName, angle, dist, p: p[i] });
						xs.push(x);
						ys.push(y);
					}
				}

				// Напарники
				else if (p[i].cmd.p[0] === 'p' && p[i].cmd.p[1]?.replace(/"/gi, '') === this.team) {
					this.teammates.push({ angle, dist, p: p[i] });
					this.observedFlags.push({ name: 'p', team: p[i].cmd.p[1], angle, dist, p: p[i] });
				}

				// Оппоненты
				else if (p[i].cmd.p[0] === 'p' && p[i].cmd.p[1] !== this.team) {
					this.opponents.push({ angle, dist, p: p[i] });
					this.observedFlags.push({ name: 'p', team: p[i].cmd.p[1], angle, dist, p: p[i] });
				}

				// МЯЧ
				else if (p[i].cmd.p[0] === 'b') {
					this.observedFlags.push({ name: objectName, angle, dist, p: p[i] });
					this.ball = { name: 'b', angle, dist, p: p[i] };
				}
			}

			this.uniqueXFlags.sort((a, b) => a.dist - b.dist);

			if (this.uniqueXFlags.length > 0) {
				let [closestFlagX, closestFlagY, closestFlagDist, closestFlagAngle] =
					this.extractFlagCoordsAndDistance(this.uniqueXFlags[0]);
				this.bodyAngle =
					calculateAngle(this.pos.x, this.pos.y, closestFlagX, closestFlagY) -
					closestFlagAngle;
				if (this.bodyAngle < 0) this.bodyAngle += 360;
				if (this.bodyAngle > 360) this.bodyAngle -= 360;
			}
		}
	},
	getLocation(method = '3P') {
		let analyze = true;
		if (this.uniqueXFlags.length < 3 && method === '3P') {
			analyze = false;
			// console.log('Вижу меньше 3 значимых флагов');
		} else if (this.uniqueXFlags.length < 2 && method === '2P') {
			analyze = false;
			// console.log('Вижу меньше 2 значимыхых флагов');
		}

		if (analyze) {
			const [x1, y1, d1, alpha1] = this.extractFlagCoordsAndDistance(this.uniqueXFlags[0]);
			const [x2, y2, d2, alpha2] = this.extractFlagCoordsAndDistance(this.uniqueXFlags[1]);
			const [x3, y3, d3, alpha3] =
				method === '3P'
					? this.extractFlagCoordsAndDistance(this.uniqueXFlags[2])
					: [0, 0, 0, 0];

			const [x, y] =
				method === '3P'
					? calculatePos3P(x1, y1, d1, x2, y2, d2, x3, y3, d3)
					: calculatePos2P(x1, y1, d1, x2, y2, d2);

			this.pos = { x, y };
		}

		return this.pos;
	},
	inPenaltyZone(side = 'r') {
		const { x, y } = this.pos;
		const { fprt, fprb, fplt, fplb } = Flags;

		return (
			(side === 'r' && x > fprt.x && y > fprt.y && y < fprb.y) ||
			(side === 'l' && x < fplt.x && y > fplt.y && y < fplb.y)
		);
	},
	getTeamLocationFirstPlayer(ourTeam = true) {
		if (this.uniqueXFlags.length >= 3) {
			const [x1, y1, d1, alpha1] = this.extractFlagCoordsAndDistance(this.uniqueXFlags[0]);
			const [x2, y2, d2, alpha2] = this.extractFlagCoordsAndDistance(this.uniqueXFlags[1]);
			const { x, y } = this.pos || this.getLocation();

			const teamArr = ourTeam ? this.teammates : this.opponents;
			let pos = null;

			if (teamArr.length) {
				const [da, alphaa] = [teamArr[0].dist, teamArr[0].angle];
				const da1 = Math.sqrt(
					d1 * d1 +
						da * da -
						2 * d1 * da * Math.cos(Math.abs(alpha1 - alphaa) * (Math.PI / 180))
				);
				const da2 = Math.sqrt(
					d2 * d2 +
						da * da -
						2 * d2 * da * Math.cos(Math.abs(alpha2 - alphaa) * (Math.PI / 180))
				);
				const [xo, yo] = calculatePos3P(x1, y1, da1, x2, y2, da2, x, y, da);
				pos = { x: xo, y: yo };
			}
			return pos;
		} else return null;
	},
	getVisible(flagName) {
		return 0 <= this.observedFlags.findIndex((fl) => fl.name === flagName);
	},
	getDistance(flagName) {
		return this.observedFlags.find((fl) => fl.name === flagName).dist;
	},
	getDistanceAppr(flagName) {
		const fl = this.observedFlags.find((fl) => fl.name === flagName);
		if (fl) return fl.dist;

		const flag = Flags[flagName];
		return Math.sqrt((this.pos.x - flag.x) ** 2 + (this.pos.y - flag.y) ** 2) || 100;
	},
	getAngle(flagName) {
		return this.observedFlags.find((fl) => fl.name === flagName).angle;
	},
	getKickAngle(goal) {
		let goalCoords = Flags[goal];
		let angleToGoal = calculateAngle(this.pos.x, this.pos.y, +goalCoords.x, +goalCoords.y);
		let tmp = calculateRotationAngle(angleToGoal, this.bodyAngle);
		return tmp;
	},
	getAction(dt) {
		const mgr = this;
		function execute(dt, title) {
			const action = dt[title];
			// Exec node
			if (typeof action.exec == 'function') {
				action.exec(mgr, dt.state);
				return execute(dt, action.next);
			}
			// Condition node
			if (typeof action.condition == 'function') {
				const cond = action.condition(mgr, dt.state);
				if (cond) return execute(dt, action.trueCond);
				return execute(dt, action.falseCond);
			}
			// Command node
			if (typeof action.command == 'function') {
				return action.command(mgr, dt.state);
			}
			throw new Error(`Unexpected node in DT: ${title}`);
		}
		return execute(dt, 'root');
	},
};

module.exports = Manager;
