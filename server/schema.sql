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
