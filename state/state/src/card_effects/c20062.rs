use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        if target.instance(game, None).unwrap().is_hero() {
          game.damage(target, 1, my_id).await;
          game.instantiate_and_summon(owner, BaseCard::C20013).await;
        } else {
          game.give_spell(target, enchant::HEX).await;
        }
      })
    },
  }
});
