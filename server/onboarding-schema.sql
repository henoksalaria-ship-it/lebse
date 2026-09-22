CREATE TABLE IF NOT EXISTS shopping_preferences (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  shopping_interest text NOT NULL CHECK (shopping_interest IN ('menswear','womenswear','both')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

