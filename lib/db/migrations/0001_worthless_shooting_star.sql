ALTER TABLE "album_photos" DROP CONSTRAINT "album_photos_album_id_photo_id_pk";--> statement-breakpoint
ALTER TABLE "album_photos" ADD PRIMARY KEY ("photo_id");--> statement-breakpoint
CREATE INDEX "album_photos_album_id_idx" ON "album_photos" USING btree ("album_id");