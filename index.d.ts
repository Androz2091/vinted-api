declare module 'vinted-api' {

    export interface VintedSearchResult {
        items: Record<string, any>[];
    }

    export function fetchCookie (): Promise<string>;
    export function parseVintedURL (url: string): {validURL: boolean, domain?: RegExpMatchArray | null, querystring?: string};
    export function search (url: string, disableOrder?: boolean, allowSwap?: boolean, customParams?: Record<string, string|number>): Promise<VintedSearchResult>;

}
