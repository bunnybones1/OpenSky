use super::effect_helpers::*;

attack_restriction!(
  Blind,
  |defender: &CardInstance<SkyWeaver>, defender_field: &[InstanceID]| {
    Some(&defender.id()) == defender_field.last()
  }
);

intrinsic_effect!(Effect::Enchant {
  on_attach: |parent, enchant| {
    parent.add_modifier(
      enchant.id(),
      0,
      Modifier::GrantAttackRestrictions(indexset!(AttackRestriction::Blind)),
      ModifierExpiry::Never { copyable: false },
    );
  },
  on_detach: |parent, enchant| {
    parent.remove_modifiers_from(enchant.id());
  },
});
