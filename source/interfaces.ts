
import {Webp} from "../libwebp/dist/webp.js"

export type DetectWebpImage = (image: HTMLImageElement) => boolean

export type DetectWebpBackground = (el: HTMLDivElement) => boolean

export interface WebpMachineOptions {
	webp?: Webp
	webpSupport?: Promise<boolean>
	detectWebpImage?: DetectWebpImage
	detectWebpBackground?: DetectWebpBackground
}

export interface PolyfillDocumentOptions {
	document?: Document,
	selectors?: string
}
