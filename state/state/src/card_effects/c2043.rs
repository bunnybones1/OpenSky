use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    if game
      .location(my_id)
      .location
      .map(|z| z.0.is_dust())
      .unwrap_or(false)
    {
      return; // fizzle if we can't re-summon ourselves
    }
    let owner = game.owner(my_id);
    let has_required_elements = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .filter(|c| c.id() != my_id)
      .map(|c| c.base().instance().element)
      .unique()
      .count()
      >= 8;

    if has_required_elements {
      // Pick one of each element
      let elements = [
        Element::Earth,
        Element::Air,
        Element::Fire,
        Element::Water,
        Element::Metal,
        Element::Mind,
        Element::Light,
        Element::Dark,
      ];
      let mut dust_cards = Vec::new();
      for element in &elements {
        let card = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.id() != my_id)
          .find(|c| c.base().instance().element == *element)
          .map(Into::into)
          .unwrap();
        dust_cards.push(card);
      }
      game.dust_many(dust_cards).await;
      game.summon(my_id).await;
    }
  }))
  .into()],
  on_play: None
});
