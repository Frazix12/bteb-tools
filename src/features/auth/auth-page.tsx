import { Chrome } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { startGoogleSignIn } from "./auth-flow";

type AuthPageProps = { redirect?: string };

export function AuthPage({ redirect }: AuthPageProps) {
	const [error, setError] = useState(false);
	const [pending, setPending] = useState(false);

	async function handleGoogleSignIn() {
		setError(false);
		setPending(true);
		try {
			const result = await startGoogleSignIn(redirect);
			if (result.error) setError(true);
		} catch {
			setError(true);
		} finally {
			setPending(false);
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center px-4 py-12">
			<Card className="w-full max-w-md border-[var(--line)] bg-[var(--surface-strong)] shadow-xl">
				<CardHeader>
					<p className="island-kicker">Sheet Generator</p>
					<CardTitle className="text-2xl">Welcome</CardTitle>
					<CardDescription>
						Sign in to continue working on your saved documents.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4">
					{error && (
						<p className="text-sm text-destructive" role="alert">
							Sign-in failed. Please try again.
						</p>
					)}
					<Button
						className="w-full"
						disabled={pending}
						onClick={() => void handleGoogleSignIn()}
						type="button"
					>
						<Chrome aria-hidden="true" />
						{pending ? "Connecting…" : "Continue with Google"}
					</Button>
				</CardContent>
			</Card>
		</main>
	);
}
