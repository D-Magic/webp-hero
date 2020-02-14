
import {Webp} from "../libwebp/dist/webp.js"
import {loadBinaryData} from "./load-binary-data.js"
import {detectWebpSupport} from "./detect-webp-support.js"
import {WebpMachineOptions, PolyfillDocumentOptions, DetectWebpImage, DetectWebpBackground} from "./interfaces.js"

const relax = () => new Promise(resolve => requestAnimationFrame(resolve))

export class WebpMachineError extends Error {}

export const defaultDetectWebpImage: DetectWebpImage = (image: HTMLImageElement) =>
	/\.webp.*$/i.test(image.src)

export const defaultDetectWebpBackground: DetectWebpBackground = (el: HTMLDivElement) =>
	/\.webp.*$/i.test(el.style.backgroundImage) || /\.webp.*$/i.test(el.dataset.bg)

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
	private busy = false
	private cache: {[key: string]: string} = {}

	constructor({
		webp = new Webp(),
		webpSupport = detectWebpSupport(),
		detectWebpImage = defaultDetectWebpImage,
		detectWebpBackground = defaultDetectWebpBackground
	}: WebpMachineOptions = {}) {
		this.webp = webp
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
		const {src} = image
		if (this.detectWebpImage(image)) {
			if (this.cache[src]) {
				image.src = this.cache[src]
				return
			}
			try {
				const webpData = await loadBinaryData(src)
				const pngData = await this.decode(webpData)
				image.src = this.cache[src] = pngData
			}
			catch (error) {
				error.name = WebpMachineError.name
				error.message = `failed to polyfill image "${src}": ${error.message}`
				throw error
			}
		}
	}

	/**
	 * Polyfill the webp format on the given <div> element
	 */
	async polyfillBackground(el: HTMLDivElement): Promise<void> {
		if (await this.webpSupport) return
		const {style: {backgroundImage}, dataset: {bg}} = el
		if (this.detectWebpBackground(el)) {
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
		   selectors = "img"
    }: PolyfillDocumentOptions = {}): Promise<void> {
		if (await this.webpSupport) return null
		for (const el of Array.from(document.querySelectorAll(selectors))) {
			try {
				if (el instanceof HTMLImageElement)
					await this.polyfillImage(el);
				else
					await this.polyfillBackground(el as HTMLDivElement);
			}
			catch (error) {
				error.name = WebpMachineError.name
				error.message = `webp el polyfill failed for url "${el instanceof HTMLImageElement ? el.src : null}": ${error}`
				throw error
			}
		}
	}
}
