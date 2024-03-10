const Taken = require('./taken');
const BEFORE_ACTION = 'beforeAction';
const Manager = {
	init(team, side) {
		this.taken = Object.create(Taken).init(team, side);
		return this;
	},
	setHear(input) {
		// Сохранение услышанного игроком
		this.taken.setHear(input);
	},
	getAction(input, ta) {
		// Формирование действия
		this.taken.setSee(input);
		this.incTimers(this.taken, ta);
		if (ta.actions[BEFORE_ACTION]) ta.actions[BEFORE_ACTION](this.taken, ta.state);
		// if (this.taken.teamName === 'teamB') console.log(ta.current);
		return this.execute(this.taken, ta);
	},
	incTimers(taken, ta) {
		// Увеличение таймеров
		if (!this.lastTime) this.lastTime = 0;
		if (taken.time > this.lastTime) {
			this.lastTime = taken.time;
			for (let key in ta.state.timers) ta.state.timers[key] = ta.state.timers[key] + 1;
		}
	},
	execute(taken, ta) {
		// Формирование действия
		if (ta.state.synch) {
			// Если действие выполнено не до конца
			let cond = ta.state.synch.substr(0, ta.state.synch.length - 1);
			return ta.actions[cond](taken, ta.state);
		}
		if (ta.state.next) {
			// Переход на следующей действие
			if (ta.nodes[ta.current]) return this.nextState(taken, ta);
			if (ta.edges[ta.current]) return this.nextEdge(taken, ta);
		} // Переход не нужен
		if (ta.nodes[ta.current]) return this.executeState(taken, ta);
		if (ta.edges[ta.current]) return this.executeEdge(taken, ta);
		throw `Unexpected state: ${ta.current}`;
	},
	nextState(taken, ta) {
		// Находимся в узле, нужен переход
		let node = ta.nodes[ta.current];
		for (let name of node.e) {
			// Перебираем ребра
			let edgeName = `${node.n}_${name}`;
			let edge = ta.edges[edgeName];
			if (!edge) throw `Unexpected edge: ${node.n}_${name}`;
			for (let e of edge) {
				// Проверяем все ребра
				if (e.guard) {
					// Проверяем ограничения
					let guard = true;
					for (let g of e.guard)
						if (!this.guard(taken, ta, g)) {
							guard = false;
							break; // Ограничение не выполнено
						}
					if (!guard)
						// Ребро нам не подходит
						continue;
				}
				if (e.synch) {
					// Необходима синхронизация
					if (e.synch.endsWith('?')) {
						// Проверка условия
						let cond = e.synch.substr(0, e.synch.length - 1);
						if (!ta.actions[cond]) throw `Unexpected synch: ${e.synch}`;
						if (!ta.actions[cond](taken, ta.state)) continue; // ПpовepKa не успешна
					}
				}
				ta.current = edgeName; // Далее работаем с этим ребром
				ta.state.next = false;
				return this.execute(taken, ta); // Рекурсивный вызов
			}
		}
	},
	nextEdge(taken, ta) {
		// Находимся в ребре, нужен переход
		let arr = ta.current.split('_');
		// После подчеркивания — имя узла, куда должны попасть
		let node = arr[1];
		ta.current = node;
		ta.state.next = false;
		return this.execute(taken, ta); // Рекурсивный вызов
	},
	executeState(taken, ta) {
		// Выполнить действия в узле
		let node = ta.nodes[ta.current];
		if (ta.actions[node]) {
			// Если действие в узле есть
			let action = ta.actions[node](taken, ta.state);
			if (!action && ta.state.next) return this.execute(taken, ta);
			return action;
		} else {
			// Если действия в узле нет
			ta.state.next = true;
			return this.execute(taken, ta); // Рекурсивный вызов
		}
	},
	executeEdge(taken, ta) {
		// Выполнить действия в ребре
		let edges = ta.edges[ta.current];
		for (let e of edges) {
			// Может быть несколько ребер
			if (e.guard) {
				// Выбираем "наше" ребро
				let guard = true;
				for (let g of e.guard)
					if (!this.guard(taken, ta, g)) {
						guard = false;
						break; // Ограничение не выполнено
					}
				if (!guard) continue; // Ребро нам не подходит
			}
			if (e.assign) {
				// Есть назначения в ребре
				for (let a of e.assign) {
					if (a.type == 'timer') {
						// Для таймеров
						if (ta.state.timers[a.n] === null) throw `Unexpected timer: ${a.n}`;
						ta.state.timers[a.n] = a.v;
					} else {
						// Для переменных
						if (ta.state.variables[a.n] === null) throw `Unexpected variable: ${a.n}`;
						ta.state.variables[a.n] = a.V;
					}
				}
			}
			if (e.synch) {
				// Необходима синхронизация
				if (!e.synch.endsWith('?') && !e.synch.endsWith('!'))
					throw `Unexpected synch: ${e.synch}`;
				if (e.synch.endsWith('!')) {
					// Выполнение действия
					let cond = e.synch.substr(0, e.synch.length - 1);
					if (!ta.actions[cond]) throw `Unexpected synch: $(e.synch}`;
					// Выполнение action
					return ta.actions[cond](taken, ta.state);
				}
			}
		}
		ta.state.next = true; // Действий нет, переход к узлу
		return this.execute(taken, ta); // Рекурсивный вызов
	},
	guard(taken, ta, g) {
		// Проверка условий
		const taStateObject = (o, ta) => {
			// Получение значения таймера/переменной (g.l или g.r)
			if (typeof o == 'object') return o.v ? ta.state.variables[o.v] : ta.state.timers[o.t];
			else return o;
		};
		const op = {
			lt: (ta, l, r) => taStateObject(l, ta) < taStateObject(r, ta),
			lte: (ta, l, r) => taStateObject(l, ta) <= taStateObject(r, ta),
			gt: (ta, l, r) => taStateObject(l, ta) > taStateObject(r, ta),
			gte: (ta, l, r) => taStateObject(l, ta) <= taStateObject(r, ta),
			e: (ta, l, r) => taStateObject(l, ta) === taStateObject(r, ta),
			ne: (ta, l, r) => taStateObject(l, ta) !== taStateObject(r, ta),
		};
		if (op[g.s]) return op[g.s](ta, g.l, g.r);
		else throw `Unexpected guard: ${JSON.stringify(g)}`;
	},
};

module.exports = Manager;
