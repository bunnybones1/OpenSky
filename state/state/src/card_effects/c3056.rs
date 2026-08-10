use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let enemy_units = game.enemy_units(owner);
        game.damage_many(&enemy_units, 1, my_id).await;

        let doom = game.create_card(owner, BaseCard::C3010).await;
        game.move_to_zone(doom, Zone::Hand { public: true }).await;
      })
    },
  }
});
