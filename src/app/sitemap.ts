import { publicUrl } from "@/env.mjs";
import StoreConfig from "@/store.config";
import * as Commerce from "commerce-kit";
import type { MetadataRoute } from "next";

type Item = MetadataRoute.Sitemap[number];
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	try {
		const products = await Commerce.productBrowse({ first: 100 });

		const productUrls = products
			.filter((product) => product.metadata?.slug)
			.map(
				(product) =>
					({
						url: `${publicUrl}/product/${product.metadata.slug}`,
						lastModified: new Date(product.updated * 1000),
						changeFrequency: "daily",
						priority: 0.8,
					}) satisfies Item,
			);

		const categoryUrls = StoreConfig.categories
			.filter((category) => category.slug)
			.map(
				(category) =>
					({
						url: `${publicUrl}/category/${category.slug}`,
						lastModified: new Date(),
						changeFrequency: "daily",
						priority: 0.5,
					}) satisfies Item,
			);

		return [
			{
				url: publicUrl,
				lastModified: new Date(),
				changeFrequency: "always",
				priority: 1,
			},
			...productUrls,
			...categoryUrls,
		];
	} catch (error) {
		console.error("Error generating sitemap:", error);
		// Return minimal sitemap on error
		return [
			{
				url: publicUrl,
				lastModified: new Date(),
				changeFrequency: "always",
				priority: 1,
			},
		];
	}
}
