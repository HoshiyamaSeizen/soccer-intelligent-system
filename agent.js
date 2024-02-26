const Msg = require('./msg');
const readline = require('readline');
const Flags = require('./flags');
const {
	calculatePos2P,
	calculatePos3P,
	calculateAngle,
	calculateRotationAngle,
} = require('./calculations');

const round = (a) => Math.round(a * 100) / 100;

class Agent {
	constructor(team, coords, strat = null) {
		this.position = 'l'; // По умолчанию ~ левая половина поля
		this.run = false; // ИГра начата
		this.act = null; // Действия
		this.bodyAngle = 0;
		this.rl = readline.createInterface({
			// Чтение консоли
			input: process.stdin,
			output: process.stdout,
		});
		this.X = coords[0];
		this.Y = coords[1];
		this.team = team;
		this.strat = strat;
		this.posMethod = '3P';
		this.rl.on('line', (input) => {
			if (this.run) {
				// Если игра начата
				// ДВижения вперед, вправо, влево, удар по мячу
				if ('w' == input) this.act = { n: 'dash', v: 100 };
				if ('d' == input) this.act = { n: 'turn', v: 20 };
				if ('a' == input) this.act = { n: 'turn', v: -20 };
				if ('s' == input) this.act = { n: 'kick', v: '100 0' };
			}
		});
		this.strategies = [
			{ act: 'kick', fl: 'b', goal: 'gr' },
			{ act: 'flag', fl: 'fplt' },
			{ act: 'flag', fl: 'fplc' },
		]; // стратегии
		this.curStratInd = 0; // индекс текущей стратегии
	}
	msgGot(msg) {
		// Получение сообщения
		let data = msg.toString('utf8'); // ПРиведение
		this.processMsg(data); // Разбор сообщения
		this.sendCmd(); // Отправка команды
	}
	setSocket(socket) {
		// Настройка сокета
		this.socket = socket;
	}
	async socketSend(cmd, value) {
		// Отправка команды
		await this.socket.sendMsg(`(${cmd} ${value})`);
	}
	processMsg(msg) {
		// Обработка сообщения
		let data = Msg.parseMsg(msg); // Разбор сообщения
		if (!data) throw new Error('Parse error\n' + msg);
		// Первое (hear) — начало игры
		if (data.cmd == 'hear' && data.p[2] == 'play_on') this.run = true;
		if (data.cmd == 'init') this.initAgent(data.p); //MHMnmaflM3auMH
		this.analyzeEnv(data.msg, data.cmd, data.p); // Обработка
	}
	initAgent(p) {
		if (p[0] == 'r') this.position = 'r'; // Правая половина поля
		if (p[1]) this.id = p[1]; // id игрока
	}
	correctMovement(angle, dist) {
		// необходимое расстояние до цели, угол под которым она видна, текущее расстояние до цели
		if (angle > 2) this.act = { n: 'turn', v: -angle };
		else if (angle < -2) this.act = { n: 'turn', v: angle };
		else if (dist >= 10) this.act = { n: 'dash', v: 100 };
		else this.act = { n: 'dash', v: 50 };
	}
	analyzeEnv(msg, cmd, p) {
		let curStrat = this.strategies[this.curStratInd];
		if (cmd == 'hear' && p[2].includes('goal')) {
			this.run = false;
			console.log('GOAL!!!!!!!!!');
			if (curStrat.act == 'kick')
				this.curStratInd = (this.curStratInd + 1) % this.strategies.length;
		}
		if (cmd == 'see') {
			let observedFlags = [];
			let opponents = [];
			const xs = [];
			let sawTarget = false;
			for (let i = 1; i < p.length; i++) {
				let objectName = p[i].cmd.p.join(''); // имя видимого объекта на поле
				let angle = +p[i].p[1]; // угол, под которым виден объект
				let dist = +p[i].p[0]; // расстояние до объекта
				// ФЛАГИ
				if (Object.keys(Flags).includes(objectName) && p[i].p.length >= 2) {
					// ФЛАГИ
					if (curStrat.act == 'flag' && curStrat.fl == objectName) {
						sawTarget = true;
						if (dist <= 3) this.curStratInd = (this.curStratInd + 1) % this.strategies.length;
						else this.correctMovement(angle, dist);
					}
					let x = Flags[objectName].x;
					if (!xs.includes(x)) {
						observedFlags.push(p[i]);
						xs.push(x);
					}
				}
				// МЯЧ
				if (p[i].cmd.p[0] === 'b' && curStrat.act == 'kick' && curStrat.fl == 'b') {
					sawTarget = true;
					let goalCoords = Flags[curStrat.goal];
					let angleToGoal = calculateAngle(this.X, this.Y, +goalCoords.x, +goalCoords.y);
					if (dist <= 0.5) {
						let angle = calculateRotationAngle(angleToGoal, this.bodyAngle);
						if (isNaN(angle)) angle = this.Y < 0 ? -90 : 90;
						this.act = { n: 'kick', v: '100 ' + angle };
						console.log(
							'ANGLE: ',
							this.bodyAngle,
							'KICK: ',
							calculateRotationAngle(angleToGoal, this.bodyAngle)
						);
					} else this.correctMovement(angle, dist);
				}
			}
			if (sawTarget == false) this.act = { n: 'turn', v: 90 };

			let analyze = true;
			if (observedFlags.length < 3 && this.posMethod === '3P') {
				analyze = false;
				console.log('Вижу меньше 3 значимых флагов');
			} else if (observedFlags.length < 2 && this.posMethod === '2P') {
				analyze = false;
				console.log('Вижу меньше 2 значимыхых флагов');
			}

			observedFlags.sort((a, b) => a.p[0] - b.p[0]);
			let extractFlagCoordsAndDistance = (observedFlag) => {
				let flagName = observedFlag.cmd.p.join('');
				return [Flags[flagName].x, Flags[flagName].y, observedFlag.p[0], observedFlag.p[1]]; // X, Y, расстояние до флага, угол
			};
			if (observedFlags.length > 0) {
				let [closestFlagX, closestFlagY, dlosestFlagDist, closestFlagAngle] =
					extractFlagCoordsAndDistance(observedFlags[0]);
				this.bodyAngle =
					calculateAngle(this.X, this.Y, closestFlagX, closestFlagY) - closestFlagAngle;
				if (this.bodyAngle < 0) this.bodyAngle += 360;
				if (this.bodyAngle > 360) this.bodyAngle -= 360;
			}
			//если можно пересчитать координаты
			if (analyze) {
				let [x1, y1, d1, alpha1] = extractFlagCoordsAndDistance(observedFlags[0]);
				let [x2, y2, d2, alpha2] = extractFlagCoordsAndDistance(observedFlags[1]);
				let [x3, y3, d3, alpha3] =
					this.posMethod === '3P'
						? extractFlagCoordsAndDistance(observedFlags[2])
						: [0, 0, 0, 0];

				[this.X, this.Y] =
					this.posMethod === '3P'
						? calculatePos3P(x1, y1, d1, x2, y2, d2, x3, y3, d3)
						: calculatePos2P(x1, y1, d1, x2, y2, d2);

				// Opponent
				if (opponents.length) {
					let [da, alphaa] = [opponents[0].p[0], opponents[0].p[1]];
					let da1 = Math.sqrt(
						d1 * d1 +
							da * da -
							2 * d1 * da * Math.cos(Math.abs(alpha1 - alphaa) * (Math.PI / 180))
					);
					let da2 = Math.sqrt(
						d2 * d2 +
							da * da -
							2 * d2 * da * Math.cos(Math.abs(alpha2 - alphaa) * (Math.PI / 180))
					);
					let [XO, YO] = calculatePos3P(x1, y1, da1, x2, y2, da2, X, Y, da);
					console.log(
						`${this.team} player ${this.id} sees ${opponents[0].cmd.p[1]} player: X = ${round(
							XO
						)} Y = ${round(YO)}`
					);
				}
			}

			if (this.strat?.name === 'spin') {
				//this.act = { n: 'turn', v: this.strat.speed };
			}
		}
	}

	sendCmd() {
		if (this.run) {
			// Идра начата
			if (this.act) this.socketSend(this.act.n, this.act.v);
			this.act = null; // Сброс команды
		}
	}
}

module.exports = Agent; // Экспорт игрока
