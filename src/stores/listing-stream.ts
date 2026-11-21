import { create } from "zustand";

import type { ListingContentResult } from "@/types/listing-content";
import type { ListingStreamProduct } from "@/types/listing-stream";

type ListingStreamState = {
  streamId: string | null;
  isOpen: boolean;
  order: string[];
  products: Record<string, ListingStreamProduct>;
  open: (streamId: string) => void;
  start: (productId: string) => void;
  append: (productId: string, text: string) => void;
  restart: (productId: string) => void;
  finish: (productId: string, listing: ListingContentResult) => void;
  fail: (productId: string, message: string | null) => void;
  close: () => void;
};

const emptyProduct = (productId: string): ListingStreamProduct => ({
  productId,
  text: "",
  listing: null,
  status: "streaming",
  message: null,
});

const updateProduct = (
  state: ListingStreamState,
  productId: string,
  change: (product: ListingStreamProduct) => ListingStreamProduct
) => ({
  order: state.order.includes(productId) ? state.order : [...state.order, productId],
  products: { ...state.products, [productId]: change(state.products[productId] ?? emptyProduct(productId)) },
});

export const useListingStreamStore = create<ListingStreamState>((set) => ({
  streamId: null,
  isOpen: false,
  order: [],
  products: {},
  open: (streamId) => set({ streamId, isOpen: true, order: [], products: {} }),
  start: (productId) => set((state) => updateProduct(state, productId, () => emptyProduct(productId))),
  append: (productId, text) =>
    set((state) => updateProduct(state, productId, (product) => ({ ...product, text: product.text + text }))),
  restart: (productId) => set((state) => updateProduct(state, productId, (product) => ({ ...product, text: "" }))),
  finish: (productId, listing) =>
    set((state) => updateProduct(state, productId, (product) => ({ ...product, listing, status: "done" }))),
  fail: (productId, message) =>
    set((state) => updateProduct(state, productId, (product) => ({ ...product, status: "failed", message }))),
  close: () => set({ isOpen: false }),
}));
