use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunrise!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let num_unique_ally_elements = game
      .characters::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .filter_map(|c| match c.element {
        Element::Sky => None,
        el => Some(el),
      })
      .unique()
      .count();
    game
      .change_mana(owner, num_unique_ally_elements as i32)
      .await;
  }))
  .into()],
  on_play: None
});
