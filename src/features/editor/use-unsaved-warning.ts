import { useBlocker } from "@tanstack/react-router";

export function useUnsavedWarning(isDirty: boolean) {
	useBlocker({
		disabled: !isDirty,
		enableBeforeUnload: isDirty,
		shouldBlockFn: () =>
			isDirty &&
			!window.confirm("You have unsaved changes. Leave without saving?"),
	});
}
