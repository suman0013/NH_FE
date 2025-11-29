CREATE TABLE "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"country" text,
	"state" text,
	"district" text,
	"sub_district" text,
	"village" text,
	"postal_code" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devotee_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"devotee_id" integer NOT NULL,
	"address_id" integer NOT NULL,
	"address_type" text NOT NULL,
	"landmark" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devotees" (
	"id" serial PRIMARY KEY NOT NULL,
	"legal_name" text NOT NULL,
	"name" text,
	"dob" text,
	"email" text,
	"phone" text,
	"father_name" text,
	"mother_name" text,
	"husband_name" text,
	"gender" text,
	"blood_group" text,
	"marital_status" text,
	"devotional_status_id" integer,
	"namahatta_id" integer,
	"gurudev_harinam" integer,
	"gurudev_pancharatrik" integer,
	"harinam_initiation_gurudev" text,
	"pancharatrik_initiation_gurudev" text,
	"initiated_name" text,
	"harinam_date" text,
	"pancharatrik_date" text,
	"education" text,
	"occupation" text,
	"devotional_courses" jsonb,
	"additional_comments" text,
	"shraddhakutir_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devotional_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "devotional_statuses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "leaders" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"reporting_to" integer,
	"location" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "namahatta_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"namahatta_id" integer NOT NULL,
	"address_id" integer NOT NULL,
	"landmark" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "namahatta_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"namahatta_id" integer NOT NULL,
	"program_type" text NOT NULL,
	"date" text NOT NULL,
	"attendance" integer NOT NULL,
	"prasad_distribution" integer,
	"nagar_kirtan" integer DEFAULT 0,
	"book_distribution" integer DEFAULT 0,
	"chanting" integer DEFAULT 0,
	"arati" integer DEFAULT 0,
	"bhagwat_path" integer DEFAULT 0,
	"image_urls" jsonb,
	"facebook_link" text,
	"youtube_link" text,
	"special_attraction" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "namahattas" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"meeting_day" text,
	"meeting_time" text,
	"mala_senapoti" text,
	"maha_chakra_senapoti" text,
	"chakra_senapoti" text,
	"upa_chakra_senapoti" text,
	"secretary" text,
	"status" text DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "namahattas_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "shraddhakutirs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"district_code" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"devotee_id" integer NOT NULL,
	"previous_status" text,
	"new_status" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"comment" text
);
