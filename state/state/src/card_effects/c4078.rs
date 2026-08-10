use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    game
      .draw(owner, |c, _| {
        c.traits.contains(&Trait::Armor) && c.is_unit()
      })
      .await;
  }))
  .into()],
  on_play: None
});
