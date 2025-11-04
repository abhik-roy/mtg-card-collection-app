export declare function throttleRAF<T extends (...args: unknown[]) => void>(fn: T): (...args: Parameters<T>) => void;
export declare function attachSpotlight(element: HTMLElement): void;
export declare function revealOnView(selector: string): void;
