import { Webp } from "../libwebp/dist/webp.js"
import { loadBinaryData } from "./load-binary-data.js"
import { detectWebpSupport } from "./detect-webp-support.js"
import {
    WebpMachineOptions,
    PolyfillDocumentOptions,
    DetectWebpImage,
    DetectWebpBackground
} from "./interfaces.js"
import { WebpQueue } from "./webpQueue.js"

const relax = () => new Promise(resolve => requestAnimationFrame(resolve));
const queue = new WebpQueue();

export class WebpMachineError extends Error {}

export const defaultDetectWebpImage: DetectWebpImage = (image: HTMLImageElement) =>
	/\.webp.*$/i.test(image.src) || (image.dataset &&  /\.webp.*$/i.test(image.dataset.src));

export const defaultDetectWebpBackground: DetectWebpBackground = (el: HTMLDivElement) =>
	/\.webp.*$/i.test(el.style.backgroundImage) || (el.dataset &&  /\.webp.*$/i.test(el.dataset.bg));

/**
 * Webp Machine
 * - decode and polyfill webp images
 * - can only decode images one-at-a-time (otherwise will throw busy error)
 */
export class WebpMachine {
	private readonly webp: Webp
	private readonly webpSupport: Promise<boolean>
	private readonly detectWebpImage: DetectWebpImage
	private readonly detectWebpBackground: DetectWebpBackground
    private processing = false;
	private busy = false
	private cache: {[key: string]: string} = {}

	constructor({
		webp = new Webp(),
		webpSupport = detectWebpSupport(),
		detectWebpImage = defaultDetectWebpImage,
		detectWebpBackground = defaultDetectWebpBackground
	}: WebpMachineOptions = {}) {
        this.processing = false;
        this.busy = false;
        this.cache = {};
		this.webp = webp
		this.webp.Module['doNotCaptureKeyboard'] = true;
		this.webpSupport = webpSupport
		this.detectWebpImage = detectWebpImage
		this.detectWebpBackground = detectWebpBackground
	}

	/**
	 * Decode raw webp data into a png data url
	 */
	async decode(webpData: Uint8Array): Promise<string> {
		if (this.busy) throw new WebpMachineError("cannot decode when already busy")
		this.busy = true

		try {
			await relax()
			const canvas = document.createElement("canvas")
			this.webp.setCanvas(canvas)
			this.webp.webpToSdl(webpData, webpData.length)
			this.busy = false
			return canvas.toDataURL()
		}
		catch (error) {
			this.busy = false
			error.name = WebpMachineError.name
			error.message = `failed to decode webp image: ${error.message}`
			throw error
		}
	}

	/**
	 * Polyfill the webp format on the given <img> element
	 */
	async polyfillImage(image: HTMLImageElement): Promise<void> {
		if (await this.webpSupport) return
		const {src, dataset} = image
		let dataSrc = null
		if (this.detectWebpImage(image)) {
			if (dataset && dataset.src) dataSrc = dataset.src
			const img = dataSrc || src
			if (this.cache[img]) {
				image.src = this.cache[img]
				return
			}
			try {
				const webpData = await loadBinaryData(img)
				const pngData = await this.decode(webpData)
				image.src = this.cache[img] = pngData
				delete image.dataset.src
			}
			catch (error) {
				error.name = WebpMachineError.name
				error.message = `failed to polyfill image "${img}": ${error.message}`
				throw error
			}
		}
	}

	/**
	 * Polyfill the webp format on the given <div> element
	 */
	async polyfillBackground(el: HTMLDivElement): Promise<void> {
		if (await this.webpSupport) return
		const {style: {backgroundImage}, dataset} = el
		let bg = null;
		if (this.detectWebpBackground(el)) {
			if (dataset && dataset.bg) bg = dataset.bg
			const image = (/([\w\/]+\.\w+)/gi.exec(backgroundImage) || /([\w\/]+\.\w+)/gi.exec(bg))[0]
			if (this.cache[image]) {
				el.style.backgroundImage = `url("${this.cache[image]}")`
				return
			}
			try {
				const webpData = await loadBinaryData(image)
				const pngData = await this.decode(webpData)
				this.cache[image] = pngData
				el.style.backgroundImage = `url("${pngData}")`
				delete el.dataset.bg
			}
			catch (error) {
				error.name = WebpMachineError.name
				error.message = `failed to polyfill image "${image}": ${error.message}`
				throw error
			}
		}
	}

    /**
     * Polyfill webp format on the entire web page
     */
    async polyfillDocument({
                               document = window.document,
                               selectors = "img",
                           }: PolyfillDocumentOptions = {}): Promise<void> {
        if (await this.webpSupport) return null;

        queue.enqueue(Array.from(document.querySelectorAll(selectors)));

        if (this.processing) return null;

        this.processing = true;
        let image;
        while (image = queue.dequeue()) {
            try {
                if (image instanceof HTMLImageElement) {
                    await this.polyfillImage(image);
                } else {
                    await this.polyfillBackground(image);
                }
            } catch (error) {
                this.processing = false;
                error.name = WebpMachineError.name;
                error.message = `webp el polyfill failed for url "${image instanceof HTMLImageElement ? image.src : null}": ${error}`;
                throw error;
            }
        }
        this.processing = false;
    }
}
