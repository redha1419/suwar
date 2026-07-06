CREATE TYPE "public"."photo_status" AS ENUM('inbox', 'kept', 'trashed');--> statement-breakpoint
CREATE TYPE "public"."share_scope" AS ENUM('photo', 'album', 'all');--> statement-breakpoint
CREATE TABLE "album_photos" (
	"album_id" uuid NOT NULL,
	"photo_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"position" integer DEFAULT 0,
	CONSTRAINT "album_photos_album_id_photo_id_pk" PRIMARY KEY("album_id","photo_id")
);
--> statement-breakpoint
CREATE TABLE "albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"cover_photo_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sort_order" integer DEFAULT 0,
	CONSTRAINT "albums_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "owners_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"original_key" text NOT NULL,
	"original_format" text NOT NULL,
	"original_bytes" integer NOT NULL,
	"preview_key" text,
	"medium_key" text,
	"thumb_key" text,
	"blurhash" text,
	"width" integer,
	"height" integer,
	"orientation" integer,
	"original_filename" text NOT NULL,
	"base_filename" text NOT NULL,
	"taken_at" timestamp,
	"camera_make" text,
	"camera_model" text,
	"lens" text,
	"aperture" double precision,
	"shutter_speed" text,
	"iso" integer,
	"focal_length" double precision,
	"gps_lat" double precision,
	"gps_lon" double precision,
	"color_profile" text,
	"raw_exif" jsonb,
	"manual_taken_at" timestamp,
	"manual_camera" text,
	"manual_location" text,
	"manual_notes" text,
	"processing_error" text,
	"status" "photo_status" DEFAULT 'inbox' NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"trashed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "raw_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"photo_id" uuid,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"base_filename" text NOT NULL,
	"extension" text NOT NULL,
	"bytes" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"trashed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"token" text NOT NULL,
	"scope" "share_scope" NOT NULL,
	"target_id" uuid,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"last_accessed_at" timestamp,
	"view_count" integer DEFAULT 0,
	CONSTRAINT "share_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "album_photos" ADD CONSTRAINT "album_photos_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_photos" ADD CONSTRAINT "album_photos_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_cover_photo_id_photos_id_fk" FOREIGN KEY ("cover_photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_files" ADD CONSTRAINT "raw_files_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_files" ADD CONSTRAINT "raw_files_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photos_base_filename_idx" ON "photos" USING btree ("base_filename");--> statement-breakpoint
CREATE INDEX "photos_status_idx" ON "photos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "photos_taken_at_idx" ON "photos" USING btree ("taken_at");--> statement-breakpoint
CREATE INDEX "photos_owner_idx" ON "photos" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "raw_files_base_filename_idx" ON "raw_files" USING btree ("base_filename");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_files_photo_id_uq" ON "raw_files" USING btree ("photo_id") WHERE "raw_files"."photo_id" is not null;