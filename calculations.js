function calculatePos3P(x1, y1, d1, x2, y2, d2, x3, y3, d3) {
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

function calculateAngle(x1, y1, x2, y2) {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const radians = Math.atan2(dy, dx);
	let degrees = radians * (180 / Math.PI);
	if (degrees < 0) {
		degrees += 360;
	}
	return degrees;
}

function calculateRotationAngle(angle1, angle2) {
	let angleDiff = angle2 - angle1;
	if (angleDiff > 180) {
		angleDiff -= 360;
	} else if (angleDiff < -180) {
		angleDiff += 360;
	}
	return -angleDiff;
}

module.exports = {
	calculatePos3P,
	calculateAngle,
	calculateRotationAngle,
};
