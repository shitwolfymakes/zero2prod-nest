CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"subscribed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "subscriptions_email_unique" UNIQUE("email")
);
