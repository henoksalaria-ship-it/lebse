export const interests = ['menswear', 'womenswear', 'both'];
export function validateInterest(value, fail) {
  if (!interests.includes(value)) fail('Choose Menswear, Womenswear, or Menswear & Womenswear.', 400, 'interest_required');
  return value;
}
export async function getPreferences(db, userId) {
  if (!userId) return null;
  return (await db.query('SELECT shopping_interest FROM shopping_preferences WHERE user_id=$1', [userId])).rows[0] || null;
}
export async function savePreferences(db, userId, value, fail) {
  const interest = validateInterest(value, fail);
  await db.query('INSERT INTO shopping_preferences(user_id,shopping_interest) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET shopping_interest=$2,updated_at=now()', [userId, interest]);
  return {shopping_interest: interest};
}
