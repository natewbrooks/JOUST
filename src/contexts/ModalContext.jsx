// context/ModalContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext();

export function useModal() {
	return useContext(ModalContext);
}

export function ModalProvider({ children }) {
	const [modals, setModals] = useState([]);

	const openModal = useCallback((modalComponent) => {
		const id = crypto.randomUUID();
		setModals((prev) => [...prev, { id, component: modalComponent }]);
		return id;
	}, []);

	const closeModal = useCallback((id) => {
		setModals((prev) => prev.filter((modal) => modal.id !== id));
	}, []);

	return (
		<ModalContext.Provider value={{ openModal, closeModal }}>
			{children}

			{/* Render all active modals */}
			{modals.map(({ id, component }) => (
				<div
					key={id}
					className='fixed w-full h-full inset-0 z-[999] bg-black/10 flex items-center justify-center'>
					{component}
				</div>
			))}
		</ModalContext.Provider>
	);
}
