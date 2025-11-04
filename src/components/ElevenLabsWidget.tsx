"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ElevenLabsConvaiEvent extends CustomEvent {
	detail: {
		config: {
			clientTools: {
				get_current_page: () => string;
				go_to_checkout: () => void;
				add_to_cart: ({ number }: { number?: number }) => Promise<void>;
				go_to_route: ({ path }: { path: string }) => void;
			};
		};
	};
}

interface ConversationHistory {
	hasConversation: boolean;
	timestamp: number;
}

const CONVERSATION_KEY = "elevenlabs_conversation_history";
const EXAMPLE_CONVERSATION = `Agent: "Hi Mati! El here, how can I help you with today?" Mati: "I'm looking for some merch for attendees joining our Summit on 11.11, what options do you have?" Agent: "Limited‑edition caps and totes are great, one‑size fits all and super useful." Mati: "That's great, can I order 600 to be delivered today?" Agent: "I don't have live stock and courier windows, so I can't confirm a same‑day delivery of 600. Want me to connect you to our support team?"`;

export function ElevenLabsWidget() {
	const router = useRouter();
	const pathname = usePathname();
	const [conversationHistory, setConversationHistory] = useState<ConversationHistory | null>(null);

	useEffect(() => {
		const storedHistory = sessionStorage.getItem(CONVERSATION_KEY);
		if (storedHistory) {
			try {
				setConversationHistory(JSON.parse(storedHistory) as ConversationHistory);
			} catch (e) {
				console.error("Failed to parse conversation history:", e);
			}
		}
	}, []);

	useEffect(() => {
		if (pathname === "/product/tote-bag" && !conversationHistory?.hasConversation) {
			const widget = document.querySelector("elevenlabs-convai");
			if (widget) {
				const startButton = widget.querySelector('button[title="Start a call"]') as HTMLButtonElement;
				if (startButton) {
					setTimeout(() => {
						startButton.click();
					}, 500);
				}
			}
		}
	}, [pathname, conversationHistory]);

	useEffect(() => {
		const script = document.createElement("script");
		script.src = "https://elevenlabs.io/convai-widget/index.js";
		script.async = true;
		script.type = "text/javascript";
		document.head.appendChild(script);

		const wrapper = document.createElement("div");
		wrapper.className = "desktop";

		const widget = document.createElement("elevenlabs-convai");
		widget.setAttribute("agent-id", "agent_4201k958dh00ftfvmezvfjkcqzmx");
		widget.setAttribute("variant", "full");

		if (conversationHistory?.hasConversation) {
			const dynamicVariables = {
				previous_conversation_context: EXAMPLE_CONVERSATION,
			};
			widget.setAttribute("dynamic-variables", JSON.stringify(dynamicVariables));
		}

		const updateWidgetColors = (widget: HTMLElement) => {
			const isDarkMode = !document.documentElement.classList.contains("light");
			if (isDarkMode) {
				widget.setAttribute("avatar-orb-color-1", "#2E2E2E");
				widget.setAttribute("avatar-orb-color-2", "#B8B8B8");
			} else {
				widget.setAttribute("avatar-orb-color-1", "#4D9CFF");
				widget.setAttribute("avatar-orb-color-2", "#9CE6E6");
			}
		};

		const updateWidgetVariant = (widget: HTMLElement) => {
			const isMobile = window.innerWidth <= 640;
			widget.setAttribute("variant", isMobile ? "expandable" : "full");
		};

		updateWidgetColors(widget);
		updateWidgetVariant(widget);

		const observer = new MutationObserver(() => {
			updateWidgetColors(widget);
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		window.addEventListener("resize", () => {
			updateWidgetVariant(widget);
		});

		widget.innerHTML = `\
    <form slot="terms" class="prose text-sm">
      <h3>Terms and conditions</h3>
      <p>
        By clicking "Continue," and each time I interact with this AI agent, I 
        consent to ElevenLabs collecting and using my voice and data derived from 
        it to interpret my speech, and provide the support services I request, and 
        to the recording, storage, and sharing of my communications with 
        third-party service providers, and as described in the 
        <a href="/terms-of-use">Privacy Policy</a>. If you do not wish to have 
        your conversations recorded, please refrain from using this service.
      </p>
    </form>`;

		widget.addEventListener("elevenlabs-convai:call", (event: Event) => {
			const customEvent = event as ElevenLabsConvaiEvent;
			customEvent.detail.config.clientTools = {
				get_current_page: () => {
					return window.location.pathname;
				},
				go_to_checkout: () => {
					router.push("/cart");
				},
				add_to_cart: async ({ number = 1 }) => {
					const addToCartButton = document.getElementById("button-add-to-cart");
					if (addToCartButton instanceof HTMLButtonElement) {
						const clicks = Array(number).fill(null);
						await Promise.all(
							clicks.map(() => {
								addToCartButton.click();
								return new Promise((resolve) => setTimeout(resolve, 150));
							}),
						);
					}
				},
				go_to_route: ({ path }: { path: string }) => {
					router.push(path);
				},
			};
		});

		widget.addEventListener("elevenlabs-convai:conversation-started", () => {
			const history: ConversationHistory = {
				hasConversation: true,
				timestamp: Date.now(),
			};
			sessionStorage.setItem(CONVERSATION_KEY, JSON.stringify(history));
			setConversationHistory(history);
		});

		wrapper.appendChild(widget);
		document.body.appendChild(wrapper);

		return () => {
			wrapper.remove();
			observer.disconnect();
		};
	}, [router, conversationHistory]);

	return null;
}
