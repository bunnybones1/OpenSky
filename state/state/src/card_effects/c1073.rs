use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemies_with_traits: Vec<Card> = game
      .characters::<&CardInstance<SkyWeaver>>(enemy(owner))
      .into_iter()
      .filter(|c| !c.traits.is_empty())
      .map_into()
      .collect();

    game
      .give_spell_many(&enemies_with_traits, enchant::CHAINS)
      .await;
  }))
  .into()],
  on_play: None
});
