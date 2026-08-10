use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        game.berf(target, 1, 1).await;
        game
          .modify_card_single(target, Modifier::GrantTrait(Trait::Armor))
          .await;
        game.instantiate_and_summon(owner, BaseCard::C20001).await;
      })
    },
  }
});
