"use server";

import { clearCartCookie, getCartCookieJson, setCartCookieJson } from "@/lib/cart";
import * as Commerce from "commerce-kit";
import { revalidateTag } from "next/cache";

export async function getCartFromCookiesAction() {
	const cartJson = await getCartCookieJson();
	if (!cartJson) {
		return null;
	}

	const cart = await Commerce.cartGet(cartJson.id);
	if (cart) {
		return structuredClone(cart);
	}
	return null;
}

export async function setInitialCartCookiesAction(cartId: string, linesCount: number) {
	await setCartCookieJson({
		id: cartId,
		linesCount,
	});
	revalidateTag(`cart-${cartId}`);
}

export async function findOrCreateCartIdFromCookiesAction() {
	const cart = await getCartFromCookiesAction();
	if (cart) {
		return structuredClone(cart);
	}

	const newCart = await Commerce.cartCreate();
	await setCartCookieJson({
		id: newCart.id,
		linesCount: 0,
	});
	revalidateTag(`cart-${newCart.id}`);

	return newCart.id;
}

export async function clearCartCookieAction() {
	const cookie = await getCartCookieJson();
	if (!cookie) {
		return;
	}

	await clearCartCookie();
	revalidateTag(`cart-${cookie.id}`);
	// FIXME not ideal, revalidate per domain instead (multi-tenant)
	revalidateTag(`admin-orders`);
}

export async function addToCartAction(formData: FormData) {
	const productId = formData.get("productId");
	if (!productId || typeof productId !== "string") {
		throw new Error("Invalid product ID");
	}

	const cart = await getCartFromCookiesAction();

	const updatedCart = await Commerce.cartAdd({ productId, cartId: cart?.cart.id });

	if (updatedCart) {
		await setCartCookieJson({
			id: updatedCart.id,
			linesCount: Commerce.cartCount(updatedCart.metadata),
		});

		revalidateTag(`cart-${updatedCart.id}`);
		return structuredClone(updatedCart);
	}
}

export async function increaseQuantity(productId: string) {
	const cart = await getCartFromCookiesAction();
	if (!cart) {
		throw new Error("Cart not found");
	}
	await Commerce.cartChangeQuantity({
		productId,
		cartId: cart.cart.id,
		operation: "INCREASE",
	});
}

export async function decreaseQuantity(productId: string) {
	const cart = await getCartFromCookiesAction();
	if (!cart) {
		throw new Error("Cart not found");
	}
	await Commerce.cartChangeQuantity({
		productId,
		cartId: cart.cart.id,
		operation: "DECREASE",
	});
}

export async function setQuantity({
	productId,
	cartId,
	quantity,
}: {
	productId: string;
	cartId: string;
	quantity: number;
}) {
	const cart = await getCartFromCookiesAction();
	if (!cart) {
		throw new Error("Cart not found");
	}
	await Commerce.cartSetQuantity({ productId, cartId, quantity });
}

export async function addMultipleToCartAction(productId: string, quantity: number) {
	const cart = await getCartFromCookiesAction();

	// If no cart exists, create one by adding the first item
	if (!cart) {
		const newCart = await Commerce.cartAdd({ productId });
		if (!newCart) {
			throw new Error("Failed to create cart");
		}
		if (quantity > 1) {
			await Commerce.cartSetQuantity({ productId, cartId: newCart.id, quantity });
		}
		await setCartCookieJson({
			id: newCart.id,
			linesCount: Commerce.cartCount(newCart.metadata),
		});
		revalidateTag(`cart-${newCart.id}`);
		return;
	}

	// Find current quantity for this product
	const currentLine = cart.lines.find(line => line.product.id === productId);
	const currentQty = currentLine?.quantity || 0;
	const newQty = currentQty + quantity;

	// Set the new quantity in one operation
	await Commerce.cartSetQuantity({
		productId,
		cartId: cart.cart.id,
		quantity: newQty
	});

	const updatedCart = await Commerce.cartGet(cart.cart.id);
	if (updatedCart) {
		await setCartCookieJson({
			id: updatedCart.cart.id,
			linesCount: Commerce.cartCount(updatedCart.cart.metadata),
		});
		revalidateTag(`cart-${updatedCart.cart.id}`);
	}
}

export async function commerceGPTRevalidateAction() {
	const cart = await getCartCookieJson();
	if (cart) {
		revalidateTag(`cart-${cart.id}`);
	}
}
