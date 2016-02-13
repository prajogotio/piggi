function Sprite(imgBuffer, offsetX, offsetY, width, height, numOfFrames, deltaPerFrame) {
	this.DELTA_PER_FRAME = deltaPerFrame;
	this.delta = 0;
	this.currentFrame = 0;
	this.numOfFrames = numOfFrames;
	this.imgBuffer = imgBuffer;
	this.offsetX = offsetX;
	this.offsetY = offsetY;
	this.width = width;
	this.height = height;
	this.autoReset = true;
}

Sprite.prototype.render = function(g, renderWidth, renderHeight) {
	if (this.delta >= this.DELTA_PER_FRAME) {
		this.delta = 0;
		this.currentFrame++;
		if (this.autoReset) {
			this.currentFrame %= this.numOfFrames;
		} else {
			this.currentFrame = Math.min(this.currentFrame, this.numOfFrames-1);
		}
	}
	var frameOffsetX = this.offsetX + this.currentFrame * this.width;
	g.drawImage(this.imgBuffer, frameOffsetX, this.offsetY, this.width, this.height, 0, 0, renderWidth, renderHeight);
	this.delta++;
}

Sprite.prototype.reset = function() {
	this.delta = 0;
	this.currentFrame = 0;
}