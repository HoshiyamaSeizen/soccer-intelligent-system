const Msg = require('./msg');
const readline = require('readline');
const Flags = require("./flags");

class Agent {
	constructor() {
		this.position = 'l'; // По умолчанию ~ левая половина поля
		this.run = false; // ИГра начата
		this.act = null; // Действия
		this.rl = readline.createInterface({
			// Чтение консоли
			input: process.stdin,
			output: process.stdout,
		});
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
		if (cmd == "see"){
			let observedFlags = []
			for (let i = 1; i < p.length; i++){
				let flagName = p[i].cmd.p.join("");
				if (Object.keys(Flags).includes(flagName) && p[i].p.length >= 2) { //является флагом и больше двух чисел => есть расстояние
					observedFlags.push(p[i]);
				} 
			}
			if (observedFlags.length < 3) {console.log("Вижу меньше 3 флагов"); return;}
			observedFlags.sort(function(a, b) { // возьмем ближайшие флаги
				return a.p[0]-b.p[0];
			});
			let extractFlagCoordsAndDistance = (observedFlag) => {
				let flagName = observedFlag.cmd.p.join("");
				return [Flags[flagName].x, Flags[flagName].y, observedFlag.p[0]] // X, Y, расстояние до флага
			}
			let [x1, y1, d1] = extractFlagCoordsAndDistance(observedFlags[0]);
			let [x2, y2, d2] = extractFlagCoordsAndDistance(observedFlags[1]);
			let [x3, y3, d3] = extractFlagCoordsAndDistance(observedFlags[2]);
			let alpha1 = (y1 - y2) / (x2 - x1);
			let beta1 = (y2*y2 - y1*y1 + x2*x2 - x1*x1 + d1*d1 - d2*d2) / (2 *(x2 - x1));
			let alpha2 = (y1 - y3) / (x3 - x1);
			let beta2 = (y3*y3 - y1*y1 + x3*x3 - x1*x1 + d1*d1 - d3*d3) / (2 *(x3 - x1));
			let delta_beta = beta1 - beta2;
			let delta_alpha = alpha2 - alpha1;
			let X = alpha1*(delta_beta/delta_alpha)+beta1;
			let Y = delta_beta/delta_alpha;
			console.log(alpha1, alpha2, beta1, beta2, delta_alpha, delta_beta);
			console.log("X = ", X, "Y = ", Y);
			console.log("\n");
		}
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
