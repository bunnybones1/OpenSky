use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _my_id, target, _owner| {
      Box::pin(async move {
        game.berf(target, 2, 2).await;
        game.give_spell(target, BaseCard::C20054).await;
      })
    },
  }
});
