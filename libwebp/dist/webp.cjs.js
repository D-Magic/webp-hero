
function Webp() {

	this.Module = Module
	this.webpToSdl = Module.cwrap("WebpToSDL", "number", ["array", "number"])
	this.setCanvas = function(canvas) { Module.canvas = canvas }
}

module.exports = {
	Webp: Webp
}
