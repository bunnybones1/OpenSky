use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        let num_blights_in_grave = game
          .player_cards(owner)
          .graveyard()
          .iter()
          .filter(|c| c.instance(game, None).unwrap().base() == &BaseCard::C20064)
          .collect_vec()
          .len();
        let damage: i8 = (num_blights_in_grave + 1).try_into().unwrap();
        game
          .modify_card_single(hero, Modifier::ModifyHealth(-damage, None))
          .await;

        game.draw(owner, |c, _| c.base != BaseCard::C20064).await;
      })
    },
  }
});
