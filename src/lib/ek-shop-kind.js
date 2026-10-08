/* ══════════════════════════════════════════════════════════════════════════
   DO'KON YOKI RESTORAN (2026-10-08)

   Egasi: «do'kon va restoran xizmatlari aralashib ketmasin — hatto admin
   tarafda ham». Restoran endi YAKKA yo'nalish: u do'kon yo'nalishlari
   bilan birga tanlanmaydi, uning modullari (stol, oshxona, qo'shimcha,
   retsept) va rollari (ofitsiant, oshpaz) do'konga berilmaydi.

   ⚠ Server ham xuddi shu qoidani tekshiradi (`ServiceDirection
   .mixesRestaurant`, `ShopFeatureService.effective`, `UserAdminService
   .assertRoleFitsShop`). Bu fayl — panel nimani KO'RSATISHI uchun.

   ⚠ ARALASH — 2026-10-08 gacha yaratilgan «restoran + do'kon». Server uni
   restoran deb hisoblaydi (ochiq stollar yo'qolmasin), panel esa
   «aralash — tanlang» deb belgilaydi.
   ══════════════════════════════════════════════════════════════════════════ */

export const RESTAURANT = "RESTAURANT";

/** Faqat restoranda bo'ladigan modullar — backenddagi `ShopFeature.isOptIn`. */
export const RESTAURANT_FEATURES = ["MODIFIERS", "RECIPES", "KITCHEN", "TABLES"];

/** Faqat restoranda beriladigan rollar — backenddagi `RoleType.isRestaurantOnly`. */
export const RESTAURANT_ROLES = ["WAITER", "COOK"];

const dirsOf = (shop) => (Array.isArray(shop?.directions) ? shop.directions : []);

export const isRestaurant = (shop) => dirsOf(shop).includes(RESTAURANT);

/** Restoran boshqa yo'nalish bilan birga — eski, tanlanishi kerak. */
export const isMixed = (shop) => isRestaurant(shop) && dirsOf(shop).length > 1;

/** Ro'yxatni tur bo'yicha ajratadi: «restaurant» · «store». */
export const ofKind = (shops, kind) =>
  (shops || []).filter((s) => (kind === "restaurant") === isRestaurant(s));

/**
 * Yo'nalish tugmasi bosilganda yangi tanlov.
 *
 * ⚠ Restoran yakka: u bosilsa qolganlari tushadi, boshqasi bosilsa
 * restoran tushadi. Aralash eski joyda admin shu yo'l bilan tanlaydi.
 */
export function toggleDirection(prev, key) {
  const next = new Set(prev);
  if (next.has(key)) { next.delete(key); return next; }
  if (key === RESTAURANT) return new Set([RESTAURANT]);
  next.delete(RESTAURANT);
  next.add(key);
  return next;
}

/** Shu joyda beriladigan rollar (ro'yxat tartibi saqlanadi). */
export const rolesFor = (shop, roles) =>
  isRestaurant(shop) ? roles : roles.filter((r) => !RESTAURANT_ROLES.includes(r));

/**
 * Rol nomi joy turiga qarab: restoranda do'kon admini — «Menejer».
 * Rol bitta (`SHOP_ADMIN`), faqat nomi boshqa — restoranda «admin»
 * deyilmaydi.
 */
export const roleNameIn = (shop, role, t, roleLabel) =>
  isRestaurant(shop) && role === "SHOP_ADMIN" ? t("enum.role.MANAGER") : roleLabel(role);
