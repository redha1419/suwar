import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const owners = pgTable("owners", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const photoStatusEnum = pgEnum("photo_status", [
  "inbox",
  "kept",
  "trashed",
]);

export const photos = pgTable(
  "photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => owners.id),

    originalKey: text("original_key").notNull(),
    originalFormat: text("original_format").notNull(),
    originalBytes: integer("original_bytes").notNull(),
    previewKey: text("preview_key"),
    mediumKey: text("medium_key"),
    thumbKey: text("thumb_key"),
    blurhash: text("blurhash"),

    width: integer("width"),
    height: integer("height"),
    orientation: integer("orientation"),

    originalFilename: text("original_filename").notNull(),
    baseFilename: text("base_filename").notNull(),

    takenAt: timestamp("taken_at"),
    cameraMake: text("camera_make"),
    cameraModel: text("camera_model"),
    lens: text("lens"),
    aperture: doublePrecision("aperture"),
    shutterSpeed: text("shutter_speed"),
    iso: integer("iso"),
    focalLength: doublePrecision("focal_length"),
    gpsLat: doublePrecision("gps_lat"),
    gpsLon: doublePrecision("gps_lon"),
    colorProfile: text("color_profile"),
    rawExif: jsonb("raw_exif"),

    manualTakenAt: timestamp("manual_taken_at"),
    manualCamera: text("manual_camera"),
    manualLocation: text("manual_location"),
    manualNotes: text("manual_notes"),

    processingError: text("processing_error"),

    status: photoStatusEnum("status").notNull().default("inbox"),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
    trashedAt: timestamp("trashed_at"),
  },
  (t) => [
    index("photos_base_filename_idx").on(t.baseFilename),
    index("photos_status_idx").on(t.status),
    index("photos_taken_at_idx").on(t.takenAt),
    index("photos_owner_idx").on(t.ownerId),
  ]
);

export const rawFiles = pgTable(
  "raw_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => owners.id),
    photoId: uuid("photo_id").references(() => photos.id, {
      onDelete: "set null",
    }),
    storageKey: text("storage_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    baseFilename: text("base_filename").notNull(),
    extension: text("extension").notNull(),
    bytes: integer("bytes").notNull(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
    trashedAt: timestamp("trashed_at"),
  },
  (t) => [
    index("raw_files_base_filename_idx").on(t.baseFilename),
    uniqueIndex("raw_files_photo_id_uq")
      .on(t.photoId)
      .where(sql`${t.photoId} is not null`),
  ]
);

export const albums = pgTable("albums", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => owners.id),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  coverPhotoId: uuid("cover_photo_id").references(() => photos.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sortOrder: integer("sort_order").default(0),
});

// A photo belongs to at most one album — photoId as the primary key (rather
// than a composite albumId+photoId key) enforces that at the DB level.
export const albumPhotos = pgTable(
  "album_photos",
  {
    photoId: uuid("photo_id")
      .primaryKey()
      .references(() => photos.id, { onDelete: "cascade" }),
    albumId: uuid("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").defaultNow().notNull(),
    position: integer("position").default(0),
  },
  (t) => [index("album_photos_album_id_idx").on(t.albumId)]
);

export const shareScopeEnum = pgEnum("share_scope", ["photo", "album", "all"]);

export const shareLinks = pgTable("share_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => owners.id),
  token: text("token").notNull().unique(),
  scope: shareScopeEnum("scope").notNull(),
  targetId: uuid("target_id"),
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  lastAccessedAt: timestamp("last_accessed_at"),
  viewCount: integer("view_count").default(0),
});
