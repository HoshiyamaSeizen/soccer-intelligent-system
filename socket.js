const dgram = require('dgram');

module.exports = function (agent, teamName, version) {
	const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

	agent.setSocket(socket);

	socket.on('message', (msg, info) => {
		agent.msgGot(msg);
	});

	socket.sendMsg = function (msg) {
		console.log(msg);
		socket.send(Buffer.from(msg), 6000, 'localhost', (err, bytes) => {
			if (err) throw err;
		});
	};

	socket.sendMsg(`(init ${teamName} (version ${version}))`);
};
