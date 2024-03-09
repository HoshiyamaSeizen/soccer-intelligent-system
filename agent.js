const Msg = require('./msg');
const readline = require('readline');
const Manager = require('./tmanager');
const TA = require('./tmachine');

class Agent {
	constructor(team, coords, strat = 'player') {
		this.position = 'l'; // По умолчанию ~ левая половина поля
		this.run = false; // Игра начата
		this.act = null; // Действия
		this.bodyAngle = 0;
		this.rl = readline.createInterface({
			// Чтение консоли
			input: process.stdin,
			output: process.stdout,
		});
		this.x = coords[0];
		this.y = coords[1];
		this.leadershipDefined = false;
		this.isLeader = false;
		this.team = team;
		this.didHearGo = false;
		this.strat = strat;
		this.rl.on('line', (input) => {
			if (this.run) {
				// Если игра начата
				// Движения вперед, вправо, влево, удар по мячу
				if ('w' == input) this.act = { n: 'dash', v: 100 };
				if ('d' == input) this.act = { n: 'turn', v: 20 };
				if ('a' == input) this.act = { n: 'turn', v: -20 };
				if ('s' == input) this.act = { n: 'kick', v: '100 0' };
			}
		});
	}
	msgGot(msg) {
		// Получение сообщения
		let data = msg.toString('utf8'); // Приведение
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
		let goal = false;

		if (!data) throw new Error('Parse error\n' + msg);
		// Первое (hear) — начало игры
		if (data.cmd == 'hear' /*&& data.p[2] == 'play_on'*/) this.run = true;
		if (data.cmd == 'init') this.initAgent(data.p); // Инициализация
		if (data.cmd == 'hear' && data.p[2] == '"go"') this.didHearGo = true;
		if (data.cmd == 'hear' && data.p[2].includes('goal')) goal = true;
		this.analyzeEnv(data.msg, data.cmd, data.p, goal); // Обработка
	}
	initAgent(p) {
		if (p[0] == 'r') this.position = 'r'; // Правая половина поля
		if (p[1]) this.id = p[1]; // id игрока
		this.mgr = Object.create(Manager).init(this.team, this.position);
		this.ta = Object.create(TA[this.strat]).init();
	}
	async analyzeEnv(msg, cmd, p, goal) {
		if (!this.run) return;
		if (goal) {
			this.run = false;
			if (this.strat == 'player') await this.socketSend('move', '-20 0');
			if (this.strat == 'goalie') await this.socketSend('move', '-30 0');
		}

		if (cmd === 'hear') this.mgr.setHear(p);
		if (cmd === 'see') {
			this.act = this.mgr.getAction(p, this.ta);
			// if (this.position === 'r') console.log(this.act);
		}
	}
	sendCmd() {
		if (this.run) {
			// Игра начата
			if (this.act) this.socketSend(this.act.n, this.act.v);
			this.act = null; // Сброс команды
		}
	}
}

module.exports = Agent; // Экспорт игрока
