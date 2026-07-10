import { useEffect } from "react";

export function useUnsavedWarning(isDirty: boolean) {
	useEffect(() => {
		if (!isDirty) return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [isDirty]);
}
