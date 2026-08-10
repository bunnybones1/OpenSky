use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game
          .modify_card_single(target, Modifier::GrantTrait(Trait::Guard))
          .await;
        let power: u8 = game.reveal_from_card(target, |c| c.power).await.into();
        let enemy_units: Vec<_> = game.units::<InstanceID>(enemy(owner));
        game.damage_many(&enemy_units, power, my_id).await;
      })
    },
  }
});
