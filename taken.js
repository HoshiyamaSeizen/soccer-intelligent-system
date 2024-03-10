const Flags = require('./flags');
const { calculatePos3P, calculateAngle, calculateRotationAngle } = require('./calculations');

const Taken = {
	state: {
		time: 0,
		pos: null,
		posPrev: null,
		bodyAngle: null,
		bodyAnglePrev: null,
		hear: null,
		hearPrev: null,
		ball: null,
		ballPrev: null,
		teammates: [],
		teammatesPrev: [],
		opponents: [],
		opponentsPrev: [],
		goal: null,
		goalPrev: null,
		goalOwn: null,
		goalOwnPrev: null,
		teamName: null,
		side: null,
		uniqueXFlags: [],
		observedFlags: [],
	},
	init(team, side) {
		this.teamName = team;
		this.side = side;

		const gr = { x: Flags.gr.x, y: Flags.gr.y, f: 'gr', dist: null, angle: null };
		const gl = { x: Flags.gl.x, y: Flags.gl.y, f: 'gl', dist: null, angle: null };
		this.goalOwn = side === 'r' ? gr : gl;
		this.goal = side === 'r' ? gl : gr;

		return this;
	},
	setHear(p) {
		this.hearPrev = this.hear;
		this.hear = p;
	},
	setSee(p) {
		this.updateVars();
		this.analyzeObjects(p);
		this.getLocation();
		this.getBodyAngle();
	},
	updateVars() {
		this.posPrev = this.pos;
		this.teammatesPrev = this.teammates;
		this.opponentsPrev = this.opponents;
		this.ballPrev = this.ball;
		this.goalOwnPrev = this.goalOwn;
		this.goalPrev = this.goal;
		this.bodyAnglePrev = this.bodyAngle;

		this.pos = null;
		this.teammates = [];
		this.opponents = [];
		this.ball = null;
		this.bodyAngle = null;
		this.goalOwn = null;
		this.goal = null;

		this.uniqueXFlags = [];
		this.observedFlags = [];
	},
	analyzeObjects(p) {
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

				if (objectName === 'gr') {
					const gr = { x, y, f: 'gr', dist, angle };
					if (this.side === 'r') this.goalOwn = gr;
					else this.goal = gr;
				} else if (objectName === 'gl') {
					const gl = { x, y, f: 'gl', dist, angle };
					if (this.side === 'l') this.goalOwn = gl;
					else this.goal = gl;
				}

				this.observedFlags.push({ f: objectName, angle, dist, p: p[i] });
				if (!xs.includes(x) && ys.filter((v) => v === y).length < 2) {
					this.uniqueXFlags.push({ f: objectName, angle, dist, p: p[i] });
					xs.push(x);
					ys.push(y);
				}
			}

			// Напарники
			else if (p[i].cmd.p[0] === 'p' && p[i].cmd.p[1]?.replace(/"/gi, '') === this.team) {
				this.teammates.push({ angle, dist, p: p[i], f: 'p' });
				this.observedFlags.push({ f: 'p', team: p[i].cmd.p[1], angle, dist, p: p[i] });
			}

			// Оппоненты
			else if (p[i].cmd.p[0] === 'p' && p[i].cmd.p[1] !== this.team) {
				this.opponents.push({ angle, dist, p: p[i], f: 'p' });
				this.observedFlags.push({ f: 'p', team: p[i].cmd.p[1], angle, dist, p: p[i] });
			}

			// МЯЧ
			else if (p[i].cmd.p[0] === 'b') {
				this.ball = { f: 'b', angle, dist, p: p[i] };
				this.observedFlags.push({ f: objectName, angle, dist, p: p[i] });
			}
		}

		this.uniqueXFlags.sort((a, b) => a.dist - b.dist);
	},
	extractFlagCoordsAndDistance(observedFlag) {
		const flag = Flags[observedFlag.f];
		return [flag.x, flag.y, observedFlag.dist, observedFlag.angle]; // X, Y, расстояние до флага, угол
	},
	getBodyAngle() {
		if (this.uniqueXFlags.length > 0 && this.pos) {
			let [closestFlagX, closestFlagY, closestFlagDist, closestFlagAngle] =
				this.extractFlagCoordsAndDistance(this.uniqueXFlags[0]);
			this.bodyAngle =
				calculateAngle(this.pos.x, this.pos.y, closestFlagX, closestFlagY) - closestFlagAngle;
			if (this.bodyAngle < 0) this.bodyAngle += 360;
			if (this.bodyAngle > 360) this.bodyAngle -= 360;
		}
	},
	getLocation() {
		if (this.uniqueXFlags.length >= 3) {
			const [x1, y1, d1, alpha1] = this.extractFlagCoordsAndDistance(this.uniqueXFlags[0]);
			const [x2, y2, d2, alpha2] = this.extractFlagCoordsAndDistance(this.uniqueXFlags[1]);
			const [x3, y3, d3, alpha3] = this.extractFlagCoordsAndDistance(this.uniqueXFlags[2]);

			const [x, y] = calculatePos3P(x1, y1, d1, x2, y2, d2, x3, y3, d3);
			this.pos = { x, y };
		}

		return this.pos;
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
		if (!this.pos) return 180;
		let goalCoords = Flags[goal];
		let angleToGoal = calculateAngle(this.pos.x, this.pos.y, +goalCoords.x, +goalCoords.y);
		let tmp = calculateRotationAngle(angleToGoal, this.bodyAngle);
		return tmp;
	},
	inPenaltyZone(side = 'r') {
		const { x, y } = this.pos;
		const { fprt, fprb, fplt, fplb } = Flags;

		return (
			(side === 'r' && x > fprt.x && y > fprt.y && y < fprb.y) ||
			(side === 'l' && x < fplt.x && y > fplt.y && y < fplb.y)
		);
	},
};

module.exports = Taken;
