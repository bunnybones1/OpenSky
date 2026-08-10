use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: xcost_modify!(
    |game, my_id| {
      let owner = game.owner(my_id);
      let grave_spells_count = game
        .player_cards(owner)
        .graveyard()
        .iter()
        .filter(|c| c.instance(game, None).unwrap().is_spell())
        .count() as i8;
      -grave_spells_count
    },
    AuraLayer::DecreaseCost
  ),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, _| {
      Box::pin(async move {
        let hero = game.hero_id(game.owner(my_id));
        game
          .modify_card_single(hero, Modifier::GrantTrait(Trait::Armor))
          .await;
      })
    },
  }
});
