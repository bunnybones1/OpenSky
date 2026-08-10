pub const fn aura_order(dfa: bool, layer: AuraLayer) -> i8 {
  (layer as u8 as i8) * 10 + if dfa { 0 } else { 1 }
}

///
/// | Layer | Type | Effects we can write | Effects we *shouldn't* write |
/// | :---: | ---- | -------------------- | ---------------------- |
/// | 0 | Internal | is_stealthed, Leo Banner Size | |
/// | 1 | Element-changing | All units are Fire. | All CONDITION units are Fire. If CONDITION comes from a higher layer, it'll be weird. |
/// | 2 | Field keyword add/remove | All Fire units have Banner| All Units with > 1 power have Banner. If we have a power-modifying aura, it'll be weird.|
/// | 3 | Power/health set | All Banner units have +1 power | |
/// | 4 | Power/health modify | All units with > 5 power have -1 power | |
/// | 5 | Hand & attach cost modify | All spells have +1c | All Banner spells in your hand have +1c. If we have an aura that gives Banner to hand cards, it'll be weird.|
/// | 6 | Hand & attach keyword add/removes | All 1c and higher spells have Banner| |
///
///
/// Auras in one layer should make a best effort to only read from the lower layers, or we'll get weiiird interactions.
///
///
/// Within each layer, DFAs, then other auras, apply in left-to-right order. (WHICH PLAYER'S FIRST?)
///
/// DFA: Dependancy-free aura
///
/// 1. A DFA must only modify the card it's printed on (or the card it's attached to, if it's an enchantment)
/// 2. A DFA must be condition-free.
/// 3. A DFA must set some attribute of the card. Usually element, keywords, or power.
///
/// e.g.: X-cost effects are DFAs. Silence/Lead/Chains etc are DFAs. So far, we have no unit effects that would classify as DFAs.
///
#[repr(u8)]
pub enum AuraLayer {
  Internal = 0, // is_stealthed, banner_size, guard
  RemoveAttackRestriction = 1,
  Wake = 2,
  Exhaust = 3,
  // ChangeElement = 1,
  FieldKeyword = 4,
  // SetStat = 3,
  IncreaseStat = 5,
  DecreaseStat = 6,
  SetCost = 7,
  IncreaseCost = 8,
  DecreaseCost = 9,
  OtherKeyword = 10,
}
