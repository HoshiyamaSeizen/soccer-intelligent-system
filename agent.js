const Msg = require('./msg');
const readline = require('readline');
const getControllers = require('./controllers');

class Agent {
	constructor(team, coords, strat = 'player', flag = null) {
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
		this.flag = flag;
		this.team = team;
		this.didHearGo = false;
		this.strat = strat;
		this.defaultPos = coords;
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
		if (data.cmd == 'hear' && data.p[2] == 'play_on') this.run = true;
		if (data.cmd == 'init') this.initAgent(data.p); // Инициализация
		if (data.cmd == 'hear' && data.p[2] == '"go"') this.didHearGo = true;
		if (data.cmd == 'hear' && data.p[2].includes('goal')) goal = true;
		this.analyzeEnv(data.msg, data.cmd, data.p, goal); // Обработка
	}
	initAgent(p) {
		if (p[0] == 'r') this.position = 'r'; // Правая половина поля
		if (p[1]) this.id = p[1]; // id игрока
		this.setControllers();
	}
	setControllers() {
		this.controllers = getControllers(this.strat);
		this.controllers[0].setTaken(this.team, this.position);
		if (this.strat === 'bouncer') this.controllers[1].setFlag(this.flag, 10);
	}
	async analyzeEnv(msg, cmd, p, goal) {
		if (!this.run) return;
		if (goal) {
			this.run = false;
			await this.socketSend(
				'move',
				this.position === 'l'
					? `${this.defaultPos[0]} ${this.defaultPos[1]}`
					: `${-this.defaultPos[0]} ${-this.defaultPos[1]}`
			);
			this.setControllers();
		}

		if (cmd === 'hear') this.controllers[0].setHear(p);
		if (cmd === 'see') this.act = this.controllers[0].execute(p, this.controllers.slice(1));
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
