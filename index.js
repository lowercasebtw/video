/**
 * @param {CallableFunction} func
 * @param {number} time
 * @returns {number}
 */
const s_globalTimer = (func, time) => setInterval(func, time);

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * @param {CallableFunction} func
 * @param  {any[]} args
 */
const run_if_function = (func, ...args) => {
	func && typeof func == "function" ? func(...args) : 0;
};

class RGB {
	/**
	 * @type {number}
	 */
	r;

	/**
	 * @type {number}
	 */
	g;

	/**
	 * @type {number}
	 */
	b;

	/**
	 * @param {number} r
	 * @param {number} g
	 * @param {number} b
	 */
	constructor(r, g, b) {
		this.r = parseFloat(r ?? 0) % 256;
		this.g = parseFloat(g ?? 0) % 256;
		this.b = parseFloat(b ?? 0) % 256;
	}

	toString() {
		return `rgb(${this.r}, ${this.g}, ${this.b})`;
	}
}

class Frame {
	/**
	 * @type {number}
	 */
	width;

	/**
	 * @type {number}
	 */
	height;

	/**
	 * @type {RGB[]}
	 */
	data;

	/**
	 * @param {number} width
	 * @param {number} height
	 * @param {RGB[]} data
	 */
	constructor(width, height, data) {
		this.width = width ?? 640;
		this.height = height ?? 480;
		this.data = data;
	}
}

class Video {
	playing = false;
	_cached_context;

	ms = 0;
	frameIdx = 0;

	/**
	 * @type {Frame[]}
	 */
	frames = [];

	/**
	 * @param {Video[]} frames
	 * @param {number} fps
	 */
	constructor(frames, fps) {
		this.ms = (1 / fps) * 1000;
		this.frameIdx = 0;
		this.frames = frames;
	}

	get length() {
		if (this.frames.length == 0) return 0;
		return (this.ms * this.frames.length) / 1000;
	}

	get width() {
		if (this.frames.length == 0) return 0;
		return this.frames[0].width;
	}

	get height() {
		if (this.frames.length == 0) return 0;
		return this.frames[0].height;
	}

	/**
	 * @type {CallableFunction | undefined}
	 */
	on_play;

	/**
	 * @type {CallableFunction | undefined}
	 */
	on_error;

	/**
	 * @type {CallableFunction | undefined}
	 */
	on_frame;

	/**
	 * @type {CallableFunction | undefined}
	 */
	on_finish;

	async restart() {
		this.frameIdx = 0;
		this.playing = false;
		this.play(this._cached_context);
	}

	async pause() {
		this.playing = false;
	}

	async resume() {
		if (!this._cached_context)
			throw new Error("Could not resume as video was never played.");
		this.playing = true;
		await this._start(this._cached_context);
	}

	/**
	 * @param {CanvasRenderingContext2D} context
	 */
	async _start(context) {
		while (this.playing && this.frameIdx < this.frames.length) {
			const frame = this.frames[this.frameIdx++];
			const rgb = frame.data[0];

			// TODO: (pixel per x/y)
			// for (let i = 0; i < frame.data.length; ++i) {}

			context.fillStyle = rgb.toString();
			context.fillRect(0, 0, this.width, this.height);

			run_if_function(this.on_frame, this, this.frameIdx, frame);
			await sleep(this.ms);
		}
	}

	/**
	 * @param {CanvasRenderingContext2D} context
	 * @returns {boolean}
	 */
	async play(context) {
		if (!s_globalTimer || !context) {
			run_if_function(
				this.on_error,
				this,
				new Error("Global Timer or Context was null."),
				this.frameIdx
			);
			return false;
		}

		this._cached_context = context;
		if (this.frameIdx >= this.frames.length) {
			run_if_function(
				this.on_error,
				this,
				new Error("Video was already played and finished.")
			);
			return false;
		}

		this.playing = true;
		context.clearRect(0, 0, context.canvas.width, context.canvas.height);

		run_if_function(this.on_play, this);
		await this._start(context);

		run_if_function(this.on_finish, this);
		return true;
	}
}

const canvas = document.getElementById("video");
const context = canvas.getContext("2d");

async function animate(video) {
	await video.restart();

	video.on_play = () => console.log("playing");

	video.on_error = function (_, idx, err) {
		console.log(`Failed on frame ${idx}: ${err.message}`);
	};

	video.on_finish = () => console.log("finished");

	// video.on_frame = () => console.log('frame');

	canvas.width = video.width;
	canvas.height = video.height;
	context.fillRect(0, 0, canvas.width, canvas.height);

	video.play(context);
}

async function main() {
	const fps = 4;
	const w = 60;
	const h = 60;
	const frames = [];

	for (let i = 0; i < 12; ++i) {
		let data = [new RGB(0, 0, 255)];
		frames.push(new Frame(w, h, data));

		data = [new RGB(0, 255, 0)];
		frames.push(new Frame(w, h, data));

		data = [new RGB(255, 0, 0)];
		frames.push(new Frame(w, h, data));

		data = [new RGB(0, 0, 0)];
		frames.push(new Frame(w, h, data));
	}

    while (true) {
        const video = new Video(frames, fps);
        animate(video);
        await sleep((video.length * 1000) + (1 * 1000));
    }
}

main();
