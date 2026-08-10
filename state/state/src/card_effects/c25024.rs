use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);

        game
          .modify_card_single(hero, Modifier::ModifyHealth(3, None))
          .await;
      })
    },
  }
});
