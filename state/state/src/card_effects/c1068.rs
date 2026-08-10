use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let enemy_has_unit = !game
          .units::<&CardInstance<SkyWeaver>>(enemy(owner))
          .is_empty();

        let num_to_summon = if enemy_has_unit { 2 } else { 1 };

        for _ in 0..num_to_summon {
          game
            .instantiate_and_run_and_summon(owner, BaseCard::C20006, |game, card| {
              Box::pin(async move {
                game
                  .modify_card(card, vec![Modifier::GrantTrait(Trait::Guard)])
                  .await;
              })
            })
            .await;
        }
      })
    },
  }
});
