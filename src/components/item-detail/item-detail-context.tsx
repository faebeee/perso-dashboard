import { createContext, useContext } from "react";

export interface OpenableItem {
	/** Integration id. */
	source: string;
	title: string;
	/** Web URL, used for "Open in …" and as the fallback. */
	url: string;
	detailRef?: string;
}

export interface ItemDetailApi {
	/**
	 * Opens the in-app detail modal when the item's source has a detail view
	 * and the item a `detailRef`. Returns false otherwise, so callers fall
	 * back to opening `url` in the browser.
	 */
	openItem(item: OpenableItem): boolean;
	openExternal(url: string): void;
}

export const ItemDetailContext = createContext<ItemDetailApi>({
	openItem: () => false,
	openExternal: () => {},
});

export const useItemDetail = () => useContext(ItemDetailContext);

export const useOpenExternal = () => useContext(ItemDetailContext).openExternal;
