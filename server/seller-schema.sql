CREATE TABLE IF NOT EXISTS listing_drafts (
 id text PRIMARY KEY,
 seller_id text NOT NULL REFERENCES users(id),
 data jsonb NOT NULL DEFAULT '{}',
 step text NOT NULL DEFAULT 'photos' CHECK(step IN ('photos','details')),
 version integer NOT NULL DEFAULT 1,
 last_request_id text,
 last_request_hash text,
 source_listing_id text REFERENCES listings(id),
 published_listing_id text REFERENCES listings(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listing_drafts_owner ON listing_drafts(seller_id,updated_at DESC);
