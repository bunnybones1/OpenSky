use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: Vec::new(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let damage = 3;
        let targets_to_damage = game.player_cards(enemy(owner)).field().clone();
        game.damage_many(&targets_to_damage, damage, my_id).await;

        let ids_to_dust: Vec<Card> = game
          .units_including_dead::<&CardInstance<SkyWeaver>>(enemy(owner))
          .into_iter()
          .filter(|c| c.marked_for_death.is_some())
          .map_into()
          .collect();

        game.dust_many(ids_to_dust).await;
      })
    }
  }
});
