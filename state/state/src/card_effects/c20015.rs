use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target, _| {
      Box::pin(async move {
        game.bounce(target).await;
        game.give_spell(target, BaseCard::C20017).await;
      })
    },
  }
});
