import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "#/components/ui/button";

export function SignInAction({
	children,
	redirect,
	variant = "default",
}: {
	children: ReactNode;
	redirect: string;
	variant?: ComponentProps<typeof Button>["variant"];
}) {
	return (
		<Button asChild variant={variant}>
			<Link to="/login" search={{ redirect }}>
				{children}
			</Link>
		</Button>
	);
}
