import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type * as React from "react";

import { buttonVariants } from "#/components/ui/button";
import { cn } from "#/lib/utils";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

function AlertDialogContent({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
	return (
		<AlertDialogPrimitive.Portal>
			<AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
			<AlertDialogPrimitive.Content
				className={cn(
					"fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg",
					className,
				)}
				{...props}
			/>
		</AlertDialogPrimitive.Portal>
	);
}

function AlertDialogHeader(props: React.ComponentProps<"div">) {
	return (
		<div className="flex flex-col gap-2 text-center sm:text-left" {...props} />
	);
}

function AlertDialogFooter(props: React.ComponentProps<"div">) {
	return (
		<div
			className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
			{...props}
		/>
	);
}

function AlertDialogTitle(
	props: React.ComponentProps<typeof AlertDialogPrimitive.Title>,
) {
	return (
		<AlertDialogPrimitive.Title className="text-lg font-semibold" {...props} />
	);
}

function AlertDialogDescription(
	props: React.ComponentProps<typeof AlertDialogPrimitive.Description>,
) {
	return (
		<AlertDialogPrimitive.Description
			className="text-sm text-muted-foreground"
			{...props}
		/>
	);
}

function AlertDialogAction({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
	return (
		<AlertDialogPrimitive.Action
			className={cn(buttonVariants({ variant: "destructive" }), className)}
			{...props}
		/>
	);
}

function AlertDialogCancel({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
	return (
		<AlertDialogPrimitive.Cancel
			className={cn(buttonVariants({ variant: "outline" }), className)}
			{...props}
		/>
	);
}

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
};
