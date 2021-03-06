/*
 * Adds a new review
 */

INSERT INTO reviews(
  title,
  subtitle,
  slug,
  is_published,
  published_at,
  author,
  summary,
  body,
  main_image,
  side_image,
  home_image,
  list_image,
  distillery,
  region,
  drink_type,
  rarity,
  proof_min,
  proof_max,
  age_min,
  age_max,
  manufacturer_price,
  realistic_price,
  mashbill_description,
  mashbill_recipe,
  rating
) VALUES (
  $(title),
  $(subtitle),
  $(slug),
  $(is_published),
  $(published_at),
  $(author),
  $(summary),
  $(body),
  $(main_image),
  $(side_image),
  $(home_image),
  $(list_image),
  $(distillery),
  $(region),
  $(drink_type),
  $(rarity),
  $(proof_min),
  $(proof_max),
  $(age_min),
  $(age_max),
  $(manufacturer_price),
  $(realistic_price),
  $(mashbill_description),
  $(mashbill_recipe),
  $(rating)
) RETURNING
  id,
  title,
  subtitle,
  slug,
  created_at,
  is_published,
  published_at,
  author,
  summary,
  body,
  main_image,
  side_image,
  home_image,
  list_image,
  distillery,
  region,
  drink_type,
  rarity,
  proof_min,
  proof_max,
  age_min,
  age_max,
  manufacturer_price,
  realistic_price,
  mashbill_description,
  mashbill_recipe,
  rating;
