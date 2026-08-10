use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let spell = game
      .draw_low_cost_spell_onto(my_id, |c, _| c.element == Element::Air)
      .await;
    if let Some(spell) = spell {
      game
        .modify_card(spell, vec![Modifier::GrantTrait(Trait::Banner)])
        .await;
    }
  }))
  .into()],
  on_play: None
});
