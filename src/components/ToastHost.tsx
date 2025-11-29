'use client';

import { useEffect, useState } from 'react';

type ToastType = 'info' | 'success' | 'error';

interface ToastItem {
	id: number;
	message: string;
	type: ToastType;
}

export default function ToastHost() {
	const [toasts, setToasts] = useState<ToastItem[]>([]);

	useEffect(() => {
		let nextId = 1;
		const handler = (e: Event) => {
			const custom = e as CustomEvent<{ message: string; type?: ToastType; durationMs?: number }>;
			const id = nextId++;
			const duration = custom.detail?.durationMs ?? 2500;
			const type: ToastType = custom.detail?.type ?? 'info';
			const message = custom.detail?.message ?? '';
			if (!message) return;

			setToasts((prev) => [...prev, { id, message, type }]);
			window.setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, duration);
		};

		window.addEventListener('app:toast', handler as EventListener);
		return () => window.removeEventListener('app:toast', handler as EventListener);
	}, []);

	if (toasts.length === 0) return null;

	return (
		<div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
			{toasts.map((t) => (
				<div
					key={t.id}
					className={
						`px-6 py-4 rounded-none shadow-2xl text-white text-lg font-semibold ` +
						(t.type === 'error'
							? 'bg-red-600/95 ring-2 ring-red-300/50'
							: t.type === 'success'
							? 'bg-green-600/95 ring-2 ring-green-300/50'
							: 'bg-black/90 ring-2 ring-white/20')
					}
				>
					{t.message}
				</div>
			))}
		</div>
	);
}


