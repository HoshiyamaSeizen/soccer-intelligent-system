const Agent = require('./agent');
const VERSION = 7;

let teamName = 'teamA';
let agent = new Agent();

(async () => {
	await require('./socket')(agent, teamName, VERSION);
	await agent.socketSend('move', `-15 0`);
})();
