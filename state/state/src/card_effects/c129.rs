use super::effect_helpers::*;

serializable_filter!(SerializableFilter::C129, |c| is_armis_guard(*c.base()));

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 4, my_id).await;
        if game
          .reveal_from_card(target, |c| c.marked_for_death.is_some())
          .await
        {
          game.instantiate_and_summon(owner, BaseCard::C20001).await;
          game.add_global_modifier(
            owner,
            my_id,
            vec![
              Modifier::ModifyHealth(1, None),
              Modifier::ModifyPower(1, None),
            ],
            SerializableFilter::C129,
          );
        }
      })
    },
  }
});
