use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _my_id, target, _| {
      Box::pin(async move {
        let target_owner = game.owner(target);
        if game.dust(target).await {
          game.cleanup_dead_units().await;
          game
            .instantiate_and_run_and_summon(target_owner, BaseCard::C20025, |game, c| {
              Box::pin(async move {
                game.give_spell(c, BaseCard::C20048).await;
              })
            })
            .await;
        }
      })
    }
  }
});
