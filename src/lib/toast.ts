export type ToastKind = 'info' | 'success' | 'error' | 'warning';

export function showToast(message: string, type: ToastKind = 'info', durationMs = 2500) {
	if (typeof window === 'undefined') return;
	const event = new CustomEvent('app:toast', {
		detail: { message, type, durationMs },
	});
	window.dispatchEvent(event);
}


