const Msg = require('./msg');
const readline = require('readline');
const Flags = require('./flags');

const round = (a) => Math.round(a * 100) / 100;

class Agent {
	constructor(team) {
		this.position = 'l'; // По умолчанию ~ левая половина поля
		this.run = false; // ИГра начата
		this.act = null; // Действия
		this.rl = readline.createInterface({
			// Чтение консоли
			input: process.stdin,
			output: process.stdout,
		});
		this.team = team;
		this.posMethod = '3P';
		this.rl.on('line', (input) => {
			// Обработка строки из кон—
			if (this.run) {
				// Если игра начата
				// ДВижения вперед, вправо, влево, удар по мячу

				if ('w' == input) this.act = { n: 'dash', v: 100 };
				if ('d' == input) this.act = { n: 'turn', v: 20 };
				if ('a' == input) this.act = { n: 'turn', v: -20 };
				if ('s' == input) this.act = { n: 'kick', v: 100 };
			}
		});
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
		if (data.cmd == 'hear') this.run = true;
		if (data.cmd == 'init') this.initAgent(data.p); //MHMnmaflM3auMH
		this.analyzeEnv(data.msg, data.cmd, data.p); // Обработка
	}
	initAgent(p) {
		if (p[0] == 'r') this.position = 'r'; // Правая половина поля
		if (p[1]) this.id = p[1]; // id игрока
	}
	analyzeEnv(msg, cmd, p) {
		if (cmd == 'see') {
			let observedFlags = [];
			let opponents = [];

			const xs = [];
			for (let i = 1; i < p.length; i++) {
				let flagName = p[i].cmd.p.join('');
				if (Object.keys(Flags).includes(flagName) && p[i].p.length >= 2) {
					// Flag
					let x = Flags[flagName].x;
					if (!xs.includes(x)) {
						observedFlags.push(p[i]);
						xs.push(x);
					}
				} else if (p[i].cmd.p[0] === 'p' && p[i].cmd.p[1] !== this.team) {
					// Opponent
					opponents.push(p[i]);
				}
			}

			if (observedFlags.length < 3 && this.posMethod === '3P')
				return console.log('Вижу меньше 3 значимых флагов');
			else if (observedFlags.length < 2 && this.posMethod === '2P')
				return console.log('Вижу меньше 2 значимыхых флагов');

			observedFlags.sort((a, b) => a.p[0] - b.p[0]);
			let extractFlagCoordsAndDistance = (observedFlag) => {
				let flagName = observedFlag.cmd.p.join('');
				return [Flags[flagName].x, Flags[flagName].y, observedFlag.p[0], observedFlag.p[1]]; // X, Y, расстояние до флага, угол
			};

			let [x1, y1, d1, alpha1] = extractFlagCoordsAndDistance(observedFlags[0]);
			let [x2, y2, d2, alpha2] = extractFlagCoordsAndDistance(observedFlags[1]);
			let [x3, y3, d3, alpha3] =
				this.posMethod === '3P' ? extractFlagCoordsAndDistance(observedFlags[2]) : [0, 0, 0, 0];

			let [X, Y] =
				this.posMethod === '3P'
					? this.calculatePos3P(x1, y1, d1, x2, y2, d2, x3, y3, d3)
					: this.calculatePos2P(x1, y1, d1, x2, y2, d2);

			console.log(`${this.team} player ${this.id}: X = ${round(X)} Y = ${round(Y)}`);

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
				let [XO, YO] = this.calculatePos3P(x1, y1, da1, x2, y2, da2, X, Y, da);
				console.log(
					`${this.team} player ${this.id} sees ${opponents[0].cmd.p[1]} player: X = ${round(
						XO
					)} Y = ${round(YO)}`
				);
			}
		}
	}
	calculatePos3P(x1, y1, d1, x2, y2, d2, x3, y3, d3) {
		let alpha1 = (y1 - y2) / (x2 - x1);
		let beta1 = (y2 * y2 - y1 * y1 + x2 * x2 - x1 * x1 + d1 * d1 - d2 * d2) / (2 * (x2 - x1));
		let alpha2 = (y1 - y3) / (x3 - x1);
		let beta2 = (y3 * y3 - y1 * y1 + x3 * x3 - x1 * x1 + d1 * d1 - d3 * d3) / (2 * (x3 - x1));
		let delta_beta = beta1 - beta2;
		let delta_alpha = alpha2 - alpha1;
		let X = alpha1 * (delta_beta / delta_alpha) + beta1;
		let Y = delta_beta / delta_alpha;
		return [X, Y];
	}
	calculatePos2P(x1, y1, d1, x2, y2, d2) {
		const field = { l: -57.5, r: 57.5, t: 39, b: -39 };
		let X, Y;

		if (x1 !== x2) {
			const alpha = (y1 - y2) / (x2 - x1);
			const beta = (y2 * y2 - y1 * y1 + x2 * x2 - x1 * x1 + d1 * d1 - d2 * d2) / (2 * (x2 - x1));
			const a = alpha * alpha + 1;
			const b0 = x1 - beta;
			const b = -2 * (alpha * b0 + y1);
			const c = b0 * b0 + y1 * y1 - d1 * d1;

			let Y1 = (-b + Math.sqrt(b * b - 4 * a * c)) / 2 / a;
			let Y2 = (-b - Math.sqrt(b * b - 4 * a * c)) / 2 / a;
			Y = Y1 >= field.b && Y1 <= field.t ? Y1 : Y2;

			if (y1 === y2) {
				X = (x2 * x2 - x1 * x1 + d1 * d1 - d2 * d2) / (x2 - x1) / 2;
			} else {
				let X1 = x1 + Math.sqrt(d1 * d1 - (Y - y1) * (Y - y1));
				let X2 = x1 - Math.sqrt(d1 * d1 - (Y - y1) * (Y - y1));
				X = X1 >= field.l && X1 <= field.r ? X1 : X2;
			}
		} else {
			Y = (y2 * y2 - y1 * y1 + d1 * d1 - d2 * d2) / (y2 - y1) / 2;

			let X1 = x1 + Math.sqrt(d1 * d1 - (Y - y1) * (Y - y1));
			let X2 = x1 + Math.sqrt(d1 * d1 - (Y - y1) * (Y - y1));
			X = X1 >= field.l && X1 <= field.r ? X1 : X2;
		}

		return [X, Y];
	}
	sendCmd() {
		if (this.run) {
			// Идра начата
			if (this.act) {
				// Есть команда от игрока
				if (this.act.n == 'kick')
					// Пнуть мяч
					this.socketSend(this.act.n, this.act.v + ' 0');
				// ДВижение и поворот
				else this.socketSend(this.act.n, this.act.v);
			}
			this.act = null; // Сброс команды
		}
	}
}

module.exports = Agent; // Экспорт игрока
