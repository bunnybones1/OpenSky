use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, _my_id, owner| Box::pin(async move {
    let dead_1c_or_more_spells: Vec<_> = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .filter(|c| c.is_spell() && c.cost > 0)
      .map(|c| c.id())
      .collect();

    if let Some(bottom_dead_spell) = dead_1c_or_more_spells.last() {
      game.move_to_zone(bottom_dead_spell, Zone::Casting).await;
      game
        .cast_spell_on_enemies(*bottom_dead_spell, |_| true, false, false)
        .await;
    }
  }))
  .into()],
  on_play: None
});
