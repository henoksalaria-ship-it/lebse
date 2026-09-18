CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  bio text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT 'Addis Ababa',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS listings (
  id text PRIMARY KEY,
  seller_id text NOT NULL REFERENCES users(id),
  name text NOT NULL,
  price_minor integer NOT NULL CHECK (price_minor BETWEEN 5000 AND 5000000),
  brand text NOT NULL DEFAULT '',
  size text NOT NULL,
  category text NOT NULL,
  condition text NOT NULL,
  color text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  flaws text NOT NULL DEFAULT '',
  allow_offers boolean NOT NULL DEFAULT true,
  location text NOT NULL DEFAULT 'Addis Ababa',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived','reserved','sold')),
  images jsonb NOT NULL DEFAULT '[]',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES users(id),
  mime text NOT NULL CHECK (mime IN ('image/png','image/jpeg','image/webp')),
  data_base64 text NOT NULL,
  bytes integer NOT NULL CHECK (bytes BETWEEN 1 AND 6291456),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS saved_items (
  user_id text NOT NULL REFERENCES users(id),
  listing_id text NOT NULL REFERENCES listings(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);
CREATE TABLE IF NOT EXISTS follows (
  user_id text NOT NULL REFERENCES users(id),
  seller_id text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, seller_id),
  CHECK (user_id <> seller_id)
);
CREATE TABLE IF NOT EXISTS conversations (
  id text PRIMARY KEY,
  listing_id text NOT NULL REFERENCES listings(id),
  buyer_id text NOT NULL REFERENCES users(id),
  seller_id text NOT NULL REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, buyer_id),
  CHECK (buyer_id <> seller_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id),
  sender_id text REFERENCES users(id),
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','system','offer')),
  body text NOT NULL,
  client_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, sender_id, client_message_id)
);
CREATE TABLE IF NOT EXISTS offers (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id),
  listing_id text NOT NULL REFERENCES listings(id),
  buyer_id text NOT NULL REFERENCES users(id),
  seller_id text NOT NULL REFERENCES users(id),
  proposer_id text NOT NULL REFERENCES users(id),
  previous_offer_id text REFERENCES offers(id),
  root_offer_id text NOT NULL,
  proposal_number integer NOT NULL CHECK (proposal_number BETWEEN 1 AND 6),
  amount_minor integer NOT NULL CHECK (amount_minor BETWEEN 5000 AND 5000000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','withdrawn','superseded','expired')),
  reason text,
  version integer NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (buyer_id <> seller_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_offer_per_conversation ON offers(conversation_id) WHERE status = 'pending';
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  listing_id text NOT NULL REFERENCES listings(id),
  buyer_id text NOT NULL REFERENCES users(id),
  seller_id text NOT NULL REFERENCES users(id),
  offer_id text REFERENCES offers(id),
  item jsonb NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  delivery_minor integer NOT NULL DEFAULT 15000 CHECK (delivery_minor >= 0),
  total_minor integer NOT NULL CHECK (total_minor > 0),
  state text NOT NULL DEFAULT 'awaiting_payment' CHECK (state IN ('awaiting_payment','paid','preparing','ready','in_transit','delivered','completed','cancelled')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','pending','failed','paid','refunded_test')),
  payout_status text NOT NULL DEFAULT 'not_due',
  reserved_until timestamptz NOT NULL,
  address jsonb,
  events jsonb NOT NULL DEFAULT '[]',
  version integer NOT NULL DEFAULT 1,
  paid_at timestamptz,
  delivered_at timestamptz,
  eligible_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (buyer_id <> seller_id),
  CHECK (total_minor = amount_minor + delivery_minor)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_sale_per_listing ON orders(listing_id) WHERE state <> 'cancelled';
CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id),
  buyer_id text NOT NULL REFERENCES users(id),
  idempotency_key text NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  state text NOT NULL CHECK (state IN ('pending','succeeded','failed')),
  mode text NOT NULL DEFAULT 'test' CHECK (mode = 'test'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, idempotency_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_allocated_payment_per_order ON payments(order_id) WHERE state = 'succeeded';
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_payment_per_order ON payments(order_id) WHERE state = 'pending';
CREATE TABLE IF NOT EXISTS reviews (
  id text PRIMARY KEY,
  order_id text NOT NULL UNIQUE REFERENCES orders(id),
  buyer_id text NOT NULL REFERENCES users(id),
  seller_id text NOT NULL REFERENCES users(id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL,
  target_id text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listings_seller ON listings(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conversations_participants ON conversations(buyer_id, seller_id);
CREATE INDEX IF NOT EXISTS orders_participants ON orders(buyer_id, seller_id);
CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS notifications_recipient ON notifications(user_id, created_at DESC);


CREATE TABLE IF NOT EXISTS legal_versions(version text PRIMARY KEY, content jsonb NOT NULL, content_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS legal_acceptances(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),version text NOT NULL REFERENCES legal_versions(version),content_hash text NOT NULL,age_confirmed boolean NOT NULL CHECK(age_confirmed),accepted_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,version));
CREATE TABLE IF NOT EXISTS consent_receipts(id text PRIMARY KEY,version text NOT NULL,external_media boolean NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS consent_history(id text PRIMARY KEY,receipt_id text NOT NULL REFERENCES consent_receipts(id),version text NOT NULL,external_media boolean NOT NULL,source text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS security_limits(bucket text PRIMARY KEY,count integer NOT NULL,expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS security_audit(id text PRIMARY KEY,actor_id text,action text NOT NULL,subject_id text,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS safety_cases(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),subject_type text NOT NULL,subject_id text NOT NULL,rule text NOT NULL,hold boolean NOT NULL DEFAULT false,status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','approved','rejected')),details jsonb NOT NULL DEFAULT '{}',resolution text,created_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz,UNIQUE(user_id,subject_type,subject_id,rule));
CREATE TABLE IF NOT EXISTS safety_requests(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),kind text NOT NULL,subject_id text NOT NULL DEFAULT '',description text NOT NULL,status text NOT NULL DEFAULT 'received',created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE safety_requests ADD COLUMN IF NOT EXISTS response text;
ALTER TABLE safety_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS safety_cases_subject ON safety_cases(subject_type,subject_id,status);
CREATE INDEX IF NOT EXISTS safety_requests_user ON safety_requests(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS security_audit_date ON security_audit(created_at);


ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_required boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_quote_id text;
CREATE TABLE IF NOT EXISTS pickup_profiles(user_id text PRIMARY KEY REFERENCES users(id),address jsonb NOT NULL,parcel jsonb NOT NULL,version integer NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS delivery_quotes(id text PRIMARY KEY,order_id text NOT NULL REFERENCES orders(id),buyer_id text NOT NULL REFERENCES users(id),provider text NOT NULL,amount_minor integer NOT NULL CHECK(amount_minor>=0),pickup jsonb NOT NULL,destination jsonb NOT NULL,parcel jsonb NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS deliveries(id text PRIMARY KEY,order_id text NOT NULL UNIQUE REFERENCES orders(id),provider text NOT NULL DEFAULT 'mock',reference text NOT NULL UNIQUE,provider_id text UNIQUE,status text NOT NULL DEFAULT 'queued',attempts integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now(),last_error text,proof jsonb,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS mock_courier_bookings(reference text PRIMARY KEY,provider_id text NOT NULL UNIQUE,state text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS delivery_events(id text PRIMARY KEY,delivery_id text NOT NULL REFERENCES deliveries(id),body_hash text NOT NULL,state text NOT NULL,applied boolean NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS deliveries_queue ON deliveries(status,next_attempt_at);


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


ALTER TABLE users ADD COLUMN IF NOT EXISTS closet_description text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_version integer NOT NULL DEFAULT 1;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sequence bigserial;
CREATE UNIQUE INDEX IF NOT EXISTS messages_sequence ON messages(sequence);
CREATE TABLE IF NOT EXISTS conversation_reads(conversation_id text REFERENCES conversations(id),user_id text REFERENCES users(id),through_sequence bigint NOT NULL DEFAULT 0,read_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(conversation_id,user_id));
CREATE TABLE IF NOT EXISTS recently_viewed(user_id text REFERENCES users(id),listing_id text REFERENCES listings(id),viewed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,listing_id));
CREATE TABLE IF NOT EXISTS saved_searches(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),name text NOT NULL,filters jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS collections(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,name),UNIQUE(id,user_id));
CREATE TABLE IF NOT EXISTS collection_items(collection_id text,user_id text,listing_id text,PRIMARY KEY(collection_id,listing_id),FOREIGN KEY(collection_id,user_id) REFERENCES collections(id,user_id) ON DELETE CASCADE,FOREIGN KEY(user_id,listing_id) REFERENCES saved_items(user_id,listing_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS addresses(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),label text NOT NULL,address jsonb NOT NULL,is_default boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS one_default_address ON addresses(user_id) WHERE is_default;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_confirmation_required boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS order_pickup_confirmations(order_id text PRIMARY KEY REFERENCES orders(id),seller_id text NOT NULL REFERENCES users(id),quote_id text NOT NULL REFERENCES delivery_quotes(id),notes text NOT NULL DEFAULT '',confirmed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS order_issues(id text PRIMARY KEY,order_id text NOT NULL REFERENCES orders(id),buyer_id text NOT NULL REFERENCES users(id),seller_id text NOT NULL REFERENCES users(id),kind text NOT NULL CHECK(kind IN ('missing','damaged','incorrect','cancellation')),description text NOT NULL,status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','under_review','awaiting_evidence','return_approved','return_in_transit','returned','resolved','rejected')),resolution text,return_instructions text,return_tracking text,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(order_id));
CREATE TABLE IF NOT EXISTS issue_events(id text PRIMARY KEY,issue_id text NOT NULL REFERENCES order_issues(id),actor_id text,actor_role text NOT NULL,label text NOT NULL,detail text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS issue_evidence(id text PRIMARY KEY,issue_id text NOT NULL REFERENCES order_issues(id),uploader_id text NOT NULL REFERENCES users(id),mime text NOT NULL,data_base64 text NOT NULL,bytes integer NOT NULL CHECK(bytes BETWEEN 1 AND 6291456),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS issue_participants ON order_issues(buyer_id,seller_id);

