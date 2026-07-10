import { useForm } from "@tanstack/react-form";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";

import { normalizeRedirectTarget, submitCredentials } from "./auth-flow";

const loginSchema = z.object({
	email: z.string().email("Enter a valid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupSchema = loginSchema.extend({
	name: z.string().trim().min(1, "Name is required"),
});

type AuthPageProps = {
	mode: "login" | "signup";
	redirect?: string;
};

export function AuthPage({ mode, redirect }: AuthPageProps) {
	const isSignup = mode === "signup";
	const navigate = useNavigate();
	const router = useRouter();
	const [serverError, setServerError] = useState<string | null>(null);
	const form = useForm({
		defaultValues: {
			email: "",
			name: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			setServerError(null);
			const parsed = (isSignup ? signupSchema : loginSchema).safeParse(value);
			if (!parsed.success) {
				setServerError(parsed.error.issues[0]?.message ?? "Check your details");
				return;
			}

			const result = isSignup
				? await submitCredentials(
						(credentials) =>
							authClient.signUp.email({
								email: credentials.email,
								name: credentials.name ?? "",
								password: credentials.password,
							}),
						value,
					)
				: await submitCredentials(
						(credentials) => authClient.signIn.email(credentials),
						value,
					);

			if (!result.ok) {
				setServerError(result.message);
				return;
			}

			await router.invalidate();
			await navigate({ to: normalizeRedirectTarget(redirect) });
		},
	});

	return (
		<main className="flex min-h-screen items-center justify-center px-4 py-12">
			<Card className="w-full max-w-md border-[var(--line)] bg-[var(--surface-strong)] shadow-xl">
				<CardHeader>
					<p className="island-kicker">Sheet Generator</p>
					<CardTitle className="text-2xl">
						{isSignup ? "Create your account" : "Welcome back"}
					</CardTitle>
					<CardDescription>
						{isSignup
							? "Save, edit, and print your coursework sheets from any device."
							: "Sign in to continue working on your saved documents."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						className="grid gap-4"
						onSubmit={(event) => {
							event.preventDefault();
							event.stopPropagation();
							void form.handleSubmit();
						}}
					>
						{isSignup && (
							<form.Field name="name">
								{(field) => (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>Name</Label>
										<Input
											id={field.name}
											autoComplete="name"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
										/>
									</div>
								)}
							</form.Field>
						)}
						<form.Field name="email">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Email</Label>
									<Input
										id={field.name}
										type="email"
										autoComplete="email"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="password">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Password</Label>
									<Input
										id={field.name}
										type="password"
										autoComplete={
											isSignup ? "new-password" : "current-password"
										}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
								</div>
							)}
						</form.Field>
						{serverError && (
							<p className="text-sm text-destructive" role="alert">
								{serverError}
							</p>
						)}
						<form.Subscribe selector={(state) => state.isSubmitting}>
							{(isSubmitting) => (
								<Button
									className="w-full"
									disabled={isSubmitting}
									type="submit"
								>
									{isSubmitting
										? "Please wait…"
										: isSignup
											? "Create account"
											: "Sign in"}
								</Button>
							)}
						</form.Subscribe>
					</form>
				</CardContent>
				<CardFooter className="justify-center text-sm text-muted-foreground">
					{isSignup ? "Already have an account?" : "New to Sheet Generator?"}
					<Button asChild className="ml-1 px-1" variant="link">
						<Link
							to={isSignup ? "/login" : "/signup"}
							search={redirect ? { redirect } : {}}
						>
							{isSignup ? "Sign in" : "Create one"}
						</Link>
					</Button>
				</CardFooter>
			</Card>
		</main>
	);
}
