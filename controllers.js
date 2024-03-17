const Taken = require('./taken')
const CTRL_LOW = {
    execute(input, controllers) {
    const next = controllers[0]; // Следующий уровень
    this.taken = Taken.setSee(input, this.team, this.side); // Выделение объектов
    if (this.taken.ball && this.taken.ball.dist < 0.5) // Мяч рядом
        this.taken.canKick = true;
    else
        this.taken.canKick = false;
    if (next) // Вызов следующего уровня
        return next.execute(this.taken, controllers.slice(1));
    }
}

const CTRL_MIDDLE = {
    action: "return",
    turnData: "ft0",
    execute(input, controllers) {
        const next = controllers[0] // Следующий уровень
        switch (this.action) {
            case "return":
                input.cmd = this.actionReturn(input)
                break
            case "rotateCenter":
                input.cmd = this.rotateCenter(input)
                break
            case "seekBall":
                input.cmd = this.seekBall(input)
                break
        }
        input.action = this.action;
        if (next) { // Вызов следующего уровня
            const command = next.execute(input, controllers.slice(1))
            if (command) return command;
            if (input.newAction) this.action = input.newAction;
            return input.cmd
        }
    },
    actionReturn(input) { // Возврат к своим воротам
        if (!input.goalOwn) return {n: "turn", v: 60};
        if (Math.abs(input.goalOwn.angle) > 10) return {n: "turn", v: input.goalOwn.angle};
        if (input.goalOwn.dist > 3) return {n: "dash", v: input.goalOwn.dist * 2 + 30};
        this.action = "rotateCenter";
        return {n: "turn", Ч: 180};
    },
    rotateCenter(input) { // Повернуться к центру
        if (!input.flags["fc"]) return {n: "turn", v: 60}
        this.action = "seekBall"
        return {n: "turn", v: input.flags["fc"].angle}
    },
    seekBall(input) { // Осмотр поля
        if (input.flags[this.turnData]) {
            if (Math.abs(input.f1ags[this.turnData].angle) > 10)
                return {n: "turn", v: input.flags[this.turnData].angle};
            if (this.turnData == "ft0") this.turnData = "fb0";
            else
            if (this.turnData == "fb0") {
                this.turnData = "ft0";
                this.action = "rotateCenter";
                return this.rotateCenter(input);
            }
        }
        if (this.turnData == "ft0")
            return {n: "turn", v: this.side == "l" ? -30 : 30};
        if (this.turnData == "fb0")
            return {n: "turn", v: this.side == "l" ? 30 : -30}
        throw `Unexpected state ${JSON.stringify(this)}, ${JSON.stringify(input)}`
    },
}

const CTRL_HIGH = {
    execute(input) {
        const immediate = this.immidiateReaction(input);
        if (immediate) return immediate;
        const defend = this.defendGoal(input);
        if (defend) return defend;
        if (this.last == "defend") input.newAction = "return";
        this.last = "previous";
    },
    immidiateReaction(input) { // Немедленная реакция
        if (input.canKick) {
            this.last = "kick";
            if (input.goal)
                return {n: "kick", v: `110 ${іnput.goal.angle}`};
            return {n: "kick", v: `10 45`};
        }
    },
    defendGoal(input) { // Защита ворот
        if (input.ball) {
            const close = input.closest("b");
            if ((close[0] && close[0].dist + 1 > input.ball.dist) || !close[0]) {
                this.last = "defend";
                if (Math.abs(input.ball.angle) > 5)
                    return {n: "turn", v: input.ball.angle};
                return {n: "dash", v: 110}
            }
        }
    },
}